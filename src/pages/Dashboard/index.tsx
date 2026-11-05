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
import type { FuncionarioEmpresaResponse } from '../../types/funcionario';
import type { CaminhaoResponse } from '../../types/frota';
import {
  belongsToTenant,
  filterReportsByTenant,
  readTenantStorage,
  resolveCurrentTenant,
} from '../../utils/tenantScope';
import {
  DEMO_COLLABORATORS_SEED,
  DEMO_FAZENDAS_SEED,
  DEMO_FLEET_SEED,
  DEMO_FRIGORIFICOS_SEED,
} from '../../utils/tenantSeeds';
import { downloadRouteReportPdf } from '../../utils/routeReportPdf';
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
  type ChartDayBar,
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

interface AuditHistoryItem {
  readonly id: string;
  readonly code: string;
  readonly status: 'Aprovado' | 'Reprovado' | 'Com ressalva';
  readonly reason: string;
  readonly timestamp: string;
}

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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const statusStr = String(report.status || 'pendente').toLowerCase();
  const driverName = resolveDriver ? resolveDriver(report.motoristaId) : renderValue(report.motoristaId);
  const farmName = resolveFazenda ? resolveFazenda(report.fazendaId, report.nomeOrigem) : (report.nomeOrigem || renderValue(report.fazendaId));
  const fridgeName = resolveFrigorifico ? resolveFrigorifico(report.unidadeFrigorificaId, report.nomeDestino) : (report.nomeDestino || renderValue(report.unidadeFrigorificaId));

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await downloadRouteReportPdf(report.id, {
        report: {
          ...report,
          nomeOrigem: farmName !== '—' ? farmName : report.nomeOrigem,
          nomeDestino: fridgeName !== '—' ? fridgeName : report.nomeDestino,
        },
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="vg-analyze-link"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            title="Baixar PDF do relatório (formato idêntico ao mobile)"
            aria-label={`Baixar PDF do relatório GTA ${report.numeroGta ?? report.id}`}
          >
            <ExportIcon size={13} aria-hidden="true" />
            <span>{downloadingPdf ? 'Gerando...' : 'PDF'}</span>
          </button>
          <button
            type="button"
            className="vg-analyze-link"
            onClick={() => onAudit?.(report)}
            aria-label={`Auditar relatório GTA ${report.numeroGta ?? report.id}`}
          >
            <span>Auditar</span>
            <ArrowRightIcon size={14} aria-hidden="true" />
          </button>
        </div>
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

  const tenant = useMemo(() => resolveCurrentTenant(user, empresa), [user, empresa]);
  const empresaId = tenant.empresaId;

  // Coleções locais isoladas por empresa (sincronizadas com Colaboradores, Frota e Fazendas/Unidades)
  const localEmployees = useMemo<FuncionarioEmpresaResponse[]>(
    () => readTenantStorage<FuncionarioEmpresaResponse>('efficientia_colaboradores_v3', tenant, DEMO_COLLABORATORS_SEED),
    [tenant]
  );
  const localVehicles = useMemo<CaminhaoResponse[]>(
    () => readTenantStorage<CaminhaoResponse>('efficientia_frota_v3', tenant, DEMO_FLEET_SEED),
    [tenant]
  );
  const localFazendas = useMemo<Array<{ id: number; nome: string; ativo?: boolean; empresaId?: number; codigoEmpresa?: string | null }>>(
    () => readTenantStorage<{ id: number; nome: string; ativo?: boolean; empresaId?: number; codigoEmpresa?: string | null }>('efficientia_fazendas_v4', tenant, DEMO_FAZENDAS_SEED),
    [tenant]
  );
  const localUnidades = useMemo<Array<{ id: number; nome: string; ativo?: boolean; empresaId?: number; codigoEmpresa?: string | null }>>(
    () => readTenantStorage<{ id: number; nome: string; ativo?: boolean; empresaId?: number; codigoEmpresa?: string | null }>('efficientia_frigorificos_v4', tenant, DEMO_FRIGORIFICOS_SEED),
    [tenant]
  );

  // Chamadas de API com carregamento assíncrono e isolamento por empresaId
  const fetchPage = useCallback(
    (signal: AbortSignal) => relatorioService.listar(pagina, PAGE_SIZE, signal, empresaId),
    [pagina, empresaId]
  );
  const { data, error, isError, isLoading, isSuccess, refetch } = useFetchData(fetchPage);

  const { data: rawAllReports, refetch: refetchAll } = useFetchData(
    useCallback((signal: AbortSignal) => relatorioService.listarTodos(signal, 100, empresaId), [empresaId])
  );
  const { data: rawVehicles } = useFetchData(
    useCallback(
      (signal: AbortSignal) =>
        empresaId ? caminhaoService.listar({ empresaId }, signal) : Promise.resolve([]),
      [empresaId]
    )
  );
  const { data: rawEmployees } = useFetchData(
    useCallback(
      (signal: AbortSignal) =>
        empresaId ? funcionarioService.listarFuncionarios(empresaId, signal) : Promise.resolve([]),
      [empresaId]
    )
  );

  const employees = useMemo<FuncionarioEmpresaResponse[]>(() => {
    const map = new Map<number, FuncionarioEmpresaResponse>();
    localEmployees.forEach((emp) => map.set(emp.id, emp));
    (rawEmployees ?? []).forEach((emp) => {
      if (emp && typeof emp.id === 'number' && belongsToTenant(emp, tenant, { allowUnscoped: false })) {
        const existing = map.get(emp.id);
        map.set(emp.id, { ...emp, ...existing, id: emp.id });
      }
    });
    if (map.size === 0 && user) {
      const currentUserId = user.id || 1;
      map.set(currentUserId, {
        id: currentUserId,
        empresaId: tenant.empresaId,
        codigoEmpresa: tenant.codigoEmpresa,
        tipo: 'tipo' in user && user.tipo ? user.tipo : 'administrador',
        nome: user.nome || empresa?.nomeFantasia || 'Administrador Principal',
        cpf: ('cpf' in user && (user as { cpf?: string }).cpf) || '000.000.000-00',
        email: user.email || 'admin@empresa.com.br',
        telefone: user.telefone || '',
        cargo: user.cargo || 'Administrador',
        ativo: true,
        criadoEm: new Date().toISOString(),
        isCurrentUser: true,
      });
    }
    return Array.from(map.values());
  }, [localEmployees, rawEmployees, tenant, user, empresa]);

  const vehicles = useMemo<CaminhaoResponse[]>(() => {
    const map = new Map<number, CaminhaoResponse>();
    localVehicles.forEach((veh) => map.set(veh.id, veh));
    (rawVehicles ?? []).forEach((veh) => {
      if (veh && typeof veh.id === 'number' && belongsToTenant(veh, tenant, { allowUnscoped: false })) {
        const existing = map.get(veh.id);
        map.set(veh.id, { ...veh, ...existing, id: veh.id });
      }
    });
    return Array.from(map.values());
  }, [localVehicles, rawVehicles, tenant]);

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



  const tenantFilterDeps = useMemo(() => {
    const driverIds = new Set<number>(employees.map((e) => e.id));
    const vehicleIds = new Set<number>(vehicles.map((v) => v.id));
    const fazendaIds = new Set<number>(localFazendas.map((f) => f.id));
    const unidadeIds = new Set<number>(localUnidades.map((u) => u.id));
    return { driverIds, vehicleIds, fazendaIds, unidadeIds };
  }, [employees, vehicles, localFazendas, localUnidades]);

  const scopedPageReports = useMemo(
    () => filterReportsByTenant(data?.itens ?? [], tenant, tenantFilterDeps),
    [data?.itens, tenant, tenantFilterDeps]
  );

  const allReports = useMemo(
    () => filterReportsByTenant(rawAllReports ?? [], tenant, tenantFilterDeps),
    [rawAllReports, tenant, tenantFilterDeps]
  );

  const [filters, dispatchFilters] = useReducer(reportFiltersReducer, INITIAL_REPORT_FILTERS);
  const filteredReports = useMemo(
    () => filterReports(scopedPageReports, filters),
    [scopedPageReports, filters]
  );
  const statusOptions = useMemo(
    () => [...new Set(scopedPageReports.map((report) => report.status) ?? [])].sort(),
    [scopedPageReports]
  );
  const hasActiveFilters = filters.query.trim().length > 0 || filters.status.length > 0;

  const canGoBack = pagina > 0;
  const canGoForward = data !== null && pagina + 1 < data.totalPaginas;

  // Resolução de dados e métricas com fallbacks elegantes ao protótipo (restritos ao tenant)
  const reportSource = useMemo(
    () => (allReports.length > 0 ? allReports : scopedPageReports),
    [allReports, scopedPageReports]
  );
  const series = useMemo(() => buildWeeklySeries(reportSource, startOfWeek(new Date())), [reportSource]);
  const liveTotals = useMemo(() => totalsFromSeries(series), [series]);

  const fazendaResolver = useMemo(() => {
    const map = new Map<number, string>();
    if (tenant.isPrimaryDemoTenant) {
      map.set(1, 'Fazenda Santa Clara');
      map.set(2, 'Fazenda Três Irmãos');
      map.set(3, 'Fazenda Boa Vista');
      map.set(4, 'Fazenda Rio Verde');
    }
    localFazendas.forEach((f) => map.set(f.id, f.nome));
    (fazendasData?.itens ?? []).forEach((f) => {
      if (belongsToTenant(f as { empresaId?: number | null }, tenant, { allowUnscoped: tenant.isPrimaryDemoTenant })) {
        map.set(f.id, f.nome);
      }
    });
    return (id: number | null | undefined, fallbackName?: string | null) => {
      if (fallbackName && fallbackName.trim()) return fallbackName;
      if (!id) return 'Fazenda não informada';
      return map.get(id) ?? `Fazenda #${id}`;
    };
  }, [fazendasData, localFazendas, tenant]);

  const frigorificoResolver = useMemo(() => {
    const map = new Map<number, string>();
    if (tenant.isPrimaryDemoTenant) {
      map.set(1, 'Frigorífico Campo Grande SIF 101');
      map.set(2, 'Frigorífico Anápolis SIF 204');
      map.set(3, 'Frigorífico Rondonópolis SIF 308');
      map.set(4, 'Frigorífico Rio Verde SIF 412');
    }
    localUnidades.forEach((u) => map.set(u.id, u.nome));
    (unidadesData?.itens ?? []).forEach((u) => {
      if (belongsToTenant(u as { empresaId?: number | null }, tenant, { allowUnscoped: tenant.isPrimaryDemoTenant })) {
        map.set(u.id, u.nome);
      }
    });
    return (id: number | null | undefined, fallbackName?: string | null) => {
      if (fallbackName && fallbackName.trim()) return fallbackName;
      if (!id) return 'Frigorífico não informado';
      return map.get(id) ?? `Frigorífico #${id}`;
    };
  }, [unidadesData, localUnidades, tenant]);

  const driverResolver = useMemo(() => {
    const names = new Map<number, string>();
    if (tenant.isPrimaryDemoTenant) {
      names.set(1, 'Jonas Ribeiro');
      names.set(2, 'Cleiton Alves');
      names.set(3, 'Marcos Tavares');
      names.set(4, 'Adriano Souza');
      names.set(5, 'Wesley Prado');
    }
    (employees ?? []).forEach((employee) => names.set(employee.id, employee.nome));
    return (id: number | null | undefined) => (id ? names.get(id) ?? `Motorista #${id}` : 'Motorista não informado');
  }, [employees, tenant.isPrimaryDemoTenant]);

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

  // Relatórios válidos (não excluídos) presentes nos Diários de Rota da empresa
  const validReports = useMemo(
    () =>
      (reportSource ?? []).filter(
        (r) => r && String(r.status ?? '').toLowerCase() !== 'excluido'
      ),
    [reportSource]
  );

  // Totais reais consolidados a partir dos relatórios existentes em Diários de Rota
  const realReportTotals = useMemo(() => {
    const diarios = validReports.length;
    const pendentes = validReports.filter(
      (r) => String(r.status ?? '').toLowerCase() === 'pendente'
    ).length;
    const bovinos = validReports.reduce((acc, r) => acc + totalAnimaisDoRelatorio(r), 0);
    const mortos = validReports.reduce((acc, r) => acc + (r.quantidadeMorto ?? 0), 0);
    const mortalidadePct = bovinos > 0 ? (mortos / bovinos) * 100 : 0;
    const anomaliasEmbarque = validReports.reduce(
      (acc, r) => acc + (r.anomaliasEmbarque?.length ?? 0),
      0
    );
    const anomaliasDesembarque = validReports.reduce(
      (acc, r) => acc + (r.anomaliasDesembarque?.length ?? 0),
      0
    );
    return {
      diarios,
      pendentes,
      bovinos,
      mortos,
      mortalidadePct,
      anomaliasEmbarque,
      anomaliasDesembarque,
    };
  }, [validReports]);

  const totalDiariosVal =
    liveTotals.diarios > 0 ? liveTotals.diarios : realReportTotals.diarios;
  const totalBovinosVal = (
    liveTotals.bovinos > 0 ? liveTotals.bovinos : realReportTotals.bovinos
  ).toLocaleString('pt-BR');

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

      const inRange = validReports.filter((r) => {
        const d = dataEmbarqueDe(r) || dataDesembarqueDe(r);
        return d && d >= start && d <= end;
      });

      const targetList = inRange.length > 0 ? inRange : validReports;

      if (targetList.length === 0) {
        if (card === 'diarios') {
          return { primary: 0, secondary: 0 };
        }
        if (card === 'bovinos') {
          return { primary: '0', secondary: 0 };
        }
        if (card === 'mortalidade') {
          return { primary: '0,00%', secondary: '< 0,5%' };
        }
        return { primary: 0, secondary: 0 };
      }

      if (card === 'diarios') {
        const total = targetList.length;
        const pendentes = targetList.filter((r) => String(r.status ?? '').toLowerCase() === 'pendente').length;
        return { primary: total, secondary: pendentes };
      }
      if (card === 'bovinos') {
        const total = targetList.reduce((acc, r) => acc + totalAnimaisDoRelatorio(r), 0);
        const mortos = targetList.reduce((acc, r) => acc + (r.quantidadeMorto ?? 0), 0);
        return {
          primary: total.toLocaleString('pt-BR'),
          secondary: mortos,
        };
      }
      if (card === 'mortalidade') {
        const totalBov = targetList.reduce((acc, r) => acc + totalAnimaisDoRelatorio(r), 0);
        const mortos = targetList.reduce((acc, r) => acc + (r.quantidadeMorto ?? 0), 0);
        const pct = totalBov > 0 ? (mortos / totalBov) * 100 : 0;
        return {
          primary: formatPercent(pct),
          secondary: '< 0,5%',
        };
      }
      const emb = targetList.reduce((acc, r) => acc + (r.anomaliasEmbarque?.length ?? 0), 0);
      const des = targetList.reduce((acc, r) => acc + (r.anomaliasDesembarque?.length ?? 0), 0);
      return {
        primary: emb,
        secondary: des,
      };
    },
    [kpiPeriods, validReports]
  );

  const diariosKpi = getKpiData('diarios');
  const bovinosKpi = getKpiData('bovinos');
  const mortalidadeKpi = getKpiData('mortalidade');
  const anomaliasKpi = getKpiData('anomalias');

  const currentWeekKey = useMemo(() => {
    const s = startOfWeek(new Date());
    return `${s.getFullYear()}-W${Math.ceil((s.getDate() + 6) / 7)}`;
  }, []);

  // Gráficos semanais sincronizados com os relatórios reais de Diários de Rota
  const chartBars = useMemo(() => {
    const activeEmpresaId = `${empresaId ?? 'default'}_n${validReports.length}`;

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

    const makeBars = (values: number[], ceiling: number): ChartDayBar[] =>
      values.map((value, index) => ({
        day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][index],
        value,
        heightPct: ceiling && value > 0 ? Math.max(3, Math.round((value / ceiling) * 100)) : 0,
        highlight: index === new Date().getDay(),
      }));

    const calculatedBars = {
      desembarque: makeBars(series.desembarque, niceCeiling(Math.max(...series.desembarque, 1))),
      embarque: makeBars(series.embarque, niceCeiling(Math.max(...series.embarque, 1))),
      mortes: makeBars(series.mortes, niceCeiling(Math.max(...series.mortes, 1))),
      anomalias: makeBars(
        series.anomaliasEmbarque.map((val, i) => val + series.anomaliasDesembarque[i]),
        niceCeiling(Math.max(...series.anomaliasEmbarque, ...series.anomaliasDesembarque, 1))
      ),
    };

    redisChartService.setChartCache(activeEmpresaId, 'desembarque', currentWeekKey, calculatedBars.desembarque);
    redisChartService.setChartCache(activeEmpresaId, 'embarque', currentWeekKey, calculatedBars.embarque);
    redisChartService.setChartCache(activeEmpresaId, 'mortes', currentWeekKey, calculatedBars.mortes);
    redisChartService.setChartCache(activeEmpresaId, 'anomalias', currentWeekKey, calculatedBars.anomalias);

    return calculatedBars;
  }, [currentWeekKey, empresaId, series, validReports.length]);

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

  const totalFuncionarios =
    employees && employees.length > 0 ? employees.length : 1;
  const motoristasCount =
    employees && employees.length > 0
      ? employees.filter((e) => (e.cargo || '').toLowerCase().includes('motorista') || e.tipo === 'motorista').length
      : 0;

  const totalCaminhoes = vehicles ? vehicles.length : 0;
  const emRotaCaminhoes =
    vehicles && vehicles.length > 0
      ? vehicles.filter((v) => v.statusUso === 'EM_USO' || ('status' in v && (v as { status?: string }).status === 'EM_USO')).length
      : 0;

  const totalFazendas = localFazendas.length;
  const totalFrigorificos = localUnidades.length;
  const totalPolos = totalFazendas + totalFrigorificos;

  const getAdminKpiData = useCallback(
    (card: 'colaboradores' | 'frota' | 'polos' | 'bovinos'): KpiMetricValues => {
      switch (card) {
        case 'colaboradores': {
          return {
            primary: totalFuncionarios,
            secondary: motoristasCount,
          };
        }
        case 'frota': {
          return {
            primary: totalCaminhoes,
            secondary: emRotaCaminhoes,
          };
        }
        case 'polos': {
          return {
            primary: totalPolos,
            secondary: totalFrigorificos,
          };
        }
        case 'bovinos': {
          return {
            primary: totalBovinosVal,
            secondary: totalDiariosVal,
          };
        }
      }
    },
    [
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
    if (tenant.isPrimaryDemoTenant) {
      return DEFAULT_TEAM_MEMBERS;
    }
    return user
      ? [
          {
            id: user.id || 1,
            nome: user.nome,
            cargo: 'cargo' in user && user.cargo ? user.cargo : 'Administrador',
            info: user.email || 'Acesso ativo',
          },
        ]
      : [];
  }, [employees, DEFAULT_TEAM_MEMBERS, tenant.isPrimaryDemoTenant, user]);

  const visibleTeam = useMemo(() => {
    if (!normalizedSearch) return teamMembers;
    return teamMembers.filter(
      (m) =>
        m.nome.toLowerCase().includes(normalizedSearch) ||
        m.cargo.toLowerCase().includes(normalizedSearch) ||
        m.info.toLowerCase().includes(normalizedSearch)
    );
  }, [teamMembers, normalizedSearch]);

  const ADMIN_ALERTS: readonly AlertItem[] = useMemo(() => {
    const dynamicAlerts: AlertItem[] = [];

    if (vehicles && vehicles.length > 0) {
      vehicles.forEach((v) => {
        if (v.statusUso === 'MANUTENCAO' || v.ativo === false) {
          dynamicAlerts.push({
            id: `adm-veh-maint-${v.id}`,
            title: v.statusUso === 'MANUTENCAO' ? 'Veículo em manutenção preventiva' : 'Veículo inativo na frota',
            subtitle: `Placa ${v.placa} • ${v.marca || ''} ${v.modelo || ''}`.trim(),
            severity: 'bloqueio',
          });
        } else if (v.dataVencimentoInspecao) {
          const daysLeft = Math.ceil((new Date(v.dataVencimentoInspecao).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 60) {
            dynamicAlerts.push({
              id: `adm-veh-insp-${v.id}`,
              title: daysLeft < 0 ? 'Inspeção veicular vencida' : `Inspeção veicular em ${daysLeft} dias`,
              subtitle: `Placa ${v.placa} • Vencimento ${new Date(v.dataVencimentoInspecao).toLocaleDateString('pt-BR')}`,
              severity: daysLeft < 0 ? 'bloqueio' : 'alerta',
            });
          }
        }
      });
    }

    if (employees && employees.length > 0) {
      employees.forEach((emp) => {
        if (emp.dataVencimentoCnh) {
          const daysLeft = Math.ceil((new Date(emp.dataVencimentoCnh).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 60) {
            dynamicAlerts.push({
              id: `adm-emp-cnh-${emp.id}`,
              title: daysLeft < 0 ? 'CNH vencida' : `CNH a vencer em ${daysLeft} dias`,
              subtitle: `${emp.nome} • Categoria ${emp.categoriaCnh || 'E'}`,
              severity: daysLeft < 0 ? 'bloqueio' : 'alerta',
            });
          }
        }
      });
    }

    if (localFazendas && localFazendas.length > 0) {
      localFazendas.forEach((f) => {
        if (f.ativo === false) {
          dynamicAlerts.push({
            id: `adm-faz-${f.id}`,
            title: 'Homologação de fazenda pendente',
            subtitle: `${f.nome} • Cadastro inativo`,
            severity: 'alerta',
          });
        }
      });
    }

    liveAlerts.forEach((al) => {
      if (!dynamicAlerts.some((existing) => existing.id === al.id)) {
        dynamicAlerts.push(al);
      }
    });

    return dynamicAlerts.slice(0, 5);
  }, [vehicles, employees, localFazendas, liveAlerts]);

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

  const queueSource = useMemo(() => liveQueue, [liveQueue]);
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

  const alertsSource = useMemo(() => liveAlerts, [liveAlerts]);
  const visibleAlerts = useMemo(() => {
    if (!normalizedSearch) return alertsSource;
    return alertsSource.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.subtitle.toLowerCase().includes(normalizedSearch)
    );
  }, [alertsSource, normalizedSearch]);

  const routesSource = useMemo(() => liveRoutes, [liveRoutes]);
  const visibleRoutes = useMemo(() => {
    if (!normalizedSearch) return routesSource;
    return routesSource.filter(
      (item) =>
        item.driver.toLowerCase().includes(normalizedSearch) ||
        item.route.toLowerCase().includes(normalizedSearch)
    );
  }, [routesSource, normalizedSearch]);

  // Auditoria: histórico e fila sincronizados com os relatórios reais
  const liveAuditHistory = useMemo<readonly AuditHistoryItem[]>(() => {
    if (validReports.length === 0) {
      return [];
    }
    return validReports
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
  }, [validReports]);

  const aprovadosCount = useMemo(() => {
    return validReports.filter((r) => {
      const s = (r.status || '').toLowerCase();
      return s === 'aprovado' || s === 'concluido';
    }).length;
  }, [validReports]);

  const reprovadosCount = useMemo(() => {
    return validReports.filter((r) => {
      const s = (r.status || '').toLowerCase();
      return s === 'reprovado';
    }).length;
  }, [validReports]);

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
    const reportsToExport = allReports && allReports.length > 0 ? allReports : scopedPageReports;
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
  }, [allReports, scopedPageReports]);

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



  // Itens indexados para pesquisa rápida na barra superior (escopados pela empresa logada)
  const quickSearchReports = useMemo<readonly QuickSearchReportItem[]>(() => {
    return queueSource.map((item) => ({
      id: item.id,
      code: item.code,
      gta: item.gta,
      driver: item.driver,
      plate: item.plate,
      route: item.route,
      status: item.status,
    }));
  }, [queueSource]);

  const quickSearchVehicles = useMemo<readonly QuickSearchVehicleItem[]>(() => {
    const list: QuickSearchVehicleItem[] = [];
    if (vehicles && vehicles.length > 0) {
      vehicles.forEach((v) => {
        if (!list.some((existing) => existing.placa.toUpperCase() === v.placa?.toUpperCase())) {
          list.push({
            id: v.id,
            placa: v.placa,
            modelo: v.modelo || 'Caminhão Boiadeiro',
            marca: v.marca || '',
            motorista: v.motoristaAtualNome || '',
            status: v.statusUso === 'EM_USO' ? 'Em trânsito' : v.statusUso === 'MANUTENCAO' ? 'Manutenção' : 'Disponível',
          });
        }
      });
    }
    return list;
  }, [vehicles]);

  const quickSearchDrivers = useMemo<readonly QuickSearchDriverItem[]>(() => {
    const list: QuickSearchDriverItem[] = [];
    if (employees && employees.length > 0) {
      employees.forEach((emp) => {
        if (!list.some((existing) => existing.nome.toLowerCase() === emp.nome.toLowerCase())) {
          list.push({
            id: emp.id,
            nome: emp.nome,
            cargo: emp.cargo || emp.tipo || 'Colaborador',
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
                    <AdminTrendChart isDarkMode={theme === 'dark'} reports={validReports} />
                    <AdminFleetDonutChart
                      totalVehicles={totalCaminhoes}
                      inTransitCount={emRotaCaminhoes}
                      isDarkMode={theme === 'dark'}
                    />
                  </div>

                  {/* GRID INFERIOR: TOP CORREDORES LOGÍSTICOS (55%) + GAUGE DE BEM-ESTAR ANIMAL (45%) */}
                  <div className="vg-admin-grid-mid">
                    <AdminTopRoutesChart
                      isDarkMode={theme === 'dark'}
                      reports={validReports}
                      fazendaResolver={fazendaResolver}
                      frigorificoResolver={frigorificoResolver}
                    />
                    <AdminWelfareGauge isDarkMode={theme === 'dark'} reports={validReports} />
                  </div>
                </section>
              ) : (
                <AnalistaWelfareCharts
                  isDarkMode={theme === 'dark'}
                  reports={validReports}
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
                      {ADMIN_ALERTS.length === 0 ? (
                        <div className="vg-empty-inline">
                          Nenhum alerta operacional pendente na frota ou cadastros.
                        </div>
                      ) : (
                        ADMIN_ALERTS.map((alert) => (
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
                        ))
                      )}
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
                              onClick={() => downloadRouteReportPdf(item.id, { report: { id: item.id, numeroGta: item.gta } })}
                              title="Baixar PDF deste diário de rota"
                            >
                              <ExportIcon size={12} style={{ marginRight: 4 }} />
                              <span>PDF</span>
                            </button>
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
                              onClick={() => downloadRouteReportPdf(item.id, { report: { id: item.id, numeroGta: item.gta } })}
                              title="Baixar PDF deste diário de rota"
                            >
                              <ExportIcon size={12} style={{ marginRight: 4 }} />
                              <span>PDF</span>
                            </button>
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
                  {scopedPageReports.length} {scopedPageReports.length === 1 ? 'relatório encontrado' : 'relatórios encontrados'}.
                </p>
              )}

              {isSuccess && data && scopedPageReports.length > 0 && (
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

              {isSuccess && data && scopedPageReports.length === 0 && (
                <section className="dashboard-state" role="status">
                  <h3>Nenhum relatório encontrado</h3>
                  <p>Não há relatórios de viagem registrados para sua empresa nesta página.</p>
                </section>
              )}

              {isSuccess && data && scopedPageReports.length > 0 && (
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
