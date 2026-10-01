import type { EmpresaResponse } from './empresa';

export type TipoUsuario =
  | 'MOTORISTA'
  | 'ANALISTA'
  | 'MANOBRISTA'
  | 'CURRALEIRO'
  | 'PECUARISTA'
  | 'ADMINISTRADOR'
  | 'FUNCIONARIO_FRIBOI';

export interface UsuarioResponse {
  id: number;
  tipo: TipoUsuario | string;
  cpf: string;
  codigoInterno: string;
  nome: string;
  dataNascimento?: string;
  email: string;
  telefone?: string;
  ativo: boolean;
}

export interface LoginRequest {
  cpf?: string;
  email?: string;
  senha: string;
  codigoEmpresa: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  usuario: UsuarioResponse;
}

export interface SignupRequest {
  tipo: TipoUsuario | string;
  cpf: string;
  codigoInterno: string;
  nome: string;
  dataNascimento?: string;
  email: string;
  telefone?: string;
  senha: string;
}

export interface AdminResponse {
  id: number;
  empresaId: number;
  codigoEmpresa: string;
  cnpjEmpresa?: string;
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  cargo?: string;
  ativo: boolean;
  criadoEm?: string;
}

export interface CriarPrimeiroAdminRequest {
  empresaId?: number;
  codigoEmpresa?: string;
  cnpj?: string;
  nome: string;
  email: string;
  senha: string;
  cpf?: string;
  telefone?: string;
  cargo?: string;
}

export interface CriarAdminRequest {
  nome: string;
  email: string;
  senha: string;
  cpf?: string;
  telefone?: string;
  cargo?: string;
}

export interface LoginAdminRequest {
  email: string;
  senha: string;
  codigoEmpresa?: string;
  cnpj?: string;
}

export interface LoginAdminResponse {
  token: string;
  tokenType: string;
  expiraEmSegundos?: number;
  admin: AdminResponse;
  empresa: EmpresaResponse;
  mensagem: string;
  roles?: string[];
}

export interface AuthSession {
  token: string;
  user: AdminResponse | UsuarioResponse;
  empresa?: EmpresaResponse | null;
  roles: string[];
}
