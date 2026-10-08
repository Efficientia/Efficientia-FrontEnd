import { apiClient, getBaseUrl } from './api/client';
import type {
  AtualizarDadosEmpresaRequest,
  CriarEmpresaRequest,
  EmpresaResponse,
  UploadLogoResponse,
} from '../types/empresa';

export const empresaService = {
  async cadastrarEmpresa(request: CriarEmpresaRequest, signal?: AbortSignal): Promise<EmpresaResponse> {
    const { data } = await apiClient.post<EmpresaResponse>('/api/v1/empresas', request, { signal });
    return data;
  },

  async listar(signal?: AbortSignal): Promise<EmpresaResponse[]> {
    const { data } = await apiClient.get<EmpresaResponse[]>('/api/v1/empresas', { signal });
    return data;
  },

  async buscarPorId(id: number, signal?: AbortSignal): Promise<EmpresaResponse> {
    const { data } = await apiClient.get<EmpresaResponse>(`/api/v1/empresas/${id}`, { signal });
    return data;
  },

  async buscarPorCodigo(codigo: string, signal?: AbortSignal): Promise<EmpresaResponse> {
    const { data } = await apiClient.get<EmpresaResponse>(
      `/api/v1/empresas/codigo/${encodeURIComponent(codigo)}`,
      { signal }
    );
    return data;
  },

  async buscarPorCnpj(cnpj: string, signal?: AbortSignal): Promise<EmpresaResponse> {
    const { data } = await apiClient.get<EmpresaResponse>(
      `/api/v1/empresas/cnpj/${encodeURIComponent(cnpj)}`,
      { signal }
    );
    return data;
  },

  async atualizarDadosComplementares(
    id: number,
    request: AtualizarDadosEmpresaRequest,
    signal?: AbortSignal
  ): Promise<EmpresaResponse> {
    const { data } = await apiClient.put<EmpresaResponse>(
      `/api/v1/empresas/${id}/dados-complementares`,
      request,
      { signal }
    );
    return data;
  },

  async atualizarDadosParcialmente(
    id: number,
    request: AtualizarDadosEmpresaRequest,
    signal?: AbortSignal
  ): Promise<EmpresaResponse> {
    const { data } = await apiClient.patch<EmpresaResponse>(
      `/api/v1/empresas/${id}/dados-complementares`,
      request,
      { signal }
    );
    return data;
  },

  async atualizarEtapa1PorCodigo(
    codigo: string,
    request: AtualizarDadosEmpresaRequest,
    signal?: AbortSignal
  ): Promise<EmpresaResponse> {
    const { data } = await apiClient.put<EmpresaResponse>(
      `/api/v1/empresas/codigo/${encodeURIComponent(codigo)}`,
      request,
      { signal }
    );
    return data;
  },

  async uploadLogo(empresaId: number, arquivo: File, signal?: AbortSignal): Promise<UploadLogoResponse> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    const { data } = await apiClient.post<UploadLogoResponse>(`/api/v1/empresas/${empresaId}/logo`, formData, {
      signal,
    });
    return data;
  },

  obterUrlLogo(empresaId: number): string {
    return `${getBaseUrl()}/api/v1/empresas/${empresaId}/logo/conteudo`;
  },
};

export default empresaService;
