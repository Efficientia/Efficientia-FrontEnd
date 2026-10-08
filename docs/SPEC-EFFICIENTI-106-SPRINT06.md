# Especificação Técnica — Sprint EFFICIENTI-106

## EFFICIENTI-334 — Estado de autenticação com Context API e reducer

`AuthProvider` expõe a sessão por Context API e centraliza as transições em `authReducer`, com estado tipado para token, usuário, empresa, papéis e carregamento. Restauração, início/fim de requisição, autenticação concluída e logout são ações explícitas; os eventos `401` limpam a sessão pelo mesmo fluxo de logout.

`useAuth` consome o contexto. Callbacks estáveis mantêm as ações previsíveis, e `useMemo` mantém o valor do provider estável enquanto o estado e as ações não mudam.

Verificação reproduzível: `npm run build` e `npm run lint`.


## EFFICIENTI-337 — Sessão versionada no localStorage

`src/services/api/storage.ts` guarda o token em `@efficientia:v1:token` e o perfil versionado (`version: 1`, usuário, empresa e papéis) em `@efficientia:v1:profile`. `getStoredToken()` lê diretamente a chave do token, sem desserializar o perfil a cada requisição. A validação da sessão remove dados malformados; chaves antigas são eliminadas e nunca usadas como fallback.

Somente `AuthContext` persiste sessões autenticadas. `authService` retorna os DTOs sem gravar credenciais como efeito colateral. `useCallback` mantém estáveis login/logout e `hasRole`; `useMemo` evita recriar o valor do Context quando estado e ações não mudam.

Verificação reproduzível: `npm run build` e `npm run lint`. Smoke executado com Node 22 confirmou remoção das chaves legadas, round-trip da sessão v1 e limpeza de perfil JSON corrompido.

## EFFICIENTI-338 — Formulários de autenticação e rotas protegidas

`/login` usa os contratos atuais da API para autenticação de funcionário (CPF, e-mail, senha e código da empresa) e administrador (identificador, senha e código/CNPJ opcionais). Os métodos do Context retornam papéis após persistir a sessão; o redirecionamento ao painel usa a mesma lista central de papéis permitidos que `PrivateRoute`.

Erros HTTP e erros por campo são exibidos como texto React escapado; nenhum conteúdo da API é interpretado como HTML. A página de teste permanece somente em desenvolvimento (`/dev/api-test`).

Verificação reproduzível: `npm run build` e `npm run lint`.

## EFFICIENTI-335 — Hook tipado de leitura cancelável

`src/hooks/useFetchData.ts` executa uma consulta assíncrona tipada e retorna `data`, `error`, `isLoading`, `isSuccess`, `isError` e `refetch`. O erro mantém a classe `ApiRequestError`, incluindo status HTTP e erros por campo do Problem Detail da API.

Cada identidade de `fetcher` e cada chamada de `refetch` inicia uma requisição com `AbortController`. A requisição anterior é cancelada quando o callback muda ou o componente desmonta; cancelamentos não aparecem como erros de interface. O callback deve ser memoizado com `useCallback` para evitar uma nova execução em cada renderização.

```tsx
const carregarRelatorios = useCallback(
  (signal: AbortSignal) => relatorioService.listar(0, 20, signal),
  []
);
const { data, error, isLoading, refetch } = useFetchData(carregarRelatorios);
```

A tela deve representar `isLoading` e `error` explicitamente; `refetch` repete a leitura com um novo sinal de cancelamento. Os serviços de relatórios, documentos, frota, cadastros e empresas aceitam `AbortSignal` nas consultas de leitura.

Verificação reproduzível: `npm run build` e `npm run lint`.

## EFFICIENTI-336 — Carregamento sob demanda das rotas

As páginas públicas, privadas e 404 são carregadas com `React.lazy`; `Suspense` apresenta um `<main aria-busy>` e mensagem `role="status"` enquanto o módulo chega. A tela `/dev/api-test` só cria o import lazy em desenvolvimento e não é emitida no bundle de produção.

Verificação reproduzível: `npm run build` e `npm run lint`; o build de produção gerou chunks por página e não incluiu chunk de `ApiTestWorkbench`.
