// ai-engine.js - VisuaFlow Offline AI Engine
// 🧠 ONNX Runtime + TensorFlow.js + WebGPU

import * as ort from 'onnxruntime-web';

class VisuaFlowAIEngine {
  constructor() {
    this.models = new Map();
    this.isInitialized = false;
    this.progressCallbacks = [];
    
    // Execution providers priority
    this.executionProviders = [
      'webgpu',  // Fastest, GPU-accelerated
      'webgl',   // Fallback for older browsers
      'wasm',    // CPU fallback
    ];
    
    // Model metadata
    this.modelRegistry = {
      beatDetector: {
        url: '/models/beat-detector-v3-quantized.onnx',
        size: 8 * 1024 * 1024, // 8MB
        priority: 'high',
        inputShape: [1, 1, 44100], // 1 second audio
        outputShape: [1, 1],
      },
      emotionClassifier: {
        url: '/models/emotion-classifier-v2.onnx',
        size: 12 * 1024 * 1024, // 12MB
        priority: 'medium',
        inputShape: [1, 128, 128], // Mel spectrogram
        outputShape: [1, 7], // 7 emotions
      },
      styleTransfer: {
        url: '/models/style-transfer-lite.onnx',
        size: 25 * 1024 * 1024, // 25MB
        priority: 'low',
        inputShape: [1, 3, 512, 512],
        outputShape: [1, 3, 512, 512],
      },
      audioAnalyzer: {
        url: '/models/audio-analyzer-v4.onnx',
        size: 15 * 1024 * 1024, // 15MB
        priority: 'high',
        inputShape: [1, 1, 88200], // 2 seconds
        outputShape: [1, 64], // Feature embeddings
      },
    };
  }

  // 🚀 Initialize AI Engine
  async initialize(options = {}) {
    if (this.isInitialized) {
      console.log('[AI] Engine already initialized');
      return;
    }

    console.log('[AI] Initializing VisuaFlow AI Engine...');
    this.updateProgress(0, 'Starting initialization...');

    try {
      // 1. Check WebGPU support
      const hasWebGPU = await this.checkWebGPUSupport();
      console.log('[AI] WebGPU support:', hasWebGPU);

      // 2. Configure ONNX Runtime
      await this.configureONNXRuntime();

      // 3. Load models progressively
      await this.loadModelsProgressive(options.modelsToLoad || ['beatDetector', 'audioAnalyzer']);

      this.isInitialized = true;
      this.updateProgress(100, 'Initialization complete!');
      console.log('[AI] Engine initialized successfully 🎉');

    } catch (error) {
      console.error('[AI] Initialization failed:', error);
      throw error;
    }
  }

  // 🔍 Check WebGPU Support
  async checkWebGPUSupport() {
    if (!navigator.gpu) {
      console.warn('[AI] WebGPU not supported, falling back to WebGL/WASM');
      this.executionProviders = this.executionProviders.filter(p => p !== 'webgpu');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        this.executionProviders = this.executionProviders.filter(p => p !== 'webgpu');
        return false;
      }
      
      const device = await adapter.requestDevice();
      console.log('[AI] WebGPU device:', device.label);
      return true;

    } catch (error) {
      console.warn('[AI] WebGPU initialization failed:', error);
      this.executionProviders = this.executionProviders.filter(p => p !== 'webgpu');
      return false;
    }
  }

  // ⚙️ Configure ONNX Runtime
  async configureONNXRuntime() {
    // Set WebAssembly paths
    ort.env.wasm.wasmPaths = '/js/onnx/';
    
    // Enable WebGPU if available
    ort.env.webgpu.powerPreference = 'high-performance';
    
    // Set number of threads for WASM
    ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
    
    // Enable SIMD
    ort.env.wasm.simd = true;
    
    console.log('[AI] ONNX Runtime configured');
  }

  // 📦 Load Models Progressively
  async loadModelsProgressive(modelNames) {
    console.log('[AI] Loading models:', modelNames);
    
    const totalModels = modelNames.length;
    let loadedCount = 0;

    for (const modelName of modelNames) {
      try {
        this.updateProgress(
          (loadedCount / totalModels) * 80,
          `Loading ${modelName}...`
        );

        await this.loadModel(modelName);
        
        loadedCount++;
        console.log(`[AI] Model loaded: ${modelName} (${loadedCount}/${totalModels})`);

      } catch (error) {
        console.error(`[AI] Failed to load model ${modelName}:`, error);
      }
    }
  }

  // 🔽 Load Single Model
  async loadModel(modelName) {
    if (this.models.has(modelName)) {
      console.log(`[AI] Model ${modelName} already loaded`);
      return this.models.get(modelName);
    }

    const modelInfo = this.modelRegistry[modelName];
    if (!modelInfo) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    try {
      // Try cache first
      const cachedModel = await this.loadFromCache(modelInfo.url);
      
      let modelBuffer;
      if (cachedModel) {
        modelBuffer = cachedModel;
        console.log(`[AI] Loaded ${modelName} from cache`);
      } else {
        // Download with progress
        modelBuffer = await this.downloadModel(modelInfo.url, modelName);
        // Cache for next time
        await this.saveToCache(modelInfo.url, modelBuffer);
      }

      // Create ONNX session
      const session = await ort.InferenceSession.create(
        modelBuffer,
        {
          executionProviders: this.executionProviders,
          graphOptimizationLevel: 'all',
          enableCpuMemArena: true,
        }
      );

      this.models.set(modelName, {
        session,
        info: modelInfo,
        loadedAt: Date.now(),
      });

      return session;

    } catch (error) {
      console.error(`[AI] Error loading model ${modelName}:`, error);
      throw error;
    }
  }

  // 💾 Load from Cache Storage
  async loadFromCache(url) {
    try {
      const cache = await caches.open('visuaflow-models-v4.5.0');
      const response = await cache.match(url);
      
      if (response) {
        return await response.arrayBuffer();
      }
      
      return null;
    } catch (error) {
      console.warn('[AI] Cache read failed:', error);
      return null;
    }
  }

  // 💾 Save to Cache Storage
  async saveToCache(url, arrayBuffer) {
    try {
      const cache = await caches.open('visuaflow-models-v4.5.0');
      const response = new Response(arrayBuffer);
      await cache.put(url, response);
    } catch (error) {
      console.warn('[AI] Cache write failed:', error);
    }
  }

  // 📥 Download Model with Progress
  async downloadModel(url, modelName) {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10);
    
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      // Update progress
      const progress = (receivedLength / total) * 100;
      this.updateProgress(
        progress * 0.8, // 80% of total is downloading
        `Downloading ${modelName}: ${Math.round(progress)}%`
      );
    }

    // Concatenate chunks
    const arrayBuffer = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, position);
      position += chunk.length;
    }

    return arrayBuffer.buffer;
  }

  // 🎯 Run Inference
  async runInference(modelName, inputData, options = {}) {
    if (!this.models.has(modelName)) {
      await this.loadModel(modelName);
    }

    const { session, info } = this.models.get(modelName);
    
    try {
      // Prepare input tensor
      const inputTensor = new ort.Tensor(
        'float32',
        inputData,
        info.inputShape
      );

      // Run inference
      const feeds = { input: inputTensor };
      const results = await session.run(feeds);

      // Extract output
      const outputTensor = results[Object.keys(results)[0]];
      
      return {
        data: outputTensor.data,
        shape: outputTensor.dims,
        type: outputTensor.type,
      };

    } catch (error) {
      console.error(`[AI] Inference failed for ${modelName}:`, error);
      throw error;
    }
  }

  // 🎵 Audio Analysis Pipeline
  async analyzeAudio(audioBuffer) {
    console.log('[AI] Starting audio analysis...');
    
    const results = {
      beats: null,
      emotion: null,
      features: null,
    };

    try {
      // 1. Extract audio features
      const audioFeatures = await this.extractAudioFeatures(audioBuffer);
      
      // 2. Detect beats (parallel with emotion)
      const [beatResult, emotionResult] = await Promise.all([
        this.runInference('beatDetector', audioFeatures.raw),
        this.runInference('emotionClassifier', audioFeatures.spectrogram),
      ]);

      results.beats = this.processBeats(beatResult.data);
      results.emotion = this.processEmotion(emotionResult.data);
      
      // 3. Advanced feature analysis
      const featureResult = await this.runInference('audioAnalyzer', audioFeatures.raw);
      results.features = Array.from(featureResult.data);

      console.log('[AI] Audio analysis complete:', results);
      return results;

    } catch (error) {
      console.error('[AI] Audio analysis failed:', error);
      throw error;
    }
  }

  // 🎨 Generate Video Frame
  async generateFrame(audioFeatures, styleParams) {
    // This would use the style transfer model
    // For now, return placeholder
    console.log('[AI] Generating frame with params:', styleParams);
    
    try {
      const inputData = this.prepareStyleInput(audioFeatures, styleParams);
      const result = await this.runInference('styleTransfer', inputData);
      
      return {
        imageData: result.data,
        shape: result.shape,
      };
    } catch (error) {
      console.error('[AI] Frame generation failed:', error);
      return null;
    }
  }

  // 🔧 Helper: Extract audio features
  extractAudioFeatures(audioBuffer) {
    // This is a simplified version
    // Real implementation would use Web Audio API + FFT
    
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    
    return {
      raw: new Float32Array(channelData),
      spectrogram: this.computeMelSpectrogram(channelData, sampleRate),
      duration: audioBuffer.duration,
    };
  }

  // 📊 Compute Mel Spectrogram (simplified)
  computeMelSpectrogram(audioData, sampleRate) {
    // Simplified version - real implementation would use FFT
    const spectrogramSize = 128 * 128;
    const spectrogram = new Float32Array(spectrogramSize);
    
    // Placeholder computation
    for (let i = 0; i < spectrogramSize; i++) {
      spectrogram[i] = Math.random() * 0.1; // This would be real FFT data
    }
    
    return spectrogram;
  }

  // 🥁 Process beat detection results
  processBeats(rawData) {
    // Convert model output to beat timestamps
    const threshold = 0.5;
    const beats = [];
    
    for (let i = 0; i < rawData.length; i++) {
      if (rawData[i] > threshold) {
        beats.push({
          time: i / 44100, // Assuming 44.1kHz sample rate
          confidence: rawData[i],
        });
      }
    }
    
    return beats;
  }

  // 😊 Process emotion classification
  processEmotion(rawData) {
    const emotions = [
      'happy', 'sad', 'angry', 'calm', 'energetic', 'dark', 'uplifting'
    ];
    
    const scores = Array.from(rawData);
    const maxIndex = scores.indexOf(Math.max(...scores));
    
    return {
      primary: emotions[maxIndex],
      scores: emotions.reduce((acc, emotion, i) => {
        acc[emotion] = scores[i];
        return acc;
      }, {}),
    };
  }

  // 🎨 Prepare style transfer input
  prepareStyleInput(audioFeatures, styleParams) {
    // Combine audio features with style parameters
    const inputSize = 3 * 512 * 512; // RGB image
    const input = new Float32Array(inputSize);
    
    // This would map audio features to visual parameters
    // Placeholder for now
    for (let i = 0; i < inputSize; i++) {
      input[i] = Math.random();
    }
    
    return input;
  }

  // 📢 Progress callback system
  onProgress(callback) {
    this.progressCallbacks.push(callback);
  }

  updateProgress(percent, message) {
    this.progressCallbacks.forEach(cb => cb(percent, message));
  }

  // 🗑️ Cleanup
  async dispose() {
    console.log('[AI] Disposing AI engine...');
    
    for (const [name, { session }] of this.models) {
      try {
        await session.dispose();
        console.log(`[AI] Disposed model: ${name}`);
      } catch (error) {
        console.warn(`[AI] Failed to dispose ${name}:`, error);
      }
    }
    
    this.models.clear();
    this.isInitialized = false;
  }

  // 📊 Get Model Info
  getModelInfo(modelName) {
    return this.modelRegistry[modelName];
  }

  // 📊 Get All Loaded Models
  getLoadedModels() {
    return Array.from(this.models.keys());
  }

  // 💾 Estimate Memory Usage
  estimateMemoryUsage() {
    let totalBytes = 0;
    
    for (const [name, { info }] of this.models) {
      totalBytes += info.size;
    }
    
    return {
      totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
      models: this.getLoadedModels().length,
    };
  }
}

// 🌟 Create singleton instance
const aiEngine = new VisuaFlowAIEngine();

// Export for use in other modules
export default aiEngine;
export { VisuaFlowAIEngine };

// Auto-initialize on import (can be disabled)
if (typeof window !== 'undefined') {
  window.VisuaFlowAI = aiEngine;
  
  // Initialize when page is loaded
  if (document.readyState === 'complete') {
    aiEngine.initialize({ modelsToLoad: ['beatDetector'] });
  } else {
    window.addEventListener('load', () => {
      aiEngine.initialize({ modelsToLoad: ['beatDetector'] });
    });
  }
}

console.log('[AI] VisuaFlow AI Engine module loaded! 🧠');
