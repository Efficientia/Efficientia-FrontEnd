import axios, { type InternalAxiosRequestConfig } from 'axios';
import { normalizeApiError } from './errors';
import { getStoredToken } from './storage';
/**
 * Obtém a URL base configurada para a API.
 */
export function getBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL || 'https://efficientia-api.onrender.com';
  return url.replace(/\/+$/, '');
}

/**
 * Instância global do cliente HTTP Axios pré-configurada.
 */
export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // 30s de tolerância para cold starts do Render
  headers: {
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
  (error: unknown) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const normalizedError = normalizeApiError(error);
    if (normalizedError.status === 401) {
      window.dispatchEvent(new CustomEvent('efficientia:unauthorized'));
    }

    return Promise.reject(normalizedError);
  }
);

/**
 * Instância exportada e alias de compatibilidade.
 */
export const api = apiClient;

export default apiClient;
