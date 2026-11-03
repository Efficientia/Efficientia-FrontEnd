# Especificação Técnica — Integração do Assistente de IA Ultrathink (Cinttia)

**Documento:** `docs/SPEC-AI-ULTRATHINK-ASSISTANT.md`  
**Épico / Funcionalidade:** Assistente Virtual Corporativo de IA (Cinttia — Ultrathink AI)  
**Branch:** `feat/implementacao-ai-assistant`  
**Status:** Implementado / Pronto para Homologação  
**Data:** 16 de Outubro de 2026  
**Responsável Técnico:** Equipe de Engenharia Frontend Efficientia  

---

## 1. Visão Geral & Contexto da Solução

O **Efficientia AI Assistant** (personificado na interface como **Cinttia**) é o assistente virtual corporativo integrado ao ecossistema do **Efficientia-FrontEnd**. Sua finalidade primária é fornecer suporte operacional contínuo a operadores logísticos, gestores de frota e motoristas, esclarecendo dúvidas sobre:

- **Documentação de Transporte:** Emissão, conferência e obrigatoriedade de Guias de Trânsito Animal (GTA), Notas Fiscais e manifestos de carga.
- **Procedimentos e Contingências:** Condutas obrigatórias em caso de paradas imprevistas, avarias mecânicas, atrasos de rota ou sinistros.
- **Conformidade e Bem-Estar Animal:** Parâmetros regulatórios de tempo de viagem, ventilação, hidratação, densidade de carga e manejo humanitário.
- **Regras Operacionais e Navegação no Sistema:** Auxílio no preenchimento de cadastros, leitura de relatórios e interpretação de indicadores do dashboard.

### 1.1. Arquitetura Híbrida do Pipeline de IA (Ultrathink)

O backend de inteligência artificial baseia-se na arquitetura **Ultrathink**, um pipeline assíncrono multi-agente hospedado em nuvem (instância FastAPI / Render). A comunicação é estruturada em turnos de diálogo transacionais com roteamento semântico dinâmico e guardrails de conformidade:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Navegador Web (Cliente)                                │
│                                                                                        │
│   ┌──────────────────────────┐                      ┌──────────────────────────────┐   │
│   │   Widget AiSupportBox    │                      │   Página AiTestWorkbench     │   │
│   │   (Apoio Operacional)    │                      │   (Diagnóstico & Auditoria)  │   │
│   └────────────┬─────────────┘                      └──────────────┬───────────────┘   │
│                │                                                   │                   │
│                └─────────────────────┬─────────────────────────────┘                   │
│                                      ▼                                                 │
│                        Hook Customizado `useAiChat`                                    │
│                     (Estado, AbortController, Sessão)                                  │
│                                      │                                                 │
│                                      ▼                                                 │
│                          Serviço `aiService.ts`                                        │
│                      (fetch nativo, DTOs, Session ID)                                  │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │ HTTP POST /chat (JSON)
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        API Ultrathink (FastAPI / Render)                               │
│                                                                                        │
│      ┌──────────────────────────────────────────────────────────────────────────┐      │
│      │                        1. Guardrail de Entrada                           │      │
│      │             (Sanitização, moderação, bloqueio de jailbreak)              │      │
│      └───────────────────────────────────┬──────────────────────────────────────┘      │
│                                          ▼                                             │
│      ┌──────────────────────────────────────────────────────────────────────────┐      │
│      │                        2. Roteador Semântico                             │      │
│      │            (Classificação de intenção e extração de contexto)            │      │
│      └───────┬───────────────────────────┬───────────────────────────────┬──────┘      │
│              ▼                           ▼                               ▼             │
│   ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐      │
│   │   Agente de FAQ     │     │ Agente de Análise   │     │ Agente de Dashboard │      │
│   │ (Base regulatória e │     │ (Consultas de frota,│     │ (Métricas e status  │      │
│   │  regras de negócio) │     │  paradas e rotas)   │     │   operacionais)     │      │
│   └──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘      │
│              │                           │                           │                 │
│              └───────────────────────────┼───────────────────────────┘                 │
│                                          ▼                                             │
│      ┌──────────────────────────────────────────────────────────────────────────┐      │
│      │                     3. Orquestrador de Síntese                           │      │
│      │          (Geração de resposta coesa e consolidada em linguagem natural)  │      │
│      └───────────────────────────────────┬──────────────────────────────────────┘      │
│                                          ▼                                             │
│      ┌──────────────────────────────────────────────────────────────────────────┐      │
│      │                        4. Guardrail de Saída                             │      │
│      │           (Auditoria de tom, validação de alucinações e PII)             │      │
│      └───────────────────────────────────┬──────────────────────────────────────┘      │
│                                          │                                             │
│                                          ▼                                             │
│               Retorno: Resposta textual + Array de agentes executados                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

A transparência algorítmica é garantida pelo retorno do vetor de `agentes_chamados`, permitindo ao operador saber exatamente quais nós de decisão validaram a resposta emitida.

---

## 2. Contratos de Dados & Tipagem Estrita

Todos os contratos de dados residem no módulo `src/types/ai.ts` e são reexportados centralmente em `src/types/index.ts`. A tipagem adota propriedades estritamente imutáveis (`readonly`) para garantir conformidade funcional e prevenir efeitos colaterais de mutação.

### 2.1. Rotas dos Agentes (`AgentRoute`)

Identifica os nós de decisão e especialistas ativados durante o ciclo de processamento da mensagem:

```typescript
export type AgentRoute =
  | 'guardrail_entrada'
  | 'roteador'
  | 'analise_dados'
  | 'dashboard'
  | 'faq'
  | 'orquestrador'
  | 'guardrail_saida'
  | string;
```

A união tipada prevê os agentes fixos da especificação Ultrathink e inclui `string` como extensão segura para novos agentes adicionados dinamicamente no backend.

### 2.2. DTO de Envio (`ChatPayload`)

Payload trafegado no corpo da requisição `POST /chat`:

```typescript
export interface ChatPayload {
  readonly user_id: string;
  readonly session_id: string;
  readonly message: string;
}
```

- `user_id`: Identificador operacional do usuário logado (CPF, e-mail corporativo ou nome extraído do `AuthContext`). Em ambientes anônimos, utiliza o fallback `'operador_web'`.
- `session_id`: UUIDv4 ou timestamp de sessão estável recuperado do `sessionStorage`.
- `message`: Conteúdo textual digitado pelo usuário, submetido a `.trim()`.

### 2.3. Envelope de Resposta (`ChatResponseEnvelope` & `ChatResult`)

Contrato oficial emitido pelo serviço Ultrathink:

```typescript
export interface ChatResult {
  readonly resposta: string;
  readonly agentes_chamados: readonly AgentRoute[];
}

export interface ChatResponseEnvelope {
  readonly response: ChatResult;
}
```

O envelope garante que a mensagem processada e a cadeia de agentes sejam auditadas de forma isolada do transporte HTTP.

### 2.4. Mensagem Interna de Interface (`ChatMessage`)

Representação das mensagens no feed do chat da interface visual:

```typescript
export interface ChatMessage {
  readonly id: string;
  readonly sender: 'user' | 'assistant' | 'system';
  readonly text: string;
  readonly timestamp: string;
  readonly agentesChamados?: readonly AgentRoute[];
  readonly isError?: boolean;
}
```

- `sender`: `'user'` para mensagens emitidas pelo operador; `'assistant'` para mensagens processadas pela Cinttia; `'system'` para avisos de diagnóstico e erros de rede.
- `agentesChamados`: Relação opcional de agentes que participaram da geração da resposta.
- `isError`: Flag indicativa de falha de conexão, timeout ou erro 5xx para renderização com estilo de erro e acessibilidade adequada.

### 2.5. Métricas de Telemetria e Monitoramento SRE (`MonitorMetrics`)

Contrato para o endpoint de saúde e performance `/monitor/data`:

```typescript
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
```

---

## 3. Endpoints & Variáveis de Ambiente

### 3.1. Resolução da URL Base

O serviço `src/services/aiService.ts` implementa a função de resolução `getAiBaseUrl()`, que garante compatibilidade entre ambientes de desenvolvimento, homologação e produção por meio de precedência estrita:

```typescript
export function getAiBaseUrl(): string {
  const envUrl =
    import.meta.env.VITE_API_AI_URL ||
    import.meta.env.VITE_API_AI_BASE_URL ||
    'https://ia-desktop.onrender.com';

  return String(envUrl).trim().replace(/\/+$/, '');
}
```

- **Precedência:**
  1. `import.meta.env.VITE_API_AI_URL`: Variável primária recomendada nos arquivos `.env`.
  2. `import.meta.env.VITE_API_AI_BASE_URL`: Alias de compatibilidade retroativa.
  3. `'https://ia-desktop.onrender.com'`: Fallback padrão para a instância estável em nuvem.
- **Normalização:** A URL é higienizada com `.trim()` e remoção de qualquer barra final (`/+$/`), prevenindo requisições com barras duplas (ex: `//chat`).

### 3.2. Especificação dos Endpoints

| Método | Caminho | Descrição | Content-Type | Autenticação / Headers |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/chat` | Envia mensagem para processamento pelo assistente | `application/json` | `Accept: application/json` |
| `GET` | `/monitor/data` | Consulta métricas de telemetria e SLO | — | `Accept: application/json` |

### 3.3. Classe Especializada de Erro (`AiServiceError`)

Erros ocorridos no transporte ou rejeições da API são modelados na classe `AiServiceError`:

```typescript
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
```

Se a API retornar um payload com a estrutura RFC 7807 (`detail`), a mensagem é automaticamente extraída. Caso a resposta não seja JSON ou o servidor esteja fora do ar, mensagens amigáveis em português são fornecidas.

---

## 4. Gerenciamento de Sessão e Estado

### 4.1. Persistência de Sessão no `sessionStorage`

Para manter o contexto da conversa enquanto o operador navega entre rotas internas (como `/dashboard`, cadastros e relatórios), a chave de sessão é persistida em `sessionStorage`:

- **Chave de armazenamento:** `@efficientia:ai:session_id`
- **Isolamento por Aba:** O uso de `sessionStorage` assegura que abas distintas do navegador operem em sessões isoladas de IA, evitando misturar contextos de conversas diferentes.
- **Ciclo de Vida:** A sessão expira automaticamente ao fechar a aba/navegador, sem deixar rastros obsoletos em disco.
- **Fallback Seguro:** Caso o navegador bloqueie acesso ao storage (modo anônimo restritivo ou cookies desabilitados), `getAiSessionId()` gera um identificador seguro em memória baseado em timestamp (`session_${Date.now()}`).

```typescript
export function getAiSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(AI_SESSION_KEY);
    if (existing && existing.trim().length > 0) {
      return existing.trim();
    }
    const newSessionId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `session_${Date.now()}`;
    window.sessionStorage.setItem(AI_SESSION_KEY, newSessionId);
    return newSessionId;
  } catch {
    return `session_${Date.now()}`;
  }
}
```

A função `resetAiSessionId()` descarta o ID atual, grava um novo UUID e retorna o identificador renovado.

### 4.2. Hook Customizado `useAiChat`

Localizado em `src/hooks/useAiChat.ts`, encapsula todo o ciclo de vida reativo do assistente.

```typescript
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
```

#### Características de Implementação do Hook:
1. **Cancelamento Ativo via `AbortController`:**
   Um ref `abortControllerRef` mantém o controlador da requisição em curso. Ao disparar uma nova mensagem ou desmontar o componente (`useEffect` cleanup), qualquer requisição em voo é abortada instantaneamente:
   ```typescript
   useEffect(() => {
     return () => {
       if (abortControllerRef.current) {
         abortControllerRef.current.abort();
       }
     };
   }, []);
   ```
2. **Silenciamento de `AbortError`:**
   Exceções do tipo `DOMException` com `name === 'AbortError'` são ignoradas silenciosamente, impedindo que cancelamentos intencionais poluam a interface com falsas mensagens de erro.
3. **Imutabilidade Funcional:**
   As mensagens do histórico são atualizadas via funções de atualização de estado `setMessages((prev) => [...prev, novaMensagem])`, garantindo renderizações puras e estáveis.
4. **Tratamento de Falhas com Mensagem na Interface:**
   Quando ocorre falha na comunicação, além de preencher a variável `error`, o hook injeta automaticamente uma mensagem do assistente com `isError: true`, alertando o usuário no próprio feed de conversa.

---

## 5. Componente Global de Apoio (`AiSupportBox`)

Localizado em `src/components/AiSupportBox/`, o componente fornece um widget de chat flutuante, não invasivo e acessível globalmente.

### 5.1. Estrutura e Comportamento

- **Botão Gatilho Flutuante (`.ai-support-trigger`):**
  Posicionado de forma fixa no canto inferior direito da tela (`position: fixed; bottom: 24px; right: 24px; z-index: 9999;`). Possui ícone temático de balão de diálogo, indicador visual de pulso ("badge") e transição de escala ao interagir.
- **Janela de Diálogo (`.ai-support-dialog`):**
  Abre suavemente acima do gatilho (`animation: aiSupportSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)`). Apresenta:
  - **Cabeçalho:** Avatar da Cinttia com ponto verde pulsante de status online, título do assistente, botão de "Nova Conversa" (invoca `resetSession`) e botão de fechar.
  - **Feed de Mensagens com Auto-scroll:** Container com rolagem automática suave sempre que uma nova mensagem chega ou o indicador de digitação é acionado.
  - **Diferenciação Visual:** Mensagens do usuário alinhadas à direita em verde institucional (`#1a4a38`) com texto branco; mensagens da Cinttia alinhadas à esquerda em fundo suave (`#f0f4f1`) com borda sutil.
  - **Chips de Agentes:** Badges compactas exibindo os agentes executados (ex.: `faq`, `analise_dados`).
  - **Indicador de Digitação:** Animação de três pontos pulsantes acompanhada do texto acessível *"Cinttia está formulando a resposta..."*.
  - **Barra de Entrada:** Campo `textarea` expansível com botão de envio.

### 5.2. Atalhos de Teclado & Foco Programático

- **Envio com `Enter`:** Pressionar `Enter` envia a mensagem imediatamente; `Shift + Enter` insere quebra de linha normal.
- **Fechamento com `Escape`:** Pressionar `Escape` em qualquer elemento interno do diálogo fecha o widget imediatamente.
- **Restauração de Foco:** Ao abrir o widget, o foco é transferido programaticamente para o `<textarea>`. Ao fechar, o foco retorna ao botão de gatilho (`triggerRef.current?.focus()`).

### 5.3. Acessibilidade (WCAG 2.1 AA)

- `role="dialog"` na janela flutuante com `aria-modal="false"` (permitindo interação paralela com a página).
- `aria-label="Assistente Virtual Efficientia"` e `aria-labelledby` associado ao título gerado dinamicamente via `useId()`.
- `aria-expanded={isOpen}` e `aria-haspopup="dialog"` no botão gatilho.
- `role="log"` com `aria-live="polite"` e `aria-relevant="additions"` no feed de mensagens, garantindo que leitores de tela anunciem novas respostas sem interromper o usuário.
- `role="status"` no indicador de digitação.
- Contraste de cores superior a 4.5:1 em todos os textos de diálogo e botões.

---

## 6. Tela de Testes & Diagnósticos (`AiTestWorkbench`)

Localizada em `src/pages/AiTestWorkbench/` e acessível pela rota protegida `/ai-test` (e pelo ambiente de desenvolvimento):

### 6.1. Recursos de Diagnóstico Operacional

O workbench é dividido em duas colunas complementares:

1. **Console Interativo de Chat (Painel Esquerdo):**
   - **Sugestões Operacionais Rápidas (Chips):** Prompts prontos para teste rápido com um clique:
     - *"Qual a documentação obrigatória da viagem (GTA/Nota)?"*
     - *"Como agir em caso de parada imprevista?"*
     - *"Quais as regras de bem-estar animal no transporte?"*
   - Histórico em tempo real com identificador do usuário logado (CPF ou e-mail obtido do `useAuth()`).
   - Botão para limpar histórico e campo para envio de prompts livres.

2. **Diagnósticos Profundos & Auditoria (Painel Direito):**
   - **Visualizador do Pipeline de Agentes:**
     Apresenta pílulas visuais categorizadas por cor para cada agente acionado na última resposta:
     - `guardrail_*`: Vermelho escuro / vinho com borda de proteção (`#8b1538`).
     - `roteador`: Azul corporativo (`#1d4ed8`).
     - `analise_dados`: Verde escuro / analytics (`#1a4a38`).
     - `dashboard`: Âmbar / dourado (`#b45309`).
     - `faq`: Cinza escuro / neutral (`#374151`).
   - **Card de Telemetria & SRE (`/monitor/data`):**
     Botão "Consultar Telemetria" que consome `aiService.getMetrics()`. Exibe cards informativos de latência P95, status do SLO corporativo, total de turnos atendidos, consumo de tokens e custo acumulado em USD. Em caso de ambiente de homologação com endpoint ausente, exibe mensagem informativa com fallback gracioso.
   - **Inspetor de JSON Bruto:**
     Bloco colapsável `<details>` com formatação monoespaçada `<pre>`, apresentando o envelope JSON verbatim retornado pela API Ultrathink para fins de validação técnica e depuração.

---

## 7. Guia de Handoff para os Desenvolvedores

Para garantir que a equipe de engenharia frontend possa evoluir, estilizar ou estender os componentes sem romper os contratos de serviço, siga as diretrizes abaixo:

### 7.1. Separação Estrita de Responsabilidades

```
src/
├── types/ai.ts                    <-- Contratos, interfaces e DTOs (NÃO altere sem alinhamento com o time de IA)
├── services/aiService.ts          <-- Comunicação HTTP, Session ID e normalização de erros
├── hooks/useAiChat.ts             <-- Lógica de estado, concorrência e AbortController
├── components/AiSupportBox/       <-- Componente visual do widget flutuante
└── pages/AiTestWorkbench/         <-- Interface de diagnóstico e bancada de testes
```

- **Camada de Transporte (`aiService.ts`):** Qualquer chamada HTTP deve ser feita exclusivamente através do objeto `aiService`. Não utilize `fetch` ou `axios` diretamente dentro dos componentes React.
- **Camada de Estado (`useAiChat.ts`):** Componentes visuais devem consumir o hook `useAiChat`. Nunca mantenha instâncias concorrentes de `session_id` ou chamadas diretas a `aiService.chat` no estado local do componente de tela.

### 7.2. Extensão do Pipeline e Novos Agentes

Caso o backend adicione um novo nó de agente (por exemplo, `agente_telemetria_veicular` ou `agente_juridico`):
1. Adicione a rota no tipo `AgentRoute` em `src/types/ai.ts`.
2. Adicione a regra visual de cor no helper `getAgentPillClass` em `AiTestWorkbench/index.tsx`.
3. O componente `AiSupportBox` renderiza dinamicamente qualquer item de `agentesChamados`, sendo retrocompatível por padrão.

### 7.3. Customização de Cores e Estilos

As folhas de estilo `AiSupportBox.css` e `AiTestWorkbench.css` utilizam as variáveis de cor e tokens oficiais do projeto Efficientia:
- Verde Floresta / Primário: `#1a4a38`
- Verde Escuro / Fundo de Cabeçalho: `#25332b`
- Verde Suave / Destaques: `#f0f4f1`
- Bordas e Divisores: `#e2e8e5`
- Sucesso / Status Online: `#218553`

Para redesenhar o balão de chat ou o botão gatilho, altere apenas os arquivos CSS correspondentes, preservando os seletores de classe e as referências de atributos de acessibilidade (`role`, `aria-*` e `tabIndex`).

---

## 8. Verificação & Evidências

### 8.1. Comandos de Validação Automatizada

Para validar a integridade técnica da integração após qualquer alteração:

```bash
# 1. Validação de tipos TypeScript e geração do bundle Vite
npm run build

# 2. Verificação estrita de linting e regras de hooks/acessibilidade
npm run lint
```

Ambos os comandos devem concluir com **0 erros** e **0 advertências**.

### 8.2. Roteiro de Testes Manuais & Funcionais

1. **Teste de Inicialização do Widget (`AiSupportBox`):**
   - Acesse qualquer rota da aplicação (ex.: `/dashboard`).
   - Localize o botão flutuante no canto inferior direito.
   - Pressione `Enter` ou clique no botão: o diálogo deve abrir com animação suave e o cursor deve se posicionar no campo de texto.
   - Pressione `Escape`: o diálogo deve fechar e o foco retornar ao botão gatilho.

2. **Teste de Diálogo e Resposta da IA:**
   - Abra o widget e digite *"Qual a documentação obrigatória para embarque de bovinos?"*.
   - Pressione `Enter`.
   - O indicador de digitação deve ser exibido com a animação de três pontos.
   - A resposta deve aparecer no feed acompanhada das tags de agentes chamados (ex.: `guardrail_entrada`, `roteador`, `faq`, `orquestrador`).

3. **Teste de Cancelamento e Nova Sessão:**
   - Clique no ícone de "Nova Conversa" no cabeçalho do widget.
   - O histórico de mensagens deve ser limpo, a saudação inicial restabelecida e uma nova chave de sessão gravada no `sessionStorage`.

4. **Teste de Diagnóstico no Workbench (`/ai-test`):**
   - Navegue para `/ai-test`.
   - Clique em uma das sugestões rápidas (ex.: *"Como agir em caso de parada imprevista?"*).
   - Verifique a atualização imediata do visualizador do pipeline de agentes na coluna direita.
   - Expanda o painel "Payload JSON Bruto" para auditar o envelope recebido.
   - Clique em "Consultar Telemetria" no card de SRE e observe a resposta das métricas operacionais.

### 8.3. Validação Direta via cURL (Endpoint Real)

Para validação isolada do endpoint Ultrathink via terminal:

```bash
curl -X POST "https://ia-desktop.onrender.com/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "user_id": "engenharia_teste",
    "session_id": "smoke_test_session_001",
    "message": "Quais as regras de parada para descanso de animais?"
  }'
```

**Resposta esperada (HTTP 200 OK):**
```json
{
  "response": {
    "resposta": "Durante o transporte de animais vivos, as paradas para descanso...",
    "agentes_chamados": [
      "guardrail_entrada",
      "roteador",
      "faq",
      "orquestrador",
      "guardrail_saida"
    ]
  }
}
```
