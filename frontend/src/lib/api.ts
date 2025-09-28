import { Event, Task, MetaResponse } from '../types.js';

const API_BASE = '/api';

export class ApiClient {
  private abortController: AbortController | null = null;

  constructor() {
  }

  private async fetchWithTimeout<T>(url: string, options: RequestInit = {}, timeout: number = 10000): Promise<T> {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => this.abortController?.abort(), timeout);

    try {
      console.log('Making request to:', url);
      const response = await fetch(url, {
        ...options,
        signal: this.abortController.signal
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async getEvents(): Promise<Event[]> {
    try {
      console.log('🔍 Fetching events from:', `${API_BASE}/calendar`);
      const result = await this.fetchWithTimeout<any>(`${API_BASE}/calendar`);
      console.log('✅ Raw response received:', result);
      
      // Handle different response formats
      let events: Event[] = [];
      if (Array.isArray(result)) {
        events = result;
      } else if (result && Array.isArray(result.value)) {
        events = result.value;
      } else if (result && Array.isArray(result.data)) {
        events = result.data;
      } else {
        console.warn('⚠️ Unexpected response format:', result);
        events = [];
      }
      
      console.log('✅ Events parsed:', events?.length || 0, 'events');
      console.log('📋 Events data:', events);
      return events || [];
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      return [];
    }
  }

  async getTasks(): Promise<Task[]> {
    try {
      console.log('🔍 Fetching tasks from:', `${API_BASE}/tasks`);
      const result = await this.fetchWithTimeout<any>(`${API_BASE}/tasks`);
      console.log('✅ Tasks raw response received:', result);
      
      // Handle different response formats
      let tasks: Task[] = [];
      if (Array.isArray(result)) {
        tasks = result;
      } else if (result && Array.isArray(result.value)) {
        tasks = result.value;
      } else if (result && Array.isArray(result.data)) {
        tasks = result.data;
      } else if (result && result.error) {
        console.log('⚠️ Tasks service not configured:', result.error);
        tasks = [];
      } else {
        console.warn('⚠️ Unexpected tasks response format:', result);
        tasks = [];
      }
      
      console.log('✅ Tasks parsed:', tasks?.length || 0, 'tasks');
      return tasks || [];
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      return [];
    }
  }

  async getMeta(): Promise<MetaResponse | null> {
    try {
      return await this.fetchWithTimeout<MetaResponse>(`${API_BASE}/meta`);
    } catch (error) {
      console.error('Error fetching meta:', error);
      return null;
    }
  }

  async refreshCache(): Promise<boolean> {
    try {
      await this.fetchWithTimeout(`${API_BASE}/admin/refresh`, { method: 'POST' });
      return true;
    } catch (error) {
      console.error('Error refreshing cache:', error);
      return false;
    }
  }

  destroy(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
