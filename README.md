---
title: Annator Full System
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Annator Full System

Canonical Hugging Face Docker Space package for the Annator / ATOM manager system.

Runtime contract:
- public app: Next.js on `0.0.0.0:7860`
- internal FastAPI service: `127.0.0.1:4490`
- Hugging Face exposes only port `7860`

The root `Dockerfile` is the deployment source of truth.
