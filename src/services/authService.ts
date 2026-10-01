import { apiClient, removeStoredToken, setStoredToken } from './api/client';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  UsuarioResponse,
  LoginAdminRequest,
  LoginAdminResponse,
  CriarPrimeiroAdminRequest,
} from '../types/auth';
import type { LoginEmpresaRequest, LoginEmpresaResponse } from '../types/empresa';

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
    const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/login', dados);
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
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
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  /**
   * Cadastra o primeiro administrador da empresa (esteira de onboarding obrigatória).
   * Desbloqueia o status da empresa para ATIVO e emite imediatamente o token JWT com perfil ADMIN.
   * Rota: POST /api/v1/auth/adm/primeiro-acesso
   */
  async cadastrarPrimeiroAdmin(dados: CriarPrimeiroAdminRequest): Promise<LoginAdminResponse> {
    const { data } = await apiClient.post<LoginAdminResponse>('/api/v1/auth/adm/primeiro-acesso', dados);
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  /**
   * Autentica administradores corporativos por e-mail/CPF e senha.
   * Rota: POST /api/v1/auth/adm/login
   */
  async loginAdmin(dados: LoginAdminRequest): Promise<LoginAdminResponse> {
    const { data } = await apiClient.post<LoginAdminResponse>('/api/v1/auth/adm/login', dados);
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  /**
   * Realiza o encerramento da sessão local.
   */
  logout(): void {
    removeStoredToken();
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
