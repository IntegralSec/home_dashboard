export interface Event {
  id: string;
  title: string;
  start: string;       // ISO8601 in TIMEZONE
  end?: string;        // ISO8601 in TIMEZONE
  allDay?: boolean;
  location?: string;
  sourceUrl?: string;  // optional html link if available
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  notes?: string;
  due?: string;        // ISO8601 (date or datetime)
  status: 'needsAction' | 'completed';
  completedAt?: string;
  updated: string;     // ISO8601
}

export interface CacheMetadata {
  timestamp: number;
  stale: boolean;
  ttl: number;
}

export interface MetaResponse {
  calendar: CacheMetadata;
  tasks: CacheMetadata;
  timezone: string;
  nextRefresh: number;
}

export type ViewMode = 'month' | 'week' | 'day';
