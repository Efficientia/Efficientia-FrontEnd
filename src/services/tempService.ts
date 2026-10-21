import { apiClient } from './api/client';
import type {
  TempResumoGraficosResponse,
  TempTabelaConsultaResponse,
  TempTabelaInfo,
} from '../types/temp';

export const tempService = {
  async obterResumoGraficos(signal?: AbortSignal): Promise<TempResumoGraficosResponse> {
    try {
      const { data } = await apiClient.get<TempResumoGraficosResponse>(
        '/api/v1/temp/graficos/metricas-resumo',
        { signal }
      );
      return data;
    } catch {
      // Fallback para caso o backend use o alias /api/v1/temp/resumo-graficos
      const { data } = await apiClient.get<TempResumoGraficosResponse>(
        '/api/v1/temp/resumo-graficos',
        { signal }
      );
      return data;
    }
  },

  async listarTabelas(signal?: AbortSignal): Promise<TempTabelaInfo[]> {
    const { data } = await apiClient.get<TempTabelaInfo[]>('/api/v1/temp/tabelas', { signal });
    return data;
  },

  async consultarTabela<T = Record<string, unknown>>(
    nomeOuAlias: string,
    params?: { limite?: number; offset?: number; ordenarPor?: string; direcao?: 'asc' | 'desc' },
    signal?: AbortSignal
  ): Promise<TempTabelaConsultaResponse<T>> {
    const { data } = await apiClient.get<TempTabelaConsultaResponse<T>>(
      `/api/v1/temp/tabelas/${encodeURIComponent(nomeOuAlias)}`,
      {
        params,
        signal,
      }
    );
    return data;
  },

  async obterTodasTabelas(limite = 1000, signal?: AbortSignal): Promise<Record<string, unknown[]>> {
    const { data } = await apiClient.get<Record<string, unknown[]>>('/api/v1/temp/dados-graficos', {
      params: { limite },
      signal,
    });
    return data;
  },

  async obterRelatoriosViagem(limite = 500, signal?: AbortSignal): Promise<TempTabelaConsultaResponse> {
    const { data } = await apiClient.get<TempTabelaConsultaResponse>('/api/v1/temp/relatorios-viagem', {
      params: { limite },
      signal,
    });
    return data;
  },
};

export default tempService;
