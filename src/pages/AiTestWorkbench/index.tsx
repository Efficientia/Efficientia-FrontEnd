import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  aiService,
  getAiBaseUrl,
  getAiSessionId,
  resetAiSessionId,
  AiServiceError,
} from '../../services/aiService';
import type {
  AgentRoute,
  ChatMessage,
  ChatResponseEnvelope,
  MonitorMetrics,
} from '../../types/ai';
import './AiTestWorkbench.css';

const DEFAULT_GREETING =
  'Olá! Sou a Cinttia, assistente virtual do ecossistema Efficientia. Como posso apoiar você em rotas, relatórios operacionais ou regras do sistema hoje?';

const QUICK_SUGGESTIONS: readonly string[] = [
  'Qual a documentação obrigatória da viagem (GTA/Nota)?',
  'Como agir em caso de parada imprevista?',
  'Quais as regras de bem-estar animal no transporte?',
];

function getAgentPillClass(agent: AgentRoute): string {
  if (agent.includes('guardrail')) {
    return 'ai-workbench__agent-pill ai-workbench__agent-pill--guardrail';
  }
  if (agent === 'roteador') {
    return 'ai-workbench__agent-pill ai-workbench__agent-pill--roteador';
  }
  if (agent === 'analise_dados') {
    return 'ai-workbench__agent-pill ai-workbench__agent-pill--analise';
  }
  if (agent === 'dashboard') {
    return 'ai-workbench__agent-pill ai-workbench__agent-pill--dashboard';
  }
  if (agent === 'faq') {
    return 'ai-workbench__agent-pill ai-workbench__agent-pill--faq';
  }
  return 'ai-workbench__agent-pill';
}

export function AiTestWorkbench(): ReactElement {
  const { user } = useAuth();
  const userId = user?.cpf || user?.email || 'operador_workbench';

  const [sessionId, setSessionId] = useState<string>(() => getAiSessionId());
  const [messages, setMessages] = useState<readonly ChatMessage[]>(() => [
    {
      id: 'greeting_msg',
      sender: 'assistant',
      text: DEFAULT_GREETING,
      timestamp: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastAgentesChamados, setLastAgentesChamados] = useState<readonly AgentRoute[]>([]);
  const [lastRawEnvelope, setLastRawEnvelope] = useState<ChatResponseEnvelope | null>(null);

  // SRE / Telemetria
  const [metrics, setMetrics] = useState<MonitorMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [metricsMessage, setMetricsMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleResetSession = useCallback(() => {
    const nextSession = resetAiSessionId();
    setSessionId(nextSession);
    setLastAgentesChamados([]);
    setLastRawEnvelope(null);
    setMessages([
      {
        id: `greeting_${Date.now()}`,
        sender: 'assistant',
        text: DEFAULT_GREETING,
        timestamp: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend: string) => {
      const trimmed = textToSend.trim();
      if (!trimmed || isLoading) {
        return;
      }

      setInputText('');

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        sender: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const envelope = await aiService.chat(
          {
            user_id: userId,
            session_id: sessionId,
            message: trimmed,
          },
          controller.signal
        );

        setLastRawEnvelope(envelope);
        const aiResponse = envelope.response;
        const agentes = aiResponse.agentes_chamados || [];
        setLastAgentesChamados(agentes);

        const aiMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          sender: 'assistant',
          text: aiResponse.resposta,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          agentesChamados: agentes,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        const fallback =
          err instanceof AiServiceError
            ? err.message
            : 'Erro ao comunicar com a Cinttia. Verifique o endpoint de IA ou tente novamente.';

        const errorMsg: ChatMessage = {
          id: `error_${Date.now()}`,
          sender: 'system',
          text: fallback,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isError: true,
        };

        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, userId]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSendMessage(inputText);
  };

  const handleFetchMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    setMetricsMessage(null);
    try {
      const data = await aiService.getMetrics();
      if (data) {
        setMetrics(data);
      } else {
        setMetrics(null);
        setMetricsMessage(
          'O endpoint /monitor/data retornou indisponível ou vazio no ambiente atual.'
        );
      }
    } catch {
      setMetrics(null);
      setMetricsMessage('Falha de conexão ao tentar ler telemetria / SRE.');
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  return (
    <main id="main-content" className="ai-workbench" tabIndex={-1}>
      <nav aria-label="Navegação estrutural" className="ai-workbench__breadcrumbs">
        <ol className="ai-workbench__breadcrumbs-list">
          <li>
            <Link to="/">Início</Link>
          </li>
          <li aria-hidden="true" className="ai-workbench__breadcrumbs-sep">
            /
          </li>
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li aria-hidden="true" className="ai-workbench__breadcrumbs-sep">
            /
          </li>
          <li aria-current="page">Workbench IA</li>
        </ol>
      </nav>

      <header className="ai-workbench__header">
        <p className="ai-workbench__eyebrow">Ambiente de Diagnóstico & Integração</p>
        <h1>Workbench de Testes — IA Efficientia (Cinttia)</h1>
        <p className="ai-workbench__description">
          Console de testes e validação da API Ultrathink de Inteligência Artificial. Permite
          executar diálogos com a Cinttia, inspecionar a cadeia de agentes acionados e verificar a
          saúde das métricas operacionais.
        </p>

        <section aria-label="Informações do Ambiente de IA" className="ai-workbench__meta-bar">
          <div className="ai-workbench__meta-item">
            <span className="ai-workbench__meta-label">Endpoint Ativo:</span>
            <code className="ai-workbench__endpoint-badge">{getAiBaseUrl()}</code>
          </div>
          <div className="ai-workbench__meta-item">
            <span className="ai-workbench__meta-label">Session ID:</span>
            <span className="ai-workbench__session-code" title={sessionId}>
              {sessionId}
            </span>
            <button
              type="button"
              className="ai-workbench__btn-session-reset"
              onClick={handleResetSession}
            >
              Novo Session ID
            </button>
          </div>
        </section>
      </header>

      <div className="ai-workbench__grid">
        {/* Painel 1: Console Interativo de Chat */}
        <section
          aria-labelledby="chat-console-heading"
          className="ai-workbench__card ai-workbench__chat-box"
        >
          <div>
            <h2 id="chat-console-heading">Console Interativo do Chat</h2>
            <p className="ai-workbench__card-desc">
              Envie prompts operacionais para simular o comportamento de motoristas e operadores.
            </p>
          </div>

          <div
            className="ai-workbench__messages-viewport"
            role="log"
            aria-live="polite"
            aria-label="Histórico de mensagens do chat"
          >
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              const isUser = msg.sender === 'user';
              const isErr = msg.isError;

              let roleClass = 'ai-workbench__message--assistant';
              if (isUser) roleClass = 'ai-workbench__message--user';
              if (isErr) roleClass = 'ai-workbench__message--error';

              return (
                <article
                  key={msg.id}
                  className={`ai-workbench__message ${roleClass}`}
                  aria-label={`Mensagem de ${msg.sender}`}
                >
                  <div className="ai-workbench__message-header">
                    <span className="ai-workbench__message-sender">
                      {isUser ? 'Você (Operador)' : isAssistant ? 'Cinttia (IA)' : 'Sistema'}
                    </span>
                    <time className="ai-workbench__message-time">{msg.timestamp}</time>
                  </div>
                  <p className="ai-workbench__message-body">{msg.text}</p>
                </article>
              );
            })}

            {isLoading && (
              <div
                className="ai-workbench__loading-bubble"
                role="status"
                aria-label="Cinttia está processando"
              >
                <span>Cinttia está formulando a resposta...</span>
              </div>
            )}
            <div ref={messagesEndRef} tabIndex={-1} />
          </div>

          {/* Sugestões Rápidas */}
          <div className="ai-workbench__chips-section">
            <span className="ai-workbench__chips-label">Sugestões rápidas:</span>
            <div className="ai-workbench__chips-list">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="ai-workbench__chip-btn"
                  disabled={isLoading}
                  onClick={() => void handleSendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Formulário de Input */}
          <form onSubmit={handleSubmit} className="ai-workbench__form">
            <label htmlFor="workbench-ai-prompt" className="ai-workbench__chips-label">
              Mensagem para a Cinttia
            </label>
            <textarea
              id="workbench-ai-prompt"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua dúvida sobre rotas, procedimentos ou regras de carga..."
              className="ai-workbench__textarea"
              rows={3}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage(inputText);
                }
              }}
            />
            <div className="ai-workbench__actions">
              <div className="ai-workbench__actions-left">
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="ai-workbench__btn-send"
                >
                  {isLoading ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
                <button
                  type="button"
                  disabled={isLoading || messages.length <= 1}
                  onClick={() =>
                    setMessages([
                      {
                        id: `cleared_${Date.now()}`,
                        sender: 'assistant',
                        text: DEFAULT_GREETING,
                        timestamp: new Date().toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      },
                    ])
                  }
                  className="ai-workbench__btn-clear"
                >
                  Limpar Histórico
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Painel 2: Diagnósticos Profundos & Inspeção de Agentes */}
        <div className="ai-workbench__diagnostics-col">
          {/* Pipeline de Agentes */}
          <section
            aria-labelledby="pipeline-heading"
            className="ai-workbench__card"
          >
            <h2 id="pipeline-heading">Pipeline de Agentes Acionados</h2>
            <p className="ai-workbench__card-desc">
              Rastreamento dos módulos do orquestrador Ultrathink na última requisição.
            </p>
            <div className="ai-workbench__pipeline" aria-live="polite">
              {lastAgentesChamados.length === 0 ? (
                <p className="ai-workbench__empty-text">
                  Nenhum agente acionado ainda. Envie uma mensagem para disparar a cadeia.
                </p>
              ) : (
                lastAgentesChamados.map((agente, idx) => (
                  <span key={`${agente}-${idx}`} className="ai-workbench__pipeline-step">
                    <span className={getAgentPillClass(agente)}>{agente}</span>
                    {idx < lastAgentesChamados.length - 1 && (
                      <span aria-hidden="true" className="ai-workbench__agent-arrow">
                        →
                      </span>
                    )}
                  </span>
                ))
              )}
            </div>
          </section>

          {/* Card Telemetria / SRE */}
          <section
            aria-labelledby="telemetry-heading"
            className="ai-workbench__card"
          >
            <h2 id="telemetry-heading">Telemetria & SLO (SRE)</h2>
            <p className="ai-workbench__card-desc">
              Dados operacionais da API de IA via endpoint <code>/monitor/data</code>.
            </p>
            <div className="ai-workbench__sre-box">
              <button
                type="button"
                className="ai-workbench__btn-metrics"
                onClick={() => void handleFetchMetrics()}
                disabled={isLoadingMetrics}
              >
                {isLoadingMetrics ? 'Consultando...' : 'Consultar Métricas SRE'}
              </button>

              {metricsMessage && (
                <p className="ai-workbench__empty-text" role="status">
                  {metricsMessage}
                </p>
              )}

              {metrics && (
                <dl className="ai-workbench__metrics-grid">
                  <div className="ai-workbench__metric-stat">
                    <dt>SLO Global</dt>
                    <dd>
                      <span
                        className={`ai-workbench__slo-pill ${
                          metrics.resumo.slo_ok
                            ? 'ai-workbench__slo-pill--ok'
                            : 'ai-workbench__slo-pill--fail'
                        }`}
                      >
                        {metrics.resumo.slo_ok ? 'CONFORME' : 'VIOLADO'}
                      </span>
                    </dd>
                  </div>
                  <div className="ai-workbench__metric-stat">
                    <dt>Latência P95</dt>
                    <dd>{metrics.resumo.latencia_p95_ms} ms</dd>
                  </div>
                  <div className="ai-workbench__metric-stat">
                    <dt>Latência Média</dt>
                    <dd>{metrics.resumo.latencia_media_ms} ms</dd>
                  </div>
                  <div className="ai-workbench__metric-stat">
                    <dt>Taxa de Erro</dt>
                    <dd>{(metrics.resumo.taxa_erro * 100).toFixed(1)}%</dd>
                  </div>
                  <div className="ai-workbench__metric-stat">
                    <dt>Turnos Totais</dt>
                    <dd>{metrics.resumo.turnos}</dd>
                  </div>
                  <div className="ai-workbench__metric-stat">
                    <dt>Tokens Totais</dt>
                    <dd>{metrics.resumo.tokens_total}</dd>
                  </div>
                </dl>
              )}
            </div>
          </section>

          {/* Inspeção de JSON Bruto */}
          <section
            aria-labelledby="raw-envelope-heading"
            className="ai-workbench__card"
          >
            <h2 id="raw-envelope-heading">Inspeção de Resposta Bruta</h2>
            <p className="ai-workbench__card-desc">
              Envelope JSON retornado pelo endpoint oficial <code>POST /chat</code>.
            </p>
            <details className="ai-workbench__details" open={Boolean(lastRawEnvelope)}>
              <summary>
                {lastRawEnvelope ? 'Ver Payload JSON Retornado' : 'Nenhuma resposta capturada'}
              </summary>
              <pre className="ai-workbench__raw-pre">
                {lastRawEnvelope
                  ? JSON.stringify(lastRawEnvelope, null, 2)
                  : '{\n  "info": "Aguardando envio de requisição para exibir dados."\n}'}
              </pre>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}

export default AiTestWorkbench;
