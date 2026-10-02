export interface KpiCardDiarios {
  total: number;
  pendentes: number;
  variacaoPercentual: number;
  periodo: string;
}

export interface KpiCardBovinos {
  total: number;
  mortos: number;
  variacaoTotalPercentual: number;
  variacaoMortosPercentual: number;
  periodo: string;
}

export interface KpiCardMortalidade {
  taxaPercentual: number;
  variacaoPercentual: number;
  metaInternaPercentual: number;
  periodo: string;
}

export interface KpiCardAnomalias {
  embarque: number;
  desembarque: number;
  variacaoEmbarquePercentual: number;
  variacaoDesembarquePercentual: number;
  periodo: string;
}

export interface PontoGraficoSemanal {
  dia: 'Dom' | 'Seg' | 'Ter' | 'Qua' | 'Qui' | 'Sex' | 'Sáb' | string;
  valor: number;
}

export interface FilaAnaliseItem {
  id: string | number;
  codigoViagem: string; // Ex: "RR-2041"
  gta: string;          // Ex: "MS-0398471"
  motorista: string;    // Ex: "Jonas Ribeiro"
  origem: string;       // Ex: "Santa Clara"
  destino: string;      // Ex: "Campo Grande"
  status: 'Pendente' | 'Em Análise' | 'Aprovado' | 'Rejeitado' | string;
}

export type CriticidadeAlerta = 'baixa' | 'media' | 'alta' | 'critica';

export interface AlertaOperacional {
  id: string | number;
  titulo: string;
  detalhe: string;
  criticidade: CriticidadeAlerta;
  tipo?: 'manutencao' | 'documentacao' | 'sanidade' | 'fiscal';
}

export interface RotaAndamentoItem {
  id: string | number;
  motorista: string;
  origem: string;
  destino: string;
  progressoPercentual: number; // 0 a 100
  placa?: string;
  status: 'no_prazo' | 'atrasado' | 'em_pausa';
}

export interface VisaoGeralDashboard {
  dataAtualFormatada: string;
  totalRotasEmAndamento: number;
  kpis: {
    diarios: KpiCardDiarios;
    bovinos: KpiCardBovinos;
    mortalidade: KpiCardMortalidade;
    anomalias: KpiCardAnomalias;
  };
  graficos: {
    volumeDesembarque: PontoGraficoSemanal[];
    volumeEmbarque: PontoGraficoSemanal[];
    mortesRegistradas: PontoGraficoSemanal[];
    anomaliasPorEtapa: PontoGraficoSemanal[];
  };
  filaAnalise: FilaAnaliseItem[];
  alertas: AlertaOperacional[];
  rotasEmAndamento: RotaAndamentoItem[];
}
