import { apiClient, getBaseUrl } from './api/client';
import type {
  AtualizarDadosEmpresaRequest,
  CriarEmpresaRequest,
  EmpresaResponse,
  UploadLogoResponse,
} from '../types/empresa';
import {
  findLocalEmpresaByCnpj,
  findLocalEmpresaByCode,
  findLocalEmpresaById,
  saveLocalEmpresa,
} from '../utils/tenantScope';

export const empresaService = {
  async cadastrarEmpresa(request: CriarEmpresaRequest, signal?: AbortSignal): Promise<EmpresaResponse> {
    const { data } = await apiClient.post<EmpresaResponse>('/api/v1/empresas', request, { signal });
    return saveLocalEmpresa(data);
  },

  async listar(signal?: AbortSignal): Promise<EmpresaResponse[]> {
    const { data } = await apiClient.get<EmpresaResponse[]>('/api/v1/empresas', { signal });
    return data;
  },
  async buscarPorId(
    id: number,
    signal?: AbortSignal,
    allowLocalFallback = true
  ): Promise<EmpresaResponse> {
    try {
      const { data } = await apiClient.get<EmpresaResponse>(`/api/v1/empresas/${id}`, { signal });
      return saveLocalEmpresa(data);
    } catch (err) {
      if (allowLocalFallback) {
        const local = findLocalEmpresaById(id);
        if (local) return local;
      }
      throw err;
    }
  },

  async buscarPorCodigo(
    codigo: string,
    signal?: AbortSignal,
    allowLocalFallback = true
  ): Promise<EmpresaResponse> {
    try {
      const { data } = await apiClient.get<EmpresaResponse>(
        `/api/v1/empresas/codigo/${encodeURIComponent(codigo)}`,
        { signal }
      );
      return saveLocalEmpresa(data);
    } catch (err) {
      if (allowLocalFallback) {
        const local = findLocalEmpresaByCode(codigo);
        if (local) return local;
      }
      throw err;
    }
  },

  async buscarPorCnpj(
    cnpj: string,
    signal?: AbortSignal,
    allowLocalFallback = true
  ): Promise<EmpresaResponse> {
    try {
      const { data } = await apiClient.get<EmpresaResponse>(
        `/api/v1/empresas/cnpj/${encodeURIComponent(cnpj)}`,
        { signal }
      );
      return saveLocalEmpresa(data);
    } catch (err) {
      if (allowLocalFallback) {
        const local = findLocalEmpresaByCnpj(cnpj);
        if (local) return local;
      }
      throw err;
    }
  },

  async atualizarDadosComplementares(
    id: number,
    request: AtualizarDadosEmpresaRequest,
    signal?: AbortSignal
  ): Promise<EmpresaResponse> {
    try {
      const { data } = await apiClient.patch<EmpresaResponse>(
        `/api/v1/empresas/${id}/dados-complementares`,
        request,
        { signal }
      );
      return saveLocalEmpresa(data);
    } catch {
      const { data } = await apiClient.put<EmpresaResponse>(
        `/api/v1/empresas/${id}/dados-complementares`,
        request,
        { signal }
      );
      return saveLocalEmpresa(data);
    }
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
    return saveLocalEmpresa(data);
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
    return saveLocalEmpresa(data);
  },

  async uploadLogo(empresaId: number, arquivo: File, signal?: AbortSignal): Promise<UploadLogoResponse> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    const { data } = await apiClient.post<UploadLogoResponse>(
      `/api/v1/empresas/${empresaId}/logo`,
      formData,
      { signal }
    );
    return data;
  },

  obterUrlLogo(empresaId: number): string {
    const existing = findLocalEmpresaById(empresaId);
    if (existing?.logoUrl && existing.logoUrl.startsWith('data:')) {
      return existing.logoUrl;
    }
    return `${getBaseUrl()}/api/v1/empresas/${empresaId}/logo/conteudo`;
  },
};

export default empresaService;
