import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetchData } from '../../hooks/useFetchData';
import { funcionarioService } from '../../services/funcionarioService';
import type { FuncionarioEmpresaResponse } from '../../types/funcionario';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import { SidebarIconGrid, SidebarIconDoc, SidebarIconFolder, SidebarIconUsers, SidebarIconTruck, SidebarIconBuilding, SidebarIconSettings, BullBrandLogo, TopbarBellIcon, SearchMagnifierIcon } from '../Dashboard/DashboardIcons';
import '../Dashboard/Dashboard.css';
import './Motoristas.css';

export function Motoristas() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [query, setQuery] = useState('');
  const empresaId = empresa?.id;
  const fetchDrivers = useCallback(
    (signal: AbortSignal) => empresaId ? funcionarioService.listarFuncionarios(empresaId, signal) : Promise.resolve([]),
    [empresaId]
  );
  const { data: employees, error, isLoading, refetch } = useFetchData(fetchDrivers);
  const employeeList = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const drivers = useMemo(() => employeeList.filter((employee) => employee.tipo === 'motorista' || employee.cargo?.toLowerCase().includes('motorista')), [employeeList]);
  const filteredDrivers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return drivers;
    return drivers.filter((driver) => [driver.nome, driver.email, driver.cpf, driver.cargo].some((value) => value?.toLowerCase().includes(normalized)));
  }, [drivers, query]);
  const activeCount = drivers.filter((driver) => driver.ativo !== false).length;
  const inactiveCount = drivers.length - activeCount;
  const hasCompany = Boolean(empresa?.id);
  const displayName = empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Administrador';
  const nav = (path: string) => navigate(path);

  return (
    <div className="vg-shell drivers-page">
      <header className="vg-topbar"><div className="vg-topbar-left"><div className="vg-brand"><BullBrandLogo /><div className="vg-brand-text"><span className="vg-brand-title">Efficien<span className="vg-brand-highlight">tia</span></span><span className="vg-brand-Check"><span className="vg-brand-green">Eficiência</span> que viaja junto com você</span></div></div><div className="vg-topbar-divider" aria-hidden="true" /><div className="vg-page-heading"><h1>Motoristas</h1><p className="vg-page-subtitle">Documentos, acessos e vínculos operacionais</p></div></div><div className="vg-topbar-right"><div className="vg-search-box"><SearchMagnifierIcon /><label className="visually-hidden" htmlFor="drivers-search">Buscar motorista</label><input id="drivers-search" className="vg-search-input" type="search" placeholder="Buscar motorista" value={query} onChange={(event) => setQuery(event.target.value)} /></div><button type="button" className="vg-bell-btn" aria-label="Visão geral" onClick={() => nav('/visao-geral')}><TopbarBellIcon /></button><div className="vg-avatar-wrapper"><GenericUserAvatar size={38} name={displayName} /></div></div></header>
      <div className="vg-body"><aside className="vg-sidebar" aria-label="Menu lateral principal"><nav className="vg-nav-top"><button type="button" className="vg-nav-item" title="Visão Geral" onClick={() => nav('/visao-geral')}><SidebarIconGrid /></button><button type="button" className="vg-nav-item" title="Diários e Relatórios" onClick={() => nav('/diarios')}><SidebarIconDoc /></button><button type="button" className="vg-nav-item" title="Auditoria" onClick={() => nav('/auditoria')}><SidebarIconFolder /></button><button type="button" className="vg-nav-item active" title="Motoristas e Equipe" aria-current="page"><SidebarIconUsers /></button><button type="button" className="vg-nav-item" title="Frota de Caminhões" onClick={() => nav('/frota')}><SidebarIconTruck /></button><button type="button" className="vg-nav-item" title="Unidades e Fazendas" disabled><SidebarIconBuilding /></button></nav><div className="vg-nav-bottom"><button type="button" className="vg-nav-item" title="Configurações" onClick={() => nav('/configuracao')}><SidebarIconSettings /></button><div className="vg-sidebar-divider" /><div className="vg-avatar-wrapper"><GenericUserAvatar size={36} name={displayName} /></div></div></aside>
        <main id="main-content" className="vg-main drivers-main" tabIndex={-1} aria-labelledby="drivers-title">
          <div className="drivers-heading"><div><p className="dashboard-eyebrow">Equipe operacional</p><h2 id="drivers-title">Motoristas</h2><p>Gerencie acessos, documentos e vínculos da sua equipe.</p></div><button type="button" className="drivers-refresh" onClick={refetch} disabled={isLoading}>{isLoading ? 'Atualizando…' : 'Atualizar dados'}</button></div>
          <section className="drivers-summary" aria-label="Resumo dos motoristas"><article><span>Ativos</span><strong>{activeCount}</strong></article><article><span>Inativos</span><strong>{inactiveCount}</strong></article><article><span>Cadastrados</span><strong>{employeeList.length}</strong></article><article><span>Pendências</span><strong>—</strong><small>Não disponível neste endpoint</small></article></section>
          {error && <section className="dashboard-state dashboard-state-error" role="alert"><h3>Não foi possível carregar os motoristas</h3><p>{error.message}</p><button type="button" onClick={refetch}>Tentar novamente</button></section>}
          {!error && !isLoading && !hasCompany && <section className="dashboard-state" role="alert"><h3>Empresa não identificada</h3><p>Não foi possível determinar a empresa da sessão para consultar os motoristas.</p></section>}
          {!error && !isLoading && hasCompany && filteredDrivers.length === 0 && <section className="dashboard-state" role="status"><h3>{drivers.length === 0 ? 'Nenhum motorista cadastrado' : 'Nenhum motorista encontrado'}</h3><p>{drivers.length === 0 ? 'Os motoristas vinculados à empresa aparecerão aqui.' : 'Tente buscar por outro nome ou documento.'}</p></section>}
          {filteredDrivers.length > 0 && <div className="drivers-table-wrap"><table className="dashboard-table drivers-table"><caption>Motoristas cadastrados</caption><thead><tr><th>Motorista</th><th>CPF</th><th>Contato</th><th>Status</th><th>Cargo</th></tr></thead><tbody>{filteredDrivers.map((driver: FuncionarioEmpresaResponse) => <tr key={driver.id}><td><div className="driver-cell"><GenericUserAvatar size={34} name={driver.nome} /><strong>{driver.nome}</strong></div></td><td>{driver.cpf || 'Não informado'}</td><td><span>{driver.email}</span><small>{driver.telefone || 'Telefone não informado'}</small></td><td><span className={`dashboard-status ${driver.ativo === false ? 'vg-status-inactive' : 'vg-status-available'}`}>{driver.ativo === false ? 'Inativo' : 'Ativo'}</span></td><td>{driver.cargo || 'Motorista'}</td></tr>)}</tbody></table></div>}
        </main></div>
    </div>
  );
}

export default Motoristas;
