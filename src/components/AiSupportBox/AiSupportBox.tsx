import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAiChat } from '../../hooks/useAiChat';
import { useAuth } from '../../hooks/useAuth';
import type { AgentRoute, ChatMessage } from '../../types/ai';
import './AiSupportBox.css';

export interface AiSupportBoxProps {
  readonly initialOpen?: boolean;
}

export const AiSupportBox: React.FC<AiSupportBoxProps> = ({ initialOpen = false }) => {
  const { user } = useAuth();

  const userId = user?.nome || user?.cpf || 'operador_web';
  const {
    messages,
    isLoading,
    sendMessage,
    resetSession,
  } = useAiChat({ userId });

  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [inputText, setInputText] = useState<string>('');

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const titleId = useId();
  const inputId = useId();

  // Rola o feed para a última mensagem automaticamente
  useEffect(() => {
    if (isOpen && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  // Foco no textarea ao abrir o diálogo e retorno ao trigger ao fechar
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Fechar com Escape quando o diálogo estiver aberto
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleReset = useCallback((): void => {
    resetSession();
    textareaRef.current?.focus();
  }, [resetSession]);

  const handleSend = useCallback(async (): Promise<void> => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    setInputText('');
    await sendMessage(trimmed);
  }, [inputText, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );


  return (
    <>
      {/* Botão Flutuante (Trigger) */}
      <button
        ref={triggerRef}
        type="button"
        className="ai-support-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Assistente Virtual Efficientia"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="12" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
        </svg>
        <span className="ai-support-trigger-badge" aria-hidden="true" />
      </button>

      {/* Caixa Flutuante (Diálogo) */}
      {isOpen && (
        <section
          ref={dialogRef}
          role="dialog"
          aria-label="Assistente Virtual Efficientia"
          aria-labelledby={titleId}
          aria-modal="false"
          className="ai-support-dialog"
        >
          {/* Header */}
          <header className="ai-support-header">
            <div className="ai-support-header-info">
              <div className="ai-support-avatar" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                  <rect x="3" y="8" width="18" height="12" rx="4" />
                  <circle cx="8" cy="14" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="14" r="1.5" fill="currentColor" />
                </svg>
                <span className="ai-support-status-dot" />
              </div>
              <div className="ai-support-title-group">
                <h2 id={titleId} className="ai-support-title">
                  Cinttia — Assistente IA
                </h2>
                <span className="ai-support-status-text">
                  Online • Efficientia Bot
                </span>
              </div>
            </div>

            <div className="ai-support-header-actions">
              <button
                type="button"
                className="ai-support-icon-btn"
                onClick={handleReset}
                title="Nova Conversa"
                aria-label="Iniciar nova conversa"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>

              <button
                type="button"
                className="ai-support-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Fechar"
                aria-label="Fechar assistente virtual"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          {/* Feed de Mensagens */}
          <div
            ref={feedRef}
            className="ai-support-feed"
            tabIndex={0}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Histórico de mensagens"
          >
            {messages.map((msg: ChatMessage) => {
              const isError = Boolean(msg.isError);

              return (
                <div
                  key={msg.id}
                  className={`ai-support-msg-row ai-support-msg-${msg.sender}`}
                >
                  <div
                    className={`ai-support-bubble ai-support-bubble-${msg.sender} ${
                      isError ? 'ai-support-bubble-error' : ''
                    }`}
                  >
                    {msg.text}
                  </div>

                  <div className="ai-support-msg-meta">
                    <span className="ai-support-msg-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Badges de Agentes Chamados */}
                  {msg.agentesChamados && msg.agentesChamados.length > 0 && (
                    <div
                      className="ai-support-badges"
                      aria-label="Agentes chamados"
                    >
                      {msg.agentesChamados.map((agente: AgentRoute) => (
                        <span key={agente} className="ai-support-badge">
                          {agente}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div
                className="ai-support-typing"
                role="status"
                aria-live="polite"
              >
                <div className="ai-support-dots" aria-hidden="true">
                  <span className="ai-support-dot" />
                  <span className="ai-support-dot" />
                  <span className="ai-support-dot" />
                </div>
                <span>Cinttia está formulando a resposta...</span>
              </div>
            )}
          </div>

          {/* Footer / Input Bar */}
          <footer className="ai-support-footer">
            <form
              className="ai-support-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
            >
              <label htmlFor={inputId} className="visually-hidden" style={{ display: 'none' }}>
                Digite sua dúvida ou comando
              </label>
              <textarea
                id={inputId}
                ref={textareaRef}
                rows={1}
                className="ai-support-textarea"
                placeholder="Pergunte à Cinttia..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                aria-label="Mensagem para a assistente Cinttia"
              />

              <button
                type="submit"
                className="ai-support-send-btn"
                disabled={isLoading || !inputText.trim()}
                title="Enviar mensagem"
                aria-label="Enviar mensagem"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>

            <span className="ai-support-hint">
              Enter para enviar • Shift + Enter para quebra de linha
            </span>
          </footer>
        </section>
      )}
    </>
  );
};

export default AiSupportBox;
