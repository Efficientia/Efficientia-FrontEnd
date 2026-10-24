export interface TempGraficoViagensStatus {
  status: string;
  total: number;
}

export interface TempGraficoAnomalia {
  tipo: string;
  total: number;
}

export interface TempGraficoFrota {
  tipo: string;
  total: number;
  emUso?: number;
  disponivel?: number;
}

export interface TempTotaisGerais {
  totalViagens?: number;
  totalUsuarios?: number;
  totalVeiculosCavalo?: number;
  totalVeiculosCarreta?: number;
  totalParadasImprevistas?: number;
  totalAnomaliasEmbarque?: number;
  totalAnomaliasDesembarque?: number;
  totalAnomalias?: number;
  totalDocumentos?: number;
  totalEmpresas?: number;
  totalFazendas?: number;
  totalUnidadesFrigorificas?: number;
  totalEnderecos?: number;
  totalAssinaturasMotorista?: number;
  totalOutboxEventos?: number;
  [key: string]: unknown;
}

export interface TempResumoGraficosResponse {
  totalViagens?: number;
  totalUsuarios?: number;
  totalVeiculosCavalo?: number;
  totalVeiculosCarreta?: number;
  totalParadasImprevistas?: number;
  totalAnomalias?: number;
  viagensPorStatus?: Record<string, number> | TempGraficoViagensStatus[];
  paradasPorMotivo?: Record<string, number>;
  anomaliasPorTipo?: Record<string, number> | TempGraficoAnomalia[];
  totaisGerais?: TempTotaisGerais;
  anomaliasFrequentes?: TempGraficoAnomalia[];
  resumoFrota?: TempGraficoFrota[];
  totalAnimaisTransportados?: number;
  totalMortos?: number;
  taxaMortalidadeGeral?: number;
}

export interface TempTabelaInfo {
  nome?: string;
  schema: string;
  tabela: string;
  alias?: string;
  totalRegistros: number;
  colunas?: string[];
}

export interface TempTabelaConsultaResponse<T = Record<string, unknown>> {
  tabela: string;
  schema: string;
  totalRegistros: number;
  limite: number;
  offset: number;
  colunas: string[];
  dados: T[];
}
