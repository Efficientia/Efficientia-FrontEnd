import type { EmpresaResponse } from './empresa';

export type TipoUsuario =
  | 'administrador'
  | 'motorista'
  | 'manobrista'
  | 'analista'
  | 'pecuarista'
  | 'curraleiro';

export interface UsuarioResponse {
  id: number;
  tipo: TipoUsuario;
  cpf: string;
  codigoInterno: string | null;
  nome: string;
  dataNascimento: string | null;
  email: string;
  telefone: string | null;
  ativo: boolean | null;
  assinaturaFixaCadastrada: boolean | null;
  assinaturaFixaId: string | null;
  urlAssinaturaGeral: string | null;
  cargo: string | null;
  nivelAcesso: string | null;
  cnhNumero: string | null;
  categoriaCnh: string | null;
  dataVencimentoCnh: string | null;
  nomeCompleto: string | null;
  statusCadastro: string | null;
}

export interface LoginRequest {
  cpf: string;
  email: string;
  senha: string;
  codigoEmpresa: string;
}

export interface LoginResponse {
  token: string;
  tokenType: 'Bearer' | string;
  usuario: UsuarioResponse;
}

export interface SignupRequest {
  tipo: TipoUsuario;
  cpf: string;
  codigoInterno?: string | null;
  nome: string;
  dataNascimento?: string | null;
  email: string;
  telefone: string;
  senha: string;
}

export interface AdminResponse {
  id: number;
  empresaId: number;
  codigoEmpresa: string;
  cnpjEmpresa: string | null;
  nome: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  cargo: string | null;
  ativo: boolean | null;
  criadoEm: string | null;
}

export interface CriarPrimeiroAdminRequest {
  empresaId?: number | null;
  codigoEmpresa?: string | null;
  cnpj?: string | null;
  nome: string;
  email: string;
  senha: string;
  cpf?: string | null;
  telefone?: string | null;
  cargo?: string | null;
}

export interface CriarAdminRequest {
  nome: string;
  email: string;
  senha: string;
  cpf?: string | null;
  telefone?: string | null;
  cargo?: string | null;
}

export interface LoginAdminRequest {
  email: string;
  senha: string;
  codigoEmpresa?: string | null;
  cnpj?: string | null;
}

export interface LoginAdminResponse {
  token: string;
  tokenType: 'Bearer' | string;
  expiraEmSegundos: number | null;
  admin: AdminResponse;
  empresa: EmpresaResponse;
  mensagem: string;
  roles: string[];
}

export interface AuthSession {
  token: string;
  user: AdminResponse | UsuarioResponse;
  empresa: EmpresaResponse | null;
  roles: string[];
}
