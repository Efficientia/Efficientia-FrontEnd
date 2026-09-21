export interface EnderecoResponse {
  id: number;
  cep: string;
  logradouro: string;
  numero: string;
  cidade: string;
  estado: string;
}

export interface FazendaResponse {
  id: number;
  pecuaristaId: number;
  enderecoId: number;
  nome: string;
}

export interface CavaloResponse {
  id: number;
  placa: string;
  ativo: boolean;
}

export interface CarretaResponse {
  id: number;
  placa: string;
  capacidadeCabecas: number;
}
