import { apiClient } from './api/client';
import type {
  AtualizarCaminhaoRequest,
  CaminhaoAppResponse,
  CaminhaoRelatorioResponse,
  CaminhaoResponse,
  CriarCaminhaoRequest,
  TipoVeiculo,
} from '../types/frota';

export interface CaminhaoFiltroRequest {
  empresaId?: number;
  ativo?: boolean;
  tipo?: TipoVeiculo;
}

export const caminhaoService = {
  async listar(filtros: CaminhaoFiltroRequest = {}, signal?: AbortSignal): Promise<CaminhaoResponse[]> {
    const { data } = await apiClient.get<CaminhaoResponse[]>('/api/v1/caminhoes', { params: filtros, signal });
    return data;
  },

  async buscarPorId(id: number, tipo?: TipoVeiculo, signal?: AbortSignal): Promise<CaminhaoResponse> {
    const { data } = await apiClient.get<CaminhaoResponse>(`/api/v1/caminhoes/${id}`, {
      params: { tipo },
      signal,
    });
    return data;
  },

  async buscarPorPlaca(placa: string, signal?: AbortSignal): Promise<CaminhaoResponse> {
    const { data } = await apiClient.get<CaminhaoResponse>(`/api/v1/caminhoes/placa/${encodeURIComponent(placa)}`, { signal });
    return data;
  },

  async criar(request: CriarCaminhaoRequest, signal?: AbortSignal): Promise<CaminhaoResponse> {
    const { data } = await apiClient.post<CaminhaoResponse>('/api/v1/caminhoes', request, { signal });
    return data;
  },

  async atualizar(
    id: number,
    request: AtualizarCaminhaoRequest,
    tipo?: TipoVeiculo,
    signal?: AbortSignal
  ): Promise<CaminhaoResponse> {
    const { data } = await apiClient.put<CaminhaoResponse>(`/api/v1/caminhoes/${id}`, request, {
      params: { tipo },
      signal,
    });
    return data;
  },

  async excluir(id: number, tipo?: TipoVeiculo, signal?: AbortSignal): Promise<void> {
    await apiClient.delete(`/api/v1/caminhoes/${id}`, { params: { tipo }, signal });
  },

  async listarParaApp(empresaId?: number, signal?: AbortSignal): Promise<CaminhaoAppResponse[]> {
    const { data } = await apiClient.get<CaminhaoAppResponse[]>('/api/v1/caminhoes/app', {
      params: { empresaId },
      signal,
    });
    return data;
  },

  async listarDisponiveis(
    empresaId?: number,
    tipo?: TipoVeiculo,
    signal?: AbortSignal
  ): Promise<CaminhaoResponse[]> {
    const { data } = await apiClient.get<CaminhaoResponse[]>('/api/v1/caminhoes/disponiveis', {
      params: { empresaId, tipo },
      signal,
    });
    return data;
  },

  async buscarDoRelatorio(relatorioId: number, signal?: AbortSignal): Promise<CaminhaoRelatorioResponse> {
    const { data } = await apiClient.get<CaminhaoRelatorioResponse>(
      `/api/v1/caminhoes/relatorio/${relatorioId}`,
      { signal }
    );
    return data;
  },

  async buscarDoMotorista(motoristaId: number, signal?: AbortSignal): Promise<CaminhaoRelatorioResponse> {
    const { data } = await apiClient.get<CaminhaoRelatorioResponse>(
      `/api/v1/caminhoes/motorista/${motoristaId}`,
      { signal }
    );
    return data;
  },
};

export default caminhaoService;
