const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const pluginManager = require('./pluginManager');

// Initialize Express app and middleware
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server and attach Socket.IO for real‑time communication
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

// Simple in‑memory job store (for demonstration only). In production use a queue.
const jobs = {};

io.on('connection', (socket) => {
  console.log('Client connected to preview channel');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Configure multer for file uploads. Ensure uploads directory exists.
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const upload = multer({ dest: uploadsDir });

// API to list available plugins
app.get('/api/plugins', (req, res) => {
  res.json(pluginManager.listPlugins());
});

// Endpoint to trigger image editing job
app.post('/api/edit/image', upload.single('file'), async (req, res) => {
  const { prompt, plugin } = req.body;
  const file = req.file;
  if (!file || !prompt) {
    return res.status(400).json({ error: 'file and prompt are required' });
  }
  const jobId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  jobs[jobId] = { status: 'queued' };
  // Kick off processing in background without blocking response
  processImageJob(jobId, file, prompt, plugin).catch((err) => console.error(err));
  return res.json({ jobId });
});

// Endpoint to trigger video editing job
app.post('/api/edit/video', upload.single('file'), async (req, res) => {
  const { prompt, plugin } = req.body;
  const file = req.file;
  if (!file || !prompt) {
    return res.status(400).json({ error: 'file and prompt are required' });
  }
  const jobId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  jobs[jobId] = { status: 'queued' };
  processVideoJob(jobId, file, prompt, plugin).catch((err) => console.error(err));
  return res.json({ jobId });
});

// Background image job processing
async function processImageJob(jobId, file, prompt, plugin) {
  try {
    jobs[jobId].status = 'processing';
    // Emit synthetic progress updates until actual results arrive
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 10, 90);
      io.emit('progress', { progress });
    }, 1000);
    // Prepare form‑data for AI service
    const form = new FormData();
    form.append('file', fs.createReadStream(file.path), file.originalname);
    form.append('prompt', prompt);
    form.append('plugin', plugin);
    const response = await axios.post('http://localhost:8000/edit/image', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    clearInterval(progressInterval);
    const { previews, file_data, file_extension } = response.data;
    // Emit preview frames sequentially
    if (previews && Array.isArray(previews)) {
      for (const img of previews) {
        io.emit('preview', { image: img });
      }
    }
    // Decode file_data and write to public directory
    if (file_data) {
      const buffer = Buffer.from(file_data, 'base64');
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${file_extension || 'png'}`;
      const outPath = path.join(publicDir, filename);
      fs.writeFileSync(outPath, buffer);
      const resultUrl = `/public/${filename}`;
      io.emit('progress', { progress: 100 });
      io.emit('result', { url: resultUrl });
    }
    jobs[jobId].status = 'completed';
  } catch (err) {
    console.error('Error processing image job', err);
    jobs[jobId].status = 'error';
  } finally {
    fs.unlink(file.path, () => {});
  }
}

// Background video job processing
async function processVideoJob(jobId, file, prompt, plugin) {
  try {
    jobs[jobId].status = 'processing';
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 5, 90);
      io.emit('progress', { progress });
    }, 1000);
    const form = new FormData();
    form.append('file', fs.createReadStream(file.path), file.originalname);
    form.append('prompt', prompt);
    form.append('plugin', plugin);
    const response = await axios.post('http://localhost:8000/edit/video', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    clearInterval(progressInterval);
    const { previews, file_data, file_extension } = response.data;
    if (previews && Array.isArray(previews)) {
      for (const img of previews) {
        io.emit('preview', { image: img });
      }
    }
    if (file_data) {
      const buffer = Buffer.from(file_data, 'base64');
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${file_extension || 'mp4'}`;
      const outPath = path.join(publicDir, filename);
      fs.writeFileSync(outPath, buffer);
      const resultUrl = `/public/${filename}`;
      io.emit('progress', { progress: 100 });
      io.emit('result', { url: resultUrl });
    }
    jobs[jobId].status = 'completed';
  } catch (err) {
    console.error('Error processing video job', err);
    jobs[jobId].status = 'error';
  } finally {
    fs.unlink(file.path, () => {});
  }
}

// Serve uploaded and result files statically from a public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
app.use('/public', express.static(publicDir));

// Start the server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});