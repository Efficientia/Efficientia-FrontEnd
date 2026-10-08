import type { TipoUsuario, UsuarioResponse } from './auth';

export interface CriarUsuarioRequest {
  tipo: TipoUsuario;
  cpf: string;
  codigoInterno?: string | null;
  nome: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  senha: string;
}

export type UsuarioCadastroResponse = UsuarioResponse;

export interface CriarEnderecoRequest {
  cep: string;
  logradouro: string;
  numero: string;
  cidade: string;
  estado: string;
}

export interface EnderecoResponse {
  id: number;
  cep: string;
  logradouro: string;
  numero: string;
  cidade: string;
  estado: string;
}

export interface CriarFazendaRequest {
  pecuaristaId: number;
  enderecoId: number;
  nome: string;
}

export interface FazendaResponse {
  id: number;
  pecuaristaId: number;
  enderecoId: number;
  nome: string;
}

export interface CriarCavaloRequest {
  placa: string;
  ativo: boolean;
}

export interface CavaloResponse {
  id: number;
  placa: string;
  ativo: boolean;
}

export interface AtualizarCavaloRequest {
  placa?: string | null;
  ativo?: boolean | null;
  empresaId?: number | null;
  dataVencimentoInspecao?: string | null;
  kmAcumulado?: number | null;
  marca?: string | null;
  modelo?: string | null;
  anoFabricacao?: number | null;
}

export interface CavaloDetalhadoResponse {
  id: number;
  placa: string;
  ativo: boolean | null;
  empresaId: number | null;
  dataVencimentoInspecao: string | null;
  kmAcumulado: number | null;
  marca: string | null;
  modelo: string | null;
  anoFabricacao: number | null;
}

export interface CriarCarretaRequest {
  placa: string;
  capacidadeCabecas: number;
}

export interface CarretaResponse {
  id: number;
  placa: string;
  capacidadeCabecas: number;
}

export interface AtualizarCarretaRequest {
  placa?: string | null;
  capacidadeCabecas?: number | null;
  ativo?: boolean | null;
  empresaId?: number | null;
  dataVencimentoInspecao?: string | null;
  marca?: string | null;
  modelo?: string | null;
  tipoCarreta?: string | null;
}

export interface CarretaDetalhadaResponse {
  id: number;
  placa: string;
  capacidadeCabecas: number | null;
  ativo: boolean | null;
  empresaId: number | null;
  dataVencimentoInspecao: string | null;
  marca: string | null;
  modelo: string | null;
  tipoCarreta: string | null;
}
