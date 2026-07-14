FROM node:20-slim AS base
RUN apt-get update && apt-get install -y python3 python3-pip make g++ git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# --- BACKEND SETUP ---
COPY backend/requirements.txt ./backend/
RUN pip3 install --no-cache-dir -r ./backend/requirements.txt
# --- FRONTEND SETUP ---
COPY atom-hf-space/package.json ./atom-hf-space/
# Kill the problematic postinstall script on the fly
RUN sed -i 's/"postinstall":.*,/"postinstall": "echo skipping postinstall",/g' ./atom-hf-space/package.json
RUN cd atom-hf-space && npm install
# --- BUILD PHASE ---
COPY . .
RUN cd atom-hf-space && npm run build
# --- RUNNER PHASE ---
ENV PORT=7860
ENV HOSTNAME=0.0.0.0
EXPOSE 7860
# Start backend in background and frontend in foreground
CMD python3 backend/main.py & npm start --prefix atom-hf-space
