import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';

// Socket reference outside component to avoid multiple connections
let socket;

export default function Editor() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [plugins, setPlugins] = useState([]);
  const [selectedPlugin, setSelectedPlugin] = useState('default');
  const [progress, setProgress] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);

  const connectSocket = () => {
    if (!socket) {
      socket = io('http://localhost:3001');
      socket.on('connect', () => {
        console.log('Connected to preview socket');
      });
      socket.on('progress', (data) => {
        setProgress(data.progress);
      });
      socket.on('preview', (data) => {
        setPreviewImg(data.image);
      });
      socket.on('result', (data) => {
        setResultUrl(data.url);
        setProgress(null);
      });
    }
  };

  useEffect(() => {
    // Fetch available plugins on mount
    axios.get('http://localhost:3001/api/plugins').then((res) => {
      setPlugins(res.data);
    }).catch((err) => console.error(err));
    connectSocket();
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file || !prompt) {
      alert('Please select a file and enter a prompt.');
      return;
    }
    // Determine endpoint based on file type
    const isVideo = file.type.startsWith('video');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    formData.append('plugin', selectedPlugin);
    try {
      const endpoint = isVideo ? '/api/edit/video' : '/api/edit/image';
      await axios.post(`http://localhost:3001${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // After posting, progress will be tracked via socket events
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Button variant="contained" component="label">
            Select Image/Video
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          {file && (
            <Typography variant="body2" color="text.secondary">
              Selected: {file.name}
            </Typography>
          )}
          <TextField
            label="Enter editing prompt"
            variant="outlined"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Select Plugin"
            value={selectedPlugin}
            onChange={(e) => setSelectedPlugin(e.target.value)}
            helperText="Choose a plugin to enhance the editing capability"
          >
            <MenuItem value="default">Default</MenuItem>
            {plugins.map((plugin) => (
              <MenuItem key={plugin.id} value={plugin.id}>{plugin.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={handleSubmit} disabled={!file || !prompt}>
            Start Editing
          </Button>
          {progress !== null && (
            <Box sx={{ width: '100%' }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" color="text.secondary">Processing: {Math.round(progress)}%</Typography>
            </Box>
          )}
          {previewImg && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Real‑Time Preview</Typography>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImg} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
            </Box>
          )}
          {resultUrl && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Result</Typography>
              <video src={resultUrl} controls style={{ maxWidth: '100%' }} />
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}