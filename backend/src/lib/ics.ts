// Using built-in fetch (Node.js 18+)
import ical from 'node-ical';
import { DateTime } from 'luxon';
import { Event } from '../types.js';

export interface ICSConfig {
  url: string;
  timezone: string;
}

export class ICSService {
  private config: ICSConfig;
  private etag?: string;
  private lastModified?: string;

  constructor(config: ICSConfig) {
    this.config = config;
  }

  async fetchICS(): Promise<string> {
    if (!this.config.url) {
      throw new Error('ICS URL not configured');
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Kiosk-Calendar/1.0'
    };

    if (this.etag) {
      headers['If-None-Match'] = this.etag;
    }

    if (this.lastModified) {
      headers['If-Modified-Since'] = this.lastModified;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(this.config.url, {
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.status === 304) {
      throw new Error('Not Modified');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Update ETag and Last-Modified for next request
    const newEtag = response.headers.get('etag');
    const newLastModified = response.headers.get('last-modified');

    if (newEtag) {
      this.etag = newEtag;
    }

    if (newLastModified) {
      this.lastModified = newLastModified;
    }

    return await response.text();
  }

  parseICS(icsData: string): Event[] {
    const parsed = ical.parseICS(icsData);
    const events: Event[] = [];

    for (const key in parsed) {
      const component = parsed[key];
      
      if (component.type === 'VEVENT') {
        const event = component as any;
        
        // Skip all-day events that are too far in the past
        const startDate = this.parseDate(event.start);
        if (startDate && startDate < DateTime.now().minus({ days: 30 })) {
          continue;
        }

        const parsedEvent: Event = {
          id: event.uid || key,
          title: event.summary || 'Untitled Event',
          start: this.formatDate(event.start),
          location: event.location,
          sourceUrl: event.url
        };

        if (event.end) {
          parsedEvent.end = this.formatDate(event.end);
        }

        // Check if it's an all-day event
        if (event.start && event.start.length === 8) {
          parsedEvent.allDay = true;
        }

        events.push(parsedEvent);
      }
    }

    // Sort events by start date
    return events.sort((a, b) => a.start.localeCompare(b.start));
  }

  private parseDate(dateInput: any): DateTime | null {
    if (!dateInput) return null;

    let dateStr: string;
    if (typeof dateInput === 'string') {
      dateStr = dateInput;
    } else if (dateInput.toISOString) {
      dateStr = dateInput.toISOString();
    } else {
      return null;
    }

    try {
      // Handle different date formats from ICS
      if (dateStr.length === 8) {
        // YYYYMMDD format (all-day events)
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6));
        const day = parseInt(dateStr.substring(6, 8));
        return DateTime.fromObject({ year, month, day }, { zone: this.config.timezone });
      } else if (dateStr.includes('T')) {
        // ISO format with time
        return DateTime.fromISO(dateStr, { zone: this.config.timezone });
      } else {
        // Try parsing as ISO
        return DateTime.fromISO(dateStr, { zone: this.config.timezone });
      }
    } catch {
      return null;
    }
  }

  private formatDate(dateInput: any): string {
    const parsed = this.parseDate(dateInput);
    return parsed ? parsed.toISO()! : new Date().toISOString();
  }

  async fetchAndParseEvents(): Promise<Event[]> {
    try {
      const icsData = await this.fetchICS();
      return this.parseICS(icsData);
    } catch (error) {
      console.error('Error fetching ICS:', error);
      throw error;
    }
  }
}
