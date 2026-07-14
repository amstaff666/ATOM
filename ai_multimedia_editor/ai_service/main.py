"""
AI Service
This FastAPI application provides endpoints to perform AI‑powered
image and video editing according to user prompts and selected plugins.
It loads plugins dynamically from the `plugins` directory. Each plugin
can override image and video frame processing functions.

The service returns previews and final results for consumption by the
Node.js backend and ultimately the frontend.
"""

import os
import io
import uuid
import importlib.util
import base64
from typing import List, Dict, Callable

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
from moviepy.editor import VideoFileClip

# ----------------------------------------------------------------------------
# Plugin Manager
# ----------------------------------------------------------------------------

class Plugin:
    def __init__(self, module):
        self.id = getattr(module, 'id')
        self.name = getattr(module, 'name')
        self.description = getattr(module, 'description', '')
        self.apply_image: Callable[[Image.Image, str], Image.Image] = getattr(module, 'apply_image', None)
        self.apply_video_frame: Callable[[Image.Image, str], Image.Image] = getattr(module, 'apply_video_frame', None)


def load_plugins() -> Dict[str, Plugin]:
    plugins = {}
    plugins_dir = os.path.join(os.path.dirname(__file__), 'plugins')
    if not os.path.isdir(plugins_dir):
        return plugins
    for filename in os.listdir(plugins_dir):
        if filename.endswith('.py'):
            path = os.path.join(plugins_dir, filename)
            name = os.path.splitext(filename)[0]
            spec = importlib.util.spec_from_file_location(name, path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)  # type: ignore
            plugin = Plugin(mod)
            plugins[plugin.id] = plugin
    return plugins


plugins = load_plugins()

# Static folder to store resulting media
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
os.makedirs(STATIC_DIR, exist_ok=True)

app = FastAPI(title="AI Multimedia Editing Service")


def pil_image_to_base64(img: Image.Image) -> str:
    """Encode a PIL image as a base64 data URI."""
    with io.BytesIO() as output:
        img.save(output, format='PNG')
        data = base64.b64encode(output.getvalue()).decode('utf-8')
    return f'data:image/png;base64,{data}'


@app.post('/edit/image')
async def edit_image(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    plugin: str = Form('default')
):
    """
    Edit a single image using the selected plugin and prompt.
    Returns a list of base64 previews and a URL to the final processed image.
    """
    try:
        # Read uploaded file into PIL image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('RGB')
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f'Invalid image file: {exc}')
    previews: List[str] = []
    # First preview is the original image
    previews.append(pil_image_to_base64(img))
    processed_img = img
    # If plugin exists and defines apply_image, run it
    selected_plugin = plugins.get(plugin)
    if selected_plugin and selected_plugin.apply_image:
        processed_img = selected_plugin.apply_image(img, prompt)
        previews.append(pil_image_to_base64(processed_img))
    else:
        # Default editing: invert colors if no plugin
        inverted = Image.eval(img, lambda px: 255 - px)
        processed_img = inverted
        previews.append(pil_image_to_base64(processed_img))
    # Save processed image temporarily and return its bytes encoded
    filename = f'{uuid.uuid4().hex}.png'
    temp_path = os.path.join(STATIC_DIR, filename)
    processed_img.save(temp_path)
    with open(temp_path, 'rb') as f:
        file_bytes = f.read()
    os.remove(temp_path)
    file_data = base64.b64encode(file_bytes).decode('utf-8')
    return JSONResponse({
        'previews': previews,
        'file_data': file_data,
        'file_extension': 'png'
    })


@app.post('/edit/video')
async def edit_video(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    plugin: str = Form('default')
):
    """
    Edit a video file using the selected plugin.
    For demonstration purposes this implementation reads the video,
    processes each frame (if plugin defines apply_video_frame), and writes
    out a new video.
    """
    # Save incoming video to a temporary file
    temp_input_path = os.path.join(STATIC_DIR, f'{uuid.uuid4().hex}_input')
    temp_output_path = os.path.join(STATIC_DIR, f'{uuid.uuid4().hex}.mp4')
    # Write uploaded file to disk
    with open(temp_input_path, 'wb') as f:
        contents = await file.read()
        f.write(contents)
    try:
        clip = VideoFileClip(temp_input_path)
    except Exception as exc:
        os.remove(temp_input_path)
        raise HTTPException(status_code=400, detail=f'Invalid video file: {exc}')
    selected_plugin = plugins.get(plugin)
    # Define frame processing function
    def process_frame(frame):
        # frame is a numpy array (H, W, 3) in float [0,1]
        image = Image.fromarray((frame * 255).astype('uint8'))
        if selected_plugin and selected_plugin.apply_video_frame:
            image = selected_plugin.apply_video_frame(image, prompt)
        else:
            image = Image.eval(image, lambda px: 255 - px)
        return ( ( (image) ).convert('RGB') )
    # Apply frame processing
    try:
        if selected_plugin and selected_plugin.apply_video_frame:
            processed_clip = clip.fl_image(lambda frame: process_frame(frame).copy())
        else:
            processed_clip = clip.fl_image(lambda frame: process_frame(frame).copy())
        processed_clip.write_videofile(temp_output_path, codec='libx264', audio_codec='aac', verbose=False, logger=None)
    finally:
        clip.close()
        os.remove(temp_input_path)
    # Generate a single preview thumbnail (first frame)
    thumbnail = Image.fromarray((processed_clip.get_frame(0)).astype('uint8')).convert('RGB')
    previews = [pil_image_to_base64(thumbnail)]
    # Encode the processed video file into base64 and return along with extension
    with open(temp_output_path, 'rb') as f:
        video_bytes = f.read()
    os.remove(temp_output_path)
    file_data = base64.b64encode(video_bytes).decode('utf-8')
    return JSONResponse({
        'previews': previews,
        'file_data': file_data,
        'file_extension': 'mp4'
    })