import { DateTime } from 'luxon';
import { MetaResponse } from '../types.js';

interface HeaderProps {
  meta: MetaResponse | null;
  currentDate: DateTime;
  onViewChange: (view: 'month' | 'week' | 'day') => void;
  onDateChange: (date: DateTime) => void;
  onShowRawData: () => void;
  view: 'month' | 'week' | 'day';
}

export function Header({ meta, currentDate, onViewChange, onDateChange, onShowRawData, view }: HeaderProps) {
  const getStatusColor = () => {
    if (!meta) return '#6b7280';
    const isCalendarStale = meta.calendar.stale;
    
    if (isCalendarStale) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  const getStatusText = () => {
    if (!meta) return 'Unknown';
    const isCalendarStale = meta.calendar.stale;
    
    if (isCalendarStale) return 'Stale';
    return 'Fresh';
  };

  const getLastSync = () => {
    if (!meta) return 'Unknown';
    
    const calendarTime = DateTime.fromMillis(meta.calendar.timestamp);
    const tasksTime = DateTime.fromMillis(meta.tasks.timestamp);
    const lastSync = calendarTime > tasksTime ? calendarTime : tasksTime;
    
    return lastSync.toFormat('HH:mm');
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.25rem 2rem',
      backgroundColor: '#2d2d2d',
      borderBottom: '1px solid #404040',
      fontSize: '1.125rem',
      fontWeight: '500',
      minHeight: '80px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '3rem',
        flex: 1
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            onClick={() => onDateChange(currentDate.minus({ months: 1 }))}
            style={{
              padding: '0.5rem',
              border: '2px solid #404040',
              borderRadius: '0.375rem',
              backgroundColor: '#404040',
              color: '#e5e5e5',
              fontSize: '1.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Previous month"
          >
            ‹
          </button>
          
          <button
            onClick={() => onDateChange(DateTime.now())}
            style={{
              padding: '0.5rem 1rem',
              border: '2px solid #404040',
              borderRadius: '0.375rem',
              backgroundColor: '#404040',
              color: '#e5e5e5',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Go to today"
          >
            Today
          </button>
          
          <button
            onClick={() => onDateChange(currentDate.plus({ months: 1 }))}
            style={{
              padding: '0.5rem',
              border: '2px solid #404040',
              borderRadius: '0.375rem',
              backgroundColor: '#404040',
              color: '#e5e5e5',
              fontSize: '1.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Next month"
          >
            ›
          </button>
        </div>
        
        <h1 style={{ 
          fontSize: '1.75rem', 
          fontWeight: '700', 
          color: '#e5e5e5',
          margin: 0,
          letterSpacing: '0.025em'
        }}>
          {currentDate.toFormat('MMMM yyyy')}
        </h1>
        
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          {(['month', 'week', 'day'] as const).map((viewMode) => (
            <button
              key={viewMode}
              onClick={() => onViewChange(viewMode)}
              style={{
                padding: '0.75rem 1.25rem',
                border: '2px solid #404040',
                borderRadius: '0.5rem',
                backgroundColor: view === viewMode ? '#3b82f6' : '#404040',
                color: view === viewMode ? '#fff' : '#e5e5e5',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
                minWidth: '70px',
                textAlign: 'center'
              }}
            >
              {viewMode}
            </button>
          ))}
        </div>
      </div>
      
      {/* Stale data notification in the center */}
      {meta && meta.calendar.stale && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#f59e0b',
          color: '#fff',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          zIndex: 10,
          border: '2px solid #d97706',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          whiteSpace: 'nowrap'
        }}>
          ⚠️ Showing stale data
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '2rem', 
        fontSize: '0.875rem',
        flexShrink: 0
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          backgroundColor: '#1a1a1a',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #404040'
        }}>
          <div style={{
            width: '0.875rem',
            height: '0.875rem',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            flexShrink: 0
          }} />
          <span style={{ 
            color: '#e5e5e5',
            fontWeight: '500'
          }}>
            {getStatusText()}
          </span>
        </div>
        
        <div style={{ 
          color: '#9ca3af',
          fontSize: '0.875rem',
          fontWeight: '500',
          backgroundColor: '#1a1a1a',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #404040',
          whiteSpace: 'nowrap'
        }}>
          Last sync: {getLastSync()}
        </div>
        
        <button
          onClick={onShowRawData}
          style={{
            padding: '0.5rem 1rem',
            border: '2px solid #6b7280',
            borderRadius: '0.375rem',
            backgroundColor: '#374151',
            color: '#e5e5e5',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          title="View raw calendar data from backend"
        >
          📊 Raw Data
        </button>
      </div>
    </header>
  );
}
