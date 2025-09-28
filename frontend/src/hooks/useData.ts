import { useState, useEffect, useCallback, useMemo } from 'react';
import { Event, Task, MetaResponse } from '../types.js';
import { ApiClient } from '../lib/api.js';

interface UseDataReturn {
  events: Event[];
  tasks: Task[];
  meta: MetaResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useData(refreshInterval: number = 60000): UseDataReturn {
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiClient = useMemo(() => new ApiClient(), []);

  const fetchData = useCallback(async () => {
    try {
      console.log('🚀 Starting data fetch...');
      setError(null);
      
      const [eventsData, tasksData, metaData] = await Promise.all([
        apiClient.getEvents(),
        apiClient.getTasks(),
        apiClient.getMeta()
      ]);

      console.log('📊 Data fetch results:', {
        events: eventsData?.length || 0,
        tasks: tasksData?.length || 0,
        meta: metaData ? 'present' : 'null'
      });

      console.log('🔍 Raw events data:', eventsData);
      console.log('🔍 Raw meta data:', metaData);

      setEvents(eventsData);
      setTasks(tasksData);
      setMeta(metaData);
      setLoading(false);
      console.log('✅ Data fetch completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);
      console.error('❌ Error fetching data:', err);
    }
  }, [apiClient]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, refreshInterval);

    return () => {
      clearInterval(interval);
      apiClient.destroy();
    };
  }, [fetchData, refreshInterval, apiClient]);

  return {
    events,
    tasks,
    meta,
    loading,
    error,
    refresh
  };
}
