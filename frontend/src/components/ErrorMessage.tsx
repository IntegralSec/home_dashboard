
interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem',
      backgroundColor: '#7f1d1d',
      border: '1px solid #991b1b',
      borderRadius: '0.5rem',
      margin: '1rem'
    }}>
      <div style={{
        fontSize: '2rem'
      }}>
        ⚠️
      </div>
      
      <div style={{
        fontSize: '1rem',
        fontWeight: '500',
        color: '#fca5a5',
        textAlign: 'center'
      }}>
        {error}
      </div>
      
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#991b1b',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
