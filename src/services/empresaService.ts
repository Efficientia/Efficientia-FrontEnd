import { apiClient, getBaseUrl } from './api/client';
import type {
  AtualizarDadosEmpresaRequest,
  CriarEmpresaRequest,
  EmpresaResponse,
  UploadLogoResponse,
} from '../types/empresa';
import {
  buildFallbackEmpresa,
  findLocalEmpresaByCnpj,
  findLocalEmpresaByCode,
  findLocalEmpresaById,
  saveLocalEmpresa,
} from '../utils/tenantScope';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de logotipo.'));
    reader.readAsDataURL(file);
  });
}

export const empresaService = {
  async cadastrarEmpresa(request: CriarEmpresaRequest, signal?: AbortSignal): Promise<EmpresaResponse> {
    const { data } = await apiClient.post<EmpresaResponse>('/api/v1/empresas', request, { signal });
    return saveLocalEmpresa(data);
  },

  async listar(signal?: AbortSignal): Promise<EmpresaResponse[]> {
    const { data } = await apiClient.get<EmpresaResponse[]>('/api/v1/empresas', { signal });
    return data;
  },

  async buscarPorId(id: number, signal?: AbortSignal): Promise<EmpresaResponse> {
    try {
      const { data } = await apiClient.get<EmpresaResponse>(`/api/v1/empresas/${id}`, { signal });
      return saveLocalEmpresa(data);
    } catch (err) {
      const local = findLocalEmpresaById(id);
      if (local) return local;
      throw err;
    }
  },

  async buscarPorCodigo(codigo: string, signal?: AbortSignal): Promise<EmpresaResponse> {
    try {
      const { data } = await apiClient.get<EmpresaResponse>(
        `/api/v1/empresas/codigo/${encodeURIComponent(codigo)}`,
        { signal }
      );
      return saveLocalEmpresa(data);
    } catch (err) {
      const local = findLocalEmpresaByCode(codigo);
      if (local) return local;
      throw err;
    }
  },

  async buscarPorCnpj(cnpj: string, signal?: AbortSignal): Promise<EmpresaResponse> {
    try {
      const { data } = await apiClient.get<EmpresaResponse>(
        `/api/v1/empresas/cnpj/${encodeURIComponent(cnpj)}`,
        { signal }
      );
      return saveLocalEmpresa(data);
    } catch (err) {
      const local = findLocalEmpresaByCnpj(cnpj);
      if (local) return local;
      throw err;
    }
  },

  async atualizarDadosComplementares(
    id: number,
    request: AtualizarDadosEmpresaRequest,
    signal?: AbortSignal
  ): Promise<EmpresaResponse> {
    const existing = findLocalEmpresaById(id);
    if (existing) {
      saveLocalEmpresa({
        ...existing,
        ...(request.nomeFantasia ? { nomeFantasia: request.nomeFantasia, nomeEmpresa: request.nomeFantasia, nome: request.nomeFantasia } : {}),
        ...(request.razaoSocial ? { razaoSocial: request.razaoSocial } : {}),
        ...(request.cnpj ? { cnpj: request.cnpj } : {}),
        ...(request.emailCorporativo ? { emailCorporativo: request.emailCorporativo, email: request.emailCorporativo } : {}),
        ...(request.telefone ? { telefone: request.telefone } : {}),
        ...(request.cep ? { cep: request.cep } : {}),
        ...(request.logradouro ? { logradouro: request.logradouro } : {}),
        ...(request.numero ? { numero: request.numero } : {}),
        ...(request.cidade ? { cidade: request.cidade } : {}),
        ...(request.estado ? { estado: request.estado, uf: request.estado } : {}),
        ...(request.logoUrl ? { logoUrl: request.logoUrl } : {}),
        etapaCadastro: 2,
      });
    }

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
    const existing = findLocalEmpresaById(id);
    if (existing) {
      saveLocalEmpresa({
        ...existing,
        ...(request.nomeFantasia ? { nomeFantasia: request.nomeFantasia, nomeEmpresa: request.nomeFantasia, nome: request.nomeFantasia } : {}),
        ...(request.razaoSocial ? { razaoSocial: request.razaoSocial } : {}),
        ...(request.cnpj ? { cnpj: request.cnpj } : {}),
        ...(request.emailCorporativo ? { emailCorporativo: request.emailCorporativo, email: request.emailCorporativo } : {}),
        ...(request.telefone ? { telefone: request.telefone } : {}),
        ...(request.cep ? { cep: request.cep } : {}),
        ...(request.logradouro ? { logradouro: request.logradouro } : {}),
        ...(request.numero ? { numero: request.numero } : {}),
        ...(request.cidade ? { cidade: request.cidade } : {}),
        ...(request.estado ? { estado: request.estado, uf: request.estado } : {}),
        ...(request.logoUrl ? { logoUrl: request.logoUrl } : {}),
      });
    }

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
    const existing = findLocalEmpresaByCode(codigo);
    if (existing) {
      saveLocalEmpresa({
        ...existing,
        ...(request.nomeFantasia ? { nomeFantasia: request.nomeFantasia, nomeEmpresa: request.nomeFantasia, nome: request.nomeFantasia } : {}),
        ...(request.razaoSocial ? { razaoSocial: request.razaoSocial } : {}),
        ...(request.cnpj ? { cnpj: request.cnpj } : {}),
        ...(request.emailCorporativo ? { emailCorporativo: request.emailCorporativo, email: request.emailCorporativo } : {}),
        ...(request.telefone ? { telefone: request.telefone } : {}),
        ...(request.cep ? { cep: request.cep } : {}),
        ...(request.logradouro ? { logradouro: request.logradouro } : {}),
        ...(request.numero ? { numero: request.numero } : {}),
        ...(request.cidade ? { cidade: request.cidade } : {}),
        ...(request.estado ? { estado: request.estado, uf: request.estado } : {}),
        ...(request.logoUrl ? { logoUrl: request.logoUrl } : {}),
      });
    }

    const { data } = await apiClient.put<EmpresaResponse>(
      `/api/v1/empresas/codigo/${encodeURIComponent(codigo)}`,
      request,
      { signal }
    );
    return saveLocalEmpresa(data);
  },

  async uploadLogo(empresaId: number, arquivo: File, signal?: AbortSignal): Promise<UploadLogoResponse> {
    let localDataUrl = '';
    try {
      localDataUrl = await fileToDataUrl(arquivo);
      const existing = findLocalEmpresaById(empresaId);
      if (existing && localDataUrl) {
        saveLocalEmpresa({
          ...existing,
          logoUrl: localDataUrl,
        });
      } else if (localDataUrl) {
        saveLocalEmpresa(
          buildFallbackEmpresa(`EMP${empresaId}`, empresaId, {
            logoUrl: localDataUrl,
          })
        );
      }
      if (localDataUrl) {
        localStorage.setItem('@efficientia:empresa:logo_data', localDataUrl);
      }
    } catch {
      // ignora erro de leitura local
    }

    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      const { data } = await apiClient.post<UploadLogoResponse>(`/api/v1/empresas/${empresaId}/logo`, formData, {
        signal,
      });
      return data;
    } catch (err) {
      if (localDataUrl) {
        return {
          logoUrl: localDataUrl,
          mensagem: 'Logo da empresa salva localmente com sucesso.',
          tamanhoBytes: arquivo.size,
          mimeType: arquivo.type || 'image/png',
        };
      }
      throw err;
    }
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
