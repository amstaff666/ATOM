# VisuaFlow - Vercel Deployment Guide
# 🚀 Deploy your PWA to Vercel in 5 minutes

## vercel.json - Configuration File

```json
{
  "version": 2,
  "name": "visuaflow",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/sw.js",
      "headers": {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Service-Worker-Allowed": "/"
      },
      "dest": "/sw.js"
    },
    {
      "src": "/manifest.json",
      "headers": {
        "Content-Type": "application/manifest+json"
      },
      "dest": "/manifest.json"
    },
    {
      "src": "/models/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      },
      "dest": "/models/$1"
    },
    {
      "src": "/(.*)",
      "headers": {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      },
      "dest": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "env": {
    "VITE_APP_NAME": "VisuaFlow",
    "VITE_APP_VERSION": "4.5.0"
  }
}
```

## package.json - Build Scripts

Add these scripts to your `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "vercel-build": "npm run build && npm run sw:build",
    "sw:build": "node build-sw.js"
  }
}
```

## build-sw.js - Service Worker Build Script

Create `frontend/build-sw.js`:

```javascript
import { build } from 'vite';
import { generateSW } from 'workbox-build';

async function buildServiceWorker() {
  console.log('🔨 Building Service Worker...');

  // Build with Workbox
  const { count, size } = await generateSW({
    swDest: 'dist/sw.js',
    globDirectory: 'dist',
    globPatterns: [
      '**/*.{html,js,css,woff2,png,svg,jpg,json}'
    ],
    maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
    
    // Runtime caching
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.anthropic\.com\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          },
        },
      },
      {
        urlPattern: /\.(?:mp3|wav|ogg|flac)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'audio-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /\.(?:mp4|webm)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'video-cache',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      {
        urlPattern: /\.(?:onnx)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'model-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
    ],
  });

  console.log(`✅ Service Worker generated:`);
  console.log(`   Cached ${count} files`);
  console.log(`   Total size: ${(size / 1024 / 1024).toFixed(2)} MB`);
}

buildServiceWorker();
```

## vite.config.js - Vite Configuration

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'VisuaFlow',
        short_name: 'VisuaFlow',
        description: 'AI-Powered Music Video Generator',
        theme_color: '#6366f1',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'three': ['three', '@react-three/fiber', '@react-three/drei'],
          'ai': ['onnxruntime-web']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
});
```

## 🚀 DEPLOYMENT STEPS

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Initialize Project

```bash
cd frontend
vercel init
```

### Step 4: Configure Environment Variables

In Vercel dashboard, add these environment variables:

```env
VITE_API_URL=https://your-backend.vercel.app
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_ANALYTICS=true
```

### Step 5: Deploy!

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 📋 Pre-Deployment Checklist

- [ ] All models are in `public/models/`
- [ ] Icons are in `public/icons/`
- [ ] `manifest.json` is configured
- [ ] Service Worker is registered
- [ ] Environment variables are set
- [ ] Build succeeds locally (`npm run build`)
- [ ] PWA works offline locally
- [ ] No console errors

## 🔧 Optimization Tips

### 1. Model Compression

Compress ONNX models before deployment:

```bash
python compress_models.py
```

### 2. Image Optimization

```bash
# Install sharp
npm install -D sharp

# Optimize images
npx @squoosh/cli --webp auto public/icons/*.png
```

### 3. Enable Brotli Compression

Vercel automatically enables Brotli, but verify:

```bash
curl -H "Accept-Encoding: br" https://your-app.vercel.app/sw.js -I
```

### 4. CDN Caching

Configure cache headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/models/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 📊 Performance Targets

After deployment, verify these metrics:

```yaml
Lighthouse Scores:
  Performance: > 90
  Accessibility: > 95
  Best Practices: > 95
  SEO: > 90
  PWA: 100

Core Web Vitals:
  LCP: < 2.5s
  FID: < 100ms
  CLS: < 0.1

PWA:
  Installable: ✅
  Offline: ✅
  Fast: ✅
```

## 🐛 Troubleshooting

### Service Worker Not Updating

```javascript
// Force update
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()));
```

### Models Not Loading

Check CORS headers:

```javascript
fetch('/models/beat-detector.onnx')
  .then(r => console.log(r.headers.get('Content-Type')));
```

### Build Fails

Clear cache:

```bash
rm -rf node_modules dist .vercel
npm install
npm run build
```

## 🎯 Post-Deployment

### 1. Test PWA Installation

- Open on mobile
- Add to Home Screen
- Verify icon and name

### 2. Test Offline Mode

- Open DevTools
- Go offline (Network tab)
- Refresh page
- Test core features

### 3. Monitor Performance

Use Vercel Analytics:

```bash
vercel analytics
```

### 4. Setup Custom Domain (Optional)

```bash
vercel domains add yourdomain.com
```

## 🔐 Security Hardening

### 1. Content Security Policy

Already configured in `vercel.json`.

### 2. API Rate Limiting

Implement in backend:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. HTTPS Only

Enforced automatically by Vercel.

## 📚 Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox Guide](https://developers.google.com/web/tools/workbox)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)

## ✅ Deployment Complete!

Your VisuaFlow PWA should now be live at:

```
https://your-project.vercel.app
```

🎉 **Congratulations! You've deployed a cutting-edge AI-powered PWA!**

---

## Quick Deploy Script

Save as `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying VisuaFlow to Vercel..."

# Build
echo "📦 Building..."
npm run build

# Check build size
echo "📊 Build size:"
du -sh dist

# Deploy
echo "🌐 Deploying..."
vercel --prod

echo "✅ Deployment complete!"
```

Make executable: `chmod +x deploy.sh`

Run: `./deploy.sh`
