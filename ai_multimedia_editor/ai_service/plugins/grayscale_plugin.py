"""
Sample grayscale plugin for the AI multimedia editor.
Each plugin must define the following attributes:
 - id: unique identifier for the plugin
 - name: human friendly name
 - description: short description
 - apply_image(img: PIL.Image.Image, prompt: str) -> PIL.Image.Image
 - apply_video_frame(frame: PIL.Image.Image, prompt: str) -> PIL.Image.Image

The plugin functions should return a new image object.
"""

from PIL import Image

id = "grayscale"
name = "Grayscale"
description = "Convert images or video frames to grayscale."


def apply_image(img: Image.Image, prompt: str) -> Image.Image:
    """Apply grayscale filter to the provided image."""
    return img.convert("L").convert("RGB")


def apply_video_frame(frame: Image.Image, prompt: str) -> Image.Image:
    """Apply grayscale filter to a video frame."""
    return frame.convert("L").convert("RGB")