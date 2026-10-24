import type { RelatorioViagemResponse } from '../../types/relatorio';
import type { CaminhaoResponse } from '../../types/frota';

/**
 * Apuração dos indicadores da Visão Geral.
 *
 * Fonte única de verdade (endpoints autenticados e restritos à empresa logada):
 *  - GET /api/v1/relatorios-viagem (todas as páginas) → big numbers, gráficos, fila, alertas e rotas
 *  - GET /api/v1/caminhoes                             → alertas de inspeção e placa das rotas
 *  - GET /api/v1/empresas/{id}/funcionarios            → nome dos motoristas (opcional)
 *
 * Nenhum valor é inventado: sem dados, o indicador mostra zero/estado vazio.
 */

export const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_EXCLUIDO = 'excluido';
const STATUS_EM_ANALISE = 'pendente';
/** Viagens abertas, ainda não enviadas para análise (preenchimento progressivo no app). */
const STATUS_ROTA_ABERTA: Record<string, true> = { rascunho: true, em_andamento: true };
/** Diários que ainda exigem ação operacional (não auditados). */
const STATUS_ATIVOS: Record<string, true> = { rascunho: true, pendente: true, em_andamento: true };
const DIAS_ALERTA_INSPECAO = 15;

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

/**
 * Converte datas da API. Campos `format: date` (YYYY-MM-DD) são interpretados no fuso local —
 * `new Date('2026-10-20')` seria meia-noite UTC e cairia no dia anterior no Brasil.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Domingo 00:00 (local) da semana que contém `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

/** Índice 0..6 (Dom..Sáb) dentro da semana iniciada em `weekStart`, ou null se fora dela. */
export function dayIndexInWeek(date: Date | null, weekStart: Date): number | null {
  if (!date) return null;
  const diff = Math.round((startOfDay(date).getTime() - weekStart.getTime()) / DAY_MS);
  return diff >= 0 && diff < 7 ? diff : null;
}

// ---------------------------------------------------------------------------
// Leitura dos campos do diário
// ---------------------------------------------------------------------------

const status = (r: RelatorioViagemResponse) => String(r.status ?? '').toLowerCase();

/** Total de cabeças: `totalAnimais` calculado pela API ou a soma das categorias. */
export function totalAnimaisDoRelatorio(r: RelatorioViagemResponse): number {
  if (typeof r.totalAnimais === 'number') return r.totalAnimais;
  return (r.quantidadeMachos ?? 0) + (r.quantidadeFemeas ?? 0) + (r.quantidadeMarrucos ?? 0);
}


/** Datas só entram após o respectivo campo ser registrado pela API. */
export const dataEmbarqueDe = (r: RelatorioViagemResponse) => parseApiDate(r.dataEmbarque);

export const dataDesembarqueDe = (r: RelatorioViagemResponse) => parseApiDate(r.dataChegadaUnidade);

/** Óbitos só são contabilizados quando a chegada foi registrada pela API. */
export const dataMortesDe = (r: RelatorioViagemResponse) => dataDesembarqueDe(r);
// ---------------------------------------------------------------------------
// Séries semanais
// ---------------------------------------------------------------------------

export interface WeeklySeries {
  diarios: number[];
  pendentes: number[];
  embarque: number[];
  desembarque: number[];
  mortes: number[];
  anomaliasEmbarque: number[];
  anomaliasDesembarque: number[];
}

const zeros = () => [0, 0, 0, 0, 0, 0, 0];

export function buildWeeklySeries(relatorios: RelatorioViagemResponse[], weekStart: Date): WeeklySeries {
  const s: WeeklySeries = {
    diarios: zeros(),
    pendentes: zeros(),
    embarque: zeros(),
    desembarque: zeros(),
    mortes: zeros(),
    anomaliasEmbarque: zeros(),
    anomaliasDesembarque: zeros(),
  };

  relatorios.filter((r) => status(r) !== STATUS_EXCLUIDO).forEach((r) => {
    const animais = totalAnimaisDoRelatorio(r);

    const iEmb = dayIndexInWeek(dataEmbarqueDe(r), weekStart);
    if (iEmb !== null) {
      s.diarios[iEmb] += 1;
      if (status(r) === STATUS_EM_ANALISE) s.pendentes[iEmb] += 1;
      s.embarque[iEmb] += animais;
      s.anomaliasEmbarque[iEmb] += r.anomaliasEmbarque?.length ?? 0;
    }

    const iDes = dayIndexInWeek(dataDesembarqueDe(r), weekStart);
    if (iDes !== null) {
      s.desembarque[iDes] += animais;
      s.anomaliasDesembarque[iDes] += r.anomaliasDesembarque?.length ?? 0;
    }

    const iMor = dayIndexInWeek(dataMortesDe(r), weekStart);
    if (iMor !== null) s.mortes[iMor] += r.quantidadeMorto ?? 0;
  });

  return s;
}

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

// ---------------------------------------------------------------------------
// Big numbers
// ---------------------------------------------------------------------------

export interface KpiTotals {
  diarios: number;
  pendentes: number;
  bovinos: number;
  mortos: number;
  /** Percentual (0–100) ou null quando não há animais embarcados. */
  mortalidadePct: number | null;
  anomaliasEmbarque: number;
  anomaliasDesembarque: number;
}

export function totalsFromSeries(s: WeeklySeries): KpiTotals {
  const bovinos = sum(s.embarque);
  const mortos = sum(s.mortes);
  return {
    diarios: sum(s.diarios),
    pendentes: sum(s.pendentes),
    bovinos,
    mortos,
    mortalidadePct: bovinos > 0 ? (mortos / bovinos) * 100 : null,
    anomaliasEmbarque: sum(s.anomaliasEmbarque),
    anomaliasDesembarque: sum(s.anomaliasDesembarque),
  };
}

export type DeltaTone = 'positive' | 'negative' | 'neutral';
export interface Delta {
  label: string;
  tone: DeltaTone;
}

const pctFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ppFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function tone(diff: number, higherIsBetter: boolean): DeltaTone {
  if (diff === 0) return 'neutral';
  return diff > 0 === higherIsBetter ? 'positive' : 'negative';
}

/** Variação percentual contra a semana anterior. Null quando não há base de comparação. */
export function percentDelta(current: number, previous: number, higherIsBetter: boolean): Delta | null {
  if (previous === 0) return current === 0 ? { label: '0,0%', tone: 'neutral' } : null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? '+' : '';
  return { label: `${sign}${pctFormatter.format(pct)}%`, tone: tone(pct, higherIsBetter) };
}

/** Variação em pontos percentuais (para taxas). */
export function pointsDelta(current: number | null, previous: number | null, higherIsBetter: boolean): Delta | null {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  const sign = diff > 0 ? '+' : '';
  return { label: `${sign}${ppFormatter.format(diff)} p.p.`, tone: tone(diff, higherIsBetter) };
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${ppFormatter.format(value)}%`;
}

// ---------------------------------------------------------------------------
// Barras dos gráficos
// ---------------------------------------------------------------------------

export interface ChartDayBar {
  readonly day: string;
  readonly value: number;
  readonly heightPct: number;
  readonly highlight: boolean;
}

/** Menor valor "redondo" (1, 2, 3, 5 × 10^n) maior ou igual a `max`. */
export function niceCeiling(max: number, minimum = 1): number {
  const target = Math.max(max, minimum);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  for (const step of [1, 2, 3, 5, 10]) {
    if (step * magnitude >= target) return step * magnitude;
  }
  return 10 * magnitude;
}

export function heightPct(value: number, ceiling: number): number {
  if (value <= 0 || ceiling <= 0) return 0;
  return Math.min(100, Math.max(3, Math.round((value / ceiling) * 100)));
}

export function buildBars(values: number[], ceiling: number, todayIndex: number | null): ChartDayBar[] {
  return WEEK_DAYS.map((day, i) => ({
    day,
    value: values[i],
    heightPct: heightPct(values[i], ceiling),
    highlight: i === todayIndex,
  }));
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

export type NomeMotoristaResolver = (motoristaId: number | null) => string;

export function buildMotoristaResolver(
  funcionarios: ReadonlyArray<{ id: number; nome: string }>,
  caminhoes: ReadonlyArray<CaminhaoResponse>
): NomeMotoristaResolver {
  const nomes = new Map<number, string>();
  caminhoes.forEach((c) => {
    if (c.motoristaAtualId && c.motoristaAtualNome) nomes.set(c.motoristaAtualId, c.motoristaAtualNome);
  });
  funcionarios.forEach((f) => {
    if (f.nome) nomes.set(f.id, f.nome);
  });
  return (id) => (id ? nomes.get(id) ?? `Motorista #${id}` : 'Motorista não informado');
}

export function rotaDoRelatorio(r: RelatorioViagemResponse): string {
  const origem = r.nomeOrigem || (r.fazendaId ? `Fazenda #${r.fazendaId}` : 'Origem não informada');
  const destino =
    r.nomeDestino || (r.unidadeFrigorificaId ? `Unidade #${r.unidadeFrigorificaId}` : 'Destino não informado');
  return `${origem} → ${destino}`;
}

const timeOf = (value: string | null | undefined) => parseApiDate(value)?.getTime() ?? 0;

export interface AnalysisQueueItem {
  readonly id: number;
  readonly code: string;
  readonly gta: string;
  readonly driver: string;
  readonly route: string;
  readonly status: string;
}

/** Fila de análise: diários `pendente` (enviados, aguardando parecer), do mais antigo ao mais novo. */
export function buildAnalysisQueue(
  relatorios: RelatorioViagemResponse[],
  nomeMotorista: NomeMotoristaResolver
): AnalysisQueueItem[] {
  return relatorios
    .filter((r) => status(r) === STATUS_EM_ANALISE)
    .sort((a, b) => timeOf(a.enviadoEm ?? a.criadoEm) - timeOf(b.enviadoEm ?? b.criadoEm))
    .map((r) => ({
      id: r.id,
      code: `Diário #${r.id}`,
      gta: r.numeroGta ? `GTA ${r.numeroGta}` : 'GTA não informada',
      driver: nomeMotorista(r.motoristaId),
      route: rotaDoRelatorio(r),
      status: 'Pendente',
    }));
}

export type AlertSeverity = 'bloqueio' | 'alerta';

export interface AlertItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly severity: AlertSeverity;
}

const plural = (n: number, singular: string, pluralForm: string) => (n === 1 ? singular : pluralForm);

export function buildAlerts(
  relatorios: RelatorioViagemResponse[],
  caminhoes: CaminhaoResponse[],
  today: Date
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const hoje = startOfDay(today).getTime();

  caminhoes
    .filter((c) => c.ativo !== false)
    .forEach((c) => {
      const vencimento = parseApiDate(c.dataVencimentoInspecao);
      if (!vencimento) return;
      const dias = Math.round((startOfDay(vencimento).getTime() - hoje) / DAY_MS);
      const dataFmt = vencimento.toLocaleDateString('pt-BR');
      if (dias < 0) {
        alerts.push({
          id: `insp-vencida-${c.tipo}-${c.id}`,
          title: 'Inspeção veicular vencida',
          subtitle: `Placa ${c.placa} • vencida em ${dataFmt} • vínculo a viagens bloqueado`,
          severity: 'bloqueio',
        });
      } else if (dias <= DIAS_ALERTA_INSPECAO) {
        alerts.push({
          id: `insp-vencer-${c.tipo}-${c.id}`,
          title: dias === 0 ? 'Inspeção vence hoje' : `Inspeção a vencer em ${dias} ${plural(dias, 'dia', 'dias')}`,
          subtitle: `Placa ${c.placa} • vence em ${dataFmt}`,
          severity: 'alerta',
        });
      }
    });

  relatorios
    .filter((r) => STATUS_ATIVOS[status(r)])
    .forEach((r) => {
      const ref = `Diário #${r.id}${r.numeroGta ? ` (GTA ${r.numeroGta})` : ''}`;
      const mortos = r.quantidadeMorto ?? 0;
      if (mortos > 0 && !r.urlLaudoMortalidade) {
        alerts.push({
          id: `morte-sem-laudo-${r.id}`,
          title: `${mortos} ${plural(mortos, 'morte', 'mortes')} sem laudo`,
          subtitle: `${ref} • laudo de mortalidade não anexado`,
          severity: 'bloqueio',
        });
      }
      if (r.sireneReFuncionou === false) {
        alerts.push({
          id: `sirene-${r.id}`,
          title: 'Sirene de ré com falha',
          subtitle: `${ref} • risco em manobra`,
          severity: 'alerta',
        });
      }
      const emergencia = r.quantidadeEmergencia ?? 0;
      if (emergencia > 0) {
        alerts.push({
          id: `emergencia-${r.id}`,
          title: `${emergencia} ${plural(emergencia, 'animal', 'animais')} em emergência`,
          subtitle: `${ref}${r.motivoEmergencia ? ` • ${r.motivoEmergencia}` : ''}`,
          severity: 'alerta',
        });
      }
    });

  const peso: Record<AlertSeverity, number> = { bloqueio: 0, alerta: 1 };
  return alerts.sort((a, b) => peso[a.severity] - peso[b.severity]);
}

export interface OngoingRouteItem {
  readonly id: number;
  readonly driver: string;
  readonly route: string;
  readonly stage: string;
  readonly progressPct: number;
}

/** Etapas do diário de rota, na ordem em que o app as preenche. */
const ETAPAS: ReadonlyArray<{ concluida: (r: RelatorioViagemResponse) => boolean; proxima: string }> = [
  { concluida: (r) => Boolean(r.dataEmbarque && r.horarioEmbarque), proxima: 'Aguardando embarque' },
  { concluida: (r) => Boolean(r.horarioSaidaPropriedade), proxima: 'Embarcando na propriedade' },
  { concluida: (r) => Boolean(r.dataChegadaUnidade && r.horarioChegadaUnidade), proxima: 'Em trânsito' },
  { concluida: (r) => Boolean(r.horarioDesembarque), proxima: 'Aguardando desembarque' },
  { concluida: (r) => r.assinaturasCompletas === true, proxima: 'Coletando assinaturas' },
];

export function progressoDaRota(r: RelatorioViagemResponse): { pct: number; stage: string } {
  const concluidas = ETAPAS.filter((e) => e.concluida(r)).length;
  const pendente = ETAPAS.find((e) => !e.concluida(r));
  return {
    pct: Math.round((concluidas / ETAPAS.length) * 100),
    stage: pendente ? pendente.proxima : 'Pronto para envio',
  };
}

/** Rotas em andamento: viagens abertas (`rascunho`/`em_andamento`), com placa do caminhão vinculado. */
export function buildOngoingRoutes(
  relatorios: RelatorioViagemResponse[],
  caminhoes: CaminhaoResponse[],
  nomeMotorista: NomeMotoristaResolver
): OngoingRouteItem[] {
  const placaPorRelatorio = new Map<number, string>();
  caminhoes.forEach((c) => {
    if (!c.relatorioAtualId) return;
    const atual = placaPorRelatorio.get(c.relatorioAtualId);
    // Prefere a placa do cavalo mecânico; a carreta só entra se não houver cavalo.
    if (!atual || String(c.tipo).toUpperCase() === 'CAVALO') placaPorRelatorio.set(c.relatorioAtualId, c.placa);
  });

  return relatorios
    .filter((r) => STATUS_ROTA_ABERTA[status(r)])
    .sort((a, b) => timeOf(b.atualizadoEm ?? b.criadoEm) - timeOf(a.atualizadoEm ?? a.criadoEm))
    .map((r) => {
      const { pct, stage } = progressoDaRota(r);
      const placa = placaPorRelatorio.get(r.id);
      return {
        id: r.id,
        driver: nomeMotorista(r.motoristaId),
        route: `${rotaDoRelatorio(r)}${placa ? ` • ${placa}` : ''}`,
        stage,
        progressPct: pct,
      };
    });
}
