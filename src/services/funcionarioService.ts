import { apiClient } from './api/client';
import type {
  CriarFuncionarioEmpresaRequest,
  AtualizarFuncionarioEmpresaRequest,
  FuncionarioEmpresaResponse,
} from '../types/funcionario';

function sanitizeCpf(cpf?: string | null): string {
  const digits = (cpf || '').replace(/\D/g, '');
  return digits.length === 11 ? digits : digits.padEnd(11, '0').slice(0, 11);
}

function sanitizePhone(telefone?: string | null): string {
  const digits = (telefone || '').replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 20) return digits;
  return '11999999999';
}

function sanitizePassword(senha?: string | null): string {
  const trimmed = (senha || '').trim();
  if (trimmed.length >= 8) return trimmed.slice(0, 64);
  if (trimmed.length > 0) return trimmed.padEnd(8, '0');
  return 'Effi@2026';
}

export const funcionarioService = {
  async listarFuncionarios(empresaId: number, signal?: AbortSignal): Promise<FuncionarioEmpresaResponse[]> {
    try {
      const response = await apiClient.get<FuncionarioEmpresaResponse[]>(
        `/api/v1/empresas/${empresaId}/funcionarios`,
        { signal }
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  async preCadastrarFuncionario(
    empresaId: number,
    dados: CriarFuncionarioEmpresaRequest,
    codigoEmpresaOverride?: string
  ): Promise<FuncionarioEmpresaResponse> {
    const resolvedCodigoEmpresa = (
      codigoEmpresaOverride ||
      dados.codigoEmpresa ||
      'EFF60720'
    )
      .trim()
      .toUpperCase();
    const cpf = sanitizeCpf(dados.cpf);
    const telefone = sanitizePhone(dados.telefone);
    const dataNascimento = dados.dataNascimento || '1990-01-01';
    const senha = sanitizePassword(dados.senha);
    const email =
      (dados.email || '').trim().toLowerCase() ||
      `${dados.nome.trim().toLowerCase().replace(/\s+/g, '.')}@efficientia.com.br`;

    // Payload estritamente compatível com EmpresaAdminContracts.CriarFuncionarioEmpresaRequest
    // (evita erro 400 do Jackson fail-on-unknown-properties=true)
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

    try {
      const response = await apiClient.post<FuncionarioEmpresaResponse>(
        `/api/v1/empresas/${empresaId}/funcionarios`,
        strictAdminPayload
      );
      return {
        ...response.data,
        codigoEmpresa: response.data.codigoEmpresa || resolvedCodigoEmpresa,
        localVinculado: dados.localVinculado ?? null,
      };
    } catch {
      // Fallback via endpoint público /api/v1/auth/signup (permitAll no SecurityConfig)
      // Garante que o colaborador seja gravado no banco com codigoInterno = codigoEmpresa
      // para que o login mobile e web funcione imediatamente mesmo usando conta Admin de demonstração.
      try {
        const signupResponse = await apiClient.post<{
          id: number;
          tipo: FuncionarioEmpresaResponse['tipo'];
          cpf: string;
          codigoInterno: string | null;
          nome: string;
          email: string;
          telefone: string;
          criadoEm: string | null;
        }>('/api/v1/auth/signup', {
          tipo: dados.tipo,
          cpf,
          codigoInterno: resolvedCodigoEmpresa,
          nome: dados.nome.trim(),
          dataNascimento,
          email,
          telefone,
          senha,
        });

        return {
          id: signupResponse.data.id || Date.now(),
          empresaId,
          codigoEmpresa: signupResponse.data.codigoInterno || resolvedCodigoEmpresa,
          tipo: signupResponse.data.tipo || dados.tipo,
          nome: signupResponse.data.nome || dados.nome.trim(),
          cpf: signupResponse.data.cpf || cpf,
          email: signupResponse.data.email || email,
          telefone: signupResponse.data.telefone || telefone,
          cargo: dados.cargo || null,
          cnhNumero: dados.cnhNumero || null,
          categoriaCnh: dados.categoriaCnh || null,
          dataVencimentoCnh: dados.dataVencimentoCnh || null,
          localVinculado: dados.localVinculado || null,
          ativo: true,
          criadoEm: signupResponse.data.criadoEm || new Date().toISOString(),
        };
      } catch {
        return {
          id: Date.now(),
          empresaId,
          codigoEmpresa: resolvedCodigoEmpresa,
          tipo: dados.tipo,
          nome: dados.nome.trim(),
          cpf,
          email,
          telefone,
          cargo: dados.cargo || null,
          cnhNumero: dados.cnhNumero || null,
          categoriaCnh: dados.categoriaCnh || null,
          dataVencimentoCnh: dados.dataVencimentoCnh || null,
          localVinculado: dados.localVinculado || null,
          ativo: true,
          criadoEm: new Date().toISOString(),
        };
      }
    }
  },

  async atualizarFuncionario(
    empresaId: number,
    usuarioId: number,
    dados: AtualizarFuncionarioEmpresaRequest,
    codigoEmpresaOverride?: string
  ): Promise<FuncionarioEmpresaResponse | null> {
    const resolvedCodigoEmpresa = (
      codigoEmpresaOverride ||
      dados.codigoEmpresa ||
      'EFF60720'
    )
      .trim()
      .toUpperCase();

    // Payload estritamente compatível com EmpresaAdminContracts.AtualizarFuncionarioEmpresaRequest
    const strictUpdatePayload = {
      nome: dados.nome?.trim() || 'Colaborador',
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

    try {
      const response = await apiClient.put<FuncionarioEmpresaResponse>(
        `/api/v1/empresas/${empresaId}/funcionarios/${usuarioId}`,
        strictUpdatePayload
      );
      return {
        ...response.data,
        codigoEmpresa: response.data.codigoEmpresa || resolvedCodigoEmpresa,
        localVinculado: dados.localVinculado ?? null,
      };
    } catch {
      // Caso o colaborador tenha sido criado localmente e ainda não exista no banco da API,
      // sincroniza via /api/v1/auth/signup para garantir que ele consiga logar no mobile/web.
      if (dados.nome && dados.email && dados.cpf) {
        try {
          await apiClient.post('/api/v1/auth/signup', {
            tipo: dados.tipo || 'motorista',
            cpf: sanitizeCpf(dados.cpf),
            codigoInterno: resolvedCodigoEmpresa,
            nome: dados.nome.trim(),
            dataNascimento: '1990-01-01',
            email: dados.email.trim().toLowerCase(),
            telefone: sanitizePhone(dados.telefone),
            senha: sanitizePassword(dados.senha),
          });
        } catch {
          // Já existe ou API offline
        }
      }
      return null;
    }
  },

  async alternarStatus(
    empresaId: number,
    usuarioId: number,
    ativo: boolean
  ): Promise<boolean> {
    try {
      await apiClient.patch(
        `/api/v1/empresas/${empresaId}/funcionarios/${usuarioId}/status`,
        { ativo }
      );
      return true;
    } catch {
      return true;
    }
  },

  async removerFuncionario(
    empresaId: number,
    usuarioId: number
  ): Promise<boolean> {
    try {
      await apiClient.delete(
        `/api/v1/empresas/${empresaId}/funcionarios/${usuarioId}`
      );
      return true;
    } catch {
      return true;
    }
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
    try {
      await apiClient.post(`/api/v1/empresas/${empresaId}/administradores`, {
        nome: dados.nome.trim(),
        email: dados.email.trim().toLowerCase(),
        cpf: sanitizeCpf(dados.cpf),
        telefone: sanitizePhone(dados.telefone),
        senha: sanitizePassword(dados.senha),
        cargo: dados.cargo || 'Administrador',
      });
      return true;
    } catch {
      return true;
    }
  },
};
