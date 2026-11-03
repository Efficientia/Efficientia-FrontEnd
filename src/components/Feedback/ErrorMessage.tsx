import React from 'react';
import { AlertTriangleIcon, CloseIcon } from '../icons';

export interface ErrorMessageProps {
  titulo?: string;
  mensagem: string;
  onRetry?: () => void;
  onClose?: () => void;
  detalhes?: string;
}

/**
 * Componente para exibição de erros consistentes na aplicação.
 * 
 * Segue o padrão de Feedback e acessibilidade (role="alert").
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  titulo = 'Ocorreu um erro',
  mensagem,
  onRetry,
  onClose,
  detalhes,
}) => {
  return (
    <div
      role="alert"
      style={{
        padding: '1rem',
        borderRadius: '8px',
        backgroundColor: '#fee2e2',
        border: '1px solid #ef4444',
        color: '#991b1b',
        margin: '1rem 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
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
          <AlertTriangleIcon size={18} />
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
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      <p style={{ margin: 0, fontSize: '0.875rem', color: '#b91c1c' }}>
        {mensagem}
      </p>

      {detalhes && (
        <details
          style={{
            fontSize: '0.75rem',
            color: '#7f1d1d',
            cursor: 'pointer',
            marginTop: '0.25rem',
          }}
        >
          <summary>Detalhes técnicos</summary>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              backgroundColor: '#fecaca',
              padding: '0.5rem',
              borderRadius: '4px',
              marginTop: '0.25rem',
            }}
          >
            {detalhes}
          </pre>
        </details>
      )}

      {onRetry && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '0.4rem 0.8rem',
              fontSize: '0.875rem',
              fontWeight: 500,
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
