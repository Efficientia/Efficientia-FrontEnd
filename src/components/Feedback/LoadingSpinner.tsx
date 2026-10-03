import React from 'react';

export interface LoadingSpinnerProps {
  mensagem?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const SIZES = {
  sm: 20,
  md: 36,
  lg: 56,
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  mensagem = 'Carregando...',
  size = 'md',
  fullScreen = false,
}) => {
  const pixelSize = SIZES[size] || SIZES.md;

  const content = (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '1rem',
        color: '#1e3a8a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 50 50"
        style={{
          animation: 'efficientia-spin 1s linear infinite',
        }}
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="5"
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#2563eb"
          strokeWidth="5"
          strokeDasharray="80"
          strokeDashoffset="60"
        />
      </svg>
      {mensagem && (
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
          {mensagem}
        </span>
      )}
      <style>
        {`
          @keyframes efficientia-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
