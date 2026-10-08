# Especificação Técnica — Sprint EFFICIENTI-106

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
