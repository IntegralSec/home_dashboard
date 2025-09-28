import { DateTime } from 'luxon';
import { Task } from '../types.js';

interface TasksProps {
  tasks: Task[];
  timezone: string;
}

export function Tasks({ tasks, timezone }: TasksProps) {
  const now = DateTime.now().setZone(timezone);
  const today = now.startOf('day');

  const upcomingTasks = tasks.filter(task => 
    task.status === 'needsAction' && 
    (!task.due || DateTime.fromISO(task.due).setZone(timezone) >= today)
  ).sort((a, b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return DateTime.fromISO(a.due).setZone(timezone).diff(DateTime.fromISO(b.due).setZone(timezone)).milliseconds;
  });

  const completedTasks = tasks.filter(task => 
    task.status === 'completed'
  ).sort((a, b) => {
    const aCompleted = a.completedAt ? DateTime.fromISO(a.completedAt) : DateTime.fromISO(a.updated);
    const bCompleted = b.completedAt ? DateTime.fromISO(b.completedAt) : DateTime.fromISO(b.updated);
    return bCompleted.diff(aCompleted).milliseconds;
  }).slice(0, 10); // Show only recent 10 completed tasks

  const getDueStatus = (task: Task) => {
    if (!task.due) return { color: '#6b7280', text: 'No due date' };
    
    const dueDate = DateTime.fromISO(task.due).setZone(timezone);
    const daysDiff = dueDate.diff(today, 'days').days;
    
    if (daysDiff < 0) return { color: '#dc2626', text: `Overdue by ${Math.abs(Math.floor(daysDiff))} days` };
    if (daysDiff === 0) return { color: '#f59e0b', text: 'Due today' };
    if (daysDiff === 1) return { color: '#f59e0b', text: 'Due tomorrow' };
    if (daysDiff <= 7) return { color: '#f59e0b', text: `Due in ${Math.floor(daysDiff)} days` };
    return { color: '#10b981', text: dueDate.toFormat('MMM d') };
  };

  const getCompletedTime = (task: Task) => {
    if (!task.completedAt) return DateTime.fromISO(task.updated).toRelative();
    
    const completed = DateTime.fromISO(task.completedAt).setZone(timezone);
    const daysDiff = today.diff(completed.startOf('day'), 'days').days;
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff <= 7) return `${daysDiff} days ago`;
    return completed.toFormat('MMM d');
  };

  return (
    <div style={{
      width: '400px',
      backgroundColor: '#2d2d2d',
      border: '1px solid #404040',
      borderRadius: '0.5rem',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      overflowY: 'auto'
    }}>
      {/* Upcoming Tasks */}
      <div>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#e5e5e5',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          📋 Upcoming Tasks
          <span style={{
            backgroundColor: '#1e3a8a',
            color: '#93c5fd',
            fontSize: '0.75rem',
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            fontWeight: '500'
          }}>
            {upcomingTasks.length}
          </span>
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {upcomingTasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '0.875rem',
              padding: '1rem',
              backgroundColor: '#1a1a1a',
              borderRadius: '0.375rem'
            }}>
              No upcoming tasks
            </div>
          ) : (
            upcomingTasks.map(task => {
              const dueStatus = getDueStatus(task);
              return (
                <div
                  key={task.id}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '0.375rem',
                    border: '1px solid #404040'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      border: '2px solid #404040',
                      borderRadius: '0.25rem',
                      marginTop: '0.125rem',
                      flexShrink: 0
                    }} />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#e5e5e5',
                        marginBottom: '0.25rem'
                      }}>
                        {task.title}
                      </div>
                      
                      {task.notes && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                          marginBottom: '0.25rem',
                          lineHeight: '1.4'
                        }}>
                          {task.notes}
                        </div>
                      )}
                      
                      <div style={{
                        fontSize: '0.75rem',
                        color: dueStatus.color,
                        fontWeight: '500'
                      }}>
                        {dueStatus.text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Completed Tasks */}
      <div>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#e5e5e5',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          ✅ Completed
          <span style={{
            backgroundColor: '#064e3b',
            color: '#6ee7b7',
            fontSize: '0.75rem',
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            fontWeight: '500'
          }}>
            {completedTasks.length}
          </span>
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {completedTasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '0.875rem',
              padding: '1rem',
              backgroundColor: '#1a1a1a',
              borderRadius: '0.375rem'
            }}>
              No completed tasks
            </div>
          ) : (
            completedTasks.map(task => (
              <div
                key={task.id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#064e3b',
                  borderRadius: '0.375rem',
                  border: '1px solid #059669'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    backgroundColor: '#059669',
                    borderRadius: '0.25rem',
                    marginTop: '0.125rem',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: '#fff', fontSize: '0.75rem' }}>✓</span>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#e5e5e5',
                      marginBottom: '0.25rem',
                      textDecoration: 'line-through',
                      opacity: 0.7
                    }}>
                      {task.title}
                    </div>
                    
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6ee7b7',
                      fontWeight: '500'
                    }}>
                      Completed {getCompletedTime(task)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
