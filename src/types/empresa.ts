export interface EnderecoDto {
  id: number | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  cidade: string | null;
  estado: string | null;
  uf: string | null;
}

export interface CriarEmpresaRequest {
  nomeEmpresa: string;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj: string;
  emailCorporativo: string;
  telefone?: string | null;
  senha?: string | null;
  enderecoId?: number | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  cidade?: string | null;
  estado?: string | null;
  logoUrl?: string | null;
  endereco?: EnderecoDto | null;
}

export interface AtualizarDadosEmpresaRequest {
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  emailCorporativo?: string | null;
  telefone?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  cidade?: string | null;
  estado?: string | null;
  logoUrl?: string | null;
  endereco?: EnderecoDto | null;
}

export interface UploadLogoResponse {
  logoUrl: string;
  mensagem: string;
  tamanhoBytes: number | null;
  mimeType: string | null;
}

export type StatusEmpresa = 'PENDENTE_PRIMEIRO_ADMIN' | 'ATIVO' | 'SUSPENSO';
export type ProximoPassoEmpresa =
  | 'CADASTRO_PRIMEIRO_ADMIN'
  | 'PAINEL_ADMINISTRATIVO'
  | 'LOGIN_ADMINISTRADOR';

export interface EmpresaResponse {
  id: number;
  codigoEmpresa: string;
  codigo: string;
  codigoInterno: string;
  nomeEmpresa: string;
  nome: string;
  nomeFantasia: string;
  razaoSocial: string | null;
  cnpj: string;
  emailCorporativo: string;
  email: string;
  telefone: string | null;
  enderecoId: number | null;
  endereco: EnderecoDto | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  cidade: string | null;
  estado: string | null;
  uf: string | null;
  logoUrl: string | null;
  etapaCadastro: number | null;
  cadastroCompleto: boolean | null;
  status: StatusEmpresa | string;
  requerPrimeiroAdmin: boolean | null;
  proximoPasso: ProximoPassoEmpresa | string;
  mensagem: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
}

export interface LoginEmpresaRequest {
  cnpj: string;
  senha?: string | null;
}

export interface LoginEmpresaResponse {
  empresa: EmpresaResponse;
  status: string;
  requerPrimeiroAdmin: boolean | null;
  proximoPasso: string;
  token: string | null;
  tokenType: string | null;
  expiraEmSegundos: number | null;
  admin: unknown;
  mensagem: string;
}
