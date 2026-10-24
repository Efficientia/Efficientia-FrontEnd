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

    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || !error.response && /timeout|network error/i.test(error.message);
    const normalizedMessage =
      error.response?.status === 401
        ? 'Sua sessão não está autenticada ou expirou. Entre novamente para continuar.'
        : error.response?.status === 403
        ? 'Seu usuário não tem permissão para consultar este recurso.'
        : isTimeout
        ? 'A API do Efficientia não respondeu no tempo esperado. O serviço pode estar acordando; tente novamente em alguns segundos.'
        : detail ?? message ?? title ?? error.message;
    return new ApiRequestError(
      normalizedMessage,
      error.response?.status,
      title,
      fieldErrors
    );
  }

  if (error instanceof Error) {
    return new ApiRequestError(error.message);
  }

  return new ApiRequestError('Erro desconhecido na comunicação com o servidor.');
}
