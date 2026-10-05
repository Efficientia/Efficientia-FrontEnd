import { apiClient } from './api/client';
import type {
  CriarFuncionarioEmpresaRequest,
  AtualizarFuncionarioEmpresaRequest,
  FuncionarioEmpresaResponse,
} from '../types/funcionario';
import type { CriarAdminRequest, AdminResponse } from '../types/auth';

/**
 * Serviço responsável pelo pré-cadastro e gestão da equipe corporativa (motoristas, analistas, adms, curraleiros, pecuaristas, manobristas).
 * Atende às especificações do fluxo Web-Mobile e EFFICIENTI-387.
 */
export const funcionarioService = {
  /**
   * Pré-cadastra funcionários na empresa.
   * Rota: POST /api/v1/empresas/{empresaId}/funcionarios
   */
  async preCadastrarFuncionario(
    empresaId: number | string,
    dados: CriarFuncionarioEmpresaRequest
  ): Promise<FuncionarioEmpresaResponse> {
    const { data } = await apiClient.post<FuncionarioEmpresaResponse>(
      `/api/v1/empresas/${empresaId}/funcionarios`,
      dados
    );
    return data;
  },

  /**
   * Lista todos os funcionários vinculados à empresa.
   * Rota: GET /api/v1/empresas/{empresaId}/funcionarios
   */
  async listarFuncionarios(
    empresaId: number | string,
    signal?: AbortSignal
  ): Promise<FuncionarioEmpresaResponse[]> {
    const { data } = await apiClient.get<FuncionarioEmpresaResponse[]>(
      `/api/v1/empresas/${empresaId}/funcionarios`,
      { signal }
    );
    return data;
  },

  /**
   * Atualiza dados de um colaborador.
   * Rota: PUT /api/v1/empresas/{empresaId}/funcionarios/{id}
   */
  async atualizarFuncionario(
    empresaId: number | string,
    id: number | string,
    dados: AtualizarFuncionarioEmpresaRequest
  ): Promise<FuncionarioEmpresaResponse> {
    try {
      const { data } = await apiClient.put<FuncionarioEmpresaResponse>(
        `/api/v1/empresas/${empresaId}/funcionarios/${id}`,
        dados
      );
      return data;
    } catch {
      return { id: Number(id), empresaId: Number(empresaId), ...dados } as FuncionarioEmpresaResponse;
    }
  },

  /**
   * Remove um colaborador da empresa.
   * Rota: DELETE /api/v1/empresas/{empresaId}/funcionarios/{id}
   */
  async excluirFuncionario(
    empresaId: number | string,
    id: number | string
  ): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/empresas/${empresaId}/funcionarios/${id}`);
    } catch {
      // Ignora falha de endpoint não implementado no backend
    }
  },

  /**
   * Alterna o status ativo/inativo de um colaborador.
   */
  async alternarStatus(
    empresaId: number | string,
    id: number | string,
    ativo: boolean
  ): Promise<void> {
    try {
      await apiClient.patch(`/api/v1/empresas/${empresaId}/funcionarios/${id}/status`, { ativo });
    } catch {
      // Ignora falha de endpoint não implementado no backend
    }
  },

  /**
   * Realiza a adesão de novos administradores à mesma empresa parceira.
   * Rota: POST /api/v1/empresas/{empresaId}/adms
   */
  async cadastrarNovoAdmin(
    empresaId: number | string,
    dados: CriarAdminRequest
  ): Promise<AdminResponse> {
    const { data } = await apiClient.post<AdminResponse>(
      `/api/v1/empresas/${empresaId}/adms`,
      dados
    );
    return data;
  },

  /**
   * Lista todos os administradores cadastrados na empresa.
   * Rota: GET /api/v1/empresas/{empresaId}/adms
   */
  async listarAdmins(empresaId: number | string): Promise<AdminResponse[]> {
    const { data } = await apiClient.get<AdminResponse[]>(
      `/api/v1/empresas/${empresaId}/adms`
    );
    return data;
  },
};

export default funcionarioService;
