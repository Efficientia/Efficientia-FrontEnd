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
| **EFFICIENTI-326** | Isolar serviços externos com retornos tipados e variáveis de ambiente | Parametrização via `VITE_API_URL` e `VITE_BASE_URL` no `.env`, eliminação de URLs hardcoded e tipagem estrita em `src/types/`. |
| **EFFICIENTI-385** | Chamadas de Login e Signup na API Java | Módulo `src/services/authService.ts` com autenticação operacional (`POST /api/v1/auth/login`), onboarding do 1º Admin (`POST /api/v1/auth/adm/primeiro-acesso`) e login corporativo (`POST /api/v1/auth/adm/login`). |
| **EFFICIENTI-387** | Chamadas de Cadastro Base | Módulos `empresaService.ts`, `funcionarioService.ts` e `cadastroBaseService.ts`, atendendo ao cadastro de empresa, etapa 1 de onboarding, upload de logo, pré-login de funcionários e frotas. |
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
- `documento.ts`: Contratos de metadados documentais, assinaturas digitais, parâmetros de paginação e exportação assíncrona ZIP.
- `index.ts`: Ponto único de exportação (*barrel export*) de todos os tipos.

### 4.2. Cliente HTTP Centralizado (`src/services/api/`)
- `client.ts`:
  - Instancia o `axios.create` parametrizado com `baseURL` oriunda de `import.meta.env.VITE_API_URL`.
  - Timeout de rede de 30.000 ms para mitigar cold starts de ambientes em nuvem (Render).
  - Interceptor de Requisição: localiza e injeta o token Bearer no cabeçalho `Authorization`.
  - Interceptor de Resposta: captura retornos HTTP 401 e dispara o evento customizado `efficientia:unauthorized`. Extrai descrições detalhadas baseadas no padrão RFC 7807 (Problem Details).
  - Helpers de persistência: `getStoredToken()`, `setStoredToken()` e `removeStoredToken()`.

### 4.3. Serviços de Domínio (`src/services/`)
- `authService.ts`:
  - `loginUsuario`: Autenticação operacional (`POST /api/v1/auth/login`).
  - `signupUsuario`: Registro de usuários comuns (`POST /api/v1/auth/signup`).
  - `loginEmpresa`: Checagem corporativa (`POST /api/v1/auth/empresa/login`).
  - `cadastrarPrimeiroAdmin`: Primeiro acesso do gestor (`POST /api/v1/auth/adm/primeiro-acesso`).
  - `loginAdmin`: Autenticação administrativa (`POST /api/v1/auth/adm/login`).
  - `verificarStatusApi`: Health check público (`GET /api/v1/status`).
- `empresaService.ts`:
  - `cadastrarEmpresa`: Registro corporativo (`POST /api/v1/empresas`).
  - `atualizarDadosComplementares`: Atualização por ID (`PUT /api/v1/empresas/{id}/dados-complementares`).
  - `atualizarEtapa1PorCodigo`: Atualização direta por código (`PUT /api/v1/empresas/codigo/{codigo}`).
  - `uploadLogo`: Upload multipart de imagem PNG/SVG até 5 MB (`POST /api/v1/empresas/{id}/logo`).
  - `obterUrlLogo`: Resolução de endpoint público para tags `<img>`.
  - `buscarPorCodigo`: Consulta pública de empresa (`GET /api/v1/empresas/codigo/{codigo}`).
- `funcionarioService.ts`:
  - `preCadastrarFuncionario`: Vinculação de motoristas/analistas (`POST /api/v1/empresas/{empresaId}/funcionarios`).
  - `listarFuncionarios`: Listagem da equipe corporativa (`GET /api/v1/empresas/{empresaId}/funcionarios`).
  - `cadastrarNovoAdmin`: Adesão de novos gestores (`POST /api/v1/empresas/{empresaId}/adms`).
  - `listarAdmins`: Listagem do corpo executivo (`GET /api/v1/empresas/{empresaId}/adms`).
- `cadastroBaseService.ts`:
  - Cadastros de endereços, fazendas de pecuaristas e veículos de transporte de carga viva.
- `documentoService.ts`:
  - `listarDocumentos`: Listagem com suporte a paginação e filtros (`GET /api/v1/documentos`).
  - `baixarConteudo`: Download de arquivo binário (`GET /api/v1/documentos/{id}/conteudo`).
  - `solicitarExportacaoZip`: Disparo de processamento assíncrono com cabeçalho `Idempotency-Key` (`POST /api/v1/exportacoes`).
  - `consultarStatusExportacao`: Polling de processamento (`GET /api/v1/exportacoes/{id}`).
  - `baixarExportacaoZip`: Download do arquivo compactado final (`GET /api/v1/exportacoes/{id}/conteudo`).

### 4.4. Hook de Controle Assíncrono (`src/hooks/useAsyncAction.ts`)
Fornece aos componentes de interface construídos manualmente um mecanismo reativo e desacoplado para execução de chamadas à API:
- Retorna `{ data, error, isLoading, isSuccess, isError, execute, reset }`.
- Garante proteção contra vazamento de memória e atualização de estado em componentes desmontados (`isMountedRef`).
- Suporta callbacks opcionais `onSuccess` e `onError`.

---

## 5. Tratamento de Erros e Segurança

1. **Sanitização de Cabeçalhos:** Tokens nunca trafegam em parâmetros de URL (Query String), apenas via cabeçalho `Authorization: Bearer <token>`.
2. **Idempotência:** Requisições críticas de exportação geram autônomamente identificadores UUID v4 (`Idempotency-Key`) para prevenir processamento duplicado no cluster.
3. **Resiliência a Erros da API:** O cliente intercepta a resposta da API e normaliza mensagens originadas do Spring Boot em instâncias de `Error`, exibíveis diretamente na interface do usuário.

---

## 6. Critérios de Aceite e Verificação

- [x] O cliente Axios consome estritamente as variáveis de ambiente com prefixo `VITE_`.
- [x] Todas as rotas de autenticação (usuário, primeiro admin, empresa e admin existente) possuem tipagens estritas de entrada e saída, sem o uso de `any`.
- [x] O fluxo de dados da Etapa 1 de 3 (dados complementares da empresa e upload de logo multipart) está mapeado e pronto para consumo visual.
- [x] O pré-cadastro de funcionários para posterior validação no app mobile está estruturado em serviço dedicado.
- [x] O download e exportação assíncrona de documentos de viagem estão disponíveis para o perfil de Analista.
- [x] O compilador TypeScript valida 100% dos tipos sem inconsistências.
