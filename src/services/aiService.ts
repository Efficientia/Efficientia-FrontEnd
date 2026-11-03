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
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api-ai';
  }
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

/**
 * Base de conhecimento local e oficial da Cinttia (Assistente Virtual Efficientia).
 * Baseada no Termo de Abertura, Portaria SDA/MAPA nº 1.280/2025 e FAQ do projeto.
 * Garante disponibilidade 100% caso a rede ou a instância externa do Render falhem.
 */
function getCinttiaKnowledgeResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('gta') || msg.includes('nota') || msg.includes('document')) {
    return `Conforme as exigências da Portaria SDA/MAPA nº 1.280/2025 e os procedimentos operacionais do ecossistema Efficientia, a documentação obrigatória da viagem compreende:

* **Guia de Trânsito Animal (GTA)**: Documento sanitário oficial emitido pelo órgão de defesa agropecuária para transporte de bovinos.
* **Nota Fiscal de Produtor Rural / Transporte**: Comprovação fiscal da movimentação de carga viva.

No diário digital de rota, o motorista informa esses números obrigatoriamente no formulário de embarque, acompanhados de quilometragem inicial e final, registros de bem-estar animal e validação das 4 assinaturas digitais.`;
  }

  if (msg.includes('assinatur') || msg.includes('assinar') || msg.includes('papel') || msg.includes('participante')) {
    return `O ecossistema Efficientia exige a validação de 4 assinaturas digitais obrigatórias ao longo de cada viagem:

1. **Pecuarista (Origem)**: Autentica o lote embarcado na fazenda parceira.
2. **Motorista (Transporte)**: Valida a condução responsável e as condições de carga viva.
3. **Manobrista (Pátio)**: Confirma a entrada do caminhão no pátio do frigorífico.
4. **Curraleiro (Desembarque)**: Atesta a integridade clínica dos animais descarregados no curral de espera.

Todas as assinaturas são capturadas digitalmente no dispositivo touch do motorista com carimbo de data e hora.`;
  }

  if (msg.includes('sirene') || msg.includes('re ') || msg.includes('ré') || msg.includes('manobra')) {
    return `A sirene de marcha a ré é item de segurança crítica do caminhão boiadeiro. Caso apresente falha durante manobras no embarque ou desembarque:

1. O motorista deve registrar o status 'Não / Falha reportada' no diário de viagem.
2. O sistema gera automaticamente um alerta operacional com sugestão de inspeção na oficina.
3. O analista de bem-estar animal avalia a gravidade e pode registrar notificação para manutenção preventiva antes da próxima rota.`;
  }

  if (msg.includes('mortalidade') || msg.includes('limite') || msg.includes('toler') || msg.includes('meta')) {
    return `A meta interna de tolerância operacional para mortalidade em trânsito no Efficientia é estritamente **menor que 0,20%** do lote transportado (com teto máximo tolerado < 0,5% na malha geral).

Caso ocorram óbitos acima do limite de tolerância:
* O diário entra em bloqueio de rota preventivo.
* É obrigatório anexar o Laudo de Mortalidade com a causa do óbito (estresse térmico, pisoteamento ou fadiga).
* O analista técnico deve registrar parecer circunstanciado na auditoria.`;
  }

  if (msg.includes('aprovar') || msg.includes('reprovar') || msg.includes('auditoria') || msg.includes('parecer')) {
    return `Na esteira de auditoria de diários de rota:

* **Para Aprovar**: O analista confirma que as 4 assinaturas digitais foram coletadas, os dados de GTA e Nota Fiscal são válidos e a contagem de animais corresponde à soma das condições físicas (em pé, deitados, emergências e mortos).
* **Para Reprovar**: É obrigatório inserir uma justificativa técnica formal no campo de parecer (ex.: divergência de contagem, óbito sem laudo comprobatório ou vício de trajeto), notificando o condutor e a frota.`;
  }

  if (msg.includes('animal') || msg.includes('bem-estar') || msg.includes('condi') || msg.includes('curral')) {
    return `O monitoramento de bem-estar animal no Efficientia categoriza os bovinos em 4 condições clínicas no desembarque:

* **Em pé (Íntegros)**: Bovinos que chegam sem sinais clínicos de estresse ou lesão (meta > 98%).
* **Prostrados / Deitados**: Animais com fadiga extrema ou estresse calórico.
* **Abate de Emergência**: Bovinos com lesões graves necessitando intervenção imediata.
* **Óbitos em Trânsito**: Animais que não resistiram ao deslocamento rodoviário.`;
  }

  return `Olá! Sou a Cinttia, assistente virtual do ecossistema Efficientia.

Posso tirar dúvidas sobre:
* **Documentação Obrigatória**: GTA, Notas Fiscais e normas da Portaria SDA/MAPA nº 1.280/2025.
* **Auditoria de Diários**: Critérios para aprovação, reprovação e conferência de assinaturas.
* **Regras de Bem-Estar**: Limites de mortalidade (< 0,20%), prostração e sirene de ré.
* **Operação de Frota**: Vinculação de cavalos, carretas e motoristas.

Como posso ajudar você agora?`;
}

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

      // Se a IA remota responder que não encontrou no FAQ, enriquece com a base oficial
      if (data.response.resposta.trim() === 'Não encontrei essa informação no FAQ do sistema.') {
        const localAnswer = getCinttiaKnowledgeResponse(payload.message);
        if (!localAnswer.startsWith('Olá! Sou a Cinttia, assistente virtual')) {
          return {
            response: {
              resposta: localAnswer,
              agentes_chamados: [...data.response.agentes_chamados, 'base_conhecimento_efficientia'],
            },
          };
        }
      }

      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }

      // Fallback de alta disponibilidade: utiliza a base oficial da Cinttia
      return {
        response: {
          resposta: getCinttiaKnowledgeResponse(payload.message),
          agentes_chamados: ['guardrail_entrada', 'base_conhecimento_efficientia'],
        },
      };
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
