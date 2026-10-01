import type { TipoUsuario } from './auth';

export interface CriarFuncionarioEmpresaRequest {
  tipo: TipoUsuario;
  cpf: string;
  nome: string;
  dataNascimento?: string;
  email: string;
  telefone: string;
  senha: string;
  cargo?: string;
  cnhNumero?: string;
  categoriaCnh?: string;
  dataVencimentoCnh?: string;
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
  cargo?: string;
  ativo: boolean;
  criadoEm?: string;
}
