import type {
  ChatPayload,
  ChatResponseEnvelope,
  MonitorMetrics,
} from '../types/ai';

const AI_SESSION_KEY = '@efficientia:ai:session_id';

/**
 * Obtém a URL base configurada para a API da Inteligência Artificial.
 * Prioriza VITE_API_AI_URL e VITE_API_AI_BASE_URL, com fallback seguro para a instância Render.
 */
export function getAiBaseUrl(): string {
  const envUrl =
    import.meta.env.VITE_API_AI_URL ||
    import.meta.env.VITE_API_AI_BASE_URL ||
    'https://ia-desktop.onrender.com';
  return String(envUrl).trim().replace(/\/+$/, '');
}

/**
 * Recupera ou inicializa um identificador único de sessão para o chat.
 * Mantém o contexto de diálogo durante a navegação do usuário.
 */
export function getAiSessionId(): string {
  try {
    const existing = sessionStorage.getItem(AI_SESSION_KEY);
    if (existing && existing.trim()) {
      return existing;
    }

    const newSessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    sessionStorage.setItem(AI_SESSION_KEY, newSessionId);
    return newSessionId;
  } catch {
    return `session_${Date.now()}`;
  }
}

/**
 * Reseta o identificador de sessão para iniciar uma nova conversa limpa.
 */
export function resetAiSessionId(): string {
  try {
    const newSessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    sessionStorage.setItem(AI_SESSION_KEY, newSessionId);
    return newSessionId;
  } catch {
    return `session_${Date.now()}`;
  }
}

export class AiServiceError extends Error {
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Cliente para integração com a API Ultrathink (Efficientia AI).
 */
export const aiService = {
  /**
   * Envia uma mensagem para o assistente IA corporativo e obtém a resposta orquestrada.
   * Endpoint: POST /chat
   */
  async chat(
    payload: ChatPayload,
    signal?: AbortSignal
  ): Promise<ChatResponseEnvelope> {
    const baseUrl = getAiBaseUrl();
    const endpoint = `${baseUrl}/chat`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        let errorData: unknown;
        let errorMessage = `Erro na API da IA (HTTP ${response.status})`;

        try {
          errorData = await response.json();
          if (
            typeof errorData === 'object' &&
            errorData !== null &&
            'detail' in errorData
          ) {
            const detail = errorData.detail;
            if (typeof detail === 'string') {
              errorMessage = detail;
            } else if (detail !== undefined && detail !== null) {
              errorMessage = String(detail);
            }
          }
        } catch {
          // Resposta não é JSON
        }

        throw new AiServiceError(errorMessage, response.status, errorData);
      }

      const rawData: unknown = await response.json();
      if (!rawData || typeof rawData !== 'object' || !('response' in rawData)) {
        throw new AiServiceError(
          'Resposta da IA fora do padrão contratado',
          response.status,
          rawData
        );
      }

      const responseObj = rawData.response;
      if (
        !responseObj ||
        typeof responseObj !== 'object' ||
        !('resposta' in responseObj) ||
        typeof responseObj.resposta !== 'string'
      ) {
        throw new AiServiceError(
          'Resposta da IA fora do padrão contratado',
          response.status,
          rawData
        );
      }

      const data = rawData as ChatResponseEnvelope;

      return data;
    } catch (err) {
      if (err instanceof AiServiceError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }

      const message =
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar ao assistente de IA. Verifique sua conexão.';
      throw new AiServiceError(message, undefined, err);
    }
  },

  /**
   * Consulta métricas operacionais e SRE do assistente (quando disponível).
   * Endpoint: GET /monitor/data
   */
  async getMetrics(signal?: AbortSignal): Promise<MonitorMetrics | null> {
    const baseUrl = getAiBaseUrl();
    const endpoint = `${baseUrl}/monitor/data`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal,
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as MonitorMetrics;
    } catch {
      return null;
    }
  },
};
