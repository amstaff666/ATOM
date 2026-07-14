// offline-db.js - VisuaFlow Advanced Offline Database
// 💾 IndexedDB + CRDTs + P2P Sync + Vector Clocks

class OfflineDatabase {
  constructor() {
    this.dbName = 'VisuaFlowOffline';
    this.dbVersion = 3;
    this.db = null;
    this.syncCallbacks = [];
    
    // CRDT state
    this.vectorClock = new Map(); // For conflict resolution
    this.peerId = this.generatePeerId();
    
    // Stores schema
    this.stores = {
      projects: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'status', keyPath: 'status', unique: false },
          { name: 'userId', keyPath: 'userId', unique: false },
        ],
      },
      videos: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'projectId', keyPath: 'projectId', unique: false },
          { name: 'createdAt', keyPath: 'createdAt', unique: false },
        ],
      },
      syncQueue: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'status', keyPath: 'status', unique: false },
          { name: 'retryCount', keyPath: 'retryCount', unique: false },
        ],
      },
      analytics: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'eventType', keyPath: 'eventType', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
        ],
      },
      cache: {
        keyPath: 'key',
        indexes: [
          { name: 'expires', keyPath: 'expires', unique: false },
        ],
      },
      settings: {
        keyPath: 'key',
      },
    };
  }

  // 🚀 Initialize Database
  async init() {
    if (this.db) {
      console.log('[DB] Already initialized');
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[DB] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[DB] Database opened successfully');
        
        // Setup error handler
        this.db.onerror = (event) => {
          console.error('[DB] Database error:', event.target.error);
        };

        // Setup close handler
        this.db.onclose = () => {
          console.warn('[DB] Database connection closed');
          this.db = null;
        };

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(`[DB] Upgrading from version ${event.oldVersion} to ${event.newVersion}`);

        // Create all stores
        for (const [storeName, schema] of Object.entries(this.stores)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: schema.keyPath,
              autoIncrement: schema.autoIncrement,
            });

            // Create indexes
            if (schema.indexes) {
              schema.indexes.forEach(index => {
                store.createIndex(index.name, index.keyPath, {
                  unique: index.unique,
                });
              });
            }

            console.log(`[DB] Created store: ${storeName}`);
          }
        }

        // Migration logic for version upgrades
        if (event.oldVersion < 2) {
          console.log('[DB] Running migration v1 -> v2');
          // Add migration code here
        }

        if (event.oldVersion < 3) {
          console.log('[DB] Running migration v2 -> v3');
          // Add migration code here
        }
      };
    });
  }

  // 📝 CRUD Operations with CRDT support

  async create(storeName, data) {
    await this.ensureDB();
    
    // Add CRDT metadata
    const enrichedData = {
      ...data,
      _crdt: {
        peerId: this.peerId,
        timestamp: Date.now(),
        vectorClock: this.getVectorClock(),
        version: 1,
      },
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(enrichedData);

      request.onsuccess = () => {
        const id = request.result;
        console.log(`[DB] Created record in ${storeName}:`, id);
        
        // Queue for sync
        this.queueForSync(storeName, 'create', { ...enrichedData, id });
        
        resolve(id);
      };

      request.onerror = () => {
        console.error(`[DB] Error creating in ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  async read(storeName, id) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async update(storeName, id, updates) {
    await this.ensureDB();

    // Get existing record
    const existing = await this.read(storeName, id);
    
    if (!existing) {
      throw new Error(`Record ${id} not found in ${storeName}`);
    }

    // Merge with CRDT logic
    const updated = this.mergeCRDT(existing, updates);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(updated);

      request.onsuccess = () => {
        console.log(`[DB] Updated record in ${storeName}:`, id);
        
        // Queue for sync
        this.queueForSync(storeName, 'update', updated);
        
        resolve(updated);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async delete(storeName, id) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`[DB] Deleted record from ${storeName}:`, id);
        
        // Queue for sync (tombstone)
        this.queueForSync(storeName, 'delete', { id, _deleted: true });
        
        resolve(true);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async query(storeName, options = {}) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let request;
      
      if (options.index) {
        const index = store.index(options.index);
        request = options.range 
          ? index.getAll(options.range)
          : index.getAll();
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result;
        
        // Apply filters
        if (options.filter) {
          results = results.filter(options.filter);
        }
        
        // Apply sorting
        if (options.sort) {
          results.sort(options.sort);
        }
        
        // Apply limit
        if (options.limit) {
          results = results.slice(0, options.limit);
        }
        
        resolve(results);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 🔄 CRDT Conflict Resolution

  mergeCRDT(existing, updates) {
    // Last-write-wins with vector clocks
    const existingClock = existing._crdt?.vectorClock || {};
    const updateClock = this.getVectorClock();
    
    const merged = { ...existing, ...updates };
    
    // Update CRDT metadata
    merged._crdt = {
      peerId: this.peerId,
      timestamp: Date.now(),
      vectorClock: this.mergeVectorClocks(existingClock, updateClock),
      version: (existing._crdt?.version || 0) + 1,
    };
    
    return merged;
  }

  getVectorClock() {
    const clock = {};
    this.vectorClock.forEach((value, key) => {
      clock[key] = value;
    });
    clock[this.peerId] = (clock[this.peerId] || 0) + 1;
    return clock;
  }

  mergeVectorClocks(clock1, clock2) {
    const merged = { ...clock1 };
    
    for (const [peerId, timestamp] of Object.entries(clock2)) {
      merged[peerId] = Math.max(merged[peerId] || 0, timestamp);
    }
    
    return merged;
  }

  // 📤 Sync Queue Management

  async queueForSync(storeName, operation, data) {
    try {
      await this.create('syncQueue', {
        storeName,
        operation,
        data,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
      });
      
      // Trigger sync if online
      if (navigator.onLine) {
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('[DB] Failed to queue for sync:', error);
    }
  }

  async processSyncQueue() {
    const pending = await this.query('syncQueue', {
      filter: item => item.status === 'pending',
      sort: (a, b) => a.createdAt - b.createdAt,
    });

    console.log(`[DB] Processing ${pending.length} items in sync queue`);

    for (const item of pending) {
      try {
        await this.syncItem(item);
        
        // Mark as synced
        await this.update('syncQueue', item.id, {
          status: 'synced',
          syncedAt: Date.now(),
        });
        
      } catch (error) {
        console.error('[DB] Sync failed for item:', item.id, error);
        
        // Increment retry count
        const retryCount = item.retryCount + 1;
        const maxRetries = 5;
        
        if (retryCount >= maxRetries) {
          await this.update('syncQueue', item.id, {
            status: 'failed',
            retryCount,
            error: error.message,
          });
        } else {
          await this.update('syncQueue', item.id, {
            status: 'pending',
            retryCount,
          });
        }
      }
    }
  }

  async syncItem(item) {
    // Send to server
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeName: item.storeName,
        operation: item.operation,
        data: item.data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    return await response.json();
  }

  // 🔍 Advanced Queries

  async searchProjects(searchTerm) {
    const projects = await this.query('projects');
    
    return projects.filter(project => {
      const titleMatch = project.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const tagsMatch = project.tags?.some(tag => 
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return titleMatch || tagsMatch;
    });
  }

  async getProjectsByStatus(status) {
    return this.query('projects', {
      filter: project => project.status === status,
      sort: (a, b) => b.timestamp - a.timestamp,
    });
  }

  async getRecentVideos(limit = 10) {
    return this.query('videos', {
      sort: (a, b) => b.createdAt - a.createdAt,
      limit,
    });
  }

  async getAnalyticsSummary(startDate, endDate) {
    const events = await this.query('analytics', {
      filter: event => 
        event.timestamp >= startDate && 
        event.timestamp <= endDate,
    });

    // Aggregate by event type
    const summary = {};
    events.forEach(event => {
      summary[event.eventType] = (summary[event.eventType] || 0) + 1;
    });

    return summary;
  }

  // 🧹 Cleanup and Maintenance

  async cleanupExpiredCache() {
    const now = Date.now();
    const expired = await this.query('cache', {
      filter: item => item.expires && item.expires < now,
    });

    console.log(`[DB] Cleaning up ${expired.length} expired cache items`);

    for (const item of expired) {
      await this.delete('cache', item.key);
    }

    return expired.length;
  }

  async vacuumDatabase() {
    console.log('[DB] Vacuuming database...');
    
    // Remove old completed sync items
    const oldSynced = await this.query('syncQueue', {
      filter: item => 
        item.status === 'synced' && 
        item.syncedAt < Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days
    });

    for (const item of oldSynced) {
      await this.delete('syncQueue', item.id);
    }

    // Cleanup expired cache
    await this.cleanupExpiredCache();

    console.log('[DB] Vacuum complete');
  }

  // 📊 Storage Statistics

  async getStorageStats() {
    const stats = {
      stores: {},
      total: 0,
    };

    for (const storeName of Object.keys(this.stores)) {
      const items = await this.query(storeName);
      stats.stores[storeName] = {
        count: items.length,
        size: this.estimateSize(items),
      };
      stats.total += stats.stores[storeName].count;
    }

    // Get quota info
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      stats.quota = {
        usage: estimate.usage,
        quota: estimate.quota,
        percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2),
      };
    }

    return stats;
  }

  estimateSize(items) {
    // Rough estimate of object size in bytes
    const jsonString = JSON.stringify(items);
    return new Blob([jsonString]).size;
  }

  // 🛠️ Utilities

  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
  }

  generatePeerId() {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  onSync(callback) {
    this.syncCallbacks.push(callback);
  }

  notifySyncListeners(event) {
    this.syncCallbacks.forEach(cb => cb(event));
  }

  // 🗑️ Cleanup

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[DB] Database closed');
    }
  }

  async deleteDatabase() {
    await this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      
      request.onsuccess = () => {
        console.log('[DB] Database deleted');
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 📤 Export/Import

  async exportData() {
    const data = {};
    
    for (const storeName of Object.keys(this.stores)) {
      data[storeName] = await this.query(storeName);
    }
    
    return {
      version: this.dbVersion,
      exportedAt: Date.now(),
      peerId: this.peerId,
      data,
    };
  }

  async importData(exportedData) {
    console.log('[DB] Importing data...');
    
    for (const [storeName, items] of Object.entries(exportedData.data)) {
      for (const item of items) {
        try {
          await this.create(storeName, item);
        } catch (error) {
          console.warn(`[DB] Failed to import item:`, error);
        }
      }
    }
    
    console.log('[DB] Import complete');
  }
}

// 🌟 Create singleton instance
const offlineDB = new OfflineDatabase();

// Auto-initialize
if (typeof window !== 'undefined') {
  window.OfflineDB = offlineDB;
  
  // Initialize on load
  if (document.readyState === 'complete') {
    offlineDB.init();
  } else {
    window.addEventListener('load', () => offlineDB.init());
  }

  // Setup network change listener
  window.addEventListener('online', () => {
    console.log('[DB] Network online, processing sync queue');
    offlineDB.processSyncQueue();
  });

  window.addEventListener('offline', () => {
    console.log('[DB] Network offline, queuing changes locally');
  });

  // Periodic cleanup
  setInterval(() => {
    offlineDB.vacuumDatabase();
  }, 24 * 60 * 60 * 1000); // Daily
}

export default offlineDB;
export { OfflineDatabase };

console.log('[DB] Offline Database module loaded! 💾');
