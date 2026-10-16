import { useCallback, useEffect, useRef, useState } from 'react';
import {
  aiService,
  AiServiceError,
  getAiSessionId,
  resetAiSessionId,
} from '../services/aiService';
import type { AgentRoute, ChatMessage } from '../types/ai';

export interface UseAiChatOptions {
  readonly initialGreeting?: string;
  readonly userId?: string;
}

export interface UseAiChatReturn {
  readonly messages: readonly ChatMessage[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly sessionId: string;
  readonly lastAgentesChamados: readonly AgentRoute[];
  readonly sendMessage: (text: string) => Promise<void>;
  readonly clearMessages: () => void;
  readonly resetSession: () => void;
}

const DEFAULT_GREETING =
  'Olá! Sou a Cinttia, assistente virtual do ecossistema Efficientia. Como posso apoiar você em rotas, relatórios operacionais ou regras do sistema hoje?';

export function useAiChat(options: UseAiChatOptions = {}): UseAiChatReturn {
  const { initialGreeting = DEFAULT_GREETING, userId = 'operador_web' } = options;

  const [sessionId, setSessionId] = useState<string>(() => getAiSessionId());
  const [messages, setMessages] = useState<readonly ChatMessage[]>(() => [
    {
      id: 'greeting_msg',
      sender: 'assistant',
      text: initialGreeting,
      timestamp: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAgentesChamados, setLastAgentesChamados] = useState<readonly AgentRoute[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancela requisições ativas ao desmontar o componente
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmedText = text.trim();
      if (!trimmedText || isLoading) {
        return;
      }

      setError(null);

      const userMessageId = `msg_user_${Date.now()}`;
      const timestamp = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const userMessage: ChatMessage = {
        id: userMessageId,
        sender: 'user',
        text: trimmedText,
        timestamp,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await aiService.chat(
          {
            user_id: userId,
            session_id: sessionId,
            message: trimmedText,
          },
          controller.signal
        );

        const aiResponse = result.response;
        const agentes = aiResponse.agentes_chamados;
        setLastAgentesChamados(agentes);

        const assistantMessage: ChatMessage = {
          id: `msg_ai_${Date.now()}`,
          sender: 'assistant',
          text: aiResponse.resposta,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          agentesChamados: agentes,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        const errorMessage =
          err instanceof AiServiceError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Ocorreu um erro ao comunicar com a IA. Tente novamente.';

        setError(errorMessage);

        const errorAssistantMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Desculpe, não consegui processar sua solicitação no momento: ${errorMessage}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isError: true,
        };

        setMessages((prev) => [...prev, errorAssistantMsg]);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [isLoading, sessionId, userId]
  );

  const clearMessages = useCallback((): void => {
    setMessages([
      {
        id: `greeting_${Date.now()}`,
        sender: 'assistant',
        text: initialGreeting,
        timestamp: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    setError(null);
    setLastAgentesChamados([]);
  }, [initialGreeting]);

  const resetSession = useCallback((): void => {
    const newId = resetAiSessionId();
    setSessionId(newId);
    clearMessages();
  }, [clearMessages]);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    lastAgentesChamados,
    sendMessage,
    clearMessages,
    resetSession,
  };
}
