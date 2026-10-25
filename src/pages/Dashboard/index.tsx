import { useCallback, useMemo, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useFetchData } from '../../hooks/useFetchData';
import { caminhaoService } from '../../services/caminhaoService';
import { funcionarioService } from '../../services/funcionarioService';
import { relatorioService } from '../../services/relatorioService';
import type { RelatorioViagemResponse } from '../../types/relatorio';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  buildAlerts,
  buildAnalysisQueue,
  buildOngoingRoutes,
  buildWeeklySeries,
  formatPercent,
  niceCeiling,
  startOfWeek,
  totalsFromSeries,
  type AlertItem,
  type AnalysisQueueItem,
  type ChartDayBar,
  type OngoingRouteItem,
} from './dashboardMetrics';
import { filterReports, INITIAL_REPORT_FILTERS, reportFiltersReducer } from './reportFilters';
import {
  BullBrandLogo,
  SidebarIconGrid,
  SidebarIconDoc,
  SidebarIconFolder,
  SidebarIconUsers,
  SidebarIconTruck,
  SidebarIconBuilding,
  SidebarIconChat,
  SidebarIconSettings,
  KpiIconDiarios,
  KpiIconBovinos,
  KpiIconMortalidade,
  KpiIconAnomalias,
  TopbarBellIcon,
  SearchMagnifierIcon,
  AlertTriangleYellowIcon,
  RouteActiveDotIcon,
  SunIcon,
  MoonIcon,
} from './DashboardIcons';
import './Dashboard.css';
import { InteractiveBarChart } from './InteractiveBarChart';

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
    route: 'Santa Clara → Campo Grande',
    status: 'Pendente',
  },
  {
    id: 2040,
    code: 'RR-2040',
    gta: 'MT-0114558',
    driver: 'Cleiton Alves',
    route: 'Boa Vista → Rondonópolis',
    status: 'Em análise',
  },
  {
    id: 2036,
    code: 'RR-2036',
    gta: 'Sem GTA',
    driver: 'Cleiton Alves',
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

function ReportRow({ report }: { readonly report: RelatorioViagemResponse }) {
  return (
    <tr>
      <td>{renderValue(report.numeroGta)}</td>
      <td>{renderValue(report.numeroNotaFiscal)}</td>
      <td>{renderValue(report.dataEmbarque)}</td>
      <td>
        <span className="dashboard-status">{report.status}</span>
      </td>
      <td>{renderValue(report.motoristaId)}</td>
      <td>{renderValue(report.fazendaId)}</td>
    </tr>
  );
}

export interface DashboardProps {
  readonly initialTab?: 'overview' | 'audit' | 'reports';
}

export function Dashboard({ initialTab = 'overview' }: DashboardProps) {
  const { empresa } = useAuth();
  const { theme, setTheme } = useTheme();
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

  const userDisplayName = empresa?.nomeFantasia || empresa?.razaoSocial || 'Administrador';
  const empresaId = empresa?.id;

  // Chamadas de API com carregamento assíncrono
  const fetchPage = useCallback(
    (signal: AbortSignal) => relatorioService.listar(pagina, PAGE_SIZE, signal),
    [pagina]
  );
  const { data, error, isError, isLoading, isSuccess, refetch } = useFetchData(fetchPage);

  const { data: allReports } = useFetchData(
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

  const driverResolver = useMemo(() => {
    const names = new Map<number, string>();
    (employees ?? []).forEach((employee) => names.set(employee.id, employee.nome));
    return (id: number | null) => (id ? names.get(id) ?? `Motorista #${id}` : 'Motorista não informado');
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

  // Gráficos semanais: usa dados reais se calculados, senão usa os gráficos do protótipo
  const hasLiveChartData = series.desembarque.some((v) => v > 0);
  const chartBars = useMemo(() => {
    if (!hasLiveChartData) {
      return {
        desembarque: VOLUME_DESEMBARQUE_BARS,
        embarque: VOLUME_EMBARQUE_BARS,
        mortes: MORTES_REGISTRADAS_BARS,
        anomalias: ANOMALIAS_ETAPA_BARS,
      };
    }
    const makeBars = (values: number[], ceiling: number): ChartDayBar[] =>
      values.map((value, index) => ({
        day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][index],
        value,
        heightPct: ceiling ? Math.max(3, Math.round((value / ceiling) * 100)) : 0,
        highlight: index === new Date().getDay(),
      }));

    return {
      desembarque: makeBars(series.desembarque, niceCeiling(Math.max(...series.desembarque, 1))),
      embarque: makeBars(series.embarque, niceCeiling(Math.max(...series.embarque, 1))),
      mortes: makeBars(series.mortes, niceCeiling(Math.max(...series.mortes, 1))),
      anomalias: makeBars(
        series.anomaliasEmbarque.map((val, i) => val + series.anomaliasDesembarque[i]),
        niceCeiling(Math.max(...series.anomaliasEmbarque, ...series.anomaliasDesembarque, 1))
      ),
    };
  }, [hasLiveChartData, series]);

  const ceilings = useMemo(() => {
    return {
      desembarque: hasLiveChartData
        ? niceCeiling(Math.max(...series.desembarque, 1))
        : 3000,
      embarque: hasLiveChartData
        ? niceCeiling(Math.max(...series.embarque, 1))
        : 900,
      mortes: hasLiveChartData
        ? niceCeiling(Math.max(...series.mortes, 1))
        : 8,
      anomalias: hasLiveChartData
        ? niceCeiling(
            Math.max(
              ...series.anomaliasEmbarque.map(
                (val, i) => val + series.anomaliasDesembarque[i]
              ),
              1
            )
          )
        : 12,
    };
  }, [hasLiveChartData, series]);

  // Listas filtradas com busca
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const queueSource = liveQueue.length > 0 ? liveQueue : DEFAULT_QUEUE_ITEMS;
  const visibleQueue = useMemo(() => {
    if (!normalizedSearch) return queueSource;
    return queueSource.filter(
      (item) =>
        item.code.toLowerCase().includes(normalizedSearch) ||
        item.gta.toLowerCase().includes(normalizedSearch) ||
        item.driver.toLowerCase().includes(normalizedSearch) ||
        item.route.toLowerCase().includes(normalizedSearch)
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
  const visibleAuditHistory = useMemo(() => {
    return DEFAULT_AUDIT_HISTORY.filter((item) => {
      const matchSearch =
        !normalizedSearch ||
        item.code.toLowerCase().includes(normalizedSearch) ||
        item.reason.toLowerCase().includes(normalizedSearch);
      if (!matchSearch) return false;
      if (auditStatusFilter === 'approved') return item.status === 'Aprovado';
      if (auditStatusFilter === 'rejected') return item.status === 'Reprovado';
      return true;
    });
  }, [normalizedSearch, auditStatusFilter]);

  const visibleAuditQueue = useMemo(() => {
    if (auditStatusFilter === 'approved' || auditStatusFilter === 'rejected') return [];
    return visibleQueue;
  }, [visibleQueue, auditStatusFilter]);

  // Navegação de abas
  const handleTabChange = (tab: 'overview' | 'audit' | 'reports') => {
    setActiveTab(tab);
    if (tab === 'overview') navigate('/visao-geral');
    else if (tab === 'audit') navigate('/auditoria');
    else if (tab === 'reports') navigate('/diarios');
  };

  const handleCtaClick = () => {
    if (activeTab === 'overview') handleTabChange('reports');
    else if (activeTab === 'audit') handleTabChange('reports');
    else handleTabChange('overview');
  };

  return (
    <div className={`vg-shell ${theme === 'dark' ? 'dark' : ''}`}>
      {/* ==================================================================
          TOPBAR
          ================================================================== */}
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div
            className="vg-brand"
            onClick={() => handleTabChange('overview')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleTabChange('overview');
            }}
          >
            <BullBrandLogo />
            <div className="vg-brand-text">
              <span className="vg-brand-title">
                Efficien<span className="vg-brand-highlight">tia</span>
              </span>
              <span className="vg-brand-Check">
                <span className="vg-brand-green">Eficiência</span> que viaja junto com você
              </span>
            </div>
          </div>

          <div className="vg-topbar-divider" aria-hidden="true" />

          <div className="vg-page-heading">
            <h1 id="dashboard-heading">
              {activeTab === 'overview'
                ? 'Visão Geral'
                : activeTab === 'audit'
                ? 'Auditoria'
                : 'Diários de Viagem'}
            </h1>
            <p className="vg-page-subtitle">
              {activeTab === 'overview'
                ? 'Terça-feira, 08 de setembro de 2026 • 3 rotas em andamento'
                : activeTab === 'audit'
                ? '2 diários aguardando parecer • 3 análises concluídas'
                : 'Dados sincronizados com a operação'}
            </p>
          </div>
        </div>

        {/* Toggle Pill central: Visão Geral | Auditoria */}
        <div className="vg-topbar-center">
          <div className="vg-toggle-pill" role="tablist" aria-label="Visualização do painel">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              className={`vg-pill-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabChange('overview')}
            >
              Visão Geral
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'audit'}
              className={`vg-pill-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => handleTabChange('audit')}
            >
              Auditoria
            </button>
          </div>
        </div>

        <div className="vg-topbar-right">
          <div className="vg-search-box">
            <SearchMagnifierIcon />
            <label htmlFor="vg-global-search" className="visually-hidden">
              Buscar GTA, placa ou motorista
            </label>
            <input
              id="vg-global-search"
              type="search"
              placeholder="Buscar GTA, placa ou motorista"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                dispatchFilters({ type: 'queryChanged', value: e.target.value });
              }}
              className="vg-search-input"
            />
          </div>

          {/* Botão de alternar tema Light/Dark */}
          <button
            type="button"
            className="vg-theme-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Botão do sino de notificações com badge verde */}
          <button
            type="button"
            className="vg-bell-btn"
            aria-label="Notificações"
            title="Notificações operacionais"
          >
            <TopbarBellIcon />
          </button>

          {/* Botão CTA dinâmico */}
          <button type="button" className="vg-cta-btn" onClick={handleCtaClick}>
            {activeTab === 'overview'
              ? 'Ver diários →'
              : activeTab === 'audit'
              ? 'Analisar próximo →'
              : '← Visão Geral'}
          </button>
        </div>
      </header>

      {/* ==================================================================
          CORPO PRINCIPAL (SIDEBAR + MAIN)
          ================================================================== */}
      <div className="vg-body">
        {/* SIDEBAR */}
        <aside className="vg-sidebar" aria-label="Menu lateral principal">
          <nav className="vg-nav-top">
            <button
              type="button"
              className={`vg-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabChange('overview')}
              aria-label="Visão Geral"
              title="Visão Geral"
            >
              <SidebarIconGrid />
            </button>
            <button
              type="button"
              className={`vg-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => handleTabChange('reports')}
              aria-label="Diários e Relatórios"
              title="Diários e Relatórios"
            >
              <SidebarIconDoc />
            </button>
            <button
              type="button"
              className={`vg-nav-item ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => handleTabChange('audit')}
              aria-label="Auditorias e Pastas"
              title="Auditorias e Pastas"
            >
              <SidebarIconFolder />
            </button>
            <button
              type="button"
              className="vg-nav-item"
              onClick={() => navigate('/motoristas')}
              aria-label="Motoristas e Equipe"
              title="Motoristas e Equipe"
            >
              <SidebarIconUsers />
            </button>
            <button
              type="button"
              className="vg-nav-item"
              onClick={() => navigate('/frota')}
              aria-label="Frota de Caminhões"
              title="Frota de Caminhões"
            >
              <SidebarIconTruck />
            </button>
            <button
              type="button"
              className="vg-nav-item"
              onClick={() => navigate('/fazenda-unidades')}
              aria-label="Unidades e Fazendas"
              title="Unidades e Fazendas"
            >
              <SidebarIconBuilding />
            </button>
          </nav>

          <div className="vg-nav-bottom">
            <button
              type="button"
              className="vg-nav-item"
              aria-label="Mensagens e Suporte"
              title="Mensagens e Suporte"
            >
              <SidebarIconChat />
            </button>
            <button
              type="button"
              className="vg-nav-item"
              onClick={() => navigate('/configuracao')}
              aria-label="Configurações"
              title="Configurações"
            >
              <SidebarIconSettings />
            </button>

            <div className="vg-sidebar-divider" aria-hidden="true" />

            <div
              className="vg-avatar-wrapper"
              title={`Perfil: ${userDisplayName}`}
              onClick={() => navigate('/configuracao')}
              style={{ cursor: 'pointer' }}
            >
              <GenericUserAvatar size={38} name={userDisplayName} />
            </div>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main
          id="main-content"
          className="vg-main"
          aria-labelledby="dashboard-heading"
          tabIndex={-1}
        >
          {/* ==============================================================
              ABA 1: VISÃO GERAL (clip0_939_11)
              ============================================================== */}
          {activeTab === 'overview' && (
            <div className="vg-grid-layout">
              {/* LINHA 1: 4 CARDS DE KPI */}
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
                    <span className="vg-period-badge">Esta Semana ⌄</span>
                  </div>
                  <div className="vg-kpi-metrics">
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Total</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{totalDiariosVal}</strong>
                        <span className="vg-metric-delta vg-delta-positive">+20,0%</span>
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Pendentes</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{pendentesDiariosVal}</strong>
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
                    <span className="vg-period-badge">Esta Semana ⌄</span>
                  </div>
                  <div className="vg-kpi-metrics">
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Total</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{totalBovinosVal}</strong>
                        <span className="vg-metric-delta vg-delta-positive">+12,0%</span>
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Mortos</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{mortosBovinosVal}</strong>
                        <span className="vg-metric-delta vg-delta-negative">+5,0%</span>
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
                    <span className="vg-period-badge">Esta Semana ⌄</span>
                  </div>
                  <div className="vg-kpi-metrics">
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Total</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{taxaMortalidadeVal}</strong>
                        <span className="vg-metric-delta vg-delta-negative">+2,0%</span>
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
                    <span className="vg-period-badge">Esta Semana ⌄</span>
                  </div>
                  <div className="vg-kpi-metrics">
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Embarque</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{anomaliasEmbarqueVal}</strong>
                        <span className="vg-metric-delta vg-delta-positive">-2,0%</span>
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Desembarque</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">{anomaliasDesembarqueVal}</strong>
                        <span className="vg-metric-delta vg-delta-positive">-5,0%</span>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              {/* LINHA 2: GRÁFICOS DE BARRAS INTERATIVOS COM RÓTULOS E DOWNLOAD (CSV & IMAGEM) */}
              <section className="vg-charts-row" aria-label="Gráficos semanais de operação com interatividade e exportação">
                {/* Gráfico 1: Volume de desembarque */}
                <InteractiveBarChart
                  id="desembarque"
                  title="Volume de desembarque"
                  subtitle="Animais descarregados nos frigoríficos"
                  unit="bovinos"
                  bars={chartBars.desembarque}
                  ceiling={ceilings.desembarque}
                  variant="large"
                  colorScheme="blue"
                  isDarkMode={theme === 'dark'}
                  yAxisSteps={[ceilings.desembarque, Math.round(ceilings.desembarque * 0.66), Math.round(ceilings.desembarque * 0.33), 0]}
                />

                {/* Gráfico 2: Volume de embarque */}
                <InteractiveBarChart
                  id="embarque"
                  title="Volume de embarque"
                  subtitle="Animais embarcados nas fazendas"
                  unit="bovinos"
                  bars={chartBars.embarque}
                  ceiling={ceilings.embarque}
                  variant="small"
                  colorScheme="blue"
                  isDarkMode={theme === 'dark'}
                />

                {/* Gráfico 3: Mortes registradas */}
                <InteractiveBarChart
                  id="mortes"
                  title="Mortes registradas"
                  subtitle="Óbitos ocorridos no trajeto"
                  unit="mortes"
                  bars={chartBars.mortes}
                  ceiling={ceilings.mortes}
                  variant="small"
                  colorScheme="red"
                  isDarkMode={theme === 'dark'}
                />

                {/* Gráfico 4: Anomalias por etapa */}
                <InteractiveBarChart
                  id="anomalias"
                  title="Anomalias por etapa"
                  subtitle="Ocorrências registradas na rota"
                  unit="anomalias"
                  bars={chartBars.anomalias}
                  ceiling={ceilings.anomalias}
                  variant="small"
                  colorScheme="orange"
                  isDarkMode={theme === 'dark'}
                />
              </section>

              {/* LINHA 3: FILA DE ANÁLISE, ALERTAS E ROTAS EM ANDAMENTO */}
              <section className="vg-bottom-row" aria-label="Operações em tempo real e auditoria">
                {/* Coluna 1: Fila de análise */}
                <article className="vg-card vg-bottom-card">
                  <div className="vg-bottom-header">
                    <h2 className="vg-bottom-title">Fila de análise</h2>
                    <p className="vg-bottom-subtitle">Diários aguardando parecer</p>
                  </div>

                  <div className="vg-queue-list">
                    {visibleQueue.slice(0, 2).map((item) => (
                      <div key={item.id} className="vg-queue-item">
                        <div className="vg-queue-info">
                          <strong className="vg-queue-code">
                            {item.code} • {item.gta}
                          </strong>
                          <span className="vg-queue-meta">
                            {item.driver} • {item.route}
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
                            onClick={() => handleTabChange('audit')}
                          >
                            Analisar →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Coluna 2: Alertas */}
                <article className="vg-card vg-bottom-card">
                  <div className="vg-bottom-header">
                    <h2 className="vg-bottom-title">Alertas</h2>
                  </div>

                  <div className="vg-alerts-list">
                    {visibleAlerts.slice(0, 4).map((alert) => (
                      <div key={alert.id} className="vg-alert-item">
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
                      <div key={route.id} className="vg-route-item">
                        <div className="vg-route-top">
                          <RouteActiveDotIcon />
                          <div className="vg-route-info">
                            <strong className="vg-route-driver">{route.driver}</strong>
                            <span className="vg-route-path">{route.route}</span>
                          </div>
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
                      Ver fila →
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
                      Ver aprovados →
                    </button>
                  </div>
                  <div className="vg-audit-kpi-body">
                    <strong className="vg-audit-kpi-number">2</strong>
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
                      Ver reprovados →
                    </button>
                  </div>
                  <div className="vg-audit-kpi-body">
                    <strong className="vg-audit-kpi-number">1</strong>
                    <span className="vg-audit-kpi-sub">Mortes sem laudo</span>
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
                              onClick={() => handleTabChange('reports')}
                            >
                              Analisar →
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
                <button type="button" onClick={refetch} disabled={isLoading}>
                  {isLoading ? 'Atualizando…' : 'Atualizar'}
                </button>
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
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReports.map((report) => (
                            <ReportRow key={report.id} report={report} />
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
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
