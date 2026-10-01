import { apiClient, getBaseUrl } from './api/client';
import type {
  CriarEmpresaRequest,
  AtualizarDadosEmpresaRequest,
  EmpresaResponse,
  UploadLogoResponse,
} from '../types/empresa';

/**
 * Serviço responsável pelas operações de gestão e onboarding da Empresa Parceira.
 * Atende às especificações da Sprint 19 e EFFICIENTI-387.
 */
export const empresaService = {
  /**
   * Registra uma nova empresa parceira e gera o código de acesso de 8 dígitos.
   * Rota: POST /api/v1/empresas
   */
  async cadastrarEmpresa(dados: CriarEmpresaRequest): Promise<EmpresaResponse> {
    const { data } = await apiClient.post<EmpresaResponse>('/api/v1/empresas', dados);
    return data;
  },

  /**
   * Atualiza os dados complementares da Etapa 1 de 3 (Endereço, contatos, dados legais).
   * Rota: PUT /api/v1/empresas/{id}/dados-complementares
   */
  async atualizarDadosComplementares(
    id: number | string,
    dados: AtualizarDadosEmpresaRequest
  ): Promise<EmpresaResponse> {
    const { data } = await apiClient.put<EmpresaResponse>(
      `/api/v1/empresas/${id}/dados-complementares`,
      dados
    );
    return data;
  },

  /**
   * Atualização direta dos dados da Etapa 1 utilizando apenas o código de 8 dígitos da empresa.
   * Rota: PUT /api/v1/empresas/codigo/{codigo}
   */
  async atualizarEtapa1PorCodigo(
    codigo: string,
    dados: AtualizarDadosEmpresaRequest
  ): Promise<EmpresaResponse> {
    const { data } = await apiClient.put<EmpresaResponse>(
      `/api/v1/empresas/codigo/${encodeURIComponent(codigo)}`,
      dados
    );
    return data;
  },

  /**
   * Realiza o upload do logotipo corporativo (PNG ou SVG até 5 MB).
   * Rota: POST /api/v1/empresas/{id}/logo
   */
  async uploadLogo(empresaId: number | string, arquivo: File): Promise<UploadLogoResponse> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);

    const { data } = await apiClient.post<UploadLogoResponse>(
      `/api/v1/empresas/${empresaId}/logo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  /**
   * Retorna a URL pública para visualização do logotipo da empresa.
   * Rota pública: GET /api/v1/empresas/{id}/logo/conteudo
   */
  obterUrlLogo(empresaId: number | string): string {
    return `${getBaseUrl()}/api/v1/empresas/${empresaId}/logo/conteudo`;
  },

  /**
   * Consulta pública dos dados da empresa através do código de 8 dígitos.
   * Rota: GET /api/v1/empresas/codigo/{codigo}
   */
  async buscarPorCodigo(codigo: string): Promise<EmpresaResponse> {
    const { data } = await apiClient.get<EmpresaResponse>(
      `/api/v1/empresas/codigo/${encodeURIComponent(codigo)}`
    );
    return data;
  },

  /**
   * Consulta os dados cadastrais da empresa pelo ID numérico.
   * Rota: GET /api/v1/empresas/{id}
   */
  async buscarPorId(id: number | string): Promise<EmpresaResponse> {
    const { data } = await apiClient.get<EmpresaResponse>(`/api/v1/empresas/${id}`);
    return data;
  },
};

export default empresaService;
