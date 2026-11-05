import { apiClient } from './api/client';
import { clearStoredAuthSession } from './api/storage';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  UsuarioResponse,
  LoginAdminRequest,
  LoginAdminResponse,
  CriarPrimeiroAdminRequest,
  TipoUsuario,
} from '../types/auth';
import type { LoginEmpresaRequest, LoginEmpresaResponse } from '../types/empresa';
import { normalizeCompanyCode } from '../utils/tenantScope';

/**
 * Serviço responsável por todas as operações de autenticação e credenciamento na API Java.
 * Atende aos requisitos da tarefa EFFICIENTI-385.
 */
export const authService = {
  /**
   * Autentica usuários operacionais (Motorista, Manobrista, Analista).
   * Rota: POST /api/v1/auth/login
   */
  async loginUsuario(dados: LoginRequest): Promise<LoginResponse> {
    // Envia estritamente os 4 campos de AuthContracts.LoginRequest (evita erro 400 do Jackson fail-on-unknown-properties)
    const strictPayload = {
      codigoEmpresa: dados.codigoEmpresa.trim(),
      email: dados.email.trim().toLowerCase(),
      cpf: dados.cpf.replace(/\D/g, ''),
      senha: dados.senha,
    };

    try {
      const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/login', strictPayload);
      return data;
    } catch (apiError) {
      // Fallback local caso o colaborador tenha sido cadastrado na sessão atual e a API esteja indisponível
      const targetCompany = normalizeCompanyCode(dados.codigoEmpresaCorporativo || dados.codigoEmpresa) || 'EFF60720';
      try {
        const scopedKey = `efficientia_colaboradores_v3__tenant_${targetCompany}`;
        const rawScoped = localStorage.getItem(scopedKey);
        const rawLegacy = localStorage.getItem('efficientia_colaboradores_v3');
        const list: Array<{
          id?: number;
          empresaId?: number;
          codigoEmpresa?: string;
          tipo?: TipoUsuario;
          nome?: string;
          cpf?: string;
          email?: string;
          telefone?: string;
          cargo?: string;
          ativo?: boolean;
          senhaProvisoria?: string | null;
        }> = [];

        if (rawScoped) {
          const parsed = JSON.parse(rawScoped);
          if (Array.isArray(parsed)) list.push(...parsed);
        }
        if (rawLegacy) {
          const parsed = JSON.parse(rawLegacy);
          if (Array.isArray(parsed)) list.push(...parsed);
        }

        const matched = list.find((c) => {
          if (c.ativo === false) return false;
          const colabCompany = normalizeCompanyCode(c.codigoEmpresa) || 'EFF60720';
          if (colabCompany !== targetCompany) return false;
          const matchesEmailOrCpf =
            (c.email && c.email.toLowerCase() === strictPayload.email) ||
            (c.cpf && c.cpf.replace(/\D/g, '') === strictPayload.cpf);
          if (!matchesEmailOrCpf) return false;
          return Boolean(c.senhaProvisoria && c.senhaProvisoria === strictPayload.senha);
        });

        if (matched) {
          return {
            token: `local-jwt-${matched.id || Date.now()}`,
            tokenType: 'Bearer',
            usuario: {
              id: matched.id || Date.now(),
              tipo: matched.tipo || 'motorista',
              cpf: (matched.cpf || strictPayload.cpf).replace(/\D/g, ''),
              codigoInterno: targetCompany,
              codigoEmpresa: targetCompany,
              empresaId: matched.empresaId || 1,
              nome: matched.nome || 'Colaborador',
              nomeCompleto: matched.nome || 'Colaborador',
              dataNascimento: '1990-01-01',
              email: matched.email || strictPayload.email,
              telefone: matched.telefone || '11999999999',
              cargo: matched.cargo || null,
              ativo: true,
              assinaturaFixaCadastrada: false,
              assinaturaFixaId: null,
              urlAssinaturaGeral: null,
              nivelAcesso: (matched.tipo || 'motorista').toUpperCase(),
              cnhNumero: null,
              categoriaCnh: null,
              dataVencimentoCnh: null,
              statusCadastro: 'ATIVO',
            },
          };
        }
      } catch {
        // Ignora erro de parse local
      }

      throw apiError;
    }
  },

  /**
   * Cadastra novos usuários operacionais no sistema.
   * Rota: POST /api/v1/auth/signup
   */
  async signupUsuario(dados: SignupRequest): Promise<UsuarioResponse> {
    const { data } = await apiClient.post<UsuarioResponse>('/api/v1/auth/signup', dados);
    return data;
  },

  /**
   * Identifica ou autentica a empresa parceira pelo CNPJ/código/e-mail corporativo.
   * Retorna se a empresa está ativa ou se requer o cadastro do primeiro administrador.
   * Rota: POST /api/v1/auth/empresa/login
   */
  async loginEmpresa(dados: LoginEmpresaRequest): Promise<LoginEmpresaResponse> {
    const { data } = await apiClient.post<LoginEmpresaResponse>('/api/v1/auth/empresa/login', dados);
    return data;
  },

  /**
   * Cadastra o primeiro administrador da empresa (esteira de onboarding obrigatória).
   * Desbloqueia o status da empresa para ATIVO e emite imediatamente o token JWT com perfil ADMIN.
   * Rota: POST /api/v1/auth/adm/primeiro-acesso
   */
  async cadastrarPrimeiroAdmin(dados: CriarPrimeiroAdminRequest): Promise<LoginAdminResponse> {
    const { data } = await apiClient.post<LoginAdminResponse>('/api/v1/auth/adm/primeiro-acesso', dados);
    return data;
  },

  /**
   * Autentica administradores corporativos por e-mail/CPF e senha.
   * Rota: POST /api/v1/auth/adm/login
   */
  async loginAdmin(dados: LoginAdminRequest): Promise<LoginAdminResponse> {
    const { data } = await apiClient.post<LoginAdminResponse>('/api/v1/auth/adm/login', dados);
    return data;
  },

  /**
   * Realiza o encerramento da sessão local.
   */
  logout(): void {
    clearStoredAuthSession();
  },

  /**
   * Verifica o status e a saúde da API backend.
   * Rota: GET /api/v1/status
   */
  async verificarStatusApi(): Promise<{ nome: string; status: string; versao: string }> {
    const { data } = await apiClient.get<{ nome: string; status: string; versao: string }>('/api/v1/status');
    return data;
  },
};

export default authService;
