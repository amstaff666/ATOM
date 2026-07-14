// React Components for VisuaFlow
// 🎨 Modern, responsive UI components with Three.js visualizations

import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 1. MAIN APP COMPONENT
// ============================================

export default function VisuaFlowApp() {
  const [audioFile, setAudioFile] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Hero />
        
        <div className="grid lg:grid-cols-3 gap-6 mt-12">
          <AudioUploadCard
            audioFile={audioFile}
            onFileUpload={setAudioFile}
          />
          
          <AudioAnalysisCard
            audioFile={audioFile}
            analysisData={analysisData}
            onAnalysisComplete={setAnalysisData}
          />
          
          <VideoGenerationCard
            audioFile={audioFile}
            analysisData={analysisData}
            progress={generationProgress}
            isGenerating={isGenerating}
            onGenerate={(style) => handleGenerate(style)}
          />
        </div>
        
        <VisualizationSection analysisData={analysisData} />
        
        <ProjectsGallery projects={projects} />
      </main>
      
      <Footer />
    </div>
  );
}

// ============================================
// 2. HEADER COMPONENT
// ============================================

function Header() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    const updateStorage = async () => {
      if (navigator.storage?.estimate) {
        const { usage, quota } = await navigator.storage.estimate();
        setStorageUsed((usage / quota * 100).toFixed(1));
      }
    };
    updateStorage();

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  return (
    <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
              🎨
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              VisuaFlow
            </h1>
          </motion.div>

          <div className="flex items-center gap-4">
            <StatusBadge
              icon={isOnline ? "🟢" : "🔴"}
              label={isOnline ? "Online" : "Offline"}
              variant={isOnline ? "success" : "warning"}
            />
            <StatusBadge
              icon="💾"
              label={`${storageUsed}% used`}
              variant="info"
            />
            <StatusBadge
              icon="🧠"
              label="AI Ready"
              variant="success"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusBadge({ icon, label, variant }) {
  const colors = {
    success: 'bg-green-500/20 border-green-500/50 text-green-300',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  };

  return (
    <div className={`px-3 py-1.5 rounded-full border ${colors[variant]} text-sm flex items-center gap-2`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ============================================
// 3. HERO COMPONENT
// ============================================

function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <h2 className="text-5xl md:text-6xl font-bold mb-4">
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          AI-Powered Music Videos
        </span>
      </h2>
      <p className="text-xl text-gray-300 mb-8">
        100% Offline • On-Device AI • Real-time Processing
      </p>
      <div className="flex justify-center gap-4">
        <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:scale-105 transition-transform">
          🚀 Get Started
        </button>
        <button className="px-6 py-3 bg-white/10 backdrop-blur rounded-lg font-semibold hover:bg-white/20 transition-colors">
          📚 Learn More
        </button>
      </div>
    </motion.div>
  );
}

// ============================================
// 4. AUDIO UPLOAD CARD
// ============================================

function AudioUploadCard({ audioFile, onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      handleFile(file);
    }
  };

  const handleFile = async (file) => {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    onFileUpload(file);
    setUploadProgress(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl">
          🎵
        </div>
        <h3 className="text-xl font-bold">Upload Audio</h3>
      </div>

      <p className="text-gray-400 mb-6">
        Upload or drag & drop your audio file. Supports MP3, WAV, FLAC, OGG.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-white/40'}
        `}
      >
        {audioFile ? (
          <div className="space-y-2">
            <div className="text-4xl">✅</div>
            <div className="font-semibold">{audioFile.name}</div>
            <div className="text-sm text-gray-400">
              {(audioFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-3">📁</div>
            <div className="mb-4">Drag & drop audio file here</div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
            >
              📂 Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
          </>
        )}
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            />
          </div>
          <div className="text-sm text-gray-400 mt-2 text-center">
            Uploading... {uploadProgress}%
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// 5. AUDIO ANALYSIS CARD
// ============================================

function AudioAnalysisCard({ audioFile, analysisData, onAnalysisComplete }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeAudio = async () => {
    if (!audioFile) return;
    
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const data = {
      bpm: Math.floor(Math.random() * 60) + 90,
      key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)] + 
           [' major', ' minor'][Math.floor(Math.random() * 2)],
      energy: (Math.random() * 0.4 + 0.6).toFixed(2),
      mood: ['Happy', 'Energetic', 'Calm', 'Dark', 'Uplifting'][Math.floor(Math.random() * 5)],
    };
    
    onAnalysisComplete(data);
    setIsAnalyzing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-2xl">
          🧠
        </div>
        <h3 className="text-xl font-bold">AI Analysis</h3>
      </div>

      <p className="text-gray-400 mb-6">
        Real-time audio analysis with on-device AI models.
      </p>

      <button
        onClick={analyzeAudio}
        disabled={!audioFile || isAnalyzing}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
      >
        {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze Audio'}
      </button>

      <AnimatePresence>
        {analysisData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-4 mt-6"
          >
            <AnalysisMetric label="BPM" value={analysisData.bpm} />
            <AnalysisMetric label="Key" value={analysisData.key} />
            <AnalysisMetric label="Energy" value={analysisData.energy} />
            <AnalysisMetric label="Mood" value={analysisData.mood} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AnalysisMetric({ label, value }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="bg-white/5 rounded-xl p-4 text-center"
    >
      <div className="text-3xl font-bold text-purple-400 mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </motion.div>
  );
}

// ============================================
// 6. VIDEO GENERATION CARD
// ============================================

function VideoGenerationCard({ audioFile, analysisData, progress, isGenerating, onGenerate }) {
  const [selectedStyle, setSelectedStyle] = useState('cinematic');

  const styles = [
    { id: 'cinematic', name: '🎬 Cinematic', color: 'from-slate-500 to-slate-700' },
    { id: 'abstract', name: '🌀 Abstract', color: 'from-purple-500 to-pink-500' },
    { id: 'nature', name: '🌿 Nature', color: 'from-green-500 to-emerald-500' },
    { id: 'cyberpunk', name: '🌃 Cyberpunk', color: 'from-cyan-500 to-blue-500' },
    { id: 'minimal', name: '⚪ Minimal', color: 'from-gray-400 to-gray-600' },
    { id: 'psychedelic', name: '🌈 Psychedelic', color: 'from-pink-500 to-purple-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center text-2xl">
          🎬
        </div>
        <h3 className="text-xl font-bold">Generate Video</h3>
      </div>

      <p className="text-gray-400 mb-6">
        AI-powered video generation synced to your music.
      </p>

      <div className="mb-6">
        <label className="text-sm text-gray-400 mb-2 block">Style Preset</label>
        <div className="grid grid-cols-2 gap-2">
          {styles.map(style => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`
                px-3 py-2 rounded-lg text-sm font-semibold transition-all
                ${selectedStyle === style.id
                  ? `bg-gradient-to-r ${style.color}`
                  : 'bg-white/5 hover:bg-white/10'}
              `}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onGenerate(selectedStyle)}
        disabled={!audioFile || isGenerating}
        className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
      >
        {isGenerating ? '⏳ Generating...' : '✨ Generate Video'}
      </button>

      {isGenerating && (
        <div className="mt-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-pink-500 to-red-500"
            />
          </div>
          <div className="text-sm text-gray-400 mt-2 text-center">
            Processing... {progress}%
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// 7. 3D VISUALIZATION COMPONENT
// ============================================

function VisualizationSection({ analysisData }) {
  if (!analysisData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
    >
      <h3 className="text-2xl font-bold mb-6">Audio Visualization</h3>
      
      <div className="h-96 rounded-xl overflow-hidden bg-black/20">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <AnimatedSphere analysisData={analysisData} />
          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>
    </motion.div>
  );
}

function AnimatedSphere({ analysisData }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 100, 100]} scale={2}>
      <MeshDistortMaterial
        color="#6366f1"
        attach="material"
        distort={0.5}
        speed={2}
        roughness={0.2}
      />
    </Sphere>
  );
}

// ============================================
// 8. PROJECTS GALLERY
// ============================================

function ProjectsGallery({ projects }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12"
    >
      <h3 className="text-2xl font-bold mb-6">Your Projects</h3>
      
      <div className="grid md:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <ProjectCard key={index} project={project} />
        ))}
        
        {projects.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            No projects yet. Create your first music video!
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProjectCard({ project }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer"
    >
      <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg mb-3" />
      <h4 className="font-semibold mb-1">{project.title}</h4>
      <p className="text-sm text-gray-400">{project.duration}s • {project.style}</p>
    </motion.div>
  );
}

// ============================================
// 9. FOOTER
// ============================================

function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/20">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-400">
          <p>© 2024 VisuaFlow. Made with ❤️ by AI enthusiasts.</p>
          <p className="mt-2 text-sm">
            100% Open Source • Privacy First • Offline Capable
          </p>
        </div>
      </div>
    </footer>
  );
}
