# Especificação Técnica - Sprint 02
**Documento:** SPEC-EFFICIENTIA-102-SPRINT02  
**Épico Relacionado:** EFFICIENTI-102 (Integração com Backend)  
**Status:** Concluída  
**Data:** 01/10/2026  
**Responsável Técnico:** Equipe de Engenharia Frontend Efficientia  

---

## 1. Objetivo da Sprint

Estabelecer a camada cliente de integração HTTP com a API RESTful principal do Efficientia (desenvolvida em Java / Spring Boot), garantindo tipagem estrita de todos os contratos de dados (DTOs), injeção autônoma de credenciais JWT via interceptores, isolamento modular dos serviços de domínio, suporte à esteira corporativa de onboarding/cadastros base e fornecimento de utilitários assíncronos para controle transacional de interface (estados de *loading*, sucesso e erro).

---

## 2. Escopo e Mapeamento de Tarefas do Jira

Esta sprint cumpre integralmente os requisitos delineados nas subtasks do épico **EFFICIENTI-102**:

| Chave Jira | Descrição Formal da Tarefa | Entregável Implementado |
| :--- | :--- | :--- |
| **EFFICIENTI-386** | Módulo Axios/Fetch Genérico c/ Tipagem | Instância pré-configurada em `src/services/api/client.ts` com interceptor de injeção de token Bearer, timeout calibrado para cold starts e tratamento centralizado de `401 Unauthorized`. |
| **EFFICIENTI-326** | Isolar serviços externos com retornos tipados e variáveis de ambiente | `VITE_API_URL` é o único endereço configurável. `.env.example` aponta para `http://localhost:8080`; produção é selecionada explicitamente pelo ambiente. |
| **EFFICIENTI-385** | Chamadas de Login e Signup na API Java | Módulo `src/services/authService.ts` com autenticação operacional (`POST /api/v1/auth/login`), onboarding do 1º Admin (`POST /api/v1/auth/adm/primeiro-acesso`) e login corporativo (`POST /api/v1/auth/adm/login`). |
| **EFFICIENTI-387** | Chamadas de Cadastro Base | Módulos `empresaService.ts`, `funcionarioService.ts`, `cadastroBaseService.ts` e `caminhaoService.ts`, cobrindo onboarding, equipe, frota e cadastros operacionais. |
| **EFFICIENTI-331** | Exibir estados de carregamento, sucesso e erro nas operações assíncronas | Hook tipado `src/hooks/useAsyncAction.ts` que desacopla o gerenciamento de estados assíncronos dos componentes visuais. |

---

## 3. Arquitetura de Integração e Fluxo Web-Mobile

### 3.1. Divisão de Responsabilidades
A aplicação Web atua como o portal central de **Governança, Cadastros e Auditoria**, operando em simbiose com o aplicativo Mobile:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API REST PRINCIPAL (Java)                         │
└───────▲──────────────────────▲────────────────────────▲──────────────▲──────┘
        │                      │                        │              │
 ┌──────┴───────────────┐ ┌────┴───────────────────┐ ┌──┴──────────────┴──────┐
 │      PORTAL WEB      │ │    PRÉ-CADASTRO RH     │ │       APP MOBILE       │
 │  (Administrador/RH)  │ │   (Motorista/Analista) │ │      (Motorista)       │
 ├──────────────────────┤ ├────────────────────────┤ ├────────────────────────┤
 │ 1. Criação Empresa   │ │ 4. Pré-login equipe:   │ │ 5. Validação e Login   │
 │ 2. 1º Acesso do ADM  │ │    - Motoristas        │ │    (com código empresa)│
 │ 3. Etapa 1 de 3:     │ │    - Analistas         │ │ 6. Preenchimento de    │
 │    - Dados Legais    │ │    - Manobristas       │ │    Relatórios Viagem   │
 │    - Endereço compl. │ │    - Curraleiros       │ │ 7. Coleta Assinaturas  │
 │    - Upload de Logo  │ │                        │ │ 8. Upload Comprovantes │
 │ 9. Download Doc/Zip  │ │                        │ │    (fotos e PDFs)      │
 └──────────────────────┘ └────────────────────────┘ └────────────────────────┘
```

1. **Onboarding Corporativo:**
   - **Passo 1:** Registro dos dados da empresa (`POST /api/v1/empresas`). A API gera o código único de 8 dígitos (ex: `FRI48291`) e retorna status `PENDENTE_PRIMEIRO_ADMIN`.
   - **Passo 2:** Cadastro compulsório do Primeiro Administrador (`POST /api/v1/auth/adm/primeiro-acesso`). A API desbloqueia a empresa para `ATIVO` e emite o token JWT com `roles: ["ADMIN", "ADMINISTRADOR"]`.
   - **Passo 3 (Etapa 1 de 3):** Enriquecimento dos dados cadastrais e endereço completo (`PUT /api/v1/empresas/{id}/dados-complementares` ou `/codigo/{codigo}`) e upload do logotipo corporativo (`POST /api/v1/empresas/{id}/logo`).
2. **Pré-Cadastro da Força Operacional:**
   - O Administrador cadastra previamente motoristas e analistas no Web (`POST /api/v1/empresas/{empresaId}/funcionarios`).
   - O motorista no Mobile realiza apenas a validação das credenciais no banco, eliminando fricção de cadastro em campo.
3. **Auditoria e Inteligência Documental (Analista Web):**
   - O Analista consome relatórios e comprovantes submetidos pelo Mobile (`GET /api/v1/documentos`).
   - É disponibilizado download individual e geração assíncrona de lotes compactados `.zip` (`POST /api/v1/exportacoes`).

---

## 4. Estrutura dos Módulos Implementados

### 4.1. Camada de Tipagem (`src/types/`)
- `auth.ts`: Modelos de autenticação, tokens JWT, DTOs de primeiro acesso de administradores e roles.
- `empresa.ts`: DTOs de criação de empresa, contratos de endereço (`EnderecoDto`), enriquecimento cadastral da Etapa 1 de 3 e respostas de upload de logo.
- `funcionario.ts`: DTOs para pré-cadastro de motoristas, manobristas, analistas e curraleiros.
- `base.ts`: DTOs para endereços físicos, fazendas e frotas (caminhões tratores e semirreboques).
- `documento.ts`, `relatorio.ts`, `frota.ts` e `api.ts`: contratos de documentos/exportações, relatórios de viagem, caminhões e erros Problem Details.
- `index.ts`: Ponto único de exportação (*barrel export*) de todos os tipos.

### 4.2. Cliente HTTP Centralizado (`src/services/api/`)
- `client.ts`:
  - Usa exclusivamente `VITE_API_URL`, com fallback para a API publicada; desenvolvimento local configura `http://localhost:8080`.
  - Timeout de rede de 30.000 ms para mitigar cold starts de ambientes em nuvem (Render).
  - Interceptor de Requisição: injeta o token Bearer no cabeçalho `Authorization`.
  - Interceptor de Resposta: captura `401`, despacha `efficientia:unauthorized` e preserva `status`, `title` e `fieldErrors` em `ApiRequestError`.
  - `idempotency.ts` centraliza a geração de chaves UUID para operações que exigem `Idempotency-Key`.

### 4.3. Serviços de Domínio (`src/services/`)
- `authService.ts`:
  - `loginUsuario`: Autenticação operacional (`POST /api/v1/auth/login`).
  - `signupUsuario`: Registro de usuários comuns (`POST /api/v1/auth/signup`).
  - `loginEmpresa`: Checagem corporativa (`POST /api/v1/auth/empresa/login`).
  - `cadastrarPrimeiroAdmin`: Primeiro acesso do gestor (`POST /api/v1/auth/adm/primeiro-acesso`).
  - `loginAdmin`: Autenticação administrativa (`POST /api/v1/auth/adm/login`).
  - `verificarStatusApi`: Health check público (`GET /api/v1/status`).
- `empresaService.ts`: cadastro/lista/consulta por ID, código e CNPJ; atualização total/parcial, upload de logo e onboarding.
- `funcionarioService.ts`: pré-cadastro e listagem de funcionários e administradores por empresa.
- `cadastroBaseService.ts`: criação/consulta/atualização/exclusão de usuários e cadastros base de endereço, fazenda, cavalo e carreta.
- `caminhaoService.ts`: CRUD, busca por placa, frota disponível e vínculos com relatório/motorista (`/api/v1/caminhoes`).
- `relatorioService.ts`: criação/edição de rascunhos, paginação, consulta, caminhão vinculado, assinaturas, status, finalização e envio para análise (`/api/v1/relatorios-viagem`).
- `documentoService.ts`: listagem/filtros, upload multipart, assinatura textual, conteúdo binário autenticado, edição otimista e exclusão (`/api/v1/documentos`).
- O mesmo `documentoService.ts` solicita exportações idempotentes, consulta seu estado e baixa o ZIP com Bearer (`/api/v1/exportacoes`).

### 4.4. Hook de Controle Assíncrono (`src/hooks/useAsyncAction.ts`)
Fornece aos componentes de interface construídos manualmente um mecanismo reativo e desacoplado para execução de chamadas à API:
- Retorna `{ data, error, isLoading, isSuccess, isError, execute, reset }`.
- Garante proteção contra vazamento de memória e atualização de estado em componentes desmontados (`isMountedRef`).
- Suporta callbacks opcionais `onSuccess` e `onError`.

---

## 5. Tratamento de Erros e Segurança

1. **Sanitização de Cabeçalhos:** Tokens nunca trafegam em parâmetros de URL (Query String), apenas via cabeçalho `Authorization: Bearer <token>`.
2. **Idempotência:** Uploads de documentos, assinaturas textuais, exportações e submissões de relatório enviam `Idempotency-Key` quando o contrato exige.
3. **Erros da API:** `ApiRequestError` mantém status HTTP, título e erros por campo de `ProblemDetail`; cancelamentos Axios não são convertidos em erro de interface.

---

## 6. Critérios de Aceite e Verificação

- [x] O cliente Axios consome estritamente as variáveis de ambiente com prefixo `VITE_`.
- [x] Todas as rotas de autenticação (usuário, primeiro admin, empresa e admin existente) possuem tipagens estritas de entrada e saída, sem o uso de `any`.
- [x] O fluxo de dados da Etapa 1 de 3 (dados complementares da empresa e upload de logo multipart) está mapeado e pronto para consumo visual.
- [x] O pré-cadastro de funcionários para posterior validação no app mobile está estruturado em serviço dedicado.
- [x] O download e exportação assíncrona de documentos de viagem estão disponíveis para o perfil de Analista.
- [x] O compilador TypeScript valida 100% dos tipos sem inconsistências.
