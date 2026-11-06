import axios from 'axios';
import type { ApiProblemDetail } from '../../types/api';

export class ApiRequestError extends Error {
  readonly status: number | undefined;
  readonly title: string | undefined;
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(
    message: string,
    status?: number,
    title?: string,
    fieldErrors: Readonly<Record<string, string>> = {}
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.title = title;
    this.fieldErrors = fieldErrors;
  }
}

export function normalizeApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (axios.isAxiosError<ApiProblemDetail>(error)) {
    const body = error.response?.data;
    const detail = typeof body?.detail === 'string' ? body.detail : undefined;
    const message = typeof body?.message === 'string' ? body.message : undefined;
    const title = typeof body?.title === 'string' ? body.title : undefined;
    const fieldErrors = body?.fieldErrors ?? {};

    const isTimeout =
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      (!error.response && /timeout|network error/i.test(error.message));

    const isAuthRoute =
      typeof error.config?.url === 'string' && error.config.url.includes('/auth');

    const backendMessage = detail ?? message ?? title;

    let normalizedMessage: string;
    if (backendMessage && !/unauthorized|forbidden|internal server error/i.test(backendMessage)) {
      normalizedMessage = backendMessage;
    } else if (error.response?.status === 401) {
      normalizedMessage = isAuthRoute
        ? 'Credenciais inválidas. Verifique o código da empresa, e-mail e senha.'
        : 'Sua sessão expirou ou não está autenticada. Faça login novamente.';
    } else if (error.response?.status === 403) {
      normalizedMessage = 'Acesso não autorizado para esta operação.';
    } else if (isTimeout) {
      normalizedMessage =
        'A API do Efficientia não respondeu no tempo esperado. Tente novamente em instantes.';
    } else if (!error.response) {
      normalizedMessage =
        'Não foi possível conectar à API do Efficientia. Verifique a conexão, o CORS e tente novamente.';
    } else {
      normalizedMessage = backendMessage ?? error.message;
    }
    return new ApiRequestError(
      normalizedMessage,
      error.response?.status ?? 0,
      title,
      fieldErrors
    );
  }

  if (error instanceof Error) {
    return new ApiRequestError(error.message);
  }

  return new ApiRequestError('Erro inesperado na comunicação com o servidor.');
}
