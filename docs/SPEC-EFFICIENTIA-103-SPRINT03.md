# Especificação Técnica - Sprint 03
**Documento:** SPEC-EFFICIENTIA-103-SPRINT03  
**Épico Relacionado:** EFFICIENTI-103 (Gerenciamento de Estado)  
**Status:** Concluída  
**Data:** 02/10/2026  
**Responsável Técnico:** Equipe de Engenharia Frontend Efficientia  

---

## 1. Objetivo da Sprint

Implementar a arquitetura global de gerenciamento de estado da aplicação utilizando React Context API e hooks customizados estritamente tipados, estabelecendo a persistência reativa da sessão do usuário autenticado (JWT, perfil corporativo e controle de acesso por roles), integrando a proteção de rotas com mitigação de falsos redirecionamentos durante carregamento, fornecendo componentes universais de feedback (loading e erros acessíveis) e estruturando o modelo de dados e camada de serviço da tela principal (**Visão Geral / Dashboard**).

---

## 2. Escopo e Mapeamento de Tarefas do Jira

Esta sprint cumpre as subtasks associadas ao épico **EFFICIENTI-103**:

| Chave Jira | Descrição Formal da Tarefa | Entregável Implementado |
| :--- | :--- | :--- |
| **EFFICIENTI-388** | AuthContext para Token JWT e Permissões | `src/contexts/AuthContext.tsx` e hook `useAuth()`, centralizando o estado de sessão, token JWT, dados do usuário/empresa e verificação de roles. |
| **EFFICIENTI-389** | Componente Global de Loading e Erros | `src/components/Feedback/LoadingSpinner.tsx` e `ErrorMessage.tsx` com conformidade de acessibilidade (ARIA live regions e roles). |
| **EFFICIENTI-327** | Gerenciar estado e efeitos sem mutação e com dependências corretas | Imutabilidade estrita no `AuthContext` e `useAsyncAction`, garantindo cancelamento seguro e sem vazamento de memória em desmontagem. |
| **EFFICIENTI-328** | Renderizar listas dinâmicas com chaves estáveis | Contratos tipados em `src/types/dashboard.ts` fornecendo identificadores únicos imutáveis (`id`, `codigoViagem`) para a Visão Geral. |

---

## 3. Arquitetura de Estado e Controle de Acesso (RBAC)

### 3.1. Topologia do Provedor de Autenticação
O `AuthProvider` envolve a árvore de roteamento no `App.tsx`, distribuindo o estado de sessão de forma reativa:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App.tsx                                   │
│                        <BrowserRouter>                                 │
│                              │                                         │
│                      <AuthProvider>                                    │
│                              │                                         │
│            ┌─────────────────┴─────────────────┐                       │
│            ▼                                   ▼                       │
│     [Rotas Públicas]                   <PrivateRoute>                  │
│   (/, /login, /404)              (Verifica isAuthenticated & Roles)    │
│                                                │                       │
│                                                ▼                       │
│                                        [Rotas Privadas]                │
│                                          (/dashboard)                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Ciclo de Vida da Sessão
1. **Inicialização:** Ao carregar a página, o `AuthContext` busca os dados gravados no `localStorage` (`@efficientia:token`, `@efficientia:user`, `@efficientia:empresa`). A flag `isLoading` permanece `true` até a checagem ser concluída, evitando que o `PrivateRoute` redirecione prematuramente para `/login`.
2. **Autenticação:**
   - Funcionários/Analistas executam `loginFuncionario(dados)`, populando o perfil operacional e derivando as permissões baseadas no enum `TipoUsuario`.
   - Administradores executam `loginAdmin(dados)` ou `cadastrarPrimeiroAdmin(dados)`, obtendo autoridades `ROLE_ADMIN` e `ROLE_ADMINISTRADOR`.
3. **Revogação / Expiração (HTTP 401):** O interceptor do Axios dispara um evento global `efficientia:unauthorized`. O `AuthContext` captura o evento de forma passiva, limpa os registros locais e redefine o estado sem recarregar forçadamente o navegador.

---

## 4. Estrutura de Dados da Visão Geral (Dashboard)

Para alimentar a tela principal (`/dashboard`) mantendo total compatibilidade com o layout de design do projeto:

### 4.1. Indicadores Chave de Performance (KPIs)
- **Diários de Viagem:** Total acumulado na semana, quantidade de diários pendentes de homologação e variação percentual comparativa.
- **Transporte de Bovinos:** Volume de animais transportados, índice de mortes em rota e variações semanais.
- **Taxa de Mortalidade:** Percentual calculado em relação ao total embarcado com comparativo contra a meta corporativa interna ($< 0,5\%$).
- **Índice de Anomalias:** Ocorrências segregadas nas etapas de embarque e desembarque.

### 4.2. Gráficos de Tendência Diária
Distribuição temporal contínua de domingo a sábado cobrindo:
1. Volume diário de desembarque.
2. Volume diário de embarque.
3. Mortes registradas por dia.
4. Anomalias categorizadas por etapa operacional.

### 4.3. Listagens Operacionais
- **Fila de Análise:** Diários em espera de parecer do Analista com dados da viagem (`RR-2041`), número da GTA (`MS-0398471`), motorista responsável e trecho de rota.
- **Alertas Operacionais:** Avisos com categorização de criticidade (`baixa`, `media`, `alta`, `critica`) e classificação por domínio (manutenção veicular, CNH, sanidade animal e inspeções periódicas).
- **Rotas em Andamento:** Monitoramento de caminhões em trânsito com taxa de progresso visual de 0 a 100%.

---

## 5. Componentes Universais de Feedback (`src/components/Feedback/`)

### 5.1. `LoadingSpinner`
- Renderização em SVG animado sem dependência de bibliotecas de terceiros.
- Atributos `role="status"` e `aria-live="polite"` garantindo notificação adequada a tecnologias assistivas (leitores de tela).
- Suporte a modo tela cheia (`fullScreen={true}`) com efeito de desfoque translúcido (`backdrop-filter`).

### 5.2. `ErrorMessage`
- Atributo semântico `role="alert"` para interrupção contextual prioritária.
- Suporte a título contextual, mensagem descritiva de erro e ação opcional de repetição (`onRetry`).

---

## 6. Critérios de Aceite e Verificação

- [x] O `AuthContext` restaura a sessão automaticamente após recarregamento (F5) sem flicker de rota.
- [x] O `PrivateRoute` bloqueia usuários não autenticados e restringe o acesso por lista de perfis permitidos (`allowedRoles`).
- [x] Todos os contratos da Visão Geral possuem tipagem estrita (`src/types/dashboard.ts`).
- [x] O serviço `dashboardService.ts` provê dados estruturados com fallback resiliente para boot da aplicação.
- [x] Os componentes de feedback atendem às diretrizes de acessibilidade WCAG AA.
- [x] A compilação TypeScript e o build de produção Vite passam com zero advertências e zero erros.
