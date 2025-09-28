import { useState } from 'react';
import { DateTime } from 'luxon';
import { ViewMode } from './types.js';
import { useData } from './hooks/useData.js';
import { Header } from './components/Header.js';
import { Calendar } from './components/Calendar.js';
import { Tasks } from './components/Tasks.js';
import { RawDataPage } from './components/RawDataPage.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { ErrorMessage } from './components/ErrorMessage.js';

function App() {
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(DateTime.fromISO('2025-09-27')); // Set to September 2025 to see the events
  const [showRawData, setShowRawData] = useState(false);
  const { events, tasks, meta, loading, error, refresh } = useData(60000); // Refresh every minute

  const timezone = meta?.timezone || 'America/Toronto';

  // Debug logging
  console.log('🏠 App component data:', {
    eventsCount: events.length,
    tasksCount: tasks.length,
    meta: meta,
    loading,
    error,
    currentDate: currentDate.toISODate()
  });

  // Show raw data page if requested
  if (showRawData) {
    return (
      <RawDataPage
        onBack={() => setShowRawData(false)}
      />
    );
  }

  if (loading && events.length === 0 && tasks.length === 0) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a'
      }}>
        <LoadingSpinner size="lg" message="Loading calendar and tasks..." />
      </div>
    );
  }

  if (error && events.length === 0 && tasks.length === 0) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a'
      }}>
        <ErrorMessage error={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1a1a1a'
    }}>
      <Header
        meta={meta}
        currentDate={currentDate}
        onViewChange={setView}
        onDateChange={setCurrentDate}
        onShowRawData={() => setShowRawData(true)}
        view={view}
      />
      
      <main style={{
        flex: 1,
        display: 'flex',
        gap: '1rem',
        padding: '1rem',
        overflow: 'hidden'
      }}>
        <Calendar
          events={events}
          currentDate={currentDate}
          view={view}
          timezone={timezone}
        />
        
        <Tasks
          tasks={tasks}
          timezone={timezone}
        />
      </main>
      
      {loading && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: '#3b82f6',
          color: '#fff',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          zIndex: 1000
        }}>
          🔄 Refreshing data...
        </div>
      )}
      
    </div>
  );
}

export default App;
