import type { TipoUsuario } from './auth';

export interface CriarFuncionarioEmpresaRequest {
  tipo: TipoUsuario;
  cpf: string;
  nome: string;
  dataNascimento?: string | null;
  email: string;
  telefone: string;
  senha: string;
  cargo?: string | null;
  cnhNumero?: string | null;
  categoriaCnh?: string | null;
  dataVencimentoCnh?: string | null;
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
}
