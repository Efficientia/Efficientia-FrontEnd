import { apiClient } from './api/client';
import type {
  CriarFuncionarioEmpresaRequest,
  AtualizarFuncionarioEmpresaRequest,
  FuncionarioEmpresaResponse,
} from '../types/funcionario';

function sanitizeCpf(cpf?: string | null): string {
  return (cpf || '').replace(/\D/g, '');
}

function sanitizePhone(telefone?: string | null): string {
  return (telefone || '').replace(/\D/g, '');
}

function sanitizePassword(senha?: string | null): string {
  return (senha || '').trim();
}

export const funcionarioService = {
  async listarFuncionarios(empresaId: number, signal?: AbortSignal): Promise<FuncionarioEmpresaResponse[]> {
    const response = await apiClient.get<FuncionarioEmpresaResponse[]>(
      `/api/v1/empresas/${empresaId}/funcionarios`,
      { signal }
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  async preCadastrarFuncionario(
    empresaId: number,
    dados: CriarFuncionarioEmpresaRequest,
    codigoEmpresaOverride?: string
  ): Promise<FuncionarioEmpresaResponse> {
    const resolvedCodigoEmpresa = (codigoEmpresaOverride || dados.codigoEmpresa || '').trim().toUpperCase();
    const cpf = sanitizeCpf(dados.cpf);
    const telefone = sanitizePhone(dados.telefone);
    const dataNascimento = dados.dataNascimento || null;
    const senha = sanitizePassword(dados.senha);
    const email = (dados.email || '').trim().toLowerCase();

    const strictAdminPayload = {
      tipo: dados.tipo,
      cpf,
      nome: dados.nome.trim(),
      dataNascimento,
      email,
      telefone,
      senha,
      cargo: dados.cargo?.trim() || dados.tipo,
      cnhNumero: dados.cnhNumero?.trim() || null,
      categoriaCnh: dados.categoriaCnh?.trim() || null,
      dataVencimentoCnh: dados.dataVencimentoCnh?.trim() || null,
    };

    const response = await apiClient.post<FuncionarioEmpresaResponse>(
      `/api/v1/empresas/${empresaId}/funcionarios`,
      strictAdminPayload
    );

    return {
      ...response.data,
      codigoEmpresa: response.data.codigoEmpresa || resolvedCodigoEmpresa,
      localVinculado: dados.localVinculado ?? null,
    };
  },

  async atualizarFuncionario(
    empresaId: number,
    usuarioId: number,
    dados: AtualizarFuncionarioEmpresaRequest,
    codigoEmpresaOverride?: string
  ): Promise<FuncionarioEmpresaResponse> {
    const resolvedCodigoEmpresa = (codigoEmpresaOverride || dados.codigoEmpresa || '').trim().toUpperCase();
    const strictUpdatePayload = {
      nome: dados.nome?.trim() || '',
      dataNascimento: '1990-01-01',
      email: (dados.email || '').trim().toLowerCase(),
      telefone: sanitizePhone(dados.telefone),
      cargo: dados.cargo?.trim() || null,
      tipo: dados.tipo || 'motorista',
      ativo: dados.ativo ?? true,
      cnhNumero: dados.cnhNumero?.trim() || null,
      categoriaCnh: dados.categoriaCnh?.trim() || null,
      dataVencimentoCnh: dados.dataVencimentoCnh?.trim() || null,
    };

    const response = await apiClient.put<FuncionarioEmpresaResponse>(
      `/api/v1/empresas/${empresaId}/funcionarios/${usuarioId}`,
      strictUpdatePayload
    );

    return {
      ...response.data,
      codigoEmpresa: response.data.codigoEmpresa || resolvedCodigoEmpresa,
      localVinculado: dados.localVinculado ?? null,
    };
  },

  async alternarStatus(
    empresaId: number,
    usuarioId: number,
    ativo: boolean
  ): Promise<boolean> {
    await apiClient.patch(
      `/api/v1/empresas/${empresaId}/funcionarios/${usuarioId}/status`,
      { ativo }
    );
    return true;
  },

  async removerFuncionario(
    empresaId: number,
    usuarioId: number
  ): Promise<boolean> {
    await apiClient.delete(
      `/api/v1/empresas/${empresaId}/funcionarios/${usuarioId}`
    );
    return true;
  },

  async excluirFuncionario(
    empresaId: number,
    usuarioId: number
  ): Promise<boolean> {
    return this.removerFuncionario(empresaId, usuarioId);
  },

  async cadastrarNovoAdmin(
    empresaId: number,
    dados: {
      nome: string;
      email: string;
      cpf: string;
      telefone?: string | null;
      senha: string;
      cargo?: string | null;
    }
  ): Promise<boolean> {
    await apiClient.post(`/api/v1/empresas/${empresaId}/administradores`, {
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      cpf: sanitizeCpf(dados.cpf),
      telefone: sanitizePhone(dados.telefone),
      senha: sanitizePassword(dados.senha),
      cargo: dados.cargo || 'Administrador',
    });
    return true;
  },
};
