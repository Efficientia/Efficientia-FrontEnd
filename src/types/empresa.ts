export interface EnderecoDto {
  id?: number;
  cep: string;
  logradouro: string;
  numero: string;
  cidade: string;
  estado?: string;
  uf?: string;
}

export interface CriarEmpresaRequest {
  nomeEmpresa: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj: string;
  emailCorporativo: string;
  telefone?: string;
  senha?: string;
  enderecoId?: number;
  cep?: string;
  logradouro?: string;
  numero?: string;
  cidade?: string;
  estado?: string;
  logoUrl?: string;
  endereco?: EnderecoDto;
}

export interface AtualizarDadosEmpresaRequest {
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
  emailCorporativo?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  cidade?: string;
  estado?: string;
  logoUrl?: string;
  endereco?: EnderecoDto;
}

export interface UploadLogoResponse {
  logoUrl: string;
  mensagem: string;
  tamanhoBytes?: number;
  mimeType?: string;
}

export interface EmpresaResponse {
  id: number;
  codigoEmpresa: string;
  codigo?: string;
  codigoInterno?: string;
  nomeEmpresa: string;
  nome?: string;
  nomeFantasia?: string;
  razaoSocial: string;
  cnpj: string;
  emailCorporativo: string;
  email?: string;
  telefone?: string;
  enderecoId?: number;
  endereco?: EnderecoDto;
  cep?: string;
  logradouro?: string;
  numero?: string;
  cidade?: string;
  estado?: string;
  uf?: string;
  logoUrl?: string;
  etapaCadastro?: number;
  cadastroCompleto?: boolean;
  status: 'PENDENTE_PRIMEIRO_ADMIN' | 'ATIVO' | 'SUSPENSO' | string;
  requerPrimeiroAdmin: boolean;
  proximoPasso: 'CADASTRO_PRIMEIRO_ADMIN' | 'PAINEL_ADMINISTRATIVO' | 'LOGIN_ADMINISTRADOR' | string;
  mensagem?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface LoginEmpresaRequest {
  cnpj: string;
  senha?: string;
}

export interface LoginEmpresaResponse {
  empresa: EmpresaResponse;
  status: string;
  requerPrimeiroAdmin: boolean;
  proximoPasso: string;
  token?: string | null;
  tokenType?: string | null;
  expiraEmSegundos?: number | null;
  admin?: unknown;
  mensagem: string;
}
