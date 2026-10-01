import { apiClient } from './api/client';
import type {
  CriarFuncionarioEmpresaRequest,
  FuncionarioEmpresaResponse,
} from '../types/funcionario';
import type { CriarAdminRequest, AdminResponse } from '../types/auth';

/**
 * Serviço responsável pelo pré-cadastro da equipe corporativa (motoristas, analistas, adms adicionais).
 * Atende às especificações do fluxo Web-Mobile e EFFICIENTI-387.
 */
export const funcionarioService = {
  /**
   * Pré-cadastra funcionários na empresa (ex: Motorista, Analista, Curraleiro).
   * O motorista utilizará este cadastro para acessar o aplicativo mobile.
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
  async listarFuncionarios(empresaId: number | string): Promise<FuncionarioEmpresaResponse[]> {
    const { data } = await apiClient.get<FuncionarioEmpresaResponse[]>(
      `/api/v1/empresas/${empresaId}/funcionarios`
    );
    return data;
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
