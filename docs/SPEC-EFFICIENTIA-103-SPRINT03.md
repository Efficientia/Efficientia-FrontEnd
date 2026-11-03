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
| **EFFICIENTI-328** | Renderizar listas dinâmicas com chaves estáveis | A listagem de relatórios usa o identificador persistente `id` do DTO tipado (`src/types/relatorio.ts`) como chave React. |

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
1. **Inicialização:** O `AuthContext` restaura o token de `@efficientia:v1:token` e o perfil versionado de `@efficientia:v1:profile`. `isLoading` permanece `true` durante a restauração, evitando redirecionamento prematuro do `PrivateRoute`.
2. **Autenticação:**
   - Funcionários/Analistas executam `loginFuncionario(dados)`, populando o perfil operacional e derivando as permissões baseadas no enum `TipoUsuario`.
   - Administradores executam `loginAdmin(dados)` ou `cadastrarPrimeiroAdmin(dados)`; o Context preserva os papéis devolvidos pela API.
3. **Revogação / Expiração (HTTP 401):** O interceptor do Axios dispara um evento global `efficientia:unauthorized`. O `AuthContext` captura o evento de forma passiva, limpa os registros locais e redefine o estado sem recarregar forçadamente o navegador.

---

## 4. Dashboard de relatórios paginados

`/dashboard` consulta `GET /api/v1/relatorios-viagem?pagina={pagina}&tamanho={tamanho}` por `relatorioService.listar`. A resposta usa `itens`, `pagina`, `tamanho`, `total` e `totalPaginas`, conforme `RelatorioViagemPageResponse`.

A tabela apresenta somente campos presentes no DTO da API: GTA, nota fiscal, data de embarque, status, ID do motorista e ID da fazenda. A tela representa carregamento, erro/repetição, resultado vazio, total e navegação paginada.

A API atual não fornece um endpoint agregado para KPIs, gráficos de tendência, alertas ou rotas em andamento. A interface não inventa esses valores nem usa fallback/mock de relatórios.

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
- [x] A resposta paginada e os relatórios usam DTOs tipados alinhados ao contrato (`src/types/relatorio.ts`).
- [x] O dashboard lê páginas reais via `relatorioService.listar`, sem dataset falso, com estados de carregamento, erro, vazio e paginação.
- [x] Os componentes de feedback atendem às diretrizes de acessibilidade WCAG AA.
- [x] A compilação TypeScript e o build de produção Vite passam com zero advertências e zero erros.
