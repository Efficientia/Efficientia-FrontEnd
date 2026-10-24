import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetchData } from '../../hooks/useFetchData';
import { cadastroBaseService } from '../../services/cadastroBaseService';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import { BullBrandLogo, SidebarIconGrid, SidebarIconDoc, SidebarIconFolder, SidebarIconUsers, SidebarIconTruck, SidebarIconBuilding, SidebarIconSettings, TopbarBellIcon, SearchMagnifierIcon } from '../Dashboard/DashboardIcons';
import '../Dashboard/Dashboard.css';
import './FazendasUnidades.css';

type LocalOperacao = { id: number; nome: string; municipio?: string | null; estado?: string | null; tipo?: string | null; ativo?: boolean | null };

function normalizeLocations(value: unknown): LocalOperacao[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LocalOperacao => Boolean(item && typeof item === 'object' && 'id' in item && 'nome' in item && typeof item.nome === 'string')).map((item) => item);
}

export function FazendasUnidades() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'todos' | 'fazenda' | 'unidade'>('todos');
  const displayName = empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Administrador';
  const fetchLocations = useCallback(async (signal: AbortSignal) => {
    const [farms, units] = await Promise.all([
      cadastroBaseService.listarFazendas(signal),
      cadastroBaseService.listarUnidadesFrigorificas(signal),
    ]);
    return [
      ...normalizeLocations(farms).map((item) => ({ ...item, tipo: 'Fazenda' })),
      ...normalizeLocations(units).map((item) => ({ ...item, tipo: 'Unidade frigorífica' })),
    ];
  }, []);
  const { data, error, isLoading, refetch } = useFetchData(fetchLocations);
  const locations = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const filteredLocations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return locations.filter((location) => {
      const matchesKind = kind === 'todos' || location.tipo?.toLowerCase().includes(kind === 'fazenda' ? 'fazenda' : 'frigorífica');
      const searchable = [location.nome, location.municipio, location.estado, location.tipo].filter(Boolean).join(' ').toLowerCase();
      return matchesKind && (!term || searchable.includes(term));
    });
  }, [kind, locations, query]);

  return <div className="vg-shell locations-page">
    <header className="vg-topbar"><div className="vg-topbar-left"><div className="vg-brand"><BullBrandLogo /><div className="vg-brand-text"><span className="vg-brand-title">Efficien<span className="vg-brand-highlight">tia</span></span><span className="vg-brand-Check"><span className="vg-brand-green">Eficiência</span> que viaja junto com você</span></div></div><div className="vg-topbar-divider" aria-hidden="true" /><div className="vg-page-heading"><h1>Fazendas e unidades</h1><p className="vg-page-subtitle">Locais de origem, destino e operação</p></div></div><div className="vg-topbar-right"><div className="vg-search-box"><SearchMagnifierIcon /><label className="visually-hidden" htmlFor="locations-search">Buscar fazenda ou unidade</label><input id="locations-search" className="vg-search-input" type="search" placeholder="Buscar fazenda ou unidade" value={query} onChange={(event) => setQuery(event.target.value)} /></div><button type="button" className="vg-bell-btn" aria-label="Visão geral" onClick={() => navigate('/visao-geral')}><TopbarBellIcon /></button><div className="vg-avatar-wrapper"><GenericUserAvatar size={38} name={displayName} /></div></div></header>
    <div className="vg-body"><aside className="vg-sidebar" aria-label="Menu lateral principal"><nav className="vg-nav-top"><button type="button" className="vg-nav-item" title="Visão Geral" onClick={() => navigate('/visao-geral')}><SidebarIconGrid /></button><button type="button" className="vg-nav-item" title="Diários e Relatórios" onClick={() => navigate('/diarios')}><SidebarIconDoc /></button><button type="button" className="vg-nav-item" title="Auditoria" onClick={() => navigate('/auditoria')}><SidebarIconFolder /></button><button type="button" className="vg-nav-item" title="Motoristas e Equipe" onClick={() => navigate('/motoristas')}><SidebarIconUsers /></button><button type="button" className="vg-nav-item" title="Frota de Caminhões" onClick={() => navigate('/frota')}><SidebarIconTruck /></button><button type="button" className="vg-nav-item active" title="Fazendas e Unidades" aria-current="page"><SidebarIconBuilding /></button></nav><div className="vg-nav-bottom"><button type="button" className="vg-nav-item" title="Configurações" onClick={() => navigate('/configuracao')}><SidebarIconSettings /></button><div className="vg-sidebar-divider" /><div className="vg-avatar-wrapper"><GenericUserAvatar size={36} name={displayName} /></div></div></aside>
      <main id="main-content" className="vg-main locations-main" tabIndex={-1} aria-labelledby="locations-title"><div className="locations-heading"><div><p className="dashboard-eyebrow">Cadastros operacionais</p><h2 id="locations-title">Fazendas e unidades</h2><p>Organize os pontos que participam dos seus roteiros.</p></div><button type="button" className="locations-refresh" onClick={refetch} disabled={isLoading}>{isLoading ? 'Atualizando…' : 'Atualizar dados'}</button></div><section className="locations-tabs" aria-label="Filtrar locais"><button type="button" className={kind === 'todos' ? 'active' : ''} onClick={() => setKind('todos')}>Todos</button><button type="button" className={kind === 'fazenda' ? 'active' : ''} onClick={() => setKind('fazenda')}>Fazendas</button><button type="button" className={kind === 'unidade' ? 'active' : ''} onClick={() => setKind('unidade')}>Unidades frigoríficas</button></section>{error && <section className="dashboard-state dashboard-state-error" role="alert"><h3>Não foi possível carregar os locais</h3><p>{error.message}</p><button type="button" onClick={refetch}>Tentar novamente</button></section>}{!error && !isLoading && filteredLocations.length === 0 && <section className="dashboard-state" role="status"><h3>{locations.length ? 'Nenhum local encontrado' : 'Nenhuma fazenda ou unidade cadastrada'}</h3><p>{locations.length ? 'Tente buscar por outro nome ou município.' : 'Os locais retornados pela API aparecerão aqui.'}</p></section>}{filteredLocations.length > 0 && <div className="locations-grid">{filteredLocations.map((location) => <article className="location-card" key={`${location.tipo}-${location.id}`}><div className="location-icon"><SidebarIconBuilding /></div><div className="location-card-content"><div className="location-card-top"><span className="location-type">{location.tipo}</span><span className={`location-status ${location.ativo === false ? 'inactive' : ''}`}>{location.ativo === false ? 'Inativo' : 'Ativo'}</span></div><h3>{location.nome}</h3><p>{[location.municipio, location.estado].filter(Boolean).join(' • ') || 'Localização não informada'}</p><small>ID {location.id}</small></div></article>)}</div>}</main>
    </div>
  </div>;
}

export default FazendasUnidades;
