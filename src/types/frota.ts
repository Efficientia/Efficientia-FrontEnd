export type TipoVeiculo = 'CAVALO' | 'CARRETA' | 'CONJUNTO';
export type StatusUsoCaminhao = 'DISPONIVEL' | 'EM_USO';

export interface CriarCaminhaoRequest {
  tipo: TipoVeiculo;
  placa: string;
  placaCarreta?: string | null;
  empresaId?: number | null;
  capacidadeCabecas?: number | null;
  kmAcumulado?: number | null;
  marca?: string | null;
  modelo?: string | null;
  anoFabricacao?: number | null;
  tipoCarreta?: string | null;
  dataVencimentoInspecao?: string | null;
  ativo?: boolean | null;
}

export interface AtualizarCaminhaoRequest {
  placa?: string | null;
  empresaId?: number | null;
  capacidadeCabecas?: number | null;
  kmAcumulado?: number | null;
  marca?: string | null;
  modelo?: string | null;
  anoFabricacao?: number | null;
  tipoCarreta?: string | null;
  dataVencimentoInspecao?: string | null;
  ativo?: boolean | null;
}

export interface CaminhaoResponse {
  id: number;
  tipo: string;
  placa: string;
  empresaId: number | null;
  ativo: boolean | null;
  dataVencimentoInspecao: string | null;
  kmAcumulado: number | null;
  capacidadeCabecas: number | null;
  marca: string | null;
  modelo: string | null;
  anoFabricacao: number | null;
  tipoCarreta: string | null;
  statusUso: StatusUsoCaminhao | string;
  relatorioAtualId: number | null;
  motoristaAtualId: number | null;
  motoristaAtualNome: string | null;
}

export interface CaminhaoAppResponse {
  id: number;
  tipo: string;
  placa: string;
  capacidadeCabecas: number | null;
  kmAcumulado: number | null;
  marca: string | null;
  modelo: string | null;
  ativo: boolean | null;
  inspecaoValida: boolean | null;
  diasParaVencerInspecao: number | null;
  statusUso: StatusUsoCaminhao | string;
  relatorioAtualId: number | null;
  motoristaAtualNome: string | null;
}

export interface CaminhaoRelatorioResponse {
  relatorioId: number;
  statusRelatorio: string;
  motoristaId: number | null;
  motoristaNome: string | null;
  cavalo: CaminhaoResponse | null;
  carreta: CaminhaoResponse | null;
  placaCavalo: string | null;
  placaCarreta: string | null;
  emUso: boolean | null;
}

export interface VincularCaminhaoRelatorioRequest {
  placaCavalo?: string | null;
  placaCarreta?: string | null;
  cavaloId?: number | null;
  carretaId?: number | null;
  motoristaId?: number | null;
}
