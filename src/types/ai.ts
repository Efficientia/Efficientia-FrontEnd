/**
 * Contratos de interface e tipagem estrita para a API de Inteligência Artificial Ultrathink (Efficientia AI).
 * Baseado no contrato oficial do sistema (API Map Ultrathink / POST /chat).
 */

export type AgentRoute =
  | 'guardrail_entrada'
  | 'roteador'
  | 'analise_dados'
  | 'dashboard'
  | 'faq'
  | 'orquestrador'
  | 'guardrail_saida'
  | string;

export interface ChatPayload {
  readonly user_id: string;
  readonly session_id: string;
  readonly message: string;
}

export interface ChatResult {
  readonly resposta: string;
  readonly agentes_chamados: readonly AgentRoute[];
}

export interface ChatResponseEnvelope {
  readonly response: ChatResult;
}

export interface SloConfig {
  readonly latencia_p95_limite_ms: number;
  readonly taxa_erro_limite: number;
}

export interface TelemetrySummary {
  readonly turnos: number;
  readonly em_andamento: number;
  readonly no_ar_segundos: number;
  readonly taxa_erro: number;
  readonly bloqueios: number;
  readonly latencia_media_ms: number;
  readonly latencia_p95_ms: number;
  readonly slo_ok: boolean;
  readonly tokens_entrada: number;
  readonly tokens_saida: number;
  readonly tokens_total: number;
  readonly custo_usd: number;
  readonly modelo_mais_usado: string;
  readonly fallbacks: number;
}

export interface MonitorMetrics {
  readonly slo: SloConfig;
  readonly resumo: TelemetrySummary;
  readonly serie_latencia: readonly { readonly hora: string; readonly latencia_ms: number }[];
  readonly serie_custo: readonly { readonly hora: string; readonly custo_acumulado_usd: number }[];
  readonly por_modelo: readonly {
    readonly modelo: string;
    readonly chamadas: number;
    readonly tokens_entrada: number;
    readonly tokens_saida: number;
    readonly custo_usd: number;
    readonly latencia_media_ms: number;
    readonly fallbacks: number;
  }[];
  readonly por_rota: readonly {
    readonly rota: string;
    readonly turnos: number;
    readonly erros: number;
    readonly bloqueios: number;
    readonly latencia_media_ms: number;
    readonly custo_usd: number;
  }[];
}

/**
 * Representação de uma mensagem no histórico da interface do chat de apoio.
 */
export interface ChatMessage {
  readonly id: string;
  readonly sender: 'user' | 'assistant' | 'system';
  readonly text: string;
  readonly timestamp: string;
  readonly agentesChamados?: readonly AgentRoute[];
  readonly isError?: boolean;
}
