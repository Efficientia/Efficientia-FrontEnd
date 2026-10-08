export type StatusRelatorioViagem = 'rascunho' | 'pendente' | 'aprovado' | 'concluido' | 'reprovado';

export interface ParadaImprevistaDto {
  id?: number | null;
  motivo: string;
  dataHoraInicio: string;
  dataHoraFim: string;
}

export interface AnomaliaItemDto {
  id?: number | null;
  anomalia: string | null;
  descricaoOutros?: string | null;
  quantidadeAnimais: number;
}

export interface CriarRelatorioViagemRequest {
  fazendaId?: number | null;
  unidadeFrigorificaId?: number | null;
  motoristaId?: number | null;
  manobristaId?: number | null;
  curraleiroId?: number | null;
  cavaloId?: number | null;
  carretaId?: number | null;
  placaCavalo?: string | null;
  placaCarreta?: string | null;
  numeroGta?: string | null;
  numeroNotaFiscal?: string | null;
  dataEmbarque?: string | null;
  horarioEmbarque?: string | null;
  horarioSaidaPropriedade?: string | null;
  kmSaidaEmbarcadouro?: number | null;
  dataChegadaUnidade?: string | null;
  horarioChegadaUnidade?: string | null;
  horarioDesembarque?: string | null;
  kmChegadaDesembarcadouro?: number | null;
  numeroCurral?: string | null;
  sireneReFuncionou?: boolean | null;
  quantidadeMachos?: number | null;
  quantidadeFemeas?: number | null;
  quantidadeMarrucos?: number | null;
  quantidadeEmPe?: number | null;
  quantidadeDeitado?: number | null;
  quantidadeMorto?: number | null;
  quantidadeEmergencia?: number | null;
  motivoEmergencia?: string | null;
  comentarios?: string | null;
  urlAssinaturaPecuarista?: string | null;
  urlAssinaturaMotorista?: string | null;
  urlAssinaturaManobrista?: string | null;
  urlAssinaturaCurraleiro?: string | null;
  capacidadeCargaUtilizada?: number | null;
  urlLaudoMortalidade?: string | null;
  status?: StatusRelatorioViagem | null;
  paradasImprevistas?: ParadaImprevistaDto[] | null;
  anomaliasEmbarque?: AnomaliaItemDto[] | null;
  anomaliasDesembarque?: AnomaliaItemDto[] | null;
}

export interface RelatorioViagemResponse {
  id: number;
  fazendaId: number | null;
  unidadeFrigorificaId: number | null;
  motoristaId: number | null;
  manobristaId: number | null;
  curraleiroId: number | null;
  cavaloId: number | null;
  carretaId: number | null;
  empresaId: number | null;
  numeroGta: string | null;
  numeroNotaFiscal: string | null;
  dataEmbarque: string | null;
  horarioEmbarque: string | null;
  horarioSaidaPropriedade: string | null;
  kmSaidaEmbarcadouro: number | null;
  dataChegadaUnidade: string | null;
  horarioChegadaUnidade: string | null;
  horarioDesembarque: string | null;
  kmChegadaDesembarcadouro: number | null;
  numeroCurral: string | null;
  sireneReFuncionou: boolean | null;
  quantidadeMachos: number | null;
  quantidadeFemeas: number | null;
  quantidadeMarrucos: number | null;
  totalAnimais: number | null;
  quantidadeEmPe: number | null;
  quantidadeDeitado: number | null;
  quantidadeMorto: number | null;
  quantidadeEmergencia: number | null;
  motivoEmergencia: string | null;
  comentarios: string | null;
  urlAssinaturaPecuarista: string | null;
  urlAssinaturaMotorista: string | null;
  urlAssinaturaManobrista: string | null;
  urlAssinaturaCurraleiro: string | null;
  criadoEm: string | null;
  status: StatusRelatorioViagem | string;
  atualizadoEm: string | null;
  enviadoEm: string | null;
  finalizadoEm: string | null;
  capacidadeCargaUtilizada: number | null;
  urlLaudoMortalidade: string | null;
  totalAssinaturasColetadas: number | null;
  assinaturasCompletas: boolean | null;
  duracaoViagemMinutos: number | null;
  distanciaPercorridaKm: number | null;
  idempotencyKey: string | null;
  paradasImprevistas: ParadaImprevistaDto[];
  anomaliasEmbarque: AnomaliaItemDto[];
  anomaliasDesembarque: AnomaliaItemDto[];
}

export interface RelatorioViagemPageResponse {
  itens: RelatorioViagemResponse[];
  pagina: number;
  tamanho: number;
  total: number;
  totalPaginas: number;
}

export interface RegistrarAssinaturasRequest {
  urlAssinaturaPecuarista?: string | null;
  urlAssinaturaMotorista?: string | null;
  urlAssinaturaManobrista?: string | null;
  urlAssinaturaCurraleiro?: string | null;
  usarAssinaturaFixaMotorista?: boolean | null;
}
