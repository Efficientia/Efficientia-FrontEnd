import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const TOKEN_STORAGE_KEY = '@efficientia:token';
export const USER_STORAGE_KEY = '@efficientia:user';
export const EMPRESA_STORAGE_KEY = '@efficientia:empresa';


export function getStoredToken(): string | null {
  return (
    localStorage.getItem(TOKEN_STORAGE_KEY) ||
    localStorage.getItem('token') ||
    sessionStorage.getItem(TOKEN_STORAGE_KEY)
  );
}

export function setStoredToken(token: string, persistSessionOnly = false): void {
  if (persistSessionOnly) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  // Sincroniza chave de compatibilidade
  localStorage.setItem('token', token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(EMPRESA_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}
/**
 * Obtém a URL base configurada para a API.
 */
export function getBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || 'https://efficientia-api.onrender.com';
  return url.replace(/\/+$/, '');
}

/**
 * Instância global do cliente HTTP Axios pré-configurada.
 */
export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // 30s de tolerância para cold starts do Render
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Interceptor de Requisição: Injeta o Token Bearer JWT caso exista na sessão.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

/**
 * Interceptor de Resposta: Tratamento padronizado de erros e sessão expirada (401).
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; detail?: string; title?: string }>) => {
    if (error.response?.status === 401) {
      // Dispara evento customizado para permitir que o AuthContext ou Router reaja sem acoplamento direto
      window.dispatchEvent(new CustomEvent('efficientia:unauthorized'));
    }

    const mensagemExtraida =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      'Erro desconhecido na comunicação com o servidor.';

    return Promise.reject(new Error(mensagemExtraida));
  }
);

/**
 * Instância exportada e alias de compatibilidade.
 */
export const api = apiClient;

export default apiClient;
