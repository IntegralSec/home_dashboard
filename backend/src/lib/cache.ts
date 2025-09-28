import fs from 'fs-extra';
import path from 'path';
import { Event, Task, CacheMetadata } from '../types.js';

export class CacheManager {
  private dataDir: string;
  private ttlSeconds: number;

  constructor(dataDir: string, ttlSeconds: number) {
    this.dataDir = dataDir;
    this.ttlSeconds = ttlSeconds;
  }

  async ensureDataDir(): Promise<void> {
    await fs.ensureDir(this.dataDir);
  }

  private getCachePath(type: 'calendar' | 'tasks'): string {
    return path.join(this.dataDir, `${type}.json`);
  }

  private getLockPath(type: 'calendar' | 'tasks'): string {
    return path.join(this.dataDir, `${type}.lock`);
  }

  async isLocked(type: 'calendar' | 'tasks'): Promise<boolean> {
    const lockPath = this.getLockPath(type);
    try {
      const stats = await fs.stat(lockPath);
      // If lock file is older than 15 seconds, consider it stale
      const age = Date.now() - stats.mtime.getTime();
      return age < 15000;
    } catch {
      return false;
    }
  }

  async acquireLock(type: 'calendar' | 'tasks'): Promise<boolean> {
    if (await this.isLocked(type)) {
      return false;
    }
    
    const lockPath = this.getLockPath(type);
    await fs.writeFile(lockPath, JSON.stringify({ timestamp: Date.now() }));
    return true;
  }

  async releaseLock(type: 'calendar' | 'tasks'): Promise<void> {
    const lockPath = this.getLockPath(type);
    try {
      await fs.remove(lockPath);
    } catch {
      // Ignore errors when removing lock
    }
  }

  async isCacheFresh(type: 'calendar' | 'tasks'): Promise<boolean> {
    const cachePath = this.getCachePath(type);
    try {
      const stats = await fs.stat(cachePath);
      const age = Date.now() - stats.mtime.getTime();
      return age < this.ttlSeconds * 1000;
    } catch {
      return false;
    }
  }

  async getCacheMetadata(type: 'calendar' | 'tasks'): Promise<CacheMetadata> {
    const cachePath = this.getCachePath(type);
    try {
      const stats = await fs.stat(cachePath);
      const age = Date.now() - stats.mtime.getTime();
      return {
        timestamp: stats.mtime.getTime(),
        stale: age >= this.ttlSeconds * 1000,
        ttl: this.ttlSeconds * 1000
      };
    } catch {
      return {
        timestamp: 0,
        stale: true,
        ttl: this.ttlSeconds * 1000
      };
    }
  }

  async getEvents(): Promise<Event[]> {
    const cachePath = this.getCachePath('calendar');
    try {
      const data = await fs.readJson(cachePath);
      return data.events || [];
    } catch {
      return [];
    }
  }

  async setEvents(events: Event[]): Promise<void> {
    const cachePath = this.getCachePath('calendar');
    await fs.writeJson(cachePath, { events, timestamp: Date.now() });
  }

  async getTasks(): Promise<Task[]> {
    const cachePath = this.getCachePath('tasks');
    try {
      const data = await fs.readJson(cachePath);
      return data.tasks || [];
    } catch {
      return [];
    }
  }

  async setTasks(tasks: Task[]): Promise<void> {
    const cachePath = this.getCachePath('tasks');
    await fs.writeJson(cachePath, { tasks, timestamp: Date.now() });
  }
}
