import type { TipoUsuario } from './auth';

export interface CriarFuncionarioEmpresaRequest {
  tipo: TipoUsuario;
  cpf: string;
  nome: string;
  dataNascimento?: string | null;
  email: string;
  telefone: string;
  senha?: string | null;
  cargo?: string | null;
  cnhNumero?: string | null;
  categoriaCnh?: string | null;
  dataVencimentoCnh?: string | null;
  localVinculado?: string | null;
  codigoEmpresa?: string | null;
}

export interface AtualizarFuncionarioEmpresaRequest {
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  cargo?: string | null;
  tipo?: TipoUsuario;
  cnhNumero?: string | null;
  categoriaCnh?: string | null;
  dataVencimentoCnh?: string | null;
  localVinculado?: string | null;
  ativo?: boolean | null;
  senha?: string | null;
  codigoEmpresa?: string | null;
}

export interface FuncionarioEmpresaResponse {
  id: number;
  empresaId: number;
  codigoEmpresa: string;
  tipo: TipoUsuario;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cargo: string | null;
  ativo: boolean | null;
  criadoEm: string | null;
  localVinculado?: string | null;
  cnhNumero?: string | null;
  categoriaCnh?: string | null;
  dataVencimentoCnh?: string | null;
  isCurrentUser?: boolean;
  senhaProvisoria?: string | null;
}
