import React from 'react';

export interface ErrorMessageProps {
  titulo?: string;
  mensagem: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  titulo = 'Atenção',
  mensagem,
  onRetry,
  onClose,
}) => {
  return (
    <div
      role="alert"
      style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '0.5rem',
        padding: '1rem',
        margin: '0.5rem 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        color: '#991b1b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <strong style={{ fontSize: '0.95rem' }}>{titulo}</strong>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mensagem de erro"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#991b1b',
              fontSize: '1rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <p style={{ margin: 0, fontSize: '0.875rem', color: '#b91c1c' }}>
        {mensagem}
      </p>

      {onRetry && (
        <div style={{ marginTop: '0.25rem' }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorMessage;
