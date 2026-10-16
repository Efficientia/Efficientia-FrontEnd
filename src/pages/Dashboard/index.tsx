import { useCallback, useMemo, useReducer, useState } from 'react';
import { useFetchData } from '../../hooks/useFetchData';
import { relatorioService } from '../../services/relatorioService';
import type { RelatorioViagemResponse } from '../../types/relatorio';
import { filterReports, INITIAL_REPORT_FILTERS, reportFiltersReducer } from './reportFilters';
import avatarUser from '../../assets/avatar-user.png';
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
} from './DashboardIcons';
import './Dashboard.css';

const PAGE_SIZE = 20;

interface ChartDayBar {
  readonly day: string;
  readonly value: number;
  readonly heightPct: number;
  readonly highlight?: boolean;
}

interface AnalysisQueueItem {
  readonly id: string;
  readonly code: string;
  readonly gta: string;
  readonly driver: string;
  readonly route: string;
  readonly status: string;
}

interface AlertItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
}

interface OngoingRouteItem {
  readonly id: string;
  readonly driver: string;
  readonly route: string;
  readonly progressPct: number;
}

const VOLUME_DESEMBARQUE_BARS: readonly ChartDayBar[] = [
  { day: 'Dom', value: 1250, heightPct: 40, highlight: true },
  { day: 'Seg', value: 3000, heightPct: 96 },
  { day: 'Ter', value: 2200, heightPct: 71 },
  { day: 'Qua', value: 3050, heightPct: 98 },
  { day: 'Qui', value: 2600, heightPct: 84 },
  { day: 'Sex', value: 2350, heightPct: 75 },
  { day: 'Sáb', value: 1800, heightPct: 57, highlight: true },
];

const VOLUME_EMBARQUE_BARS: readonly ChartDayBar[] = [
  { day: 'Dom', value: 260, heightPct: 28 },
  { day: 'Seg', value: 560, heightPct: 62 },
  { day: 'Ter', value: 420, heightPct: 47 },
  { day: 'Qua', value: 790, heightPct: 88 },
  { day: 'Qui', value: 710, heightPct: 79 },
  { day: 'Sex', value: 900, heightPct: 100 },
  { day: 'Sáb', value: 640, heightPct: 71, highlight: true },
];

const MORTES_REGISTRADAS_BARS: readonly ChartDayBar[] = [
  { day: 'Dom', value: 1, heightPct: 14 },
  { day: 'Seg', value: 3, heightPct: 30 },
  { day: 'Ter', value: 2, heightPct: 21 },
  { day: 'Qua', value: 5, heightPct: 50 },
  { day: 'Qui', value: 3, heightPct: 34 },
  { day: 'Sex', value: 6, heightPct: 62 },
  { day: 'Sáb', value: 2, heightPct: 25, highlight: true },
];

const ANOMALIAS_ETAPA_BARS: readonly ChartDayBar[] = [
  { day: 'Dom', value: 5, heightPct: 44 },
  { day: 'Seg', value: 9, heightPct: 74 },
  { day: 'Ter', value: 4, heightPct: 38 },
  { day: 'Qua', value: 10, heightPct: 84 },
  { day: 'Qui', value: 6, heightPct: 54 },
  { day: 'Sex', value: 11, heightPct: 94 },
  { day: 'Sáb', value: 6, heightPct: 47, highlight: true },
];

const DEFAULT_QUEUE_ITEMS: readonly AnalysisQueueItem[] = [
  {
    id: 'rr-2041',
    code: 'RR-2041',
    gta: 'MS-0398471',
    driver: 'Jonas Ribeiro',
    route: 'Santa Clara → Campo Grande',
    status: 'Pendente',
  },
  {
    id: 'rr-2040',
    code: 'RR-2040',
    gta: 'MT-0114558',
    driver: 'Cleiton Alves',
    route: 'Boa Vista → Rondonópolis',
    status: 'Pendente',
  },
];

const ALERT_ITEMS: readonly AlertItem[] = [
  {
    id: 'al-1',
    title: 'Sirene de ré com falha',
    subtitle: 'Placa LKD-2B45 • bloqueio de rota sugerido',
  },
  {
    id: 'al-2',
    title: 'CNH vencida',
    subtitle: 'Adriano Souza • motorista bloqueado',
  },
  {
    id: 'al-3',
    title: '2 mortes sem laudo',
    subtitle: 'Diário RR-2038 • reprovado na auditoria',
  },
  {
    id: 'al-4',
    title: 'Inspeção a vencer',
    subtitle: 'Placa QAP-3J88 • em 9 dias',
  },
];

const ONGOING_ROUTES: readonly OngoingRouteItem[] = [
  {
    id: 'rt-1',
    driver: 'Jonas Ribeiro',
    route: 'Santa Clara → Campo Grande',
    progressPct: 62,
  },
  {
    id: 'rt-2',
    driver: 'Marcos Tavares',
    route: 'Três Irmãos → Anápolis',
    progressPct: 28,
  },
  {
    id: 'rt-3',
    driver: 'Wesley Prado',
    route: 'Boa Vista → Rondonópolis',
    progressPct: 84,
  },
];

function renderValue(value: string | number | null): string {
  return value === null || value === '' ? '—' : String(value);
}

function ReportRow({ report }: { report: RelatorioViagemResponse }) {
  return (
    <tr>
      <td>{renderValue(report.numeroGta)}</td>
      <td>{renderValue(report.numeroNotaFiscal)}</td>
      <td>{renderValue(report.dataEmbarque)}</td>
      <td><span className="dashboard-status">{report.status}</span></td>
      <td>{renderValue(report.motoristaId)}</td>
      <td>{renderValue(report.fazendaId)}</td>
    </tr>
  );
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagina, setPagina] = useState(0);

  const fetchPage = useCallback(
    (signal: AbortSignal) => relatorioService.listar(pagina, PAGE_SIZE, signal),
    [pagina]
  );
  const { data, error, isError, isLoading, isSuccess, refetch } = useFetchData(fetchPage);

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

  // Filtra itens da Visão Geral se o usuário digitar na barra de busca do topo
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const visibleQueueItems = useMemo(() => {
    if (!normalizedSearch) return DEFAULT_QUEUE_ITEMS;
    return DEFAULT_QUEUE_ITEMS.filter(
      (item) =>
        item.code.toLowerCase().includes(normalizedSearch) ||
        item.gta.toLowerCase().includes(normalizedSearch) ||
        item.driver.toLowerCase().includes(normalizedSearch) ||
        item.route.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  const visibleOngoingRoutes = useMemo(() => {
    if (!normalizedSearch) return ONGOING_ROUTES;
    return ONGOING_ROUTES.filter(
      (item) =>
        item.driver.toLowerCase().includes(normalizedSearch) ||
        item.route.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  const visibleAlerts = useMemo(() => {
    if (!normalizedSearch) return ALERT_ITEMS;
    return ALERT_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.subtitle.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch]);

  return (
    <div className="vg-shell">
      {/* TOPBAR */}
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-brand">
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
              {activeTab === 'overview' ? 'Visão Geral' : 'Diários de Viagem'}
            </h1>
            <p className="vg-page-subtitle">
              Terça-feira, 08 de setembro de 2026 • 3 rotas em andamento
            </p>
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

          <button
            type="button"
            className="vg-bell-btn"
            aria-label="Notificações"
            title="Notificações"
          >
            <TopbarBellIcon />
          </button>

          <button
            type="button"
            className="vg-cta-btn"
            onClick={() => setActiveTab((prev) => (prev === 'overview' ? 'reports' : 'overview'))}
          >
            {activeTab === 'overview' ? 'Ver diários →' : '← Visão Geral'}
          </button>
        </div>
      </header>

      <div className="vg-body">
        {/* SIDEBAR */}
        <aside className="vg-sidebar" aria-label="Menu lateral principal">
          <nav className="vg-nav-top">
            <button
              type="button"
              className={`vg-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              aria-label="Visão Geral"
              title="Visão Geral"
            >
              <SidebarIconGrid />
            </button>
            <button
              type="button"
              className={`vg-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
              aria-label="Diários e Relatórios"
              title="Diários e Relatórios"
            >
              <SidebarIconDoc />
            </button>
            <button
              type="button"
              className="vg-nav-item"
              onClick={() => setActiveTab('reports')}
              aria-label="Auditorias e Pastas"
              title="Auditorias e Pastas"
            >
              <SidebarIconFolder />
            </button>
            <button
              type="button"
              className="vg-nav-item"
              aria-label="Motoristas e Equipe"
              title="Motoristas e Equipe"
            >
              <SidebarIconUsers />
            </button>
            <button
              type="button"
              className="vg-nav-item"
              aria-label="Frota de Caminhões"
              title="Frota de Caminhões"
            >
              <SidebarIconTruck />
            </button>
            <button
              type="button"
              className="vg-nav-item"
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
              aria-label="Configurações"
              title="Configurações"
            >
              <SidebarIconSettings />
            </button>

            <div className="vg-sidebar-divider" aria-hidden="true" />

            <div className="vg-avatar-wrapper" title="Perfil do Administrador">
              <img
                src={avatarUser}
                alt="Avatar da usuária logada"
                className="vg-avatar-img"
              />
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
          {activeTab === 'overview' ? (
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
                        <strong className="vg-metric-number">
                          {data && data.total > 0 ? data.total : 15}
                        </strong>
                        <span className="vg-metric-delta vg-delta-positive">+20,0%</span>
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Pendentes</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">8</strong>
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
                        <strong className="vg-metric-number">4.299</strong>
                        <span className="vg-metric-delta vg-delta-positive">+12,0%</span>
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Mortos</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">67</strong>
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
                        <strong className="vg-metric-number">1,56%</strong>
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
                        <strong className="vg-metric-number">7</strong>
                        <span className="vg-metric-delta vg-delta-positive">-2,0%</span>
                      </div>
                    </div>
                    <div className="vg-metric-col">
                      <span className="vg-metric-label">Desembarque</span>
                      <div className="vg-metric-val-row">
                        <strong className="vg-metric-number">4</strong>
                        <span className="vg-metric-delta vg-delta-positive">-5,0%</span>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              {/* LINHA 2: GRÁFICOS DE BARRAS */}
              <section className="vg-charts-row" aria-label="Gráficos semanais de operação">
                {/* Gráfico Principal: Volume de desembarque */}
                <article className="vg-card vg-chart-card vg-chart-large">
                  <div className="vg-chart-header">
                    <h2 className="vg-chart-title-lg">Volume de desembarque</h2>
                    <span className="vg-period-badge">Esta Semana ⌄</span>
                  </div>

                  <div className="vg-chart-body-lg">
                    <div className="vg-chart-y-axis" aria-hidden="true">
                      <span>3000</span>
                      <span>2000</span>
                      <span>1000</span>
                      <span>0</span>
                    </div>

                    <div className="vg-bars-container-lg">
                      {VOLUME_DESEMBARQUE_BARS.map((bar) => (
                        <div key={bar.day} className="vg-bar-col-lg">
                          <div className="vg-bar-track-lg">
                            <div
                              className={`vg-bar-fill-lg ${
                                bar.highlight ? 'vg-bar-green' : 'vg-bar-blue'
                              }`}
                              style={{ height: `${bar.heightPct}%` }}
                              title={`${bar.day}: ${bar.value} animais`}
                            />
                          </div>
                          <span className="vg-bar-label-lg">{bar.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>

                {/* Gráfico 2: Volume de embarque */}
                <article className="vg-card vg-chart-card vg-chart-small">
                  <div className="vg-chart-header">
                    <h2 className="vg-chart-title-sm">Volume de embarque</h2>
                    <span className="vg-period-badge-sm">Esta semana</span>
                  </div>
                  <span className="vg-chart-ceiling">900</span>

                  <div className="vg-bars-container-sm">
                    {VOLUME_EMBARQUE_BARS.map((bar) => (
                      <div key={bar.day} className="vg-bar-col-sm">
                        <div className="vg-bar-track-sm">
                          <div
                            className={`vg-bar-fill-sm ${
                              bar.highlight ? 'vg-bar-green' : 'vg-bar-blue'
                            }`}
                            style={{ height: `${bar.heightPct}%` }}
                            title={`${bar.day}: ${bar.value} animais`}
                          />
                        </div>
                        <span className="vg-bar-label-sm">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Gráfico 3: Mortes registradas */}
                <article className="vg-card vg-chart-card vg-chart-small">
                  <div className="vg-chart-header">
                    <h2 className="vg-chart-title-sm">Mortes registradas</h2>
                    <span className="vg-period-badge-sm">Esta semana</span>
                  </div>
                  <span className="vg-chart-ceiling">8</span>

                  <div className="vg-bars-container-sm">
                    {MORTES_REGISTRADAS_BARS.map((bar) => (
                      <div key={bar.day} className="vg-bar-col-sm">
                        <div className="vg-bar-track-sm">
                          <div
                            className={`vg-bar-fill-sm ${
                              bar.highlight ? 'vg-bar-green' : 'vg-bar-red'
                            }`}
                            style={{ height: `${bar.heightPct}%` }}
                            title={`${bar.day}: ${bar.value} mortes`}
                          />
                        </div>
                        <span className="vg-bar-label-sm">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Gráfico 4: Anomalias por etapa */}
                <article className="vg-card vg-chart-card vg-chart-small">
                  <div className="vg-chart-header">
                    <h2 className="vg-chart-title-sm">Anomalias por etapa</h2>
                    <span className="vg-period-badge-sm">Esta semana</span>
                  </div>
                  <span className="vg-chart-ceiling">12</span>

                  <div className="vg-bars-container-sm">
                    {ANOMALIAS_ETAPA_BARS.map((bar) => (
                      <div key={bar.day} className="vg-bar-col-sm">
                        <div className="vg-bar-track-sm">
                          <div
                            className={`vg-bar-fill-sm ${
                              bar.highlight ? 'vg-bar-green' : 'vg-bar-orange'
                            }`}
                            style={{ height: `${bar.heightPct}%` }}
                            title={`${bar.day}: ${bar.value} anomalias`}
                          />
                        </div>
                        <span className="vg-bar-label-sm">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </article>
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
                    {visibleQueueItems.map((item) => (
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
                          <span className="vg-badge-pending">{item.status}</span>
                          <button
                            type="button"
                            className="vg-analyze-link"
                            onClick={() => setActiveTab('reports')}
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
                    {visibleAlerts.map((alert) => (
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
                    {visibleOngoingRoutes.map((route) => (
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
          ) : (
            /* ABA DE LISTAGEM COMPLETA DE DIÁRIOS / RELATÓRIOS DA API */
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
