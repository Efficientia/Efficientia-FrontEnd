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
  ativo?: boolean;
}

export interface CavaloResponse {
  id: number;
  placa: string;
  ativo: boolean;
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
