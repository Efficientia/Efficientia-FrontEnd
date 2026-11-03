import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAiChat } from '../../hooks/useAiChat';
import {
  CinttiaIcon,
  CloseIcon,
  SendIcon,
  ResetIcon,
  AlertTriangleIcon,
} from '../icons';
import './CinttiaChatWidget.css';

interface CinttiaChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_SUGGESTIONS: readonly string[] = [
  'Qual a documentação obrigatória da viagem (GTA/Nota)?',
  'Como agir em caso de parada imprevista?',
  'Quais as regras de bem-estar animal no transporte?',
];

export const CinttiaChatWidget: React.FC<CinttiaChatWidgetProps> = ({ isOpen, onClose }) => {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    resetSession,
  } = useAiChat();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Foco no input ao abrir o widget
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? inputMessage).trim();
      if (!text || isLoading) return;

      setInputMessage('');
      await sendMessage(text);
    },
    [inputMessage, isLoading, sendMessage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSend();
  };

  if (!isOpen) return null;

  return (
    <aside
      className="cinttia-chat-widget"
      role="dialog"
      aria-labelledby="cinttia-widget-title"
      aria-modal="false"
    >
      {/* CABEÇALHO DO CHAT */}
      <header className="cinttia-chat-header">
        <div className="cinttia-chat-header-info">
          <div className="cinttia-avatar-badge">
            <CinttiaIcon size={20} stroke="#ffffff" fill="#ffffff" />
            <span className="cinttia-status-dot" title="Online" />
          </div>
          <div>
            <h3 id="cinttia-widget-title" className="cinttia-title">
              Cinttia
            </h3>
            <span className="cinttia-subtitle">Assistente Virtual Efficientia</span>
          </div>
        </div>

        <div className="cinttia-header-actions">
          <button
            type="button"
            className="cinttia-header-btn"
            onClick={resetSession}
            title="Reiniciar conversa / Nova sessão"
            aria-label="Reiniciar conversa"
          >
            <ResetIcon size={14} />
          </button>
          <button
            type="button"
            className="cinttia-header-btn cinttia-close-btn"
            onClick={onClose}
            title="Fechar chat"
            aria-label="Fechar janela do chat"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </header>

      {/* HISTÓRICO DE MENSAGENS */}
      <div
        className="cinttia-messages-viewport"
        role="log"
        aria-live="polite"
        aria-label="Histórico de mensagens"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isError = msg.isError;

          return (
            <div
              key={msg.id}
              className={`cinttia-msg-row ${isUser ? 'msg-row-user' : 'msg-row-assistant'}`}
            >
              {!isUser && (
                <div className="cinttia-msg-avatar" aria-hidden="true">
                  <CinttiaIcon size={14} stroke="#ffffff" fill="#ffffff" />
                </div>
              )}

              <div
                className={`cinttia-msg-bubble ${
                  isUser ? 'msg-bubble-user' : isError ? 'msg-bubble-error' : 'msg-bubble-assistant'
                }`}
              >
                {isError && (
                  <div className="msg-error-label">
                    <AlertTriangleIcon size={13} />
                    <span>Falha de comunicação</span>
                  </div>
                )}
                <p className="cinttia-msg-text">{msg.text}</p>
                <span className="cinttia-msg-time">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {/* Indicador de digitando / processando */}
        {isLoading && (
          <div className="cinttia-msg-row msg-row-assistant">
            <div className="cinttia-msg-avatar" aria-hidden="true">
              <CinttiaIcon size={14} stroke="#ffffff" fill="#ffffff" />
            </div>
            <div className="cinttia-typing-bubble" aria-label="Cinttia está respondendo...">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {/* Sugestões rápidas no início ou quando houver poucas mensagens */}
        {messages.length <= 2 && !isLoading && (
          <div className="cinttia-suggestions-box">
            <span className="suggestions-title">Sugestões rápidas:</span>
            <div className="suggestions-chips">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => void handleSend(suggestion)}
                >
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} tabIndex={-1} />
      </div>

      {error && !isLoading && (
        <div className="cinttia-error-banner" role="alert">
          <AlertTriangleIcon size={13} />
          <span>{error}</span>
        </div>
      )}

      {/* COMPOSER / FORMULÁRIO DE ENVIO */}
      <form onSubmit={handleSubmit} className="cinttia-chat-footer">
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isLoading ? 'Aguarde a resposta...' : 'Tire sua dúvida com a Cinttia...'}
          className="cinttia-chat-input"
          disabled={isLoading}
          aria-label="Mensagem para a assistente Cinttia"
        />
        <button
          type="submit"
          disabled={isLoading || !inputMessage.trim()}
          className="cinttia-send-btn"
          title="Enviar mensagem"
          aria-label="Enviar mensagem"
        >
          <SendIcon size={16} />
        </button>
      </form>
    </aside>
  );
};

export default CinttiaChatWidget;
