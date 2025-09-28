import { DateTime } from 'luxon';
import { Event, ViewMode } from '../types.js';

interface CalendarProps {
  events: Event[];
  currentDate: DateTime;
  view: ViewMode;
  timezone: string;
}

export function Calendar({ events, currentDate, view, timezone }: CalendarProps) {
  console.log('🗓️ Calendar component received:', {
    eventsCount: events.length,
    currentDate: currentDate.toISODate(),
    view,
    timezone,
    events: events.slice(0, 3) // Show first 3 events for debugging
  });

  const renderMonthView = () => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startOfWeek = startOfMonth.startOf('week');
    const endOfWeek = endOfMonth.endOf('week');

    const weeks = [];
    let current = startOfWeek;

    while (current <= endOfWeek) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const day = current.plus({ days: i });
        const dayEvents = events.filter(event => {
          const eventDate = DateTime.fromISO(event.start, { zone: timezone });
          const hasSameDay = eventDate.hasSame(day, 'day');
          
          // Debug logging for September 27th
          if (day.toISODate() === '2025-09-27') {
            console.log('🔍 Debugging Sep 27:', {
              day: day.toISODate(),
              eventTitle: event.title,
              eventStart: event.start,
              eventDate: eventDate.toISODate(),
              hasSameDay,
              timezone
            });
          }
          
          return hasSameDay;
        });

        week.push(
          <div
            key={day.toISODate()}
          style={{
            flex: 1,
            minHeight: '140px',
            border: '1px solid #404040',
            padding: '0.75rem 0.5rem',
            backgroundColor: day.hasSame(currentDate, 'month') ? '#2d2d2d' : '#1a1a1a',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0
          }}
          >
            <div style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: day.hasSame(DateTime.now(), 'day') ? '#60a5fa' : '#e5e5e5',
              marginBottom: '0.5rem',
              flexShrink: 0,
              textAlign: 'center'
            }}>
              {day.day}
            </div>
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.25rem',
              overflow: 'hidden'
            }}>
              {dayEvents.slice(0, 3).map(event => (
                <div
                  key={event.id}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.375rem 0.5rem',
                    backgroundColor: '#1e3a8a',
                    borderRadius: '0.375rem',
                    color: '#93c5fd',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    border: '1px solid #3b82f6',
                    flexShrink: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title={`${event.title}${event.location ? ` - ${event.location}` : ''}${event.allDay ? ' (All Day)' : ` (${DateTime.fromISO(event.start).toFormat('HH:mm')} - ${event.end ? DateTime.fromISO(event.end).toFormat('HH:mm') : '?'})`}`}
                >
                  {event.allDay ? (
                    <span style={{ fontWeight: '600' }}>📅 {event.title}</span>
                  ) : (
                    <span><strong>{DateTime.fromISO(event.start).toFormat('HH:mm')}</strong> {event.title}</span>
                  )}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  fontStyle: 'italic'
                }}>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      }
      weeks.push(
        <div key={current.toISODate()} style={{ 
          display: 'flex', 
          flex: 1,
          borderBottom: '1px solid #404040'
        }}>
          {week}
        </div>
      );
      current = current.plus({ weeks: 1 });
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex',
          backgroundColor: '#404040',
          borderBottom: '2px solid #404040',
          flexShrink: 0
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              style={{
                flex: 1,
                padding: '1rem 0.75rem',
                textAlign: 'center',
                fontWeight: '600',
                color: '#e5e5e5',
                fontSize: '1rem',
                minWidth: 0
              }}
            >
              {day}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {weeks}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = currentDate.startOf('week');
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = startOfWeek.plus({ days: i });
      const dayEvents = events.filter(event => {
        const eventDate = DateTime.fromISO(event.start, { zone: timezone });
        return eventDate.hasSame(day, 'day');
      });

      days.push(
        <div
          key={day.toISODate()}
          style={{
            flex: 1,
            border: '1px solid #404040',
            padding: '1rem',
            backgroundColor: '#2d2d2d'
          }}
        >
          <div style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: day.hasSame(DateTime.now(), 'day') ? '#60a5fa' : '#e5e5e5',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{day.toFormat('EEE, MMM d')}</span>
            {dayEvents.length > 0 && (
              <span style={{
                fontSize: '0.75rem',
                color: '#60a5fa',
                fontWeight: '500',
                backgroundColor: '#1e3a8a',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem'
              }}>
                {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {dayEvents.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.875rem',
                fontStyle: 'italic',
                padding: '1rem 0.5rem'
              }}>
                No events for {day.toFormat('MMM d')}
              </div>
            ) : (
              dayEvents.map(event => (
                <div
                  key={event.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#1e3a8a',
                    borderRadius: '0.5rem',
                    borderLeft: '4px solid #3b82f6',
                    border: '1px solid #3b82f6',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#e5e5e5',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    lineHeight: '1.3'
                  }}>
                    {event.allDay ? '📅' : '🕐'} <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{event.title}</span>
                  </div>
                  {!event.allDay && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      fontWeight: '500',
                      marginBottom: '0.25rem'
                    }}>
                      {DateTime.fromISO(event.start).toFormat('HH:mm')}
                      {event.end && ` - ${DateTime.fromISO(event.end).toFormat('HH:mm')}`}
                    </div>
                  )}
                  {event.location && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      📍 {event.location}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ 
        display: 'flex', 
        flex: 1,
        overflow: 'hidden'
      }}>
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = events.filter(event => {
      const eventDate = DateTime.fromISO(event.start, { zone: timezone });
      return eventDate.hasSame(currentDate, 'day');
    });

    return (
      <div style={{ 
        padding: '1.5rem', 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#e5e5e5',
          marginBottom: '1.5rem',
          textAlign: 'center',
          flexShrink: 0
        }}>
          {currentDate.toFormat('EEEE, MMMM d, yyyy')}
        </div>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          overflow: 'auto'
        }}>
          {dayEvents.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '1rem',
              padding: '2rem'
            }}>
              No events scheduled for this day
            </div>
          ) : (
            dayEvents.map(event => (
              <div
                key={event.id}
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#1e3a8a',
                  borderRadius: '0.75rem',
                  borderLeft: '6px solid #3b82f6',
                  border: '1px solid #3b82f6',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#93c5fd',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  {event.allDay ? '📅' : '🕐'} {event.title}
                </div>
                
                {!event.allDay && (
                  <div style={{
                    fontSize: '1rem',
                    color: '#e5e5e5',
                    marginBottom: '0.75rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    ⏰ {DateTime.fromISO(event.start).toFormat('HH:mm')}
                    {event.end && ` - ${DateTime.fromISO(event.end).toFormat('HH:mm')}`}
                  </div>
                )}
                
                {event.location && (
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📍 {event.location}
                  </div>
                )}
                
                {event.sourceUrl && (
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginTop: '0.5rem'
                  }}>
                    🔗 <a 
                      href={event.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        color: '#60a5fa',
                        textDecoration: 'none',
                        fontWeight: '500'
                      }}
                    >
                      View in Google Calendar
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      flex: 1, 
      backgroundColor: '#2d2d2d', 
      border: '1px solid #404040',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Event count display */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #404040',
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{
          fontSize: '0.875rem',
          color: '#9ca3af',
          fontWeight: '500'
        }}>
          📅 Calendar Events
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: events.length > 0 ? '#10b981' : '#ef4444',
          fontWeight: '600',
          backgroundColor: events.length > 0 ? '#065f46' : '#7f1d1d',
          padding: '0.25rem 0.75rem',
          borderRadius: '0.375rem',
          border: `1px solid ${events.length > 0 ? '#059669' : '#991b1b'}`
        }}>
          {events.length} event{events.length !== 1 ? 's' : ''} received
        </div>
      </div>
      
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
    </div>
  );
}
