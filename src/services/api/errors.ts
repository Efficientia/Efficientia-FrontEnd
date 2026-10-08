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

    return new ApiRequestError(
      detail ?? message ?? title ?? error.message,
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
