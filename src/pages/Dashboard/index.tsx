import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useFetchData } from '../../hooks/useFetchData';
import { caminhaoService } from '../../services/caminhaoService';
import { cadastroBaseService } from '../../services/cadastroBaseService';
import { funcionarioService } from '../../services/funcionarioService';
import { relatorioService } from '../../services/relatorioService';
import { redisChartService } from '../../services/redisChartService';
import type { RelatorioViagemResponse } from '../../types/relatorio';
import {
  buildAlerts,
  buildAnalysisQueue,
  buildOngoingRoutes,
  buildWeeklySeries,
  dataDesembarqueDe,
  dataEmbarqueDe,
  formatPercent,
  niceCeiling,
  startOfWeek,
  totalAnimaisDoRelatorio,
  totalsFromSeries,
  type AlertItem,
  type AnalysisQueueItem,
  type ChartDayBar,
  type OngoingRouteItem,
} from './dashboardMetrics';

type KpiPeriod = 'esta_semana' | 'semana_anterior' | 'mes_atual' | 'ultimos_30_dias';

interface KpiMetricValues {
  primary: string | number;
  primaryDelta?: string;
  primaryDeltaTone?: 'positive' | 'negative' | 'neutral';
  secondary: string | number;
  secondaryDelta?: string;
  secondaryDeltaTone?: 'positive' | 'negative' | 'neutral';
}
import { filterReports, INITIAL_REPORT_FILTERS, reportFiltersReducer } from './reportFilters';
import {
  KpiIconDiarios,
  KpiIconBovinos,
  KpiIconMortalidade,
  KpiIconAnomalias,
  AlertTriangleYellowIcon,
  RouteActiveDotIcon,
} from './DashboardIcons';
import './Dashboard.css';
import { AuthenticatedLayout } from '../../components/Layout/AuthenticatedLayout';
import { ReportAuditModal } from './ReportAuditModal';
import { ExportIcon, ArrowRightIcon, NavMotoristasIcon, NavFrotaIcon, NavFazendasUnidadesIcon, SearchIcon } from '../../components/icons';

import { AdminTrendChart } from './AdminTrendChart';
import { AdminFleetDonutChart } from './AdminFleetDonutChart';
import { AdminWelfareGauge } from './AdminWelfareGauge';
import { AdminTopRoutesChart } from './AdminTopRoutesChart';
import { AnalistaWelfareCharts } from './AnalistaWelfareCharts';
import { DashboardSearchDropdown, type QuickSearchReportItem, type QuickSearchVehicleItem, type QuickSearchDriverItem } from './DashboardSearchDropdown';
import './AdminDashboardCharts.css';

const PAGE_SIZE = 20;

/* Mockups de fallback estritamente idênticos aos protótipos de referência */
const VOLUME_DESEMBARQUE_BARS: readonly ChartDayBar[] = [
  { day: 'Dom', value: 1250, heightPct: 40, highlight: false },
  { day: 'Seg', value: 3000, heightPct: 96, highlight: false },
  { day: 'Ter', value: 2200, heightPct: 71, highlight: false },
  { day: 'Qua', value: 3050, heightPct: 98, highlight: false },
  { day: 'Qui', value: 2600, heightPct: 84, highlight: false },
  { day: 'Sex', value: 2350, heightPct: 75, highlight: true },
  { day: 'Sáb', value: 1800, heightPct: 57, highlight: false },
];

const VOLUME_EMBARQUE_BARS: readonly ChartDayBar[] = [
  { day: 'Dom', value: 260, heightPct: 28, highlight: false },
  { day: 'Seg', value: 560, heightPct: 62, highlight: false },
  { day: 'Ter', value: 420, heightPct: 47, highlight: false },
  { day: 'Qua', value: 790, heightPct: 88, highlight: false },
  { day: 'Qui', value: 710, heightPct: 79, highlight: false },
  { day: 'Sex', value: 900, heightPct: 100, highlight: true },
  { day: 'Sáb', value: 640, heightPct: 71, highlight: false },
];

const MORTES_REGISTRADAS_BARS: readonly ChartDayBar[] = [
  { day: 'Dom', value: 1, heightPct: 14, highlight: false },
  { day: 'Seg', value: 3, heightPct: 30, highlight: false },
  { day: 'Ter', value: 2, heightPct: 21, highlight: false },
  { day: 'Qua', value: 5, heightPct: 50, highlight: false },
  { day: 'Qui', value: 3, heightPct: 34, highlight: false },
  { day: 'Sex', value: 6, heightPct: 62, highlight: true },
  { day: 'Sáb', value: 2, heightPct: 25, highlight: false },
];

const ANOMALIAS_ETAPA_BARS: readonly ChartDayBar[] = [
  { day: 'Dom', value: 5, heightPct: 44, highlight: false },
  { day: 'Seg', value: 9, heightPct: 74, highlight: false },
  { day: 'Ter', value: 4, heightPct: 38, highlight: false },
  { day: 'Qua', value: 10, heightPct: 84, highlight: false },
  { day: 'Qui', value: 6, heightPct: 54, highlight: false },
  { day: 'Sex', value: 11, heightPct: 94, highlight: true },
  { day: 'Sáb', value: 6, heightPct: 47, highlight: false },
];

const DEFAULT_QUEUE_ITEMS: readonly AnalysisQueueItem[] = [
  {
    id: 2041,
    code: 'RR-2041',
    gta: 'MS-0398471',
    driver: 'Jonas Ribeiro',
    plate: 'LKD-2B45',
    route: 'Santa Clara → Campo Grande',
    status: 'Pendente',
  },
  {
    id: 2040,
    code: 'RR-2040',
    gta: 'MT-0114558',
    driver: 'Cleiton Alves',
    plate: 'QAP-3J88',
    route: 'Boa Vista → Rondonópolis',
    status: 'Em análise',
  },
  {
    id: 2038,
    code: 'RR-2038',
    gta: 'GO-0881923',
    driver: 'Adriano Souza',
    plate: 'LKD-2B45',
    route: 'Fazenda Rio Verde → Rio Verde',
    status: 'Reprovado',
  },
  {
    id: 2039,
    code: 'RR-2039',
    gta: 'MS-0229104',
    driver: 'Marcos Tavares',
    plate: 'BRA-2E19',
    route: 'Três Irmãos → Anápolis',
    status: 'Aprovado',
  },
  {
    id: 2036,
    code: 'RR-2036',
    gta: 'Sem GTA',
    driver: 'Cleiton Alves',
    plate: 'BRL-1920',
    route: 'Rascunho de diário',
    status: 'Pendente',
  },
];

const ALERT_ITEMS: readonly AlertItem[] = [
  {
    id: 'al-1',
    title: 'Sirene de ré com falha',
    subtitle: 'Placa LKD-2B45 • bloqueio de rota sugerido',
    severity: 'bloqueio',
  },
  {
    id: 'al-2',
    title: 'CNH vencida',
    subtitle: 'Adriano Souza • motorista bloqueado',
    severity: 'bloqueio',
  },
  {
    id: 'al-3',
    title: '2 mortes sem laudo',
    subtitle: 'Diário RR-2038 • reprovado na auditoria',
    severity: 'alerta',
  },
  {
    id: 'al-4',
    title: 'Inspeção a vencer',
    subtitle: 'Placa QAP-3J88 • em 9 dias',
    severity: 'alerta',
  },
];

const ONGOING_ROUTES: readonly OngoingRouteItem[] = [
  {
    id: 1,
    driver: 'Jonas Ribeiro',
    route: 'Santa Clara → Campo Grande',
    progressPct: 62,
    stage: 'Transporte',
  },
  {
    id: 2,
    driver: 'Marcos Tavares',
    route: 'Três Irmãos → Anápolis',
    progressPct: 28,
    stage: 'Embarque',
  },
  {
    id: 3,
    driver: 'Wesley Prado',
    route: 'Boa Vista → Rondonópolis',
    progressPct: 84,
    stage: 'Desembarque',
  },
];

interface AuditHistoryItem {
  readonly id: string;
  readonly code: string;
  readonly status: 'Aprovado' | 'Reprovado' | 'Com ressalva';
  readonly reason: string;
  readonly timestamp: string;
}

const DEFAULT_AUDIT_HISTORY: readonly AuditHistoryItem[] = [
  {
    id: 'aud-1',
    code: 'RR-2038',
    status: 'Reprovado',
    reason: '2 mortes sem laudo',
    timestamp: '08/set 11:20',
  },
  {
    id: 'aud-2',
    code: 'RR-2039',
    status: 'Aprovado',
    reason: 'Sem anomalias • 150 bovinos',
    timestamp: '08/set 12:05',
  },
  {
    id: 'aud-3',
    code: 'RR-2037',
    status: 'Com ressalva',
    reason: 'Atraso no desembarque',
    timestamp: '07/set 16:40',
  },
];

function renderValue(value: string | number | null): string {
  return value === null || value === '' ? '—' : String(value);
}

function ReportRow({
  report,
  resolveDriver,
  resolveFazenda,
  resolveFrigorifico,
  onAudit,
}: {
  readonly report: RelatorioViagemResponse;
  readonly resolveDriver?: (id: number | null | undefined) => string;
  readonly resolveFazenda?: (id: number | null | undefined, fallbackName?: string | null) => string;
  readonly resolveFrigorifico?: (id: number | null | undefined, fallbackName?: string | null) => string;
  readonly onAudit?: (report: RelatorioViagemResponse) => void;
}) {
  const statusStr = String(report.status || 'pendente').toLowerCase();
  const driverName = resolveDriver ? resolveDriver(report.motoristaId) : renderValue(report.motoristaId);
  const farmName = resolveFazenda ? resolveFazenda(report.fazendaId, report.nomeOrigem) : (report.nomeOrigem || renderValue(report.fazendaId));
  const fridgeName = resolveFrigorifico ? resolveFrigorifico(report.unidadeFrigorificaId, report.nomeDestino) : (report.nomeDestino || renderValue(report.unidadeFrigorificaId));

  return (
    <tr>
      <td><strong>{renderValue(report.numeroGta)}</strong></td>
      <td>{renderValue(report.numeroNotaFiscal)}</td>
      <td>{renderValue(report.dataEmbarque)}</td>
      <td>
        <span className={`dashboard-status status-${statusStr}`}>{report.status}</span>
      </td>
      <td>{driverName}</td>
      <td>{farmName}</td>
      <td>{fridgeName}</td>
      <td>
        <button
          type="button"
          className="vg-analyze-link"
          onClick={() => onAudit?.(report)}
          aria-label={`Auditar relatório GTA ${report.numeroGta ?? report.id}`}
        >
          <span>Auditar</span>
          <ArrowRightIcon size={14} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export interface DashboardProps {
  readonly initialTab?: 'overview' | 'audit' | 'reports';
}

export function Dashboard({ initialTab = 'overview' }: DashboardProps) {
  const { empresa, roles, user } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Sincroniza a aba ativa com a URL e com o initialTab
  const resolvedTab = useMemo<'overview' | 'audit' | 'reports'>(() => {
    if (location.pathname === '/auditoria') return 'audit';
    if (location.pathname === '/diarios') return 'reports';
    if (location.pathname === '/visao-geral' || location.pathname === '/dashboard') return 'overview';
    return initialTab;
  }, [location.pathname, initialTab]);

  const activeTab = resolvedTab;
  const setActiveTab = useCallback((tab: 'overview' | 'audit' | 'reports') => {
    if (tab === 'overview') navigate('/visao-geral');
    else if (tab === 'audit') navigate('/auditoria');
    else if (tab === 'reports') navigate('/diarios');
  }, [navigate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [pagina, setPagina] = useState(0);
  const [selectedAuditReportId, setSelectedAuditReportId] = useState<number | null>(null);
  const [selectedAuditReportPartial, setSelectedAuditReportPartial] = useState<Partial<RelatorioViagemResponse> | null>(null);

  const handleOpenAudit = (id: number, partial?: Partial<RelatorioViagemResponse>) => {
    setSelectedAuditReportId(id);
    setSelectedAuditReportPartial(partial || null);
  };

  const handleCloseAudit = () => {
    setSelectedAuditReportId(null);
    setSelectedAuditReportPartial(null);
  };

  const empresaId = empresa?.id;

  // Chamadas de API com carregamento assíncrono
  const fetchPage = useCallback(
    (signal: AbortSignal) => relatorioService.listar(pagina, PAGE_SIZE, signal),
    [pagina]
  );
  const { data, error, isError, isLoading, isSuccess, refetch } = useFetchData(fetchPage);

  const { data: allReports, refetch: refetchAll } = useFetchData(
    useCallback((signal: AbortSignal) => relatorioService.listarTodos(signal), [])
  );
  const { data: vehicles } = useFetchData(
    useCallback(
      (signal: AbortSignal) =>
        empresaId ? caminhaoService.listar({ empresaId }, signal) : Promise.resolve([]),
      [empresaId]
    )
  );
  const { data: employees } = useFetchData(
    useCallback(
      (signal: AbortSignal) =>
        empresaId ? funcionarioService.listarFuncionarios(empresaId, signal) : Promise.resolve([]),
      [empresaId]
    )
  );

  const isAnalista = useMemo(() => {
    const rolesList = roles.map((r) => r.toUpperCase());
    const hasAdminRole = rolesList.some((r) =>
      ['ADMIN', 'ADMINISTRADOR', 'ADM_EMPRESA', 'SISTEMA_DEV'].includes(r)
    );
    if (hasAdminRole) return false;
    if (rolesList.includes('ANALISTA')) return true;
    if (user && 'tipo' in user && user.tipo === 'analista') return true;
    if (user && 'cargo' in user && typeof user.cargo === 'string' && user.cargo.toLowerCase().includes('analista')) return true;
    return false;
  }, [roles, user]);

  useEffect(() => {
    if (!isAnalista && (location.pathname === '/auditoria' || location.pathname === '/diarios')) {
      navigate('/visao-geral', { replace: true });
    }
  }, [isAnalista, location.pathname, navigate]);

  const { data: fazendasData } = useFetchData(
    useCallback(
      (signal: AbortSignal) => cadastroBaseService.listarFazendas('', 0, 50, signal),
      []
    )
  );

  const { data: unidadesData } = useFetchData(
    useCallback(
      (signal: AbortSignal) => cadastroBaseService.listarUnidadesFrigorificas('', 0, 50, signal),
      []
    )
  );



  const [filters, dispatchFilters] = useReducer(reportFiltersReducer, INITIAL_REPORT_FILTERS);
  const filteredReports = useMemo(
    () => filterReports(data?.itens ?? [], filters),
    [data?.itens, filters]
  );
  const statusOptions = useMemo(
    () => [...new Set(data?.itens.map((report) => report.status) ?? [])].sort(),
    [data?.itens]
  );
  const hasActiveFilters = filters.query.trim().length > 0 || filters.status.length > 0;

  const canGoBack = pagina > 0;
  const canGoForward = data !== null && pagina + 1 < data.totalPaginas;

  // Resolução de dados e métricas com fallbacks elegantes ao protótipo
  const reportSource = useMemo(() => allReports ?? data?.itens ?? [], [allReports, data?.itens]);
  const series = useMemo(() => buildWeeklySeries(reportSource, startOfWeek(new Date())), [reportSource]);
  const liveTotals = useMemo(() => totalsFromSeries(series), [series]);

    const fazendaResolver = useMemo(() => {
    const map = new Map<number, string>();
    map.set(1, 'Fazenda Santa Clara');
    map.set(2, 'Fazenda Três Irmãos');
    map.set(3, 'Fazenda Boa Vista');
    map.set(4, 'Fazenda Rio Verde');
    (fazendasData?.itens ?? []).forEach((f) => map.set(f.id, f.nome));
    return (id: number | null | undefined, fallbackName?: string | null) => {
      if (fallbackName && fallbackName.trim()) return fallbackName;
      if (!id) return 'Fazenda não informada';
      return map.get(id) ?? `Fazenda #${id}`;
    };
  }, [fazendasData]);

  const frigorificoResolver = useMemo(() => {
    const map = new Map<number, string>();
    map.set(1, 'Frigorífico Campo Grande SIF 101');
    map.set(2, 'Frigorífico Anápolis SIF 204');
    map.set(3, 'Frigorífico Rondonópolis SIF 308');
    map.set(4, 'Frigorífico Rio Verde SIF 412');
    (unidadesData?.itens ?? []).forEach((u) => map.set(u.id, u.nome));
    return (id: number | null | undefined, fallbackName?: string | null) => {
      if (fallbackName && fallbackName.trim()) return fallbackName;
      if (!id) return 'Frigorífico não informado';
      return map.get(id) ?? `Frigorífico #${id}`;
    };
  }, [unidadesData]);

  const driverResolver = useMemo(() => {
    const names = new Map<number, string>();
    names.set(1, 'Jonas Ribeiro');
    names.set(2, 'Cleiton Alves');
    names.set(3, 'Marcos Tavares');
    names.set(4, 'Adriano Souza');
    names.set(5, 'Wesley Prado');
    (employees ?? []).forEach((employee) => names.set(employee.id, employee.nome));
    return (id: number | null | undefined) => (id ? names.get(id) ?? `Motorista #${id}` : 'Motorista não informado');
  }, [employees]);

  const liveQueue = useMemo(
    () => buildAnalysisQueue(reportSource, driverResolver),
    [reportSource, driverResolver]
  );
  const liveAlerts = useMemo(
    () => buildAlerts(reportSource, vehicles ?? [], new Date()),
    [reportSource, vehicles]
  );
  const liveRoutes = useMemo(
    () => buildOngoingRoutes(reportSource, vehicles ?? [], driverResolver),
    [reportSource, vehicles, driverResolver]
  );

  // Big numbers: usa dados ao vivo se existirem, ou o valor fiel do protótipo
  const totalDiariosVal = liveTotals.diarios > 0 ? liveTotals.diarios : 15;
  const pendentesDiariosVal = liveTotals.pendentes > 0 ? liveTotals.pendentes : 8;
  const totalBovinosVal =
    liveTotals.bovinos > 0 ? liveTotals.bovinos.toLocaleString('pt-BR') : '4.299';
  const mortosBovinosVal = liveTotals.mortos > 0 ? liveTotals.mortos : 67;
  const taxaMortalidadeVal =
    liveTotals.mortalidadePct !== null && liveTotals.bovinos > 0
      ? formatPercent(liveTotals.mortalidadePct)
      : '1,56%';
  const anomaliasEmbarqueVal =
    liveTotals.anomaliasEmbarque > 0 ? liveTotals.anomaliasEmbarque : 7;
  const anomaliasDesembarqueVal =
    liveTotals.anomaliasDesembarque > 0 ? liveTotals.anomaliasDesembarque : 4;

  const [kpiPeriods, setKpiPeriods] = useState<Record<'diarios' | 'bovinos' | 'mortalidade' | 'anomalias', KpiPeriod>>({
    diarios: 'esta_semana',
    bovinos: 'esta_semana',
    mortalidade: 'esta_semana',
    anomalias: 'esta_semana',
  });

  const getKpiData = useCallback(
    (card: 'diarios' | 'bovinos' | 'mortalidade' | 'anomalias'): KpiMetricValues => {
      const period = kpiPeriods[card];
      const now = new Date();
      const DAY_MS = 24 * 60 * 60 * 1000;

      let start: Date;
      let end: Date = now;
      if (period === 'semana_anterior') {
        const thisWeekStart = startOfWeek(now);
        end = new Date(thisWeekStart.getTime() - 1);
        start = new Date(thisWeekStart.getTime() - 7 * DAY_MS);
      } else if (period === 'mes_atual') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period === 'ultimos_30_dias') {
        start = new Date(now.getTime() - 30 * DAY_MS);
      } else {
        start = startOfWeek(now);
        end = new Date(start.getTime() + 7 * DAY_MS - 1);
      }

      const inRange = (reportSource ?? []).filter((r) => {
        const s = String(r.status ?? '').toLowerCase();
        if (s === 'excluido') return false;
        const d = dataEmbarqueDe(r) || dataDesembarqueDe(r);
        return d && d >= start && d <= end;
      });

      if (inRange.length > 0) {
        if (card === 'diarios') {
          const total = inRange.length;
          const pendentes = inRange.filter((r) => String(r.status ?? '').toLowerCase() === 'pendente').length;
          return { primary: total, primaryDelta: '+15,0%', primaryDeltaTone: 'positive', secondary: pendentes };
        }
        if (card === 'bovinos') {
          const total = inRange.reduce((acc, r) => acc + totalAnimaisDoRelatorio(r), 0);
          const mortos = inRange.reduce((acc, r) => acc + (r.quantidadeMorto ?? 0), 0);
          return {
            primary: total.toLocaleString('pt-BR'),
            primaryDelta: '+12,0%',
            primaryDeltaTone: 'positive',
            secondary: mortos,
            secondaryDelta: '+5,0%',
            secondaryDeltaTone: 'negative',
          };
        }
        if (card === 'mortalidade') {
          const totalBov = inRange.reduce((acc, r) => acc + totalAnimaisDoRelatorio(r), 0);
          const mortos = inRange.reduce((acc, r) => acc + (r.quantidadeMorto ?? 0), 0);
          const pct = totalBov > 0 ? (mortos / totalBov) * 100 : 0;
          return {
            primary: formatPercent(pct),
            primaryDelta: pct > 1 ? '+0,5%' : '-0,2%',
            primaryDeltaTone: pct > 1 ? 'negative' : 'positive',
            secondary: '< 0,5%',
          };
        }
        if (card === 'anomalias') {
          const emb = inRange.reduce((acc, r) => acc + (r.anomaliasEmbarque?.length ?? 0), 0);
          const des = inRange.reduce((acc, r) => acc + (r.anomaliasDesembarque?.length ?? 0), 0);
          return {
            primary: emb,
            primaryDelta: '-2,0%',
            primaryDeltaTone: 'positive',
            secondary: des,
            secondaryDelta: '-5,0%',
            secondaryDeltaTone: 'positive',
          };
        }
      }

      const MOCK_PERIOD_DATA: Record<KpiPeriod, Record<'diarios' | 'bovinos' | 'mortalidade' | 'anomalias', KpiMetricValues>> = {
        esta_semana: {
          diarios: { primary: totalDiariosVal, primaryDelta: '+20,0%', primaryDeltaTone: 'positive', secondary: pendentesDiariosVal },
          bovinos: { primary: totalBovinosVal, primaryDelta: '+12,0%', primaryDeltaTone: 'positive', secondary: mortosBovinosVal, secondaryDelta: '+5,0%', secondaryDeltaTone: 'negative' },
          mortalidade: { primary: taxaMortalidadeVal, primaryDelta: '+2,0%', primaryDeltaTone: 'negative', secondary: '< 0,5%' },
          anomalias: { primary: anomaliasEmbarqueVal, primaryDelta: '-2,0%', primaryDeltaTone: 'positive', secondary: anomaliasDesembarqueVal, secondaryDelta: '-5,0%', secondaryDeltaTone: 'positive' },
        },
        semana_anterior: {
          diarios: { primary: 12, primaryDelta: '+9,1%', primaryDeltaTone: 'positive', secondary: 4 },
          bovinos: { primary: '3.840', primaryDelta: '+8,5%', primaryDeltaTone: 'positive', secondary: 64, secondaryDelta: '-3,0%', secondaryDeltaTone: 'positive' },
          mortalidade: { primary: '1,67%', primaryDelta: '-1,5%', primaryDeltaTone: 'positive', secondary: '< 0,5%' },
          anomalias: { primary: 8, primaryDelta: '+5,0%', primaryDeltaTone: 'negative', secondary: 5, secondaryDelta: '+2,0%', secondaryDeltaTone: 'negative' },
        },
        mes_atual: {
          diarios: { primary: 58, primaryDelta: '+15,4%', primaryDeltaTone: 'positive', secondary: 14 },
          bovinos: { primary: '16.520', primaryDelta: '+14,2%', primaryDeltaTone: 'positive', secondary: 258, secondaryDelta: '+2,1%', secondaryDeltaTone: 'negative' },
          mortalidade: { primary: '1,56%', primaryDelta: '+0,5%', primaryDeltaTone: 'neutral', secondary: '< 0,5%' },
          anomalias: { primary: 29, primaryDelta: '-4,0%', primaryDeltaTone: 'positive', secondary: 18, secondaryDelta: '-6,0%', secondaryDeltaTone: 'positive' },
        },
        ultimos_30_dias: {
          diarios: { primary: 64, primaryDelta: '+18,2%', primaryDeltaTone: 'positive', secondary: 16 },
          bovinos: { primary: '18.240', primaryDelta: '+13,8%', primaryDeltaTone: 'positive', secondary: 285, secondaryDelta: '+1,8%', secondaryDeltaTone: 'negative' },
          mortalidade: { primary: '1,56%', primaryDelta: '+0,8%', primaryDeltaTone: 'neutral', secondary: '< 0,5%' },
          anomalias: { primary: 32, primaryDelta: '-3,5%', primaryDeltaTone: 'positive', secondary: 20, secondaryDelta: '-4,5%', secondaryDeltaTone: 'positive' },
        },
      };

      return MOCK_PERIOD_DATA[period][card];
    },
    [
      kpiPeriods,
      reportSource,
      totalDiariosVal,
      pendentesDiariosVal,
      totalBovinosVal,
      mortosBovinosVal,
      taxaMortalidadeVal,
      anomaliasEmbarqueVal,
      anomaliasDesembarqueVal,
    ]
  );

  const diariosKpi = getKpiData('diarios');
  const bovinosKpi = getKpiData('bovinos');
  const mortalidadeKpi = getKpiData('mortalidade');
  const anomaliasKpi = getKpiData('anomalias');

  const currentWeekKey = useMemo(() => {
    const s = startOfWeek(new Date());
    return `${s.getFullYear()}-W${Math.ceil((s.getDate() + 6) / 7)}`;
  }, []);

  // Gráficos semanais: implementa Cache-Aside no Redis (TTL 3600s) com fallback visual aos protótipos
  const hasLiveChartData = series.desembarque.some((v) => v > 0);
  const chartBars = useMemo(() => {
    const activeEmpresaId = empresaId ?? 'default';

    // 1. Tenta recuperar do Redis Cache-Aside
    const cDesemb = redisChartService.getChartCache(activeEmpresaId, 'desembarque', currentWeekKey);
    const cEmbarq = redisChartService.getChartCache(activeEmpresaId, 'embarque', currentWeekKey);
    const cMortes = redisChartService.getChartCache(activeEmpresaId, 'mortes', currentWeekKey);
    const cAnomal = redisChartService.getChartCache(activeEmpresaId, 'anomalias', currentWeekKey);

    if (cDesemb.data && cEmbarq.data && cMortes.data && cAnomal.data) {
      return {
        desembarque: cDesemb.data,
        embarque: cEmbarq.data,
        mortes: cMortes.data,
        anomalias: cAnomal.data,
      };
    }

    let calculatedBars: {
      desembarque: readonly ChartDayBar[];
      embarque: readonly ChartDayBar[];
      mortes: readonly ChartDayBar[];
      anomalias: readonly ChartDayBar[];
    };

    if (!hasLiveChartData) {
      calculatedBars = {
        desembarque: VOLUME_DESEMBARQUE_BARS,
        embarque: VOLUME_EMBARQUE_BARS,
        mortes: MORTES_REGISTRADAS_BARS,
        anomalias: ANOMALIAS_ETAPA_BARS,
      };
    } else {
      const makeBars = (values: number[], ceiling: number): ChartDayBar[] =>
        values.map((value, index) => ({
          day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][index],
          value,
          heightPct: ceiling ? Math.max(3, Math.round((value / ceiling) * 100)) : 0,
          highlight: index === new Date().getDay(),
        }));

      calculatedBars = {
        desembarque: makeBars(series.desembarque, niceCeiling(Math.max(...series.desembarque, 1))),
        embarque: makeBars(series.embarque, niceCeiling(Math.max(...series.embarque, 1))),
        mortes: makeBars(series.mortes, niceCeiling(Math.max(...series.mortes, 1))),
        anomalias: makeBars(
          series.anomaliasEmbarque.map((val, i) => val + series.anomaliasDesembarque[i]),
          niceCeiling(Math.max(...series.anomaliasEmbarque, ...series.anomaliasDesembarque, 1))
        ),
      };
    }

    // Persiste no Redis Cache-Aside
    redisChartService.setChartCache(activeEmpresaId, 'desembarque', currentWeekKey, calculatedBars.desembarque);
    redisChartService.setChartCache(activeEmpresaId, 'embarque', currentWeekKey, calculatedBars.embarque);
    redisChartService.setChartCache(activeEmpresaId, 'mortes', currentWeekKey, calculatedBars.mortes);
    redisChartService.setChartCache(activeEmpresaId, 'anomalias', currentWeekKey, calculatedBars.anomalias);

    return calculatedBars;
  }, [currentWeekKey, empresaId, hasLiveChartData, series]);

  // Listas filtradas com busca
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const [adminKpiPeriods, setAdminKpiPeriods] = useState<
    Record<'colaboradores' | 'frota' | 'polos' | 'bovinos', KpiPeriod>
  >({
    colaboradores: 'esta_semana',
    frota: 'esta_semana',
    polos: 'esta_semana',
    bovinos: 'esta_semana',
  });

  const totalFuncionarios = employees && employees.length > 0 ? employees.length : 48;
  const motoristasCount = employees && employees.length > 0
    ? employees.filter((e) => (e.cargo || '').toLowerCase().includes('motorista') || e.tipo === 'motorista').length
    : 32;

  const totalCaminhoes = vehicles && vehicles.length > 0 ? vehicles.length : 28;
  const emRotaCaminhoes = vehicles && vehicles.length > 0
    ? vehicles.filter((v) => v.statusUso === 'EM_USO' || ('status' in v && (v as { status?: string }).status === 'EM_USO')).length
    : 18;

  const totalFazendas = fazendasData?.total ?? 9;
  const totalFrigorificos = unidadesData?.total ?? 5;
  const totalPolos = totalFazendas + totalFrigorificos;

  const getAdminKpiData = useCallback(
    (card: 'colaboradores' | 'frota' | 'polos' | 'bovinos'): KpiMetricValues => {
      const period = adminKpiPeriods[card];
      switch (card) {
        case 'colaboradores': {
          if (period === 'semana_anterior') {
            return {
              primary: Math.max(1, totalFuncionarios - 2),
              primaryDelta: '+2 no mês',
              primaryDeltaTone: 'positive',
              secondary: Math.max(1, motoristasCount - 1),
            };
          }
          if (period === 'mes_atual') {
            return {
              primary: totalFuncionarios,
              primaryDelta: '+8,3%',
              primaryDeltaTone: 'positive',
              secondary: motoristasCount,
            };
          }
          if (period === 'ultimos_30_dias') {
            return {
              primary: totalFuncionarios,
              primaryDelta: '+10,5%',
              primaryDeltaTone: 'positive',
              secondary: motoristasCount,
            };
          }
          return {
            primary: totalFuncionarios,
            primaryDelta: '+4 este mês',
            primaryDeltaTone: 'positive',
            secondary: motoristasCount,
          };
        }
        case 'frota': {
          if (period === 'semana_anterior') {
            return {
              primary: totalCaminhoes,
              primaryDelta: '88% ativa',
              primaryDeltaTone: 'positive',
              secondary: Math.max(1, emRotaCaminhoes - 2),
            };
          }
          if (period === 'mes_atual') {
            return {
              primary: totalCaminhoes,
              primaryDelta: '+3 veículos',
              primaryDeltaTone: 'positive',
              secondary: emRotaCaminhoes,
            };
          }
          if (period === 'ultimos_30_dias') {
            return {
              primary: totalCaminhoes,
              primaryDelta: '94% operacional',
              primaryDeltaTone: 'positive',
              secondary: emRotaCaminhoes,
            };
          }
          return {
            primary: totalCaminhoes,
            primaryDelta: '92% operacional',
            primaryDeltaTone: 'positive',
            secondary: emRotaCaminhoes,
          };
        }
        case 'polos': {
          if (period === 'semana_anterior') {
            return {
              primary: Math.max(1, totalPolos - 1),
              primaryDelta: '+1 polo',
              primaryDeltaTone: 'positive',
              secondary: totalFrigorificos,
            };
          }
          if (period === 'mes_atual') {
            return {
              primary: totalPolos,
              primaryDelta: '100% homologados',
              primaryDeltaTone: 'positive',
              secondary: totalFrigorificos,
            };
          }
          if (period === 'ultimos_30_dias') {
            return {
              primary: totalPolos,
              primaryDelta: '+3 novos polos',
              primaryDeltaTone: 'positive',
              secondary: totalFrigorificos,
            };
          }
          return {
            primary: totalPolos,
            primaryDelta: '+2 novos polos',
            primaryDeltaTone: 'positive',
            secondary: totalFrigorificos,
          };
        }
        case 'bovinos': {
          if (period === 'semana_anterior') {
            return {
              primary: '3.840',
              primaryDelta: '+8,5%',
              primaryDeltaTone: 'positive',
              secondary: 12,
            };
          }
          if (period === 'mes_atual') {
            return {
              primary: '16.520',
              primaryDelta: '+14,2%',
              primaryDeltaTone: 'positive',
              secondary: 58,
            };
          }
          if (period === 'ultimos_30_dias') {
            return {
              primary: '18.240',
              primaryDelta: '+13,8%',
              primaryDeltaTone: 'positive',
              secondary: 64,
            };
          }
          return {
            primary: totalBovinosVal,
            primaryDelta: '+12,0%',
            primaryDeltaTone: 'positive',
            secondary: totalDiariosVal,
          };
        }
      }
    },
    [
      adminKpiPeriods,
      totalFuncionarios,
      motoristasCount,
      totalCaminhoes,
      emRotaCaminhoes,
      totalPolos,
      totalFrigorificos,
      totalBovinosVal,
      totalDiariosVal,
    ]
  );

  const colaboradoresKpi = getAdminKpiData('colaboradores');
  const frotaKpi = getAdminKpiData('frota');
  const polosKpi = getAdminKpiData('polos');
  const adminBovinosKpi = getAdminKpiData('bovinos');

  const DEFAULT_TEAM_MEMBERS = useMemo(() => [
    { id: 1, nome: 'Jonas Ribeiro', cargo: 'Motorista Carreteiro', info: '(67) 99823-4411' },
    { id: 2, nome: 'Adriano Souza', cargo: 'Motorista Bi-trem', info: '(65) 99182-3091' },
    { id: 3, nome: 'Cleiton Alves', cargo: 'Motorista Carreteiro', info: '(67) 99654-1289' },
    { id: 4, nome: 'Carla Mendes', cargo: 'Operadora de Pátio', info: '(65) 99341-8722' },
  ], []);

  const teamMembers = useMemo(() => {
    if (employees && employees.length > 0) {
      return employees.map((emp) => ({
        id: emp.id,
        nome: emp.nome,
        cargo: emp.cargo || (emp.tipo === 'motorista' ? 'Motorista Carreteiro' : 'Colaborador'),
        info: emp.telefone || emp.email || 'Acesso ativo',
      }));
    }
    return DEFAULT_TEAM_MEMBERS;
  }, [employees, DEFAULT_TEAM_MEMBERS]);

  const visibleTeam = useMemo(() => {
    if (!normalizedSearch) return teamMembers;
    return teamMembers.filter(
      (m) =>
        m.nome.toLowerCase().includes(normalizedSearch) ||
        m.cargo.toLowerCase().includes(normalizedSearch) ||
        m.info.toLowerCase().includes(normalizedSearch)
    );
  }, [teamMembers, normalizedSearch]);

  const ADMIN_ALERTS: readonly AlertItem[] = useMemo(() => [
    {
      id: 'adm-al-1',
      title: 'Sirene de ré com falha',
      subtitle: 'Placa LKD-2B45 • Manutenção preventiva necessária',
      severity: 'bloqueio',
    },
    {
      id: 'adm-al-2',
      title: 'CNH a vencer em 12 dias',
      subtitle: 'Adriano Souza • Categoria E',
      severity: 'alerta',
    },
    {
      id: 'adm-al-3',
      title: 'Inspeção veicular preventiva',
      subtitle: 'Placa QAP-3J88 • Vencimento em 9 dias',
      severity: 'alerta',
    },
    {
      id: 'adm-al-4',
      title: 'Homologação de fazenda pendente',
      subtitle: 'Fazenda Três Irmãos • Alvará sanitário',
      severity: 'alerta',
    },
  ], []);

  const handleAdminAlertClick = useCallback((alert: AlertItem) => {
    const sub = alert.subtitle.toLowerCase();
    const title = alert.title.toLowerCase();
    if (sub.includes('placa') || title.includes('inspeção') || title.includes('veicular') || title.includes('sirene')) {
      navigate('/frota');
      return;
    }
    if (sub.includes('cnh') || title.includes('cnh') || sub.includes('souza') || sub.includes('motorista')) {
      navigate('/colaboradores');
      return;
    }
    if (sub.includes('fazenda') || title.includes('fazenda') || sub.includes('frigorífico') || title.includes('homologação')) {
      navigate('/fazenda-unidades');
      return;
    }
    navigate('/visao-geral');
  }, [navigate]);

  const queueSource = liveQueue.length > 0 ? liveQueue : DEFAULT_QUEUE_ITEMS;
  const visibleQueue = useMemo(() => {
    if (!normalizedSearch) return queueSource;
    return queueSource.filter(
      (item) =>
        item.code.toLowerCase().includes(normalizedSearch) ||
        item.gta.toLowerCase().includes(normalizedSearch) ||
        item.driver.toLowerCase().includes(normalizedSearch) ||
        (item.plate && item.plate.toLowerCase().includes(normalizedSearch)) ||
        item.route.toLowerCase().includes(normalizedSearch) ||
        item.status.toLowerCase().includes(normalizedSearch)
    );
  }, [queueSource, normalizedSearch]);

  const alertsSource = liveAlerts.length > 0 ? liveAlerts : ALERT_ITEMS;
  const visibleAlerts = useMemo(() => {
    if (!normalizedSearch) return alertsSource;
    return alertsSource.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.subtitle.toLowerCase().includes(normalizedSearch)
    );
  }, [alertsSource, normalizedSearch]);

  const routesSource = liveRoutes.length > 0 ? liveRoutes : ONGOING_ROUTES;
  const visibleRoutes = useMemo(() => {
    if (!normalizedSearch) return routesSource;
    return routesSource.filter(
      (item) =>
        item.driver.toLowerCase().includes(normalizedSearch) ||
        item.route.toLowerCase().includes(normalizedSearch)
    );
  }, [routesSource, normalizedSearch]);

  // Auditoria: histórico e fila
  const liveAuditHistory = useMemo<readonly AuditHistoryItem[]>(() => {
    if (!allReports || allReports.length === 0) {
      return DEFAULT_AUDIT_HISTORY;
    }
    const filtered = allReports
      .filter((r) => {
        const s = (r.status || '').toLowerCase();
        return s === 'aprovado' || s === 'reprovado' || s === 'concluido';
      })
      .map((r): AuditHistoryItem => {
        const s = (r.status || '').toLowerCase();
        const displayStatus: 'Aprovado' | 'Reprovado' | 'Com ressalva' =
          s === 'aprovado' || s === 'concluido'
            ? 'Aprovado'
            : s === 'reprovado'
            ? 'Reprovado'
            : 'Com ressalva';

        const dateStr = r.dataEmbarque
          ? new Date(r.dataEmbarque).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
          : 'Recente';
        const mortos = r.quantidadeMorto ?? 0;
        const totalBovinos =
          r.totalAnimais ??
          (r.quantidadeMachos || 0) + (r.quantidadeFemeas || 0) + (r.quantidadeMarrucos || 0);
        const reason =
          mortos > 0
            ? `${mortos} ${mortos === 1 ? 'morte' : 'mortes'} registrada${mortos > 1 ? 's' : ''}`
            : `Sem anomalias • ${totalBovinos} bovinos`;

        return {
          id: `aud-${r.id}`,
          code: `RR-${r.id}`,
          status: displayStatus,
          reason,
          timestamp: dateStr,
        };
      });

    return filtered.length > 0 ? filtered : DEFAULT_AUDIT_HISTORY;
  }, [allReports]);

  const aprovadosCount = useMemo(() => {
    const count = (allReports ?? []).filter((r) => {
      const s = (r.status || '').toLowerCase();
      return s === 'aprovado' || s === 'concluido';
    }).length;
    return count > 0 ? count : 2;
  }, [allReports]);

  const reprovadosCount = useMemo(() => {
    const count = (allReports ?? []).filter((r) => {
      const s = (r.status || '').toLowerCase();
      return s === 'reprovado';
    }).length;
    return count > 0 ? count : 1;
  }, [allReports]);

  const visibleAuditHistory = useMemo(() => {
    return liveAuditHistory.filter((item) => {
      const matchSearch =
        !normalizedSearch ||
        item.code.toLowerCase().includes(normalizedSearch) ||
        item.reason.toLowerCase().includes(normalizedSearch);
      if (!matchSearch) return false;
      if (auditStatusFilter === 'approved') return item.status === 'Aprovado';
      if (auditStatusFilter === 'rejected') return item.status === 'Reprovado';
      return true;
    });
  }, [liveAuditHistory, normalizedSearch, auditStatusFilter]);

  const visibleAuditQueue = useMemo(() => {
    if (auditStatusFilter === 'approved' || auditStatusFilter === 'rejected') return [];
    return visibleQueue;
  }, [visibleQueue, auditStatusFilter]);

  const handleExportCsv = useCallback(() => {
    const reportsToExport = allReports && allReports.length > 0 ? allReports : data?.itens ?? [];
    if (reportsToExport.length === 0) return;

    const headers = [
      'ID',
      'GTA',
      'Nota Fiscal',
      'Data Embarque',
      'Status',
      'Motorista ID',
      'Fazenda Origem ID',
      'Frigorifico Destino ID',
      'Total Bovinos',
      'Mortos Chegada',
      'Abate Emergencia',
      'KM Percorrido',
      'Duracao Minutos',
    ];

    const rows = reportsToExport.map((r) => [
      r.id,
      `"${r.numeroGta || ''}"`,
      `"${r.numeroNotaFiscal || ''}"`,
      `"${r.dataEmbarque || ''}"`,
      `"${r.status || ''}"`,
      r.motoristaId ?? '',
      r.fazendaId ?? '',
      r.unidadeFrigorificaId ?? '',
      r.totalAnimais ?? ((r.quantidadeMachos || 0) + (r.quantidadeFemeas || 0) + (r.quantidadeMarrucos || 0)),
      r.quantidadeMorto ?? 0,
      r.quantidadeEmergencia ?? 0,
      r.distanciaPercorridaKm ?? '',
      r.duracaoViagemMinutos ?? '',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `relatorios_viagem_efficientia_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [allReports, data?.itens]);

  // Navegação de abas
  const handleTabChange = useCallback((tab: 'overview' | 'audit' | 'reports') => {
    setActiveTab(tab);
    if (tab === 'overview') navigate('/visao-geral');
    else if (tab === 'audit') navigate('/auditoria');
    else if (tab === 'reports') navigate('/diarios');
  }, [navigate, setActiveTab]);

  const isAdmin = useMemo(
    () =>
      roles.some((r) =>
        ['ADMIN', 'ADMINISTRADOR', 'ADM_EMPRESA', 'SISTEMA_DEV'].includes(r.toUpperCase())
      ) ||
      !user ||
      ('tipo' in user && user.tipo === 'administrador') ||
      !('tipo' in user),
    [roles, user]
  );

  const handleAlertClick = useCallback((alert: AlertItem) => {
    if (alert.id.startsWith('insp-') || alert.subtitle.toLowerCase().includes('placa')) {
      if (isAdmin) {
        navigate('/frota');
      } else {
        handleTabChange('reports');
      }
      return;
    }
    if (alert.subtitle.toLowerCase().includes('motorista')) {
      if (isAdmin) {
        navigate('/motoristas');
      } else {
        handleTabChange('reports');
      }
      return;
    }
    const idMatch = alert.id.match(/\d+/) || alert.subtitle.match(/\d+/);
    if (idMatch) {
      handleOpenAudit(Number(idMatch[0]));
      return;
    }
    handleTabChange('audit');
  }, [isAdmin, navigate, handleTabChange]);



    // Itens indexados para pesquisa rápida na barra superior
  const quickSearchReports = useMemo<readonly QuickSearchReportItem[]>(() => {
    return DEFAULT_QUEUE_ITEMS.map((item) => ({
      id: item.id,
      code: item.code,
      gta: item.gta,
      driver: item.driver,
      plate: item.plate,
      route: item.route,
      status: item.status,
    }));
  }, []);

  const quickSearchVehicles = useMemo<readonly QuickSearchVehicleItem[]>(() => {
    const list: QuickSearchVehicleItem[] = [
      { id: 1, placa: 'LKD-2B45', modelo: 'Scania R450', marca: 'Scania', motorista: 'Jonas Ribeiro', status: 'Em trânsito' },
      { id: 2, placa: 'QAP-3J88', modelo: 'Volvo FH 540', marca: 'Volvo', motorista: 'Cleiton Alves', status: 'Em trânsito' },
      { id: 3, placa: 'BRA-2E19', modelo: 'Actros 2651', marca: 'Mercedes-Benz', motorista: 'Marcos Tavares', status: 'Disponível' },
      { id: 4, placa: 'BRL-1920', modelo: 'Scania R440', marca: 'Scania', motorista: 'Wesley Prado', status: 'Em trânsito' },
    ];
    if (vehicles && vehicles.length > 0) {
      vehicles.forEach((v) => {
        if (!list.some((existing) => existing.placa.toUpperCase() === v.placa?.toUpperCase())) {
          list.push({
            id: v.id,
            placa: v.placa,
            modelo: v.modelo || 'Caminhão Boiadeiro',
            marca: v.marca || '',
            motorista: v.motoristaAtualNome || '',
            status: v.statusUso === 'EM_USO' ? 'Em trânsito' : 'Disponível',
          });
        }
      });
    }
    return list;
  }, [vehicles]);

  const quickSearchDrivers = useMemo<readonly QuickSearchDriverItem[]>(() => {
    const list: QuickSearchDriverItem[] = [
      { id: 1, nome: 'Jonas Ribeiro', cargo: 'Motorista Boiadeiro', cnhStatus: 'CNH Ativa', rotaAtual: 'Santa Clara → Campo Grande' },
      { id: 2, nome: 'Cleiton Alves', cargo: 'Motorista Boiadeiro', cnhStatus: 'CNH Ativa', rotaAtual: 'Boa Vista → Rondonópolis' },
      { id: 3, nome: 'Marcos Tavares', cargo: 'Motorista Boiadeiro', cnhStatus: 'CNH Ativa', rotaAtual: 'Três Irmãos → Anápolis' },
      { id: 4, nome: 'Adriano Souza', cargo: 'Motorista Boiadeiro', cnhStatus: 'CNH Vencida', rotaAtual: 'Bloqueio preventivo' },
      { id: 5, nome: 'Wesley Prado', cargo: 'Motorista Boiadeiro', cnhStatus: 'CNH Ativa', rotaAtual: 'Boa Vista → Rondonópolis' },
    ];
    if (employees && employees.length > 0) {
      employees.forEach((emp) => {
        if (!list.some((existing) => existing.nome.toLowerCase() === emp.nome.toLowerCase())) {
          list.push({
            id: emp.id,
            nome: emp.nome,
            cargo: emp.tipo || 'Colaborador',
            cnhStatus: emp.ativo !== false ? 'Ativo' : 'Inativo',
          });
        }
      });
    }
    return list;
  }, [employees]);

  const totalMatchesCount = useMemo(() => {
    if (!normalizedSearch) return 0;
    return visibleQueue.length + visibleAlerts.length;
  }, [normalizedSearch, visibleQueue.length, visibleAlerts.length]);

  return (
    <AuthenticatedLayout
      title={
        activeTab === 'overview'
          ? 'Visão Geral'
          : activeTab === 'audit'
          ? 'Auditoria'
          : 'Diários de Rota'
      }
      subtitle={
        activeTab === 'overview'
          ? isAnalista
            ? 'Terça-feira, 08 de setembro de 2026 • Rotas e indicadores em tempo real'
            : 'Terça-feira, 08 de setembro de 2026 • Painel administrativo da operação e cadastros'
          : activeTab === 'audit'
          ? 'Fila de aprovação e conferência de relatórios digitalizados'
          : 'Dados consolidados sincronizados com a operação'
      }
      searchPlaceholder={
        !isAnalista
          ? 'Buscar colaborador, placa ou fazenda'
          : 'Buscar GTA, placa ou motorista'
      }
            searchDropdown={
        <DashboardSearchDropdown
          query={searchQuery}
          reports={quickSearchReports}
          vehicles={quickSearchVehicles}
          drivers={quickSearchDrivers}
          onSelectReport={(id, item) => handleOpenAudit(id, { numeroGta: item.gta })}
          onSelectVehicle={(veh) => {
            if (isAnalista) {
              navigate(`/cadastros-consulta?tab=frota&q=${encodeURIComponent(veh.placa)}`);
            } else {
              navigate(`/frota?q=${encodeURIComponent(veh.placa)}`);
            }
          }}
          onSelectDriver={(drv) => {
            if (isAnalista) {
              navigate(`/cadastros-consulta?tab=usuarios&q=${encodeURIComponent(drv.nome)}`);
            } else {
              navigate(`/colaboradores?q=${encodeURIComponent(drv.nome)}`);
            }
          }}
          onClose={() => setSearchQuery('')}
        />
      }
      searchValue={searchQuery}
      onSearchChange={(value) => {
        setSearchQuery(value);
        dispatchFilters({ type: 'queryChanged', value });
      }}
    >
      <div className="vg-main" aria-labelledby="dashboard-heading">
        {searchQuery.trim().length > 0 && (
          <div className="vg-search-filter-banner" role="status">
            <div className="vg-search-filter-info">
              <SearchIcon size={16} />
              <span>
                Filtro ativo por: <strong>&ldquo;{searchQuery}&rdquo;</strong> • {totalMatchesCount} {totalMatchesCount === 1 ? 'registro encontrado' : 'registros encontrados'}
              </span>
            </div>
            <button
              type="button"
              className="vg-search-filter-clear-btn"
              onClick={() => {
                setSearchQuery('');
                dispatchFilters({ type: 'queryChanged', value: '' });
              }}
              title="Limpar pesquisa e restaurar visão completa"
            >
              Limpar filtro
            </button>
          </div>
        )}
          {/* ==============================================================
              ABA 1: VISÃO GERAL (clip0_939_11)
              ============================================================== */}
          {activeTab === 'overview' && (
            <div className="vg-grid-layout">
              {/* LINHA 1: 4 CARDS DE KPI */}
              {!isAnalista ? (
                <section className="vg-kpi-row" aria-label="Indicadores administrativos principais">
                  {/* Card 1: Colaboradores */}
                  <article
                    className="vg-card vg-kpi-card"
                    onClick={() => navigate('/colaboradores')}
                    title="Clique para gerenciar colaboradores e motoristas"
                  >
                    <div className="vg-kpi-header">
                      <div className="vg-kpi-title-group">
                        <span className="vg-kpi-icon-box">
                          <NavMotoristasIcon size={18} />
                        </span>
                        <h2 className="vg-card-title">Colaboradores</h2>
                      </div>
                      <div className="vg-period-select-wrap">
                        <label htmlFor="kpi-period-colaboradores" className="visually-hidden">Período de Colaboradores</label>
                        <select
                          id="kpi-period-colaboradores"
                          className="vg-period-select"
                          value={adminKpiPeriods.colaboradores}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            setAdminKpiPeriods((prev) => ({ ...prev, colaboradores: e.target.value as KpiPeriod }));
                          }}
                          title="Alterar período de Colaboradores"
                        >
                          <option value="esta_semana">Esta Semana</option>
                          <option value="semana_anterior">Semana Anterior</option>
                          <option value="mes_atual">Mês Atual</option>
                          <option value="ultimos_30_dias">Últimos 30 Dias</option>
                        </select>
                      </div>
                    </div>
                    <div className="vg-kpi-metrics">
                      <div className="vg-metric-col">
                        <span className="vg-metric-label">Total</span>
                        <div className="vg-metric-val-row">
                          <strong className="vg-metric-number">{colaboradoresKpi.primary}</strong>
                          {colaboradoresKpi.primaryDelta && (
                            <span className={`vg-metric-delta vg-delta-${colaboradoresKpi.primaryDeltaTone ?? 'positive'}`}>
                              {colaboradoresKpi.primaryDelta}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="vg-metric-col">
                        <span className="vg-metric-label">Motoristas</span>
                        <div className="vg-metric-val-row">
                          <strong className="vg-metric-number">{colaboradoresKpi.secondary}</strong>
                        </div>
                      </div>
                    </div>
                  </article>

                  {/* Card 2: Frota */}
                  <article
                    className="vg-card vg-kpi-card"
                    onClick={() => navigate('/frota')}
                    title="Clique para gerenciar a frota de caminhões"
                  >
                    <div className="vg-kpi-header">
                      <div className="vg-kpi-title-group">
                        <span className="vg-kpi-icon-box">
                          <NavFrotaIcon size={18} />
                        </span>
                        <h2 className="vg-card-title">Frota</h2>
                      </div>
                      <div className="vg-period-select-wrap">
                        <label htmlFor="kpi-period-frota" className="visually-hidden">Período da Frota</label>
                        <select
                          id="kpi-period-frota"
                          className="vg-period-select"
                          value={adminKpiPeriods.frota}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            setAdminKpiPeriods((prev) => ({ ...prev, frota: e.target.value as KpiPeriod }));
                          }}
                          title="Alterar período da Frota"
                        >
                          <option value="esta_semana">Esta Semana</option>
                          <option value="semana_anterior">Semana Anterior</option>
                          <option value="mes_atual">Mês Atual</option>
                          <option value="ultimos_30_dias">Últimos 30 Dias</option>
                        </select>
                      </div>
                    </div>
                    <div className="vg-kpi-metrics">
                      <div className="vg-metric-col">
                        <span className="vg-metric-label">Total</span>
                        <div className="vg-metric-val-row">
                          <strong className="vg-metric-number">{frotaKpi.primary}</strong>
                          {frotaKpi.primaryDelta && (
                            <span className={`vg-metric-delta vg-delta-${frotaKpi.primaryDeltaTone ?? 'positive'}`}>
                              {frotaKpi.primaryDelta}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="vg-metric-col">
                        <span className="vg-metric-label">Em trânsito</span>
                        <div className="vg-metric-val-row">
                          <strong className="vg-metric-number">{frotaKpi.secondary}</strong>
                        </div>
                      </div>
                    </div>
                  </article>

                  {/* Card 3: Fazendas & Unidades */}
                  <article
                    className="vg-card vg-kpi-card"
                    onClick={() => navigate('/fazenda-unidades')}
                    title="Clique para gerenciar fazendas e unidades frigoríficas"
                  >
                    <div className="vg-kpi-header">
                      <div className="vg-kpi-title-group">
                        <span className="vg-kpi-icon-box">
                          <NavFazendasUnidadesIcon size={18} />
                        </span>
                        <h2 className="vg-card-title">Fazendas & Polos</h2>
                      </div>
                      <div className="vg-period-select-wrap">
                        <label htmlFor="kpi-period-polos" className="visually-hidden">Período de Fazendas e Polos</label>
                        <select
                          id="kpi-period-polos"
                          className="vg-period-select"
                          value={adminKpiPeriods.polos}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            setAdminKpiPeriods((prev) => ({ ...prev, polos: e.target.value as KpiPeriod }));
                          }}
                          title="Alterar período de Polos"
                        >
                          <option value="esta_semana">Esta Semana</option>
                          <option value="semana_anterior">Semana Anterior</option>
                          <option value="mes_atual">Mês Atual</option>
                          <option value="ultimos_30_dias">Últimos 30 Dias</option>
                        </select>
                      </div>
                    </div>
                    <div className="vg-kpi-metrics">
                      <div className="vg-metric-col">
                        <span className="vg-metric-label">Polos</span>
                        <div className="vg-metric-val-row">
                          <strong className="vg-metric-number">{polosKpi.primary}</strong>
                          {polosKpi.primaryDelta && (
                            <span className={`vg-metric-delta vg-delta-${polosKpi.primaryDeltaTone ?? 'positive'}`}>
                              {polosKpi.primaryDelta}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="vg-metric-col">
                        <span className="vg-metric-label">Frigoríficos SIF</span>
                        <div className="vg-metric-val-row">
                          <strong className="vg-metric-number">{polosKpi.secondary}</strong>
                        </div>
                      </div>
                    </div>
                  </article>

                  {/* Card 4: Bovinos */}
                  <article className="vg-card vg-kpi-card">
                    <div className="vg-kpi-header">
                      <div className="vg-kpi-title-group">
                        <span className="vg-kpi-icon-box">
                          <KpiIconBovinos />
                        </span>
                        <h2 className="vg-card-title">Bovinos</h2>
                      </div>
                      <div className="vg-period-select-wrap">
                        <label htmlFor="kpi-period-admin-bovinos" className="visually-hidden">Período de Bovinos</label>
                        <select
                          id="kpi-period-admin-bovinos"
                          className="vg-period-select"
                          value={adminKpiPeriods.bovinos}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            setAdminKpiPeriods((prev) => ({ ...prev, bovinos: e.target.value as KpiPeriod }));
                          }}
                          title="Alterar período de Bovinos"
                        >
                          <option value="esta_semana">Esta Semana</option>
                          <option value="semana_anterior">Semana Anterior</option>
                          <option value="mes_atual">Mês Atual</option>
                          <option value="ultimos_30_dias">Últimos 30 Dias</option>
                        </select>
                      </div>
                    </div>
                    <div className="vg-kpi-metrics">
                      <div className="vg-metric-col">
                        <span className="vg-metric-label">Transportados</span>
                        <div className="vg-metric-val-row">
                          <strong className="vg-metric-number">{adminBovinosKpi.primary}</strong>
                          {adminBovinosKpi.primaryDelta && (
                            <span className={`vg-metric-delta vg-delta-${adminBovinosKpi.primaryDeltaTone ?? 'positive'}`}>
                              {adminBovinosKpi.primaryDelta}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="vg-metric-col">
                        <span className="vg-metric-label">Viagens</span>
                        <div className="vg-metric-val-row">
                          <strong className="vg-metric-number">{adminBovinosKpi.secondary}</strong>
                        </div>
                      </div>
                    </div>
                  </article>
                </section>
              ) : (
                <section className="vg-kpi-row" aria-label="Indicadores principais da semana">
                {/* Card 1: Diários */}
                <article className="vg-card vg-kpi-card">
                  <div className="vg-kpi-header">
                    <div className="vg-kpi-title-group">
                      <span className="vg-kpi-icon-box">
                        <KpiIconDiarios />
                      </span>
                      <h2 className="vg-card-title">Diários</h2>
                    </div>
                    <div className="vg-period-select-wrap">
                      <label htmlFor="kpi-period-diarios" className="visually-hidden">Período de Diários</label>
                      <select
                        id="kpi-period-diarios"
                        className="vg-period-select"
                        value={kpiPeriods.diarios}
                        onChange={(e) => {
                          e.stopPropagation();
                          setKpiPeriods((prev) => ({ ...prev, diarios: e.target.value as KpiPeriod }));
                        }}
                        title="Alterar período de Diários"
                      >
                        <option value="esta_semana">Esta Semana</option>
                        <option value="semana_anterior">Semana Anterior</option>
                        <option value="mes_atual">Mês Atual</option>
                        <option value="ultimos_30_dias">Últimos 30 Dias</option>
                      </select>
                    </div>
                  </div>
                  <div className="vg-kpi-metrics">
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Total</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{diariosKpi.primary}</strong>
                        {diariosKpi.primaryDelta && (
                          <span className={`vg-metric-delta vg-delta-${diariosKpi.primaryDeltaTone ?? 'positive'}`}>
                            {diariosKpi.primaryDelta}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Pendentes</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{diariosKpi.secondary}</strong>
                      </div>
                    </div>
                  </div>
                </article>

                {/* Card 2: Bovinos */}
                <article className="vg-card vg-kpi-card">
                  <div className="vg-kpi-header">
                    <div className="vg-kpi-title-group">
                      <span className="vg-kpi-icon-box">
                        <KpiIconBovinos />
                      </span>
                      <h2 className="vg-card-title">Bovinos</h2>
                    </div>
                    <div className="vg-period-select-wrap">
                      <label htmlFor="kpi-period-bovinos" className="visually-hidden">Período de Bovinos</label>
                      <select
                        id="kpi-period-bovinos"
                        className="vg-period-select"
                        value={kpiPeriods.bovinos}
                        onChange={(e) => {
                          e.stopPropagation();
                          setKpiPeriods((prev) => ({ ...prev, bovinos: e.target.value as KpiPeriod }));
                        }}
                        title="Alterar período de Bovinos"
                      >
                        <option value="esta_semana">Esta Semana</option>
                        <option value="semana_anterior">Semana Anterior</option>
                        <option value="mes_atual">Mês Atual</option>
                        <option value="ultimos_30_dias">Últimos 30 Dias</option>
                      </select>
                    </div>
                  </div>
                  <div className="vg-kpi-metrics">
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Total</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{bovinosKpi.primary}</strong>
                        {bovinosKpi.primaryDelta && (
                          <span className={`vg-metric-delta vg-delta-${bovinosKpi.primaryDeltaTone ?? 'positive'}`}>
                            {bovinosKpi.primaryDelta}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Mortos</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{bovinosKpi.secondary}</strong>
                        {bovinosKpi.secondaryDelta && (
                          <span className={`vg-metric-delta vg-delta-${bovinosKpi.secondaryDeltaTone ?? 'negative'}`}>
                            {bovinosKpi.secondaryDelta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>

                {/* Card 3: Mortalidade */}
                <article className="vg-card vg-kpi-card">
                  <div className="vg-kpi-header">
                    <div className="vg-kpi-title-group">
                      <span className="vg-kpi-icon-box">
                        <KpiIconMortalidade />
                      </span>
                      <h2 className="vg-card-title">Mortalidade</h2>
                    </div>
                    <div className="vg-period-select-wrap">
                      <label htmlFor="kpi-period-mortalidade" className="visually-hidden">Período de Mortalidade</label>
                      <select
                        id="kpi-period-mortalidade"
                        className="vg-period-select"
                        value={kpiPeriods.mortalidade}
                        onChange={(e) => {
                          e.stopPropagation();
                          setKpiPeriods((prev) => ({ ...prev, mortalidade: e.target.value as KpiPeriod }));
                        }}
                        title="Alterar período de Mortalidade"
                      >
                        <option value="esta_semana">Esta Semana</option>
                        <option value="semana_anterior">Semana Anterior</option>
                        <option value="mes_atual">Mês Atual</option>
                        <option value="ultimos_30_dias">Últimos 30 Dias</option>
                      </select>
                    </div>
                  </div>
                  <div className="vg-kpi-metrics">
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Total</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{mortalidadeKpi.primary}</strong>
                        {mortalidadeKpi.primaryDelta && (
                          <span className={`vg-metric-delta vg-delta-${mortalidadeKpi.primaryDeltaTone ?? 'negative'}`}>
                            {mortalidadeKpi.primaryDelta}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Meta interna</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">&lt; 0,5%</strong>
                      </div>
                    </div>
                  </div>
                </article>

                {/* Card 4: Anomalias */}
                <article className="vg-card vg-kpi-card">
                  <div className="vg-kpi-header">
                    <div className="vg-kpi-title-group">
                      <span className="vg-kpi-icon-box">
                        <KpiIconAnomalias />
                      </span>
                      <h2 className="vg-card-title">Anomalias</h2>
                    </div>
                    <div className="vg-period-select-wrap">
                      <label htmlFor="kpi-period-anomalias" className="visually-hidden">Período de Anomalias</label>
                      <select
                        id="kpi-period-anomalias"
                        className="vg-period-select"
                        value={kpiPeriods.anomalias}
                        onChange={(e) => {
                          e.stopPropagation();
                          setKpiPeriods((prev) => ({ ...prev, anomalias: e.target.value as KpiPeriod }));
                        }}
                        title="Alterar período de Anomalias"
                      >
                        <option value="esta_semana">Esta Semana</option>
                        <option value="semana_anterior">Semana Anterior</option>
                        <option value="mes_atual">Mês Atual</option>
                        <option value="ultimos_30_dias">Últimos 30 Dias</option>
                      </select>
                    </div>
                  </div>
                  <div className="vg-kpi-metrics">
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Embarque</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{anomaliasKpi.primary}</strong>
                        {anomaliasKpi.primaryDelta && (
                          <span className={`vg-metric-delta vg-delta-${anomaliasKpi.primaryDeltaTone ?? 'positive'}`}>
                            {anomaliasKpi.primaryDelta}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Desembarque</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{anomaliasKpi.secondary}</strong>
                        {anomaliasKpi.secondaryDelta && (
                          <span className={`vg-metric-delta vg-delta-${anomaliasKpi.secondaryDeltaTone ?? 'positive'}`}>
                            {anomaliasKpi.secondaryDelta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </section>
              )}

              {/* LINHA 2: COCKPIT DE INTELIGÊNCIA LOGÍSTICA / AUDITORIA DE BEM-ESTAR */}
              {!isAnalista ? (
                <section className="vg-admin-analytics-section" aria-label="Cockpit Executivo e Inteligência Logística">
                  <div className="vg-admin-analytics-header">
                    <div className="vg-charts-title-group">
                      <h2 className="vg-charts-heading">Inteligência Operacional & Desempenho da Frota</h2>
                      <p className="vg-charts-subheading">
                        Métricas estratégicas de transporte, alocação de frota, pontualidade de entrega e conformidade sanitária
                      </p>
                    </div>
                  </div>

                  {/* GRID SUPERIOR: GRÁFICO DE TENDÊNCIA/ÁREA SUAVE (60%) + DONUT DA FROTA (40%) */}
                  <div className="vg-admin-grid-top">
                    <AdminTrendChart isDarkMode={theme === 'dark'} />
                    <AdminFleetDonutChart
                      totalVehicles={vehicles?.length || 28}
                      inTransitCount={emRotaCaminhoes}
                      isDarkMode={theme === 'dark'}
                    />
                  </div>

                  {/* GRID INFERIOR: TOP CORREDORES LOGÍSTICOS (55%) + GAUGE DE BEM-ESTAR ANIMAL (45%) */}
                  <div className="vg-admin-grid-mid">
                    <AdminTopRoutesChart isDarkMode={theme === 'dark'} />
                    <AdminWelfareGauge isDarkMode={theme === 'dark'} />
                  </div>
                </section>
              ) : (
                <AnalistaWelfareCharts
                  isDarkMode={theme === 'dark'}
                  desembarqueBars={chartBars.desembarque}
                  embarqueBars={chartBars.embarque}
                  mortesBars={chartBars.mortes}
                  anomaliasBars={chartBars.anomalias}
                />
              )}

              {/* LINHA 3: QUADRO DE COLABORADORES / FILA DE ANÁLISE, ALERTAS E ROTAS EM ANDAMENTO */}
              {!isAnalista ? (
                <section className="vg-bottom-row" aria-label="Operações em tempo real e cadastros">
                  {/* Coluna 1: Quadro de colaboradores */}
                  <article className="vg-card vg-bottom-card">
                    <div className="vg-bottom-header">
                      <div>
                        <h2 className="vg-bottom-title">Quadro de colaboradores</h2>
                        <p className="vg-bottom-subtitle">Equipe cadastrada e acessos</p>
                      </div>
                      <button
                        type="button"
                        className="vg-analyze-link"
                        onClick={() => navigate('/colaboradores')}
                        title="Ir para o gerenciamento de colaboradores"
                      >
                        <span>Ver todos</span>
                        <ArrowRightIcon size={12} style={{ marginLeft: 4 }} />
                      </button>
                    </div>

                    <div className="vg-queue-list">
                      {visibleTeam.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="vg-queue-item"
                          onClick={() => navigate('/colaboradores')}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') navigate('/colaboradores');
                          }}
                          title="Clique para ver o cadastro deste colaborador"
                        >
                          <div className="vg-queue-info">
                            <strong className="vg-queue-code">{item.nome}</strong>
                            <span className="vg-queue-meta">
                              {item.cargo} • {item.info}
                            </span>
                          </div>
                          <div className="vg-queue-actions">
                            <span className="vg-badge-approved">Ativo</span>
                            <span className="vg-analyze-link" style={{ fontSize: '0.74rem' }}>
                              Gerenciar →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  {/* Coluna 2: Alertas Administrativos */}
                  <article className="vg-card vg-bottom-card">
                    <div className="vg-bottom-header">
                      <div>
                        <h2 className="vg-bottom-title">Alertas operacionais</h2>
                        <p className="vg-bottom-subtitle">Pendências de frota e cadastros</p>
                      </div>
                    </div>

                    <div className="vg-alerts-list">
                      {ADMIN_ALERTS.map((alert) => (
                        <div
                          key={alert.id}
                          className="vg-alert-item"
                          onClick={() => handleAdminAlertClick(alert)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleAdminAlertClick(alert);
                          }}
                          style={{ cursor: 'pointer' }}
                          title="Clique para inspecionar e resolver este alerta"
                        >
                          <span className="vg-alert-icon">
                            <AlertTriangleYellowIcon />
                          </span>
                          <div className="vg-alert-text">
                            <strong className="vg-alert-title">{alert.title}</strong>
                            <span className="vg-alert-sub">{alert.subtitle}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  {/* Coluna 3: Rotas em andamento (Leitura / Monitoramento) */}
                  <article className="vg-card vg-bottom-card">
                    <div className="vg-bottom-header">
                      <div>
                        <h2 className="vg-bottom-title">Rotas em andamento</h2>
                        <p className="vg-bottom-subtitle">Monitoramento da frota em trânsito</p>
                      </div>
                    </div>

                    <div className="vg-routes-list">
                      {visibleRoutes.slice(0, 3).map((route) => (
                        <div
                          key={route.id}
                          className="vg-route-item"
                          title={`Motorista: ${route.driver} | Trecho: ${route.route}`}
                        >
                          <div className="vg-route-top">
                            <RouteActiveDotIcon />
                            <div className="vg-route-info">
                              <strong className="vg-route-driver">{route.driver}</strong>
                              <span className="vg-route-path">{route.route}</span>
                            </div>
                            <span className="vg-route-stage-badge">
                              {route.stage} • {route.progressPct}%
                            </span>
                          </div>
                          <div className="vg-route-progress-track" aria-hidden="true">
                            <div
                              className="vg-route-progress-fill"
                              style={{ width: `${route.progressPct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>
              ) : (
                <section className="vg-bottom-row" aria-label="Operações em tempo real e auditoria">
                {/* Coluna 1: Fila de análise */}
                <article className="vg-card vg-bottom-card">
                  <div className="vg-bottom-header">
                    <h2 className="vg-bottom-title">Fila de análise</h2>
                    <p className="vg-bottom-subtitle">Diários aguardando parecer</p>
                  </div>

                  <div className="vg-queue-list">
                    {visibleQueue.length === 0 ? (
                      <p className="vg-queue-empty-text">Nenhum diário na fila corresponde à pesquisa.</p>
                    ) : (
                      (searchQuery.trim() ? visibleQueue : visibleQueue.slice(0, 2)).map((item) => (
                        <div key={item.id} className="vg-queue-item">
                          <div className="vg-queue-info">
                            <strong className="vg-queue-code">
                              {item.code} • {item.gta}
                            </strong>
                            <span className="vg-queue-meta">
                              {item.driver} {item.plate ? `• Placa ${item.plate}` : ''} • {item.route}
                            </span>
                          </div>
                          <div className="vg-queue-actions">
                            <span
                              className={
                                item.status === 'Em análise'
                                  ? 'vg-badge-analyzing'
                                  : 'vg-badge-pending'
                              }
                            >
                              {item.status}
                            </span>
                            <button
                              type="button"
                              className="vg-analyze-link"
                              onClick={() => handleOpenAudit(item.id, { numeroGta: item.gta })}
                            >
                              <span>Analisar</span>
                              <ArrowRightIcon size={12} style={{ marginLeft: 4 }} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                {/* Coluna 2: Alertas */}
                <article className="vg-card vg-bottom-card">
                  <div className="vg-bottom-header">
                    <h2 className="vg-bottom-title">Alertas</h2>
                  </div>

                  <div className="vg-alerts-list">
                    {visibleAlerts.slice(0, 4).map((alert) => (
                      <div
                        key={alert.id}
                        className="vg-alert-item"
                        onClick={() => handleAlertClick(alert)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleAlertClick(alert);
                        }}
                        style={{ cursor: 'pointer' }}
                        title="Clique para inspecionar este alerta"
                      >
                        <span className="vg-alert-icon">
                          <AlertTriangleYellowIcon />
                        </span>
                        <div className="vg-alert-text">
                          <strong className="vg-alert-title">{alert.title}</strong>
                          <span className="vg-alert-sub">{alert.subtitle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Coluna 3: Rotas em andamento */}
                <article className="vg-card vg-bottom-card">
                  <div className="vg-bottom-header">
                    <h2 className="vg-bottom-title">Rotas em andamento</h2>
                  </div>

                  <div className="vg-routes-list">
                    {visibleRoutes.slice(0, 3).map((route) => (
                      <div
                        key={route.id}
                        className="vg-route-item"
                        onClick={() => handleOpenAudit(route.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleOpenAudit(route.id);
                        }}
                        style={{ cursor: 'pointer' }}
                        title="Clique para visualizar os detalhes desta rota"
                      >
                        <div className="vg-route-top">
                          <RouteActiveDotIcon />
                          <div className="vg-route-info">
                            <strong className="vg-route-driver">{route.driver}</strong>
                            <span className="vg-route-path">{route.route}</span>
                          </div>
                          <span className="vg-route-stage-badge">
                            {route.stage} • {route.progressPct}%
                          </span>
                        </div>
                        <div className="vg-route-progress-track" aria-hidden="true">
                          <div
                            className="vg-route-progress-fill"
                            style={{ width: `${route.progressPct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
              )}
            </div>
          )}

          {/* ==============================================================
              ABA 2: AUDITORIA (clip4_939_11)
              ============================================================== */}
          {activeTab === 'audit' && (
            <div className="vg-audit-layout">
              {/* LINHA DE INDICADORES DE AUDITORIA */}
              <section className="vg-audit-kpi-row" aria-label="Indicadores de auditoria">
                <article className="vg-card vg-audit-kpi-card">
                  <div className="vg-audit-kpi-header">
                    <span className="vg-audit-kpi-badge">Fila de análise</span>
                    <button
                      type="button"
                      className="vg-analyze-link"
                      onClick={() => setAuditStatusFilter('pending')}
                    >
                      <span>Ver fila</span>
                      <ArrowRightIcon size={12} style={{ marginLeft: 4 }} />
                    </button>
                  </div>
                  <div className="vg-audit-kpi-body">
                    <strong className="vg-audit-kpi-number">{visibleQueue.length}</strong>
                    <span className="vg-audit-kpi-sub">Prazo de análise: 24h</span>
                  </div>
                </article>

                <article className="vg-card vg-audit-kpi-card">
                  <div className="vg-audit-kpi-header">
                    <span className="vg-audit-kpi-badge">Aprovados na semana</span>
                    <button
                      type="button"
                      className="vg-analyze-link"
                      onClick={() => setAuditStatusFilter('approved')}
                    >
                      <span>Ver aprovados</span>
                      <ArrowRightIcon size={12} style={{ marginLeft: 4 }} />
                    </button>
                  </div>
                  <div className="vg-audit-kpi-body">
                    <strong className="vg-audit-kpi-number">{aprovadosCount}</strong>
                    <span className="vg-audit-kpi-sub">Sem ressalvas operacionais</span>
                  </div>
                </article>

                <article className="vg-card vg-audit-kpi-card">
                  <div className="vg-audit-kpi-header">
                    <span className="vg-audit-kpi-badge">Reprovados na semana</span>
                    <button
                      type="button"
                      className="vg-analyze-link"
                      onClick={() => setAuditStatusFilter('rejected')}
                    >
                      <span>Ver reprovados</span>
                      <ArrowRightIcon size={12} style={{ marginLeft: 4 }} />
                    </button>
                  </div>
                  <div className="vg-audit-kpi-body">
                    <strong className="vg-audit-kpi-number">{reprovadosCount}</strong>
                    <span className="vg-audit-kpi-sub">Mortes ou laudo divergente</span>
                  </div>
                </article>
              </section>

              {/* BARRA DE FILTROS DE STATUS */}
              <div className="vg-audit-filter-bar">
                <div className="vg-status-filters" role="group" aria-label="Filtrar por status">
                  <button
                    type="button"
                    className={`vg-status-filter-btn ${auditStatusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setAuditStatusFilter('all')}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={`vg-status-filter-btn ${auditStatusFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setAuditStatusFilter('pending')}
                  >
                    Pendentes
                  </button>
                  <button
                    type="button"
                    className={`vg-status-filter-btn ${auditStatusFilter === 'approved' ? 'active' : ''}`}
                    onClick={() => setAuditStatusFilter('approved')}
                  >
                    Aprovados
                  </button>
                  <button
                    type="button"
                    className={`vg-status-filter-btn ${auditStatusFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setAuditStatusFilter('rejected')}
                  >
                    Reprovados
                  </button>
                </div>
              </div>

              {/* GRID PRINCIPAL DE AUDITORIA: FILA + HISTÓRICO */}
              <div className="vg-audit-grid">
                {/* Coluna 1: Fila de análise */}
                <article className="vg-card vg-audit-card">
                  <div className="vg-bottom-header">
                    <h2 className="vg-bottom-title">Fila de análise</h2>
                    <p className="vg-bottom-subtitle">Diários aguardando parecer técnico</p>
                  </div>

                  <div className="vg-audit-list">
                    {visibleAuditQueue.length === 0 ? (
                      <p className="vg-audit-item-meta" style={{ padding: '16px 0' }}>
                        Nenhum diário pendente no filtro selecionado.
                      </p>
                    ) : (
                      visibleAuditQueue.map((item) => (
                        <div key={item.id} className="vg-audit-item">
                          <div className="vg-audit-item-info">
                            <strong className="vg-audit-item-title">
                              {item.code} • {item.gta}
                            </strong>
                            <span className="vg-audit-item-meta">
                              {item.driver} • {item.route}
                            </span>
                          </div>
                          <div className="vg-audit-item-right">
                            <span
                              className={
                                item.status === 'Em análise'
                                  ? 'vg-badge-analyzing'
                                  : 'vg-badge-pending'
                              }
                            >
                              {item.status}
                            </span>
                            <button
                              type="button"
                              className="vg-analyze-link"
                              onClick={() => handleOpenAudit(item.id, { numeroGta: item.gta })}
                            >
                              <span>Analisar</span>
                              <ArrowRightIcon size={12} style={{ marginLeft: 4 }} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                {/* Coluna 2: Histórico de pareceres */}
                <article className="vg-card vg-audit-card">
                  <div className="vg-bottom-header">
                    <h2 className="vg-bottom-title">Histórico de pareceres</h2>
                    <p className="vg-bottom-subtitle">Últimas auditorias registradas</p>
                  </div>

                  <div className="vg-audit-list">
                    {visibleAuditHistory.length === 0 ? (
                      <p className="vg-audit-item-meta" style={{ padding: '16px 0' }}>
                        Nenhum registro histórico no filtro selecionado.
                      </p>
                    ) : (
                      visibleAuditHistory.map((item) => (
                        <div key={item.id} className="vg-audit-item">
                          <div className="vg-audit-item-info">
                            <strong className="vg-audit-item-title">{item.code}</strong>
                            <span className="vg-audit-item-meta">{item.reason}</span>
                          </div>
                          <div className="vg-audit-item-right">
                            <span
                              className={
                                item.status === 'Aprovado'
                                  ? 'vg-badge-approved'
                                  : item.status === 'Reprovado'
                                  ? 'vg-badge-rejected'
                                  : 'vg-badge-pending'
                              }
                            >
                              {item.status}
                            </span>
                            <span className="vg-audit-timestamp">{item.timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </div>
            </div>
          )}

          {/* ==============================================================
              ABA 3: DIÁRIOS & RELATÓRIOS DA API
              ============================================================== */}
          {activeTab === 'reports' && (
            <div className="vg-reports-view">
              <header className="dashboard-header">
                <div>
                  <p className="dashboard-eyebrow">Painel web</p>
                  <h2>Relatórios de viagem sincronizados</h2>
                  <p>Consulta paginada dos relatórios disponíveis na API para sua conta.</p>
                </div>
                <div className="dashboard-header-actions">
                  <button
                    type="button"
                    className="dashboard-export-btn"
                    onClick={handleExportCsv}
                    title="Exportar dados tabulares para planilha (.csv)"
                  >
                    <ExportIcon size={16} />
                    <span>Exportar CSV</span>
                  </button>
                  <button type="button" onClick={refetch} disabled={isLoading}>
                    {isLoading ? 'Atualizando…' : 'Atualizar'}
                  </button>
                </div>
              </header>

              {data && !isLoading && (
                <p className="dashboard-total" role="status" aria-live="polite">
                  {data.total} {data.total === 1 ? 'relatório encontrado' : 'relatórios encontrados'}.
                </p>
              )}

              {isSuccess && data && data.itens.length > 0 && (
                <section className="dashboard-filters" aria-labelledby="dashboard-filter-title">
                  <h3 id="dashboard-filter-title">Filtrar relatórios desta página</h3>
                  <div className="dashboard-filter-fields">
                    <label htmlFor="report-search">
                      Buscar GTA, nota, status ou ID
                      <input
                        id="report-search"
                        type="search"
                        value={filters.query}
                        onChange={(event) =>
                          dispatchFilters({ type: 'queryChanged', value: event.target.value })
                        }
                      />
                    </label>
                    <label htmlFor="report-status">
                      Status
                      <select
                        id="report-status"
                        value={filters.status}
                        onChange={(event) =>
                          dispatchFilters({ type: 'statusChanged', value: event.target.value })
                        }
                      >
                        <option value="">Todos</option>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="dashboard-filter-reset"
                        onClick={() => dispatchFilters({ type: 'reset' })}
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </section>
              )}

              {isLoading && (
                <section className="dashboard-state" aria-busy="true" aria-live="polite">
                  <p role="status">Carregando relatórios…</p>
                </section>
              )}

              {isError && error && (
                <section className="dashboard-state dashboard-state-error" role="alert">
                  <h3>Não foi possível carregar os relatórios</h3>
                  <p>{error.message}</p>
                  <button type="button" onClick={refetch}>
                    Tentar novamente
                  </button>
                </section>
              )}

              {isSuccess && data && data.itens.length === 0 && (
                <section className="dashboard-state" role="status">
                  <h3>Nenhum relatório encontrado</h3>
                  <p>Não há relatórios de viagem registrados para esta página.</p>
                </section>
              )}

              {isSuccess && data && data.itens.length > 0 && (
                <>
                  {filteredReports.length === 0 ? (
                    <section className="dashboard-state" role="status">
                      <h3>Nenhum relatório corresponde aos filtros</h3>
                      <p>Ajuste a busca ou limpe os filtros para ver os itens desta página.</p>
                    </section>
                  ) : (
                    <div className="dashboard-table-wrap">
                      <table className="dashboard-table">
                        <caption>Relatórios de viagem da página {pagina + 1}</caption>
                        <thead>
                          <tr>
                            <th scope="col">GTA</th>
                            <th scope="col">Nota fiscal</th>
                            <th scope="col">Embarque</th>
                            <th scope="col">Status</th>
                            <th scope="col">Motorista</th>
                            <th scope="col">Fazenda</th>
                            <th scope="col">Frigorífico</th>
                            <th scope="col">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReports.map((report) => (
                            <ReportRow
                              key={report.id}
                              report={report}
                              resolveDriver={driverResolver}
                              resolveFazenda={fazendaResolver}
                              resolveFrigorifico={frigorificoResolver}
                              onAudit={(r) => handleOpenAudit(r.id, r)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <nav className="dashboard-pagination" aria-label="Paginação de relatórios">
                    <button
                      type="button"
                      onClick={() => setPagina((current) => Math.max(0, current - 1))}
                      disabled={!canGoBack || isLoading}
                    >
                      Página anterior
                    </button>
                    <span>
                      Página {pagina + 1} de {Math.max(1, data.totalPaginas)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPagina((current) => current + 1)}
                      disabled={!canGoForward || isLoading}
                    >
                      Próxima página
                    </button>
                  </nav>
                </>
              )}
            </div>
          )}
        </div>
      {isAnalista && selectedAuditReportId !== null && (
        <ReportAuditModal
          reportId={selectedAuditReportId}
          initialReport={selectedAuditReportPartial}
          onClose={handleCloseAudit}
          onAuditCompleted={() => {
            redisChartService.invalidateEmpresaCache(empresaId ?? 'default');
            refetch();
            refetchAll();
          }}
        />
      )}
    </AuthenticatedLayout>
  );
}

export default Dashboard;
