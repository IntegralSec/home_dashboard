import { useState } from 'react';
import { ApiClient } from '../lib/api.js';

interface RawDataPageProps {
  onBack: () => void;
}

interface ApiEndpoint {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  icon: string;
  color: string;
}

export function RawDataPage({ onBack }: RawDataPageProps) {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [endpointData, setEndpointData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiClient = new ApiClient();

  const endpoints: ApiEndpoint[] = [
    {
      name: 'Health Check',
      method: 'GET',
      path: '/api/health',
      description: 'Check if the backend service is running',
      icon: '❤️',
      color: '#10b981'
    },
    {
      name: 'Calendar Events',
      method: 'GET',
      path: '/api/calendar',
      description: 'Get calendar events from ICS feed',
      icon: '📅',
      color: '#3b82f6'
    },
    {
      name: 'Tasks',
      method: 'GET',
      path: '/api/tasks',
      description: 'Get tasks from Google Tasks API',
      icon: '✅',
      color: '#8b5cf6'
    },
    {
      name: 'Metadata',
      method: 'GET',
      path: '/api/meta',
      description: 'Get cache metadata and status',
      icon: 'ℹ️',
      color: '#f59e0b'
    },
    {
      name: 'Refresh Cache',
      method: 'POST',
      path: '/api/admin/refresh',
      description: 'Force refresh all cached data',
      icon: '🔄',
      color: '#ef4444'
    }
  ];

  const handleEndpointClick = async (endpoint: ApiEndpoint) => {
    const endpointKey = endpoint.path;
    
    if (expandedEndpoint === endpointKey) {
      // Collapse if already expanded
      setExpandedEndpoint(null);
      return;
    }

    // Expand and fetch data if not already loaded
    setExpandedEndpoint(endpointKey);
    
    if (endpointData[endpointKey]) {
      return; // Already have data
    }

    setLoading(prev => ({ ...prev, [endpointKey]: true }));
    setErrors(prev => ({ ...prev, [endpointKey]: '' }));

    try {
      let data: any;
      if (endpoint.method === 'GET') {
        if (endpoint.path === '/api/health') {
          data = await fetch(endpoint.path).then(res => res.json());
        } else if (endpoint.path === '/api/calendar') {
          data = await apiClient.getEvents();
        } else if (endpoint.path === '/api/tasks') {
          data = await apiClient.getTasks();
        } else if (endpoint.path === '/api/meta') {
          data = await apiClient.getMeta();
        }
      } else if (endpoint.method === 'POST') {
        if (endpoint.path === '/api/admin/refresh') {
          const response = await fetch(endpoint.path, { method: 'POST' });
          data = await response.json();
        }
      }

      setEndpointData(prev => ({ ...prev, [endpointKey]: data }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, [endpointKey]: errorMessage }));
      console.error(`Error fetching ${endpoint.path}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [endpointKey]: false }));
    }
  };

  const renderEndpointData = (endpoint: ApiEndpoint) => {
    const endpointKey = endpoint.path;
    const data = endpointData[endpointKey];
    const error = errors[endpointKey];
    const isLoading = loading[endpointKey];

    if (isLoading) {
      return (
        <div style={{
          padding: '1rem',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          <div style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '2px solid #374151',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '0.5rem'
          }} />
          Loading...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          padding: '1rem',
          backgroundColor: '#7f1d1d',
          border: '1px solid #991b1b',
          borderRadius: '0.5rem',
          color: '#fca5a5'
        }}>
          <strong>Error:</strong> {error}
        </div>
      );
    }

    if (!data) {
      return (
        <div style={{
          padding: '1rem',
          textAlign: 'center',
          color: '#9ca3af',
          fontStyle: 'italic'
        }}>
          Click to fetch data
        </div>
      );
    }

    // Create summary info for specific endpoints
    const getSummaryInfo = () => {
      if (endpointKey === '/api/calendar' && Array.isArray(data)) {
        return {
          type: 'calendar',
          count: data.length,
          hasData: data.length > 0
        };
      } else if (endpointKey === '/api/tasks' && Array.isArray(data)) {
        return {
          type: 'tasks',
          count: data.length,
          hasData: data.length > 0
        };
      } else if (endpointKey === '/api/meta' && data) {
        return {
          type: 'meta',
          hasData: true
        };
      } else if (endpointKey === '/api/health' && data) {
        return {
          type: 'health',
          hasData: true
        };
      } else if (endpointKey === '/api/admin/refresh' && data) {
        return {
          type: 'refresh',
          hasData: true
        };
      }
      return null;
    };

    const summaryInfo = getSummaryInfo();

    return (
      <div>
        {/* Summary header */}
        {summaryInfo && (
          <div style={{
            backgroundColor: '#1a1a1a',
            borderBottom: '1px solid #374151',
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem'
          }}>
            <div style={{
              color: '#9ca3af',
              fontWeight: '500'
            }}>
              {summaryInfo.type === 'calendar' && '📅 Calendar Events'}
              {summaryInfo.type === 'tasks' && '✅ Tasks'}
              {summaryInfo.type === 'meta' && 'ℹ️ Metadata'}
              {summaryInfo.type === 'health' && '❤️ Health Status'}
              {summaryInfo.type === 'refresh' && '🔄 Cache Refresh'}
            </div>
            <div style={{
              color: summaryInfo.hasData ? '#10b981' : '#ef4444',
              fontWeight: '600',
              backgroundColor: summaryInfo.hasData ? '#065f46' : '#7f1d1d',
              padding: '0.25rem 0.75rem',
              borderRadius: '0.375rem',
              border: `1px solid ${summaryInfo.hasData ? '#059669' : '#991b1b'}`
            }}>
              {summaryInfo.type === 'calendar' && `${summaryInfo.count} event${summaryInfo.count !== 1 ? 's' : ''} received`}
              {summaryInfo.type === 'tasks' && `${summaryInfo.count} task${summaryInfo.count !== 1 ? 's' : ''} received`}
              {summaryInfo.type === 'meta' && 'Metadata available'}
              {summaryInfo.type === 'health' && 'Service healthy'}
              {summaryInfo.type === 'refresh' && 'Refresh completed'}
            </div>
          </div>
        )}

        {/* Raw JSON data */}
        <pre style={{
          backgroundColor: '#1f2937',
          color: '#e5e5e5',
          padding: '1rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          overflow: 'auto',
          maxHeight: '400px',
          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
          margin: 0
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#0f0f0f',
      color: '#e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Add CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <header style={{
        backgroundColor: '#1a1a1a',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #374151',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <button
          onClick={onBack}
          style={{
            backgroundColor: '#374151',
            color: '#e5e5e5',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ← Back to Calendar
        </button>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          margin: 0,
          color: '#e5e5e5'
        }}>
          Live API Explorer
        </h1>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '1.5rem',
        overflow: 'auto'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <p style={{
            color: '#9ca3af',
            marginBottom: '2rem',
            fontSize: '1rem',
            lineHeight: '1.6'
          }}>
            Click on any endpoint below to make a live API request and view the raw response data.
          </p>

          {endpoints.map((endpoint) => {
            const isExpanded = expandedEndpoint === endpoint.path;
            const hasData = endpointData[endpoint.path];
            const hasError = errors[endpoint.path];

            return (
              <div key={endpoint.path} style={{
                marginBottom: '1rem',
                backgroundColor: '#1a1a1a',
                borderRadius: '0.5rem',
                border: '1px solid #374151',
                overflow: 'hidden'
              }}>
                {/* Endpoint Header */}
                <button
                  onClick={() => handleEndpointClick(endpoint)}
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    color: '#e5e5e5',
                    border: 'none',
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{endpoint.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          backgroundColor: endpoint.color,
                          color: '#ffffff',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          fontFamily: 'Monaco, Consolas, monospace'
                        }}>
                          {endpoint.method}
                        </span>
                        <span style={{ fontFamily: 'Monaco, Consolas, monospace', color: '#3b82f6' }}>
                          {endpoint.path}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#9ca3af',
                        marginTop: '0.25rem'
                      }}>
                        {endpoint.description}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#9ca3af'
                  }}>
                    {hasData && !hasError && (
                      <span style={{ color: '#10b981' }}>✓ Data loaded</span>
                    )}
                    {hasError && (
                      <span style={{ color: '#ef4444' }}>✗ Error</span>
                    )}
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </button>

                {/* Endpoint Content */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid #374151',
                    backgroundColor: '#111111'
                  }}>
                    {renderEndpointData(endpoint)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}