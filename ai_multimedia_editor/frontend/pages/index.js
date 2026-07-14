import React from 'react';
import Editor from '../components/Editor';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export default function Home() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Next‑Generation AI Multimedia Editor
      </Typography>
      <Editor />
    </Container>
  );
}