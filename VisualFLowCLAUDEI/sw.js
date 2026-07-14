// sw.js - VisuaFlow Advanced Service Worker
// 🚀 Quantum Cache Strategy + Predictive Pre-caching + AI Model Management

const CACHE_VERSION = 'v4.5.0';
const CACHE_NAMES = {
  static: `visuaflow-static-${CACHE_VERSION}`,
  dynamic: `visuaflow-dynamic-${CACHE_VERSION}`,
  ai_models: `visuaflow-models-${CACHE_VERSION}`,
  videos: `visuaflow-videos-${CACHE_VERSION}`,
  audio: `visuaflow-audio-${CACHE_VERSION}`,
};

const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/app.js',
  '/js/three.min.js',
];

// AI Model URLs (ONNX format)
const AI_MODELS = {
  beatDetector: '/models/beat-detector-v3-quantized.onnx',
  emotionClassifier: '/models/emotion-classifier-v2.onnx',
  styleTransfer: '/models/style-transfer-lite.onnx',
  audioAnalyzer: '/models/audio-analyzer-v4.onnx',
};

// 📊 Cache Size Limits (bytes)
const CACHE_LIMITS = {
  static: 50 * 1024 * 1024,    // 50MB
  dynamic: 100 * 1024 * 1024,  // 100MB
  ai_models: 200 * 1024 * 1024, // 200MB
  videos: 500 * 1024 * 1024,   // 500MB
  audio: 100 * 1024 * 1024,    // 100MB
};

// 🎯 INSTALL EVENT - Aggressive Caching
self.addEventListener('install', (event) => {
  console.log('[SW] Installing VisuaFlow Service Worker', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      // Open all caches in parallel
      const [staticCache, modelCache] = await Promise.all([
        caches.open(CACHE_NAMES.static),
        caches.open(CACHE_NAMES.ai_models),
      ]);

      // Cache critical resources
      await staticCache.addAll(CRITICAL_RESOURCES);
      console.log('[SW] Cached critical resources');

      // Pre-cache AI models (progressive loading)
      await precacheModels(modelCache);
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// 🔄 ACTIVATE EVENT - Cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker');
  
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter(key => !Object.values(CACHE_NAMES).includes(key))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );

      // Take control of all clients immediately
      await clients.claim();
      
      // Initialize IndexedDB for advanced features
      await initializeOfflineDB();
      
      console.log('[SW] Service worker activated');
    })()
  );
});

// 📡 FETCH EVENT - Quantum Cache Strategy™
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Route to appropriate strategy
  if (url.pathname.startsWith('/models/')) {
    event.respondWith(handleModelRequest(request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (request.destination === 'video' || url.pathname.includes('/videos/')) {
    event.respondWith(handleVideoRequest(request));
  } else if (request.destination === 'audio' || url.pathname.includes('/audio/')) {
    event.respondWith(handleAudioRequest(request));
  } else {
    event.respondWith(handleStaticRequest(request));
  }
});

// 🧠 AI Model Request Handler - Cache First, Network Fallback
async function handleModelRequest(request) {
  const cache = await caches.open(CACHE_NAMES.ai_models);
  
  // Try cache first
  const cached = await cache.match(request);
  if (cached) {
    console.log('[SW] Serving model from cache:', request.url);
    return cached;
  }

  // Fetch from network with timeout
  try {
    const response = await fetchWithTimeout(request, 30000);
    
    if (response.ok) {
      // Cache the model
      cache.put(request, response.clone());
      console.log('[SW] Cached new model:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Model fetch failed:', error);
    return new Response('Model unavailable offline', { 
      status: 503,
      statusText: 'Service Unavailable' 
    });
  }
}

// 🌐 API Request Handler - Network First, Cache Fallback
async function handleAPIRequest(request) {
  const cache = await caches.open(CACHE_NAMES.dynamic);

  try {
    // Try network first (with timeout)
    const response = await fetchWithTimeout(request, 5000);
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback to cache
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Serving API from cache (offline):', request.url);
      return cached;
    }

    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No network and no cache available',
        timestamp: Date.now()
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 🎥 Video Request Handler - Streaming + Range Support
async function handleVideoRequest(request) {
  const cache = await caches.open(CACHE_NAMES.videos);
  
  // Check if we have it cached
  const cached = await cache.match(request);
  
  if (cached) {
    // Support range requests for video streaming
    return handleRangeRequest(request, cached);
  }

  // Try to fetch from network
  try {
    const response = await fetch(request);
    
    if (response.ok && response.status === 200) {
      // Cache if under size limit
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) < 50 * 1024 * 1024) {
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    return new Response('Video not available offline', { 
      status: 503 
    });
  }
}

// 🎵 Audio Request Handler - Similar to video but smaller cache
async function handleAudioRequest(request) {
  const cache = await caches.open(CACHE_NAMES.audio);
  
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    return new Response('Audio not available offline', { 
      status: 503 
    });
  }
}

// 📄 Static Resource Handler - Cache First
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAMES.static);
  
  // Try cache first
  const cached = await cache.match(request);
  if (cached) {
    // Stale-while-revalidate
    updateCacheInBackground(request, cache);
    return cached;
  }

  // Fetch from network
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Offline fallback page
    if (request.destination === 'document') {
      return cache.match('/offline.html') || new Response('Offline');
    }
    
    return new Response('Resource not available offline', { 
      status: 503 
    });
  }
}

// ⚡ Utility: Fetch with timeout
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
  ]);
}

// 🔄 Background cache update (stale-while-revalidate)
async function updateCacheInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
    }
  } catch (error) {
    // Silent fail - already serving from cache
  }
}

// 📹 Handle Range Requests (for video streaming)
function handleRangeRequest(request, response) {
  const rangeHeader = request.headers.get('range');
  
  if (!rangeHeader) {
    return response;
  }

  return response.clone().arrayBuffer().then(buffer => {
    const bytes = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
    const start = parseInt(bytes[1], 10);
    const end = bytes[2] ? parseInt(bytes[2], 10) : buffer.byteLength - 1;
    
    return new Response(buffer.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Range': `bytes ${start}-${end}/${buffer.byteLength}`,
        'Content-Length': end - start + 1,
        'Content-Type': response.headers.get('Content-Type'),
      },
    });
  });
}

// 🎯 Pre-cache AI models progressively
async function precacheModels(cache) {
  console.log('[SW] Pre-caching AI models...');
  
  const modelPromises = Object.entries(AI_MODELS).map(async ([name, url]) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log(`[SW] Cached model: ${name}`);
      }
    } catch (error) {
      console.warn(`[SW] Failed to cache model ${name}:`, error);
    }
  });

  await Promise.allSettled(modelPromises);
}

// 💾 Initialize IndexedDB for offline data
async function initializeOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VisuaFlowOffline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        projectStore.createIndex('timestamp', 'timestamp', { unique: false });
        projectStore.createIndex('status', 'status', { unique: false });
      }
      
      // Generated videos store
      if (!db.objectStoreNames.contains('videos')) {
        const videoStore = db.createObjectStore('videos', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        videoStore.createIndex('projectId', 'projectId', { unique: false });
      }
      
      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
      }

      // Analytics events store
      if (!db.objectStoreNames.contains('analytics')) {
        const analyticsStore = db.createObjectStore('analytics', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// 🔄 BACKGROUND SYNC - Upload pending data when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-projects') {
    event.waitUntil(syncPendingProjects());
  } else if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncPendingProjects() {
  console.log('[SW] Syncing pending projects...');
  
  const db = await initializeOfflineDB();
  const transaction = db.transaction(['syncQueue'], 'readonly');
  const store = transaction.objectStore('syncQueue');
  const allRecords = await getAllFromStore(store);
  
  for (const record of allRecords) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record.data),
      });
      
      // Remove from sync queue after successful upload
      const deleteTransaction = db.transaction(['syncQueue'], 'readwrite');
      deleteTransaction.objectStore('syncQueue').delete(record.id);
      
    } catch (error) {
      console.error('[SW] Sync failed for record:', record.id, error);
    }
  }
}

async function syncAnalytics() {
  // Similar to syncPendingProjects but for analytics events
  console.log('[SW] Syncing analytics events...');
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 📬 PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New update available',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'VisuaFlow',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 🧹 PERIODIC CLEANUP - Run every hour when idle
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cleanup-caches') {
    event.waitUntil(cleanupOldCaches());
  }
});

async function cleanupOldCaches() {
  console.log('[SW] Running cache cleanup...');
  
  for (const [name, cacheName] of Object.entries(CACHE_NAMES)) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const limit = CACHE_LIMITS[name];
    
    let totalSize = 0;
    const sizes = await Promise.all(
      requests.map(async (req) => {
        const response = await cache.match(req);
        const blob = await response.blob();
        return { request: req, size: blob.size };
      })
    );
    
    // Sort by size (largest first)
    sizes.sort((a, b) => b.size - a.size);
    
    // Delete until under limit
    for (const { request, size } of sizes) {
      totalSize += size;
      if (totalSize > limit) {
        await cache.delete(request);
        console.log('[SW] Deleted from cache:', request.url);
      }
    }
  }
}

console.log('[SW] VisuaFlow Service Worker loaded! 🚀');
