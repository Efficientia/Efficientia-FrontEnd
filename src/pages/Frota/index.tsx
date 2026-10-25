import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetchData } from '../../hooks/useFetchData';
import { caminhaoService } from '../../services/caminhaoService';
import type { CaminhaoResponse } from '../../types/frota';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  BullBrandLogo,
  SidebarIconGrid,
  SidebarIconDoc,
  SidebarIconFolder,
  SidebarIconUsers,
  SidebarIconTruck,
  SidebarIconBuilding,
  SidebarIconSettings,
  TopbarBellIcon,
  SearchMagnifierIcon,
} from '../Dashboard/DashboardIcons';
import '../Dashboard/Dashboard.css';
import './Frota.css';
const FLEET_CACHE_KEY = '@efficientia:frota:cache';
function formatDate(value: string | null): string {
  if (!value) return 'Não informado';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

function statusLabel(status: string): string {
  return status === 'EM_USO' ? 'Em uso' : 'Disponível';
}

export function Frota() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [query, setQuery] = useState('');
  const [cachedVehicles, setCachedVehicles] = useState<CaminhaoResponse[]>(() => {
    try {
      const stored = localStorage.getItem(FLEET_CACHE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed as CaminhaoResponse[] : [];
    } catch {
      return [];
    }
  });
  const displayName = empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Administrador';
  const empresaId = empresa?.id;
  const hasCompany = Boolean(empresaId);
  const fetchFleet = useCallback(
    async (signal: AbortSignal) => {
      if (!empresaId) return [];
      const response = await caminhaoService.listar({ empresaId }, signal);
      setCachedVehicles(response);
      try {
        localStorage.setItem(FLEET_CACHE_KEY, JSON.stringify(response));
      } catch {
        // O cache é apenas uma melhoria; a resposta da API continua sendo a fonte oficial.
      }
      return response;
    },
    [empresaId]
  );
  const { data: vehicles, error, isLoading, refetch } = useFetchData(fetchFleet);
  const displayVehicles = Array.isArray(vehicles) ? vehicles : cachedVehicles;
  const hasCachedData = vehicles === null && cachedVehicles.length > 0;
  const filteredVehicles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return displayVehicles;
    return displayVehicles.filter((vehicle) =>
      [vehicle.placa, vehicle.tipo, vehicle.marca, vehicle.modelo, vehicle.motoristaAtualNome]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [query, displayVehicles]);
  const total = displayVehicles.length;
  const inUse = displayVehicles.filter((vehicle) => vehicle.statusUso === 'EM_USO').length;
  const available = total - inUse;
  const inspectionPending = displayVehicles.filter((vehicle) => vehicle.dataVencimentoInspecao).length;

  const nav = (path: string) => navigate(path);

  return (
    <div className="vg-shell fleet-page">
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-brand"><BullBrandLogo /><div className="vg-brand-text"><span className="vg-brand-title">Efficien<span className="vg-brand-highlight">tia</span></span><span className="vg-brand-Check"><span className="vg-brand-green">Eficiência</span> que viaja junto com você</span></div></div>
          <div className="vg-topbar-divider" aria-hidden="true" />
          <div className="vg-page-heading"><h1>Frota de caminhões</h1><p className="vg-page-subtitle">Veículos e disponibilidade da operação</p></div>
        </div>
        <div className="vg-topbar-right">
          <div className="vg-search-box"><SearchMagnifierIcon /><label className="visually-hidden" htmlFor="fleet-search">Buscar veículo</label><input id="fleet-search" className="vg-search-input" type="search" placeholder="Buscar placa ou modelo" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <button type="button" className="vg-bell-btn" aria-label="Visão geral" onClick={() => nav('/visao-geral')}><TopbarBellIcon /></button>
          <div className="vg-avatar-wrapper"><GenericUserAvatar size={38} name={displayName} /></div>
        </div>
      </header>
      <div className="vg-body">
        <aside className="vg-sidebar" aria-label="Menu lateral principal">
          <nav className="vg-nav-top">
            <button type="button" className="vg-nav-item" title="Visão Geral" onClick={() => nav('/visao-geral')}><SidebarIconGrid /></button>
            <button type="button" className="vg-nav-item" title="Diários e Relatórios" onClick={() => nav('/diarios')}><SidebarIconDoc /></button>
            <button type="button" className="vg-nav-item" title="Auditoria" onClick={() => nav('/auditoria')}><SidebarIconFolder /></button>
            <button type="button" className="vg-nav-item" title="Motoristas e Equipe" onClick={() => nav('/motoristas')}><SidebarIconUsers /></button>
            <button type="button" className="vg-nav-item active" title="Frota de Caminhões" aria-current="page"><SidebarIconTruck /></button>
            <button type="button" className="vg-nav-item" title="Fazendas e Unidades" onClick={() => nav('/fazenda-unidades')}><SidebarIconBuilding /></button>
          </nav>
          <div className="vg-nav-bottom"><button type="button" className="vg-nav-item" title="Configurações" onClick={() => nav('/configuracao')}><SidebarIconSettings /></button><div className="vg-sidebar-divider" /><div className="vg-avatar-wrapper"><GenericUserAvatar size={36} name={displayName} /></div></div>
        </aside>
        <main id="main-content" className="vg-main fleet-main" tabIndex={-1} aria-labelledby="fleet-title">
          <div className="fleet-heading"><div><p className="dashboard-eyebrow">Gestão da frota</p><h2 id="fleet-title">Seus caminhões</h2><p>Acompanhe disponibilidade, inspeções e vínculo com a operação.</p></div><button type="button" className="fleet-refresh" onClick={refetch} disabled={isLoading}>{isLoading ? 'Atualizando…' : 'Atualizar dados'}</button></div>
          <section className="fleet-kpis" aria-label="Resumo da frota"><article><span>Total de veículos</span><strong>{total}</strong></article><article><span>Em uso</span><strong>{inUse}</strong></article><article><span>Disponíveis</span><strong>{available}</strong></article><article><span>Com inspeção registrada</span><strong>{inspectionPending}</strong></article></section>
          {error && hasCompany && <section className={`fleet-api-notice ${hasCachedData ? 'fleet-api-notice-warning' : 'fleet-api-notice-error'}`} role={hasCachedData ? 'status' : 'alert'}><div><strong>{hasCachedData ? 'Exibindo a última frota sincronizada' : 'Não foi possível carregar a frota'}</strong><p>{hasCachedData ? 'A API está temporariamente indisponível. Os dados abaixo são do último carregamento concluído.' : error.message}</p></div><button type="button" onClick={refetch}>Tentar novamente</button></section>}
          {!hasCompany && <section className="dashboard-state" role="alert"><h3>Empresa não identificada</h3><p>Não foi possível consultar a frota porque a sessão não possui uma empresa vinculada.</p></section>}
          {!error && !isLoading && hasCompany && filteredVehicles.length === 0 && <section className="dashboard-state" role="status"><h3>{total === 0 ? 'Nenhum caminhão cadastrado' : 'Nenhum veículo encontrado'}</h3><p>{total === 0 ? 'Os veículos cadastrados para a empresa aparecerão aqui.' : 'Tente buscar por outra placa, marca ou modelo.'}</p></section>}
          {filteredVehicles.length > 0 && <div className="fleet-table-wrap"><table className="dashboard-table fleet-table"><caption>Veículos cadastrados</caption><thead><tr><th>Veículo</th><th>Tipo</th><th>Status</th><th>Motorista atual</th><th>Inspeção</th></tr></thead><tbody>{filteredVehicles.map((vehicle: CaminhaoResponse) => <tr key={vehicle.id}><td><strong>{vehicle.placa}</strong><small>{[vehicle.marca, vehicle.modelo, vehicle.anoFabricacao].filter(Boolean).join(' • ') || 'Detalhes não informados'}</small></td><td>{vehicle.tipo}</td><td><span className={`dashboard-status ${vehicle.statusUso === 'EM_USO' ? 'vg-status-in-use' : 'vg-status-available'}`}>{statusLabel(vehicle.statusUso)}</span></td><td>{vehicle.motoristaAtualNome || (vehicle.motoristaAtualId ? `ID #${vehicle.motoristaAtualId}` : 'Não vinculado')}</td><td>{formatDate(vehicle.dataVencimentoInspecao)}</td></tr>)}</tbody></table></div>}
        </main>
      </div>
    </div>
  );
}

export default Frota;
