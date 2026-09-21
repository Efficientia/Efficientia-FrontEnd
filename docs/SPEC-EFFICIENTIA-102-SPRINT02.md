# Especificação Técnica - Sprint 02
**Documento:** SPEC-EFFICIENTIA-102-SPRINT02
**Épicos Relacionados:** EFFICIENTI-102 (Integração com Backend), EFFICIENTI-103 (Gerenciamento de Estado)
**Status:** Em Andamento

## 1. Objetivo da Sprint
Conectar a aplicação frontend aos endpoints RESTful da API Java (Spring Boot), estabelecer um cliente HTTP genérico com tratamento global de requisições, e implementar a persistência do estado de autenticação do usuário.

## 2. Implementações em Andamento e Planejadas

### 2.1. Módulo HTTP Genérico e Interceptadores (Em Andamento)
- Instalação e configuração da biblioteca HTTP cliente (Axios).
- Construção de uma instância isolada em `src/services/api.ts` com parametrização de `baseURL` e `timeout`.
- Configuração de interceptadores (Request Interceptors) encarregados de extrair o token JWT armazenado localmente e injetá-lo de forma autônoma no cabeçalho `Authorization` (formato Bearer) em todas as requisições autenticadas.

### 2.2. Integração dos Módulos de Autenticação
- Implementação das funções de consumo para os endpoints centrais:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/signup`
- Estruturação do tratamento de respostas e lançamento padronizado de exceções HTTP para a interface de usuário.

### 2.3. Gerenciamento de Estado e Context API
- Criação do `AuthContext` para encapsular a lógica de sessão, distribuindo os dados do usuário autenticado (como identificador e Role) ao longo da árvore de componentes do React, sem necessidade de Prop Drilling.
- Implementação de componentes visuais globais para feedback transacional (indicadores de carregamento durante requisições de rede).