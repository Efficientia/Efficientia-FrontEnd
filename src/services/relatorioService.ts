import { apiClient } from './api/client';
import { createIdempotencyKey } from './api/idempotency';
import type { CaminhaoRelatorioResponse, VincularCaminhaoRelatorioRequest } from '../types/frota';
import type {
  CriarRelatorioViagemRequest,
  RegistrarAssinaturasRequest,
  RelatorioViagemPageResponse,
  RelatorioViagemResponse,
  StatusRelatorioViagem,
} from '../types/relatorio';

function idempotencyHeaders(key?: string): { 'Idempotency-Key': string } {
  return { 'Idempotency-Key': key ?? createIdempotencyKey() };
}

export const relatorioService = {
  async listar(pagina = 0, tamanho = 20, signal?: AbortSignal): Promise<RelatorioViagemPageResponse> {
    const { data } = await apiClient.get<RelatorioViagemPageResponse>('/api/v1/relatorios-viagem', {
      params: { pagina, tamanho },
      signal,
    });
    return data;
  },

  async buscarPorId(id: number, signal?: AbortSignal): Promise<RelatorioViagemResponse> {
    const { data } = await apiClient.get<RelatorioViagemResponse>(`/api/v1/relatorios-viagem/${id}`, { signal });
    return data;
  },

  async criar(
    request: CriarRelatorioViagemRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<RelatorioViagemResponse> {
    const headers = request.status === 'pendente' ? idempotencyHeaders(idempotencyKey) : undefined;
    const { data } = await apiClient.post<RelatorioViagemResponse>('/api/v1/relatorios-viagem', request, {
      headers,
      signal,
    });
    return data;
  },

  async atualizar(
    id: number,
    request: CriarRelatorioViagemRequest,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<RelatorioViagemResponse> {
    const headers = request.status === 'pendente' ? idempotencyHeaders(idempotencyKey) : undefined;
    const { data } = await apiClient.put<RelatorioViagemResponse>(`/api/v1/relatorios-viagem/${id}`, request, {
      headers,
      signal,
    });
    return data;
  },

  async buscarCaminhao(id: number, signal?: AbortSignal): Promise<CaminhaoRelatorioResponse> {
    const { data } = await apiClient.get<CaminhaoRelatorioResponse>(`/api/v1/relatorios-viagem/${id}/caminhao`, { signal });
    return data;
  },

  async vincularCaminhao(
    id: number,
    request: VincularCaminhaoRelatorioRequest,
    signal?: AbortSignal
  ): Promise<CaminhaoRelatorioResponse> {
    const { data } = await apiClient.post<CaminhaoRelatorioResponse>(
      `/api/v1/relatorios-viagem/${id}/vincular-caminhao`,
      request,
      { signal }
    );
    return data;
  },

  async finalizar(id: number, idempotencyKey?: string, signal?: AbortSignal): Promise<RelatorioViagemResponse> {
    const { data } = await apiClient.patch<RelatorioViagemResponse>(
      `/api/v1/relatorios-viagem/${id}/finalizar`,
      null,
      { headers: idempotencyHeaders(idempotencyKey), signal }
    );
    return data;
  },

  async atualizarStatus(
    id: number,
    status: StatusRelatorioViagem,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<RelatorioViagemResponse> {
    const { data } = await apiClient.patch<RelatorioViagemResponse>(
      `/api/v1/relatorios-viagem/${id}/status`,
      null,
      { params: { status }, headers: idempotencyHeaders(idempotencyKey), signal }
    );
    return data;
  },

  async registrarAssinaturas(
    id: number,
    request: RegistrarAssinaturasRequest,
    signal?: AbortSignal
  ): Promise<RelatorioViagemResponse> {
    const { data } = await apiClient.patch<RelatorioViagemResponse>(
      `/api/v1/relatorios-viagem/${id}/assinaturas`,
      request,
      { signal }
    );
    return data;
  },

  async registrarAssinaturaPapel(
    id: number,
    papel: string,
    urlAssinatura?: string,
    signal?: AbortSignal
  ): Promise<RelatorioViagemResponse> {
    const { data } = await apiClient.post<RelatorioViagemResponse>(
      `/api/v1/relatorios-viagem/${id}/assinar-papel`,
      null,
      { params: { papel, urlAssinatura }, signal }
    );
    return data;
  },

  async enviarParaAnalise(
    id: number,
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<RelatorioViagemResponse> {
    const { data } = await apiClient.patch<RelatorioViagemResponse>(
      `/api/v1/relatorios-viagem/${id}/enviar`,
      null,
      { headers: idempotencyHeaders(idempotencyKey), signal }
    );
    return data;
  },
};

export default relatorioService;
