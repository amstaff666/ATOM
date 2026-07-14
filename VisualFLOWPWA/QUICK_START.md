# 🚀 VISUAFLOW PWA - KIIRE ALUSTAMISJUHEND

## ⚡ KÕIGE KIIREM ALUSTAMINE (15 min)

### Samm 1: Ava PowerShell Administrator õigustega
```powershell
# Windows key + X → "Windows PowerShell (Admin)"
```

### Samm 2: Luba skriptide käivitamine
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Samm 3: Klooni failid
```powershell
# Kopeeri kõik loodud failid oma projekti kausta
mkdir C:\Projects\visuaflow-pwa
cd C:\Projects\visuaflow-pwa

# Kopeeri failid:
# - sw.js → public/sw.js
# - ai-engine.js → src/utils/ai-engine.js
# - offline-db.js → src/utils/offline-db.js
# - manifest.json → public/manifest.json
# - backend-main.py → backend/api/main.py
# - setup-visuaflow.ps1 → setup.ps1
```

### Samm 4: Käivita setup
```powershell
.\setup.ps1
```

### Samm 5: Käivita rakendus
```powershell
.\start-all.ps1
```

### Samm 6: Ava brauser
```
Frontend: http://localhost:5173
Backend:  http://localhost:8000/docs
```

---

## 🎯 ALTERNATIIVSED ALUSTAMISE VIISID

### A) Ainult Frontend (ilma backend-ita)

```powershell
# 1. Loo uus React projekt
npm create vite@latest visuaflow-frontend -- --template react

cd visuaflow-frontend

# 2. Installi dependencies
npm install onnxruntime-web three @react-three/fiber framer-motion

# 3. Kopeeri PWA failid
# - sw.js → public/
# - ai-engine.js → src/utils/
# - offline-db.js → src/utils/
# - manifest.json → public/

# 4. Lisa index.html-i
<link rel="manifest" href="/manifest.json">
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>

# 5. Käivita
npm run dev
```

### B) Kasuta Olemasolevat LuunaOS Playerit

Sul on juba `index.html` fail! Lisa lihtsalt:

```html
<!-- Lisa index.html <head> sektsiooni -->
<link rel="manifest" href="/manifest.json">
<script type="module" src="/js/ai-engine.js"></script>
<script type="module" src="/js/offline-db.js"></script>

<!-- Service Worker registreerimine -->
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.log('SW error:', err));
  });
}
</script>
```

---

## 📦 MINIMAALNE SETUP (AINULT PWA)

Kui tahad ainult offline funktsionaalsust:

### 1. Loo failid:

```
my-pwa/
├── index.html
├── manifest.json
├── sw.js
└── js/
    ├── ai-engine.js
    └── offline-db.js
```

### 2. Lisa index.html-i:

```html
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisuaFlow</title>
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <div id="app">
    <h1>VisuaFlow PWA</h1>
    <button onclick="testOffline()">Test Offline Mode</button>
  </div>

  <script type="module">
    import aiEngine from './js/ai-engine.js';
    import offlineDB from './js/offline-db.js';

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    // Test functions
    window.testOffline = async () => {
      await offlineDB.init();
      const id = await offlineDB.create('projects', {
        title: 'Test Project',
        status: 'draft'
      });
      console.log('Created project:', id);
      alert('Offline DB works! Check console.');
    };
  </script>
</body>
</html>
```

### 3. Käivita server:

```powershell
# Python
python -m http.server 8000

# Või Node.js
npx serve .
```

### 4. Ava: http://localhost:8000

---

## 🧪 TESTIMINE

### Test 1: Offline Mode
```javascript
// DevTools Console
navigator.serviceWorker.ready.then(() => {
  console.log('Service Worker ready!');
});

// Disconnect network in DevTools → Network tab → Offline
// Refresh page → should still work!
```

### Test 2: IndexedDB
```javascript
// DevTools Console
const db = window.OfflineDB;
await db.create('projects', { title: 'My First Project' });
const projects = await db.query('projects');
console.log(projects);
```

### Test 3: AI Engine
```javascript
// DevTools Console
const ai = window.VisuaFlowAI;
await ai.initialize();
console.log('Loaded models:', ai.getLoadedModels());
```

---

## 🔧 TROUBLESHOOTING

### Service Worker ei registreeru?
```javascript
// Check registration
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Active SWs:', regs);
});
```

### Cache ei tööta?
```javascript
// Check caches
caches.keys().then(keys => {
  console.log('Cache keys:', keys);
});
```

### IndexedDB viga?
```javascript
// Check databases
indexedDB.databases().then(dbs => {
  console.log('Databases:', dbs);
});
```

---

## 📚 JÄRGMISED SAMMUD

1. **Lisa AI mudelid** → `/public/models/` kausta
2. **Seadista backend** → FastAPI + Celery
3. **Integreeri CometAI** → Muusika genereerimine
4. **Deploy** → Vercel, Netlify, või AWS

---

## 💡 KASULIKUD LINGID

- **Service Worker API**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **IndexedDB**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **ONNX Runtime**: https://onnxruntime.ai/docs/tutorials/web/
- **PWA Guide**: https://web.dev/progressive-web-apps/

---

## 🎨 NÄITED KASUTAMISEST

### Example 1: Loo projekt
```javascript
import offlineDB from './js/offline-db.js';

const projectId = await offlineDB.create('projects', {
  title: 'My Music Video',
  audioUrl: '/audio/song.mp3',
  status: 'draft',
  settings: {
    style: 'cinematic',
    duration: 60
  }
});

console.log('Created project:', projectId);
```

### Example 2: Analüüsi audio
```javascript
import aiEngine from './js/ai-engine.js';

await aiEngine.initialize();

const audioContext = new AudioContext();
const response = await fetch('/audio/song.mp3');
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

const analysis = await aiEngine.analyzeAudio(audioBuffer);
console.log('BPM:', analysis.beats);
console.log('Emotion:', analysis.emotion);
```

### Example 3: Offline sync
```javascript
// Automatically syncs when online
window.addEventListener('online', () => {
  offlineDB.processSyncQueue();
});
```

---

## ✅ KONTROLLNIMEKIRI

- [ ] Python 3.10+ installitud
- [ ] Node.js 18+ installitud
- [ ] Redis käivitatud (optional)
- [ ] PostgreSQL käivitatud (optional)
- [ ] Service Worker registreeritud
- [ ] IndexedDB töötab
- [ ] AI mudelid loodud
- [ ] Backend API töötab
- [ ] Frontend kuvab õigesti

---

## 🆘 ABI VAJAD?

1. Vaata `VISUAFLOW_PWA_ARCHITECTURE.md` → Üksikasjalik arhitektuur
2. Kontrolli browser console → Vigade logid
3. DevTools → Application → Service Workers, IndexedDB, Cache
4. GitHub Issues → Küsi kogukonnalt

**Edu projektiga! 🚀**
