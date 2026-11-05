import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/Layout/AuthenticatedLayout';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import { useAuth } from '../../hooks/useAuth';
import { useFetchData } from '../../hooks/useFetchData';
import { funcionarioService } from '../../services/funcionarioService';
import { caminhaoService } from '../../services/caminhaoService';
import type { FuncionarioEmpresaResponse } from '../../types/funcionario';
import type { CaminhaoResponse } from '../../types/frota';
import {
  belongsToTenant,
  readTenantStorage,
  resolveCurrentTenant,
} from '../../utils/tenantScope';
import {
  DEMO_COLLABORATORS_SEED,
  DEMO_FAZENDAS_SEED,
  DEMO_FLEET_SEED,
  DEMO_FRIGORIFICOS_SEED,
} from '../../utils/tenantSeeds';
import {
  ShieldCheckIcon,
  SearchIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  BuildingIcon,
  NavMotoristasIcon,
  NavFrotaIcon,
  NavFazendasUnidadesIcon,
  EyeIcon,
  InfoIcon,
} from '../../components/icons';
import './CadastrosConsulta.css';

// ============================================================================
// MODELOS DE DADOS
// ============================================================================
export interface FazendaModel {
  id: number;
  empresaId?: number;
  codigoEmpresa?: string | null;
  nome: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
  pecuaristaId: number;
  cidade: string;
  uf: string;
  logradouro?: string | null;
  numero?: string | null;
  cep?: string | null;
  capacidadeEmbarqueCabecas?: number | null;
  ativo: boolean;
}

export interface UnidadeFrigorificaModel {
  id: number;
  empresaId?: number;
  codigoEmpresa?: string | null;
  nome: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  registroSif: string;
  analistaId: number;
  curraleiroId: number;
  manobristaId: number;
  cidade: string;
  uf: string;
  logradouro?: string | null;
  numero?: string | null;
  cep?: string | null;
  capacidadeAbateDiario: number;
  qtdCurrais?: number;
  ativo: boolean;
}

// STORAGE KEYS COMPARTILHADAS
const STORAGE_COLABORADORES = 'efficientia_colaboradores_v3';
const STORAGE_FROTA = 'efficientia_frota_v3';
const STORAGE_FAZENDAS = 'efficientia_fazendas_v4';
const STORAGE_FRIGORIFICOS = 'efficientia_frigorificos_v4';

// DEFAULT FALLBACKS (sincronizados com os cadastros administrativos da empresa demo)
const DEFAULT_COLLABORATORS: FuncionarioEmpresaResponse[] = DEMO_COLLABORATORS_SEED;
const DEFAULT_FLEET: CaminhaoResponse[] = DEMO_FLEET_SEED;
const DEFAULT_FAZENDAS: FazendaModel[] = DEMO_FAZENDAS_SEED;
const DEFAULT_FRIGORIFICOS: UnidadeFrigorificaModel[] = DEMO_FRIGORIFICOS_SEED;

type TabType = 'usuarios' | 'frota' | 'fazendas' | 'frigorificos';

export function CadastrosConsulta() {
  const { user, empresa } = useAuth();
  const tenant = useMemo(() => resolveCurrentTenant(user, empresa), [user, empresa]);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab') as TabType | null;

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (currentTabParam && ['usuarios', 'frota', 'fazendas', 'frigorificos'].includes(currentTabParam)) {
      return currentTabParam;
    }
    return 'usuarios';
  });

  // Atualiza query param quando a aba muda
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Carrega coleções persistidas escopadas exclusivamente pela empresa logada
  const localCollaborators = useMemo<FuncionarioEmpresaResponse[]>(
    () =>
      readTenantStorage(
        STORAGE_COLABORADORES,
        tenant,
        tenant.isPrimaryDemoTenant ? DEFAULT_COLLABORATORS : []
      ),
    [tenant]
  );

  const localFleet = useMemo<CaminhaoResponse[]>(
    () =>
      readTenantStorage(
        STORAGE_FROTA,
        tenant,
        tenant.isPrimaryDemoTenant ? DEFAULT_FLEET : []
      ),
    [tenant]
  );

  const fazendas = useMemo<FazendaModel[]>(
    () =>
      readTenantStorage(
        STORAGE_FAZENDAS,
        tenant,
        tenant.isPrimaryDemoTenant ? DEFAULT_FAZENDAS : []
      ),
    [tenant]
  );

  const frigorificos = useMemo<UnidadeFrigorificaModel[]>(
    () =>
      readTenantStorage(
        STORAGE_FRIGORIFICOS,
        tenant,
        tenant.isPrimaryDemoTenant ? DEFAULT_FRIGORIFICOS : []
      ),
    [tenant]
  );

  // Também sincroniza colaboradores e frota da API restritos à empresa logada
  const fetchRemoteEmployees = useCallback(
    (signal: AbortSignal) => funcionarioService.listarFuncionarios(tenant.empresaId, signal),
    [tenant.empresaId]
  );
  const { data: remoteEmployees } = useFetchData(fetchRemoteEmployees);

  const fetchRemoteFleet = useCallback(
    (signal: AbortSignal) => caminhaoService.listar({ empresaId: tenant.empresaId }, signal),
    [tenant.empresaId]
  );
  const { data: remoteFleet } = useFetchData(fetchRemoteFleet);

  const collaborators = useMemo<FuncionarioEmpresaResponse[]>(() => {
    const map = new Map<number, FuncionarioEmpresaResponse>();
    localCollaborators.forEach((item) => map.set(item.id, item));
    (remoteEmployees ?? []).forEach((remote) => {
      if (remote && typeof remote.id === 'number' && belongsToTenant(remote, tenant, { allowUnscoped: false })) {
        const existing = map.get(remote.id);
        map.set(remote.id, { ...remote, ...existing, id: remote.id });
      }
    });
    return Array.from(map.values());
  }, [localCollaborators, remoteEmployees, tenant]);

  const fleet = useMemo<CaminhaoResponse[]>(() => {
    const map = new Map<number, CaminhaoResponse>();
    localFleet.forEach((item) => map.set(item.id, item));
    (remoteFleet ?? []).forEach((remote) => {
      if (remote && typeof remote.id === 'number' && belongsToTenant(remote, tenant, { allowUnscoped: false })) {
        const existing = map.get(remote.id);
        map.set(remote.id, { ...remote, ...existing, id: remote.id });
      }
    });
    return Array.from(map.values());
  }, [localFleet, remoteFleet, tenant]);

  // Mapas para resolução de nomes (evita mostrar IDs do banco)
  const userMap = useMemo(() => {
    const map = new Map<number, FuncionarioEmpresaResponse>();
    collaborators.forEach((c) => map.set(c.id, c));
    return map;
  }, [collaborators]);

  // ==========================================================================
  // FILTROS - USUÁRIOS
  // ==========================================================================
  const queryParam = searchParams.get('q') || '';
  const [userQuery, setUserQuery] = useState(() => (activeTab === 'usuarios' ? queryParam : ''));
  const [userRoleFilter, setUserRoleFilter] = useState<string>('todos');
  const [userStatusFilter, setUserStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');

  const filteredUsers = useMemo(() => {
    return collaborators.filter((user) => {
      if (userRoleFilter !== 'todos' && user.tipo !== userRoleFilter) return false;
      if (userStatusFilter === 'ativos' && user.ativo === false) return false;
      if (userStatusFilter === 'inativos' && user.ativo !== false) return false;
      if (userQuery.trim()) {
        const q = userQuery.toLowerCase();
        const matchesName = user.nome.toLowerCase().includes(q);
        const matchesCpf = (user.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchesEmail = (user.email || '').toLowerCase().includes(q);
        const matchesCargo = (user.cargo || '').toLowerCase().includes(q);
        return matchesName || matchesCpf || matchesEmail || matchesCargo;
      }
      return true;
    });
  }, [collaborators, userRoleFilter, userStatusFilter, userQuery]);

  // ==========================================================================
  // FILTROS - FROTA
  // ==========================================================================
  const [fleetQuery, setFleetQuery] = useState(() => (activeTab === 'frota' ? queryParam : ''));
  const [fleetTypeFilter, setFleetTypeFilter] = useState<string>('todos');
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('todos');

  const filteredFleet = useMemo(() => {
    return fleet.filter((truck) => {
      if (fleetTypeFilter !== 'todos' && truck.tipo !== fleetTypeFilter) return false;
      if (fleetStatusFilter === 'EM_USO' && truck.statusUso !== 'EM_USO') return false;
      if (fleetStatusFilter === 'DISPONIVEL' && truck.statusUso !== 'DISPONIVEL') return false;
      if (fleetStatusFilter === 'ativos' && truck.ativo === false) return false;
      if (fleetStatusFilter === 'inativos' && truck.ativo !== false) return false;
      if (fleetQuery.trim()) {
        const q = fleetQuery.toLowerCase();
        const matchesPlaca = (truck.placa || '').toLowerCase().includes(q);
        const matchesCarreta = (truck.placaCarreta || '').toLowerCase().includes(q);
        const matchesModelo = (truck.modelo || '').toLowerCase().includes(q);
        const matchesMarca = (truck.marca || '').toLowerCase().includes(q);
        const matchesMotorista = (truck.motoristaAtualNome || '').toLowerCase().includes(q);
        return matchesPlaca || matchesCarreta || matchesModelo || matchesMarca || matchesMotorista;
      }
      return true;
    });
  }, [fleet, fleetTypeFilter, fleetStatusFilter, fleetQuery]);

  // ==========================================================================
  // FILTROS - FAZENDAS
  // ==========================================================================
  const [fazendaQuery, setFazendaQuery] = useState(() => (activeTab === 'fazendas' ? queryParam : ''));
  const [fazendaStatusFilter, setFazendaStatusFilter] = useState<'todos' | 'ativas' | 'inativas'>('todos');

  const filteredFazendas = useMemo(() => {
    return fazendas.filter((faz) => {
      if (fazendaStatusFilter === 'ativas' && !faz.ativo) return false;
      if (fazendaStatusFilter === 'inativas' && faz.ativo) return false;
      if (fazendaQuery.trim()) {
        const q = fazendaQuery.toLowerCase();
        const pecuarista = userMap.get(faz.pecuaristaId)?.nome || '';
        const matchesNome = faz.nome.toLowerCase().includes(q);
        const matchesRazao = (faz.razaoSocial || '').toLowerCase().includes(q);
        const matchesCidade = `${faz.cidade} ${faz.uf}`.toLowerCase().includes(q);
        const matchesPecuarista = pecuarista.toLowerCase().includes(q);
        return matchesNome || matchesRazao || matchesCidade || matchesPecuarista;
      }
      return true;
    });
  }, [fazendas, fazendaStatusFilter, fazendaQuery, userMap]);

  // ==========================================================================
  // FILTROS - FRIGORÍFICOS
  // ==========================================================================
  const [frigorificoQuery, setFrigorificoQuery] = useState(() => (activeTab === 'frigorificos' ? queryParam : ''));

  useEffect(() => {
    const q = searchParams.get('q');
    if (!q) return;
    const timer = setTimeout(() => {
      if (activeTab === 'usuarios') setUserQuery(q);
      else if (activeTab === 'frota') setFleetQuery(q);
      else if (activeTab === 'fazendas') setFazendaQuery(q);
      else if (activeTab === 'frigorificos') setFrigorificoQuery(q);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, activeTab]);
  const [frigorificoStatusFilter, setFrigorificoStatusFilter] = useState<'todos' | 'ativas' | 'inativas'>('todos');

  const filteredFrigorificos = useMemo(() => {
    return frigorificos.filter((frig) => {
      if (frigorificoStatusFilter === 'ativas' && !frig.ativo) return false;
      if (frigorificoStatusFilter === 'inativas' && frig.ativo) return false;
      if (frigorificoQuery.trim()) {
        const q = frigorificoQuery.toLowerCase();
        const analista = userMap.get(frig.analistaId)?.nome || '';
        const curraleiro = userMap.get(frig.curraleiroId)?.nome || '';
        const manobrista = userMap.get(frig.manobristaId)?.nome || '';
        const matchesNome = frig.nome.toLowerCase().includes(q);
        const matchesSif = frig.registroSif.toLowerCase().includes(q);
        const matchesCidade = `${frig.cidade} ${frig.uf}`.toLowerCase().includes(q);
        const matchesStaff = `${analista} ${curraleiro} ${manobrista}`.toLowerCase().includes(q);
        return matchesNome || matchesSif || matchesCidade || matchesStaff;
      }
      return true;
    });
  }, [frigorificos, frigorificoStatusFilter, frigorificoQuery, userMap]);

  // ==========================================================================
  // MODAL DE DETALHES EM MODO LEITURA
  // ==========================================================================
  const [selectedItem, setSelectedItem] = useState<{
    type: 'usuario' | 'frota' | 'fazenda' | 'frigorifico';
    data: FuncionarioEmpresaResponse | CaminhaoResponse | FazendaModel | UnidadeFrigorificaModel;
  } | null>(null);

  // Escuta teclado para fechar modal com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedItem(null);
      }
    };
    if (selectedItem) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  return (
    <AuthenticatedLayout
      title="Tabelas e Cadastros"
      subtitle="Consulta unificada e auditoria de colaboradores, frota, fazendas e frigoríficos"
    >
      <div className="cadastros-consulta-shell">
        {/* Banner Informativo de Modo Consulta */}
        <div className="cadastros-readonly-banner" role="region" aria-label="Aviso de Modo Consulta">
          <div className="cadastros-readonly-content">
            <span className="cadastros-readonly-icon" aria-hidden="true">
              <ShieldCheckIcon size={22} />
            </span>
            <div>
              <span className="cadastros-readonly-title">Modo de Consulta Operacional:</span>
              <span className="cadastros-readonly-text">
                Visualização e filtros liberados para conferência e auditoria de relatórios. Alterações, inclusões e exclusões de registros são gerenciadas pela administração corporativa.
              </span>
            </div>
          </div>
          <span className="cadastros-readonly-pill">Auditoria Ativa</span>
        </div>

        {/* Barra de Navegação entre Tabelas (Tabs) */}
        <nav className="cadastros-tabs-nav" aria-label="Tabelas de cadastro">
          <button
            type="button"
            className={`cadastros-tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
            onClick={() => handleTabChange('usuarios')}
            aria-selected={activeTab === 'usuarios'}
          >
            <NavMotoristasIcon size={20} />
            <span>Usuários & Equipe</span>
            <span className="cadastros-tab-counter">{collaborators.length}</span>
          </button>

          <button
            type="button"
            className={`cadastros-tab-btn ${activeTab === 'frota' ? 'active' : ''}`}
            onClick={() => handleTabChange('frota')}
            aria-selected={activeTab === 'frota'}
          >
            <NavFrotaIcon size={20} />
            <span>Frota de Veículos</span>
            <span className="cadastros-tab-counter">{fleet.length}</span>
          </button>

          <button
            type="button"
            className={`cadastros-tab-btn ${activeTab === 'fazendas' ? 'active' : ''}`}
            onClick={() => handleTabChange('fazendas')}
            aria-selected={activeTab === 'fazendas'}
          >
            <BuildingIcon size={20} />
            <span>Fazendas Parceiras</span>
            <span className="cadastros-tab-counter">{fazendas.length}</span>
          </button>

          <button
            type="button"
            className={`cadastros-tab-btn ${activeTab === 'frigorificos' ? 'active' : ''}`}
            onClick={() => handleTabChange('frigorificos')}
            aria-selected={activeTab === 'frigorificos'}
          >
            <NavFazendasUnidadesIcon size={20} />
            <span>Unidades Frigoríficas</span>
            <span className="cadastros-tab-counter">{frigorificos.length}</span>
          </button>
        </nav>

        {/* ==============================================================
            ABA 1: USUÁRIOS & EQUIPE
            ============================================================== */}
        {activeTab === 'usuarios' && (
          <section className="cadastros-tab-content" aria-label="Tabela de Colaboradores e Usuários">
            {/* KPIs Operacionais */}
            <div className="cadastros-kpis-grid">
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Total Cadastrado</span>
                <span className="kpi-number">{collaborators.length}</span>
                <span className="kpi-detail">{collaborators.filter((c) => c.ativo !== false).length} ativos no sistema</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Motoristas</span>
                <span className="kpi-number">
                  {collaborators.filter((c) => c.tipo === 'motorista').length}
                </span>
                <span className="kpi-detail">Operadores rodoviários</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Analistas</span>
                <span className="kpi-number">
                  {collaborators.filter((c) => c.tipo === 'analista').length}
                </span>
                <span className="kpi-detail">Qualidade e bem-estar animal</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Polo Frigorífico / Campo</span>
                <span className="kpi-number">
                  {collaborators.filter((c) => ['curraleiro', 'pecuarista', 'manobrista'].includes(c.tipo)).length}
                </span>
                <span className="kpi-detail">Curraleiros, manobristas e pecuaristas</span>
              </div>
            </div>

            {/* Toolbar com Busca e Filtros */}
            <div className="cadastros-toolbar">
              <div className="cadastros-search-box">
                <SearchIcon size={18} />
                <input
                  type="search"
                  className="cadastros-search-input"
                  placeholder="Buscar por nome, CPF, e-mail ou cargo..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
              </div>

              <div className="cadastros-filters-group">
                <div className="cadastros-filter-pill-list" role="radiogroup" aria-label="Filtrar por papel">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'administrador', label: 'Administradores' },
                    { id: 'analista', label: 'Analistas' },
                    { id: 'motorista', label: 'Motoristas' },
                    { id: 'curraleiro', label: 'Curraleiros' },
                    { id: 'pecuarista', label: 'Pecuaristas' },
                    { id: 'manobrista', label: 'Manobristas' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`cadastros-filter-pill ${userRoleFilter === tab.id ? 'active' : ''}`}
                      onClick={() => setUserRoleFilter(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <select
                  className="cadastros-filter-select"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as 'todos' | 'ativos' | 'inativos')}
                  aria-label="Filtrar por status"
                >
                  <option value="todos">Status: Todos</option>
                  <option value="ativos">Apenas Ativos</option>
                  <option value="inativos">Apenas Inativos</option>
                </select>

                {(userQuery || userRoleFilter !== 'todos' || userStatusFilter !== 'todos') && (
                  <button
                    type="button"
                    className="cadastros-clear-filters-btn"
                    onClick={() => {
                      setUserQuery('');
                      setUserRoleFilter('todos');
                      setUserStatusFilter('todos');
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="cadastros-table-container">
              <div className="cadastros-table-responsive">
                <table className="cadastros-table">
                  <thead>
                    <tr>
                      <th scope="col">Colaborador / Usuário</th>
                      <th scope="col">Papel / Perfil</th>
                      <th scope="col">Código da Empresa</th>
                      <th scope="col">Documento & Contato</th>
                      <th scope="col">Qualificação / Detalhes</th>
                      <th scope="col">Acesso</th>
                      <th scope="col">Status</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          <div className="cadastros-empty-state">
                            <InfoIcon size={36} className="cadastros-empty-icon" />
                            <div className="cadastros-empty-title">Nenhum colaborador localizado</div>
                            <p className="cadastros-empty-desc">
                              Nenhum registro corresponde aos filtros selecionados. Tente ajustar os termos de busca.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((colab) => {
                        const displayCode =
                          !colab.codigoEmpresa || colab.codigoEmpresa === 'EFF-001'
                            ? tenant.codigoEmpresa || 'EFF60720'
                            : colab.codigoEmpresa;

                        return (
                        <tr key={colab.id}>
                          <td>
                            <div className="cadastros-entity-cell">
                              <GenericUserAvatar name={colab.nome} size={38} />
                              <div className="cadastros-entity-info">
                                <span className="cadastros-entity-name">{colab.nome}</span>
                                <span className="cadastros-entity-sub">{colab.cargo || 'Função Operacional'}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`cadastros-role-badge ${colab.tipo}`}>
                              {colab.tipo === 'administrador' && 'Administrador'}
                              {colab.tipo === 'analista' && 'Analista de Bem-Estar'}
                              {colab.tipo === 'motorista' && 'Motorista'}
                              {colab.tipo === 'curraleiro' && 'Curraleiro'}
                              {colab.tipo === 'pecuarista' && 'Pecuarista'}
                              {colab.tipo === 'manobrista' && 'Manobrista'}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(15, 81, 174, 0.25)',
                                background: 'rgba(15, 81, 174, 0.08)',
                                color: '#0f51ae',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {displayCode}
                            </span>
                          </td>
                          <td>
                            <div className="cadastros-entity-info">
                              <span style={{ fontWeight: 600 }}>{colab.cpf || '---'}</span>
                              <span className="cadastros-entity-sub">{colab.email}</span>
                              <span className="cadastros-entity-sub">{colab.telefone}</span>
                            </div>
                          </td>
                          <td>
                            {colab.tipo === 'motorista' ? (
                              <div className="cadastros-entity-info">
                                <span>
                                  <strong>CNH:</strong> {colab.cnhNumero || 'Não informada'} (Cat. {colab.categoriaCnh || 'E'})
                                </span>
                                <span className="cadastros-entity-sub">
                                  Vencimento: {colab.dataVencimentoCnh || 'Não informado'}
                                </span>
                              </div>
                            ) : (
                              <span className="cadastros-entity-sub">
                                {colab.localVinculado || 'Base Operacional Principal'}
                              </span>
                            )}
                          </td>
                          <td>
                            {['administrador', 'analista'].includes(colab.tipo) ? (
                              <span className="cadastros-role-badge administrador" style={{ fontSize: '0.72rem' }}>
                                Acesso Web Corporativo
                              </span>
                            ) : colab.tipo === 'motorista' ? (
                              <span className="cadastros-role-badge motorista" style={{ fontSize: '0.72rem' }}>
                                Aplicativo Mobile (Rota)
                              </span>
                            ) : (
                              <span className="cadastros-entity-sub">Acesso Polo SIF / Campo</span>
                            )}
                          </td>
                          <td>
                            <span className={`cadastros-status-badge ${colab.ativo !== false ? 'ativo' : 'inativo'}`}>
                              {colab.ativo !== false ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
                              {colab.ativo !== false ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="cadastros-view-btn"
                              onClick={() => setSelectedItem({ type: 'usuario', data: colab })}
                              title="Visualizar ficha completa"
                            >
                              <EyeIcon size={15} />
                              <span>Ficha</span>
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="cadastros-table-footer">
                <span>Exibindo <strong>{filteredUsers.length}</strong> de <strong>{collaborators.length}</strong> colaboradores cadastrados</span>
                <span>Modo Leitura / Auditoria</span>
              </div>
            </div>
          </section>
        )}

        {/* ==============================================================
            ABA 2: FROTA DE VEÍCULOS
            ============================================================== */}
        {activeTab === 'frota' && (
          <section className="cadastros-tab-content" aria-label="Tabela de Frota de Veículos">
            {/* KPIs da Frota */}
            <div className="cadastros-kpis-grid">
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Veículos Cadastrados</span>
                <span className="kpi-number">{fleet.length}</span>
                <span className="kpi-detail">{fleet.filter((f) => f.ativo !== false).length} operacionais</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Em Viagem / Rota</span>
                <span className="kpi-number">
                  {fleet.filter((f) => f.statusUso === 'EM_USO').length}
                </span>
                <span className="kpi-detail">Caminhões em trânsito com gado</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Disponíveis</span>
                <span className="kpi-number">
                  {fleet.filter((f) => f.statusUso === 'DISPONIVEL').length}
                </span>
                <span className="kpi-detail">Aptos para nova escala</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Capacidade Embarque</span>
                <span className="kpi-number">
                  {fleet.reduce((acc, curr) => acc + (curr.capacidadeCabecas || 0), 0)}
                </span>
                <span className="kpi-detail">Cabeças de gado por rota</span>
              </div>
            </div>

            {/* Toolbar com Busca e Filtros */}
            <div className="cadastros-toolbar">
              <div className="cadastros-search-box">
                <SearchIcon size={18} />
                <input
                  type="search"
                  className="cadastros-search-input"
                  placeholder="Buscar por placa, modelo, marca ou motorista..."
                  value={fleetQuery}
                  onChange={(e) => setFleetQuery(e.target.value)}
                />
              </div>

              <div className="cadastros-filters-group">
                <div className="cadastros-filter-pill-list" role="radiogroup" aria-label="Filtrar por tipo de veículo">
                  {[
                    { id: 'todos', label: 'Todos os Tipos' },
                    { id: 'CONJUNTO', label: 'Conjuntos Completos' },
                    { id: 'CAVALO', label: 'Cavalos Mecânicos' },
                    { id: 'CARRETA', label: 'Carretas / Reboques' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`cadastros-filter-pill ${fleetTypeFilter === tab.id ? 'active' : ''}`}
                      onClick={() => setFleetTypeFilter(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <select
                  className="cadastros-filter-select"
                  value={fleetStatusFilter}
                  onChange={(e) => setFleetStatusFilter(e.target.value)}
                  aria-label="Filtrar por status da frota"
                >
                  <option value="todos">Status: Todos</option>
                  <option value="EM_USO">Em Viagem (Em Uso)</option>
                  <option value="DISPONIVEL">Disponível no Pátio</option>
                  <option value="ativos">Apenas Ativos</option>
                  <option value="inativos">Apenas Inativos</option>
                </select>

                {(fleetQuery || fleetTypeFilter !== 'todos' || fleetStatusFilter !== 'todos') && (
                  <button
                    type="button"
                    className="cadastros-clear-filters-btn"
                    onClick={() => {
                      setFleetQuery('');
                      setFleetTypeFilter('todos');
                      setFleetStatusFilter('todos');
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Tabela de Frota */}
            <div className="cadastros-table-container">
              <div className="cadastros-table-responsive">
                <table className="cadastros-table">
                  <thead>
                    <tr>
                      <th scope="col">Identificação / Placa</th>
                      <th scope="col">Modelo & Marca</th>
                      <th scope="col">Capacidade</th>
                      <th scope="col">Motorista Atribuído</th>
                      <th scope="col">Km Acumulado</th>
                      <th scope="col">Inspeção Veicular</th>
                      <th scope="col">Status Operacional</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFleet.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          <div className="cadastros-empty-state">
                            <InfoIcon size={36} className="cadastros-empty-icon" />
                            <div className="cadastros-empty-title">Nenhum veículo localizado</div>
                            <p className="cadastros-empty-desc">
                              Nenhum caminhão corresponde aos filtros aplicados.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredFleet.map((truck) => (
                        <tr key={truck.id}>
                          <td>
                            <div className="cadastros-entity-info">
                              <span className="cadastros-placa-badge">{truck.placa}</span>
                              {truck.placaCarreta && (
                                <span className="cadastros-entity-sub" style={{ marginTop: '2px' }}>
                                  Carreta: <strong>{truck.placaCarreta}</strong>
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="cadastros-entity-info">
                              <span className="cadastros-entity-name">{truck.marca} {truck.modelo}</span>
                              <span className="cadastros-entity-sub">
                                Ano {truck.anoFabricacao || '---'} • {truck.tipoCarreta || 'Boiadeiro'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="cadastros-entity-info">
                              <span style={{ fontWeight: 700 }}>
                                {truck.capacidadeCabecas ? `${truck.capacidadeCabecas} cabeças` : '---'}
                              </span>
                              <span className="cadastros-entity-sub">{truck.tipo}</span>
                            </div>
                          </td>
                          <td>
                            {truck.motoristaAtualNome ? (
                              <div className="cadastros-entity-cell">
                                <GenericUserAvatar name={truck.motoristaAtualNome} size={28} />
                                <span style={{ fontWeight: 600 }}>{truck.motoristaAtualNome}</span>
                              </div>
                            ) : (
                              <span className="cadastros-entity-sub">Disponível / Sem escala</span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>
                              {truck.kmAcumulado ? `${truck.kmAcumulado.toLocaleString('pt-BR')} km` : '---'}
                            </span>
                          </td>
                          <td>
                            <div className="cadastros-entity-info">
                              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                {truck.dataVencimentoInspecao || 'Não informada'}
                              </span>
                              <span className="cadastros-entity-sub">Vistoria Semestral</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`cadastros-status-badge ${
                                truck.statusUso === 'EM_USO' ? 'em-uso' : 'disponivel'
                              }`}
                            >
                              {truck.statusUso === 'EM_USO' ? (
                                <>
                                  <AlertTriangleIcon size={12} />
                                  <span>Em Viagem</span>
                                </>
                              ) : (
                                <>
                                  <CheckIcon size={12} />
                                  <span>Disponível</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="cadastros-view-btn"
                              onClick={() => setSelectedItem({ type: 'frota', data: truck })}
                              title="Visualizar ficha técnica"
                            >
                              <EyeIcon size={15} />
                              <span>Ficha</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="cadastros-table-footer">
                <span>Exibindo <strong>{filteredFleet.length}</strong> de <strong>{fleet.length}</strong> veículos</span>
                <span>Modo Leitura / Auditoria</span>
              </div>
            </div>
          </section>
        )}

        {/* ==============================================================
            ABA 3: FAZENDAS PARCEIRAS
            ============================================================== */}
        {activeTab === 'fazendas' && (
          <section className="cadastros-tab-content" aria-label="Tabela de Fazendas Parceiras">
            {/* KPIs das Fazendas */}
            <div className="cadastros-kpis-grid">
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Fazendas Ativas</span>
                <span className="kpi-number">{fazendas.filter((f) => f.ativo).length}</span>
                <span className="kpi-detail">De {fazendas.length} propriedades cadastradas</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Capacidade de Embarque</span>
                <span className="kpi-number">
                  {fazendas.reduce((acc, curr) => acc + (curr.capacidadeEmbarqueCabecas || 0), 0)}
                </span>
                <span className="kpi-detail">Cabeças de gado por lote</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Municípios Atendidos</span>
                <span className="kpi-number">{new Set(fazendas.map((f) => f.cidade)).size}</span>
                <span className="kpi-detail">Pólos produtores</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Estados de Origem</span>
                <span className="kpi-number">{new Set(fazendas.map((f) => f.uf)).size}</span>
                <span className="kpi-detail">{Array.from(new Set(fazendas.map((f) => f.uf))).join(', ')}</span>
              </div>
            </div>

            {/* Toolbar com Busca e Filtros */}
            <div className="cadastros-toolbar">
              <div className="cadastros-search-box">
                <SearchIcon size={18} />
                <input
                  type="search"
                  className="cadastros-search-input"
                  placeholder="Buscar fazenda, pecuarista, cidade ou CNPJ..."
                  value={fazendaQuery}
                  onChange={(e) => setFazendaQuery(e.target.value)}
                />
              </div>

              <div className="cadastros-filters-group">
                <select
                  className="cadastros-filter-select"
                  value={fazendaStatusFilter}
                  onChange={(e) => setFazendaStatusFilter(e.target.value as 'todos' | 'ativas' | 'inativas')}
                  aria-label="Filtrar por status das fazendas"
                >
                  <option value="todos">Status: Todas</option>
                  <option value="ativas">Apenas Ativas</option>
                  <option value="inativas">Apenas Inativas</option>
                </select>

                {(fazendaQuery || fazendaStatusFilter !== 'todos') && (
                  <button
                    type="button"
                    className="cadastros-clear-filters-btn"
                    onClick={() => {
                      setFazendaQuery('');
                      setFazendaStatusFilter('todos');
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Tabela de Fazendas */}
            <div className="cadastros-table-container">
              <div className="cadastros-table-responsive">
                <table className="cadastros-table">
                  <thead>
                    <tr>
                      <th scope="col">Propriedade / Fazenda</th>
                      <th scope="col">Documentação Fiscal</th>
                      <th scope="col">Pecuarista Responsável</th>
                      <th scope="col">Localização</th>
                      <th scope="col">Capacidade de Embarque</th>
                      <th scope="col">Status</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFazendas.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="cadastros-empty-state">
                            <InfoIcon size={36} className="cadastros-empty-icon" />
                            <div className="cadastros-empty-title">Nenhuma fazenda localizada</div>
                            <p className="cadastros-empty-desc">
                              Nenhuma propriedade parceira corresponde aos filtros atuais.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredFazendas.map((faz) => {
                        const pecuarista = userMap.get(faz.pecuaristaId);
                        return (
                          <tr key={faz.id}>
                            <td>
                              <div className="cadastros-entity-info">
                                <span className="cadastros-entity-name">{faz.nome}</span>
                                <span className="cadastros-entity-sub">{faz.razaoSocial || 'Produtor Rural Individual'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="cadastros-entity-info">
                                <span style={{ fontWeight: 600 }}>{faz.cnpj || 'CPF do Produtor'}</span>
                                <span className="cadastros-entity-sub">IE: {faz.inscricaoEstadual || 'Isento'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="cadastros-entity-cell">
                                <GenericUserAvatar name={pecuarista?.nome || 'Pecuarista'} size={32} />
                                <div className="cadastros-entity-info">
                                  <span style={{ fontWeight: 700 }}>{pecuarista?.nome || 'Produtor Titular'}</span>
                                  <span className="cadastros-entity-sub">{pecuarista?.telefone || pecuarista?.email || 'Contato em cadastro'}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="cadastros-entity-info">
                                <span style={{ fontWeight: 600 }}>{faz.cidade} / {faz.uf}</span>
                                <span className="cadastros-entity-sub">{faz.logradouro || 'Zona Rural'}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700 }}>
                                {faz.capacidadeEmbarqueCabecas ? `${faz.capacidadeEmbarqueCabecas} cabeças` : 'Não informada'}
                              </span>
                            </td>
                            <td>
                              <span className={`cadastros-status-badge ${faz.ativo ? 'ativo' : 'inativo'}`}>
                                {faz.ativo ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
                                {faz.ativo ? 'Ativa' : 'Inativa'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="cadastros-view-btn"
                                onClick={() => setSelectedItem({ type: 'fazenda', data: faz })}
                                title="Visualizar ficha da fazenda"
                              >
                                <EyeIcon size={15} />
                                <span>Ficha</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="cadastros-table-footer">
                <span>Exibindo <strong>{filteredFazendas.length}</strong> de <strong>{fazendas.length}</strong> propriedades</span>
                <span>Modo Leitura / Auditoria</span>
              </div>
            </div>
          </section>
        )}

        {/* ==============================================================
            ABA 4: UNIDADES FRIGORÍFICAS
            ============================================================== */}
        {activeTab === 'frigorificos' && (
          <section className="cadastros-tab-content" aria-label="Tabela de Unidades Frigoríficas">
            {/* KPIs dos Frigoríficos */}
            <div className="cadastros-kpis-grid">
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Plantas Ativas</span>
                <span className="kpi-number">{frigorificos.filter((f) => f.ativo).length}</span>
                <span className="kpi-detail">De {frigorificos.length} unidades cadastradas</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Abate Diário Total</span>
                <span className="kpi-number">
                  {frigorificos.reduce((acc, curr) => acc + (curr.capacidadeAbateDiario || 0), 0).toLocaleString('pt-BR')}
                </span>
                <span className="kpi-detail">Cabeças de gado por dia</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Currais Totais SIF</span>
                <span className="kpi-number">
                  {frigorificos.reduce((acc, curr) => acc + (curr.qtdCurrais || 0), 0)}
                </span>
                <span className="kpi-detail">Estruturas de recepção e descanso</span>
              </div>
              <div className="cadastros-kpi-card">
                <span className="kpi-label">Registros SIF</span>
                <span className="kpi-number">{frigorificos.length}</span>
                <span className="kpi-detail">Inspeção Federal certificada</span>
              </div>
            </div>

            {/* Toolbar com Busca e Filtros */}
            <div className="cadastros-toolbar">
              <div className="cadastros-search-box">
                <SearchIcon size={18} />
                <input
                  type="search"
                  className="cadastros-search-input"
                  placeholder="Buscar por unidade, SIF, cidade ou integrante da equipe..."
                  value={frigorificoQuery}
                  onChange={(e) => setFrigorificoQuery(e.target.value)}
                />
              </div>

              <div className="cadastros-filters-group">
                <select
                  className="cadastros-filter-select"
                  value={frigorificoStatusFilter}
                  onChange={(e) => setFrigorificoStatusFilter(e.target.value as 'todos' | 'ativas' | 'inativas')}
                  aria-label="Filtrar por status dos frigoríficos"
                >
                  <option value="todos">Status: Todas</option>
                  <option value="ativas">Apenas Ativas</option>
                  <option value="inativas">Apenas Inativas</option>
                </select>

                {(frigorificoQuery || frigorificoStatusFilter !== 'todos') && (
                  <button
                    type="button"
                    className="cadastros-clear-filters-btn"
                    onClick={() => {
                      setFrigorificoQuery('');
                      setFrigorificoStatusFilter('todos');
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Tabela de Unidades Frigoríficas */}
            <div className="cadastros-table-container">
              <div className="cadastros-table-responsive">
                <table className="cadastros-table">
                  <thead>
                    <tr>
                      <th scope="col">Unidade Frigorífica / SIF</th>
                      <th scope="col">Razão Social & CNPJ</th>
                      <th scope="col">Equipe SIF Designada</th>
                      <th scope="col">Localização</th>
                      <th scope="col">Capacidade Operacional</th>
                      <th scope="col">Status</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFrigorificos.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="cadastros-empty-state">
                            <InfoIcon size={36} className="cadastros-empty-icon" />
                            <div className="cadastros-empty-title">Nenhum frigorífico localizado</div>
                            <p className="cadastros-empty-desc">
                              Nenhuma unidade frigorífica corresponde aos filtros atuais.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredFrigorificos.map((frig) => {
                        const analista = userMap.get(frig.analistaId);
                        const curraleiro = userMap.get(frig.curraleiroId);
                        const manobrista = userMap.get(frig.manobristaId);

                        return (
                          <tr key={frig.id}>
                            <td>
                              <div className="cadastros-entity-info">
                                <span className="cadastros-entity-name">{frig.nome}</span>
                                <span className="cadastros-sif-badge">{frig.registroSif}</span>
                              </div>
                            </td>
                            <td>
                              <div className="cadastros-entity-info">
                                <span style={{ fontWeight: 600 }}>{frig.razaoSocial || 'Frigorífico S.A.'}</span>
                                <span className="cadastros-entity-sub">{frig.cnpj || 'CNPJ Cadastrado'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="cadastros-team-stack">
                                <div className="cadastros-team-item">
                                  <span className="cadastros-team-role">Analista:</span>
                                  <strong>{analista?.nome || 'A definir'}</strong>
                                </div>
                                <div className="cadastros-team-item">
                                  <span className="cadastros-team-role">Curraleiro:</span>
                                  <span>{curraleiro?.nome || 'A definir'}</span>
                                </div>
                                <div className="cadastros-team-item">
                                  <span className="cadastros-team-role">Manobrista:</span>
                                  <span>{manobrista?.nome || 'A definir'}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="cadastros-entity-info">
                                <span style={{ fontWeight: 600 }}>{frig.cidade} / {frig.uf}</span>
                                <span className="cadastros-entity-sub">{frig.logradouro || 'Distrito Industrial'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="cadastros-entity-info">
                                <span style={{ fontWeight: 700 }}>{frig.capacidadeAbateDiario.toLocaleString('pt-BR')} cab/dia</span>
                                <span className="cadastros-entity-sub">{frig.qtdCurrais || 8} currais de recepção</span>
                              </div>
                            </td>
                            <td>
                              <span className={`cadastros-status-badge ${frig.ativo ? 'ativo' : 'inativo'}`}>
                                {frig.ativo ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
                                {frig.ativo ? 'Ativa' : 'Inativa'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="cadastros-view-btn"
                                onClick={() => setSelectedItem({ type: 'frigorifico', data: frig })}
                                title="Visualizar ficha da planta SIF"
                              >
                                <EyeIcon size={15} />
                                <span>Ficha</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="cadastros-table-footer">
                <span>Exibindo <strong>{filteredFrigorificos.length}</strong> de <strong>{frigorificos.length}</strong> plantas frigoríficas</span>
                <span>Modo Leitura / Auditoria</span>
              </div>
            </div>
          </section>
        )}

        {/* ==============================================================
            MODAL DE DETALHES (READ-ONLY)
            ============================================================== */}
        {selectedItem && (
          <div
            className="cadastros-modal-overlay"
            onClick={() => setSelectedItem(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="cadastros-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="cadastros-modal-header">
                <div className="cadastros-modal-header-info">
                  {selectedItem.type === 'usuario' && <NavMotoristasIcon size={24} />}
                  {selectedItem.type === 'frota' && <NavFrotaIcon size={24} />}
                  {selectedItem.type === 'fazenda' && <BuildingIcon size={24} />}
                  {selectedItem.type === 'frigorifico' && <NavFazendasUnidadesIcon size={24} />}
                  <div>
                    <h2 className="cadastros-modal-title">
                      {selectedItem.type === 'usuario' && (selectedItem.data as FuncionarioEmpresaResponse).nome}
                      {selectedItem.type === 'frota' && `Veículo Placa ${(selectedItem.data as CaminhaoResponse).placa}`}
                      {selectedItem.type === 'fazenda' && (selectedItem.data as FazendaModel).nome}
                      {selectedItem.type === 'frigorifico' && (selectedItem.data as UnidadeFrigorificaModel).nome}
                    </h2>
                    <p className="cadastros-modal-subtitle">
                      Ficha Cadastral em Modo de Leitura e Auditoria
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="cadastros-modal-close-btn"
                  onClick={() => setSelectedItem(null)}
                  aria-label="Fechar ficha"
                >
                  <CloseIcon size={20} />
                </button>
              </header>

              <div className="cadastros-modal-body">
                {/* Visualização de Usuário */}
                {selectedItem.type === 'usuario' && (() => {
                  const u = selectedItem.data as FuncionarioEmpresaResponse;
                  return (
                    <>
                      <section className="cadastros-modal-section">
                        <h3 className="cadastros-modal-section-title">Dados Pessoais e Contato</h3>
                        <div className="cadastros-modal-grid">
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Nome Completo</span>
                            <span className="cadastros-modal-value">{u.nome}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Perfil de Acesso</span>
                            <span className="cadastros-modal-value" style={{ textTransform: 'capitalize' }}>
                              {u.tipo}
                            </span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">CPF</span>
                            <span className="cadastros-modal-value">{u.cpf || 'Não informado'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">E-mail</span>
                            <span className="cadastros-modal-value">{u.email || 'Não informado'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Telefone / WhatsApp</span>
                            <span className="cadastros-modal-value">{u.telefone || 'Não informado'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Cargo / Função</span>
                            <span className="cadastros-modal-value">{u.cargo || 'Função Operacional'}</span>
                          </div>
                        </div>
                      </section>

                      {u.tipo === 'motorista' && (
                        <section className="cadastros-modal-section">
                          <h3 className="cadastros-modal-section-title">Habilitação Profissional (CNH)</h3>
                          <div className="cadastros-modal-grid">
                            <div className="cadastros-modal-field">
                              <span className="cadastros-modal-label">Número do Registro</span>
                              <span className="cadastros-modal-value">{u.cnhNumero || 'Não informado'}</span>
                            </div>
                            <div className="cadastros-modal-field">
                              <span className="cadastros-modal-label">Categoria</span>
                              <span className="cadastros-modal-value">{u.categoriaCnh || 'E'}</span>
                            </div>
                            <div className="cadastros-modal-field">
                              <span className="cadastros-modal-label">Vencimento da CNH</span>
                              <span className="cadastros-modal-value">{u.dataVencimentoCnh || 'Não informado'}</span>
                            </div>
                            <div className="cadastros-modal-field">
                              <span className="cadastros-modal-label">Status da Habilitação</span>
                              <span className="cadastros-modal-value" style={{ color: '#15803d' }}>
                                Regular para Transporte Boiadeiro
                              </span>
                            </div>
                          </div>
                        </section>
                      )}
                    </>
                  );
                })()}

                {/* Visualização de Frota */}
                {selectedItem.type === 'frota' && (() => {
                  const t = selectedItem.data as CaminhaoResponse;
                  return (
                    <>
                      <section className="cadastros-modal-section">
                        <h3 className="cadastros-modal-section-title">Identificação do Veículo</h3>
                        <div className="cadastros-modal-grid">
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Placa do Cavalo</span>
                            <span className="cadastros-modal-value">{t.placa}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Placa da Carreta</span>
                            <span className="cadastros-modal-value">{t.placaCarreta || 'Não vinculada'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Marca & Modelo</span>
                            <span className="cadastros-modal-value">{t.marca} {t.modelo}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Ano de Fabricação</span>
                            <span className="cadastros-modal-value">{t.anoFabricacao || 'Não informado'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Tipo de Carreta</span>
                            <span className="cadastros-modal-value">{t.tipoCarreta || 'Carreta Boiadeira'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Capacidade Nominal</span>
                            <span className="cadastros-modal-value">{t.capacidadeCabecas || 0} cabeças de gado</span>
                          </div>
                        </div>
                      </section>

                      <section className="cadastros-modal-section">
                        <h3 className="cadastros-modal-section-title">Situação Operacional e Manutenção</h3>
                        <div className="cadastros-modal-grid">
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Status Atual</span>
                            <span className="cadastros-modal-value">
                              {t.statusUso === 'EM_USO' ? 'Em Viagem / Rota' : 'Disponível no Pátio'}
                            </span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Motorista Alocado</span>
                            <span className="cadastros-modal-value">{t.motoristaAtualNome || 'Nenhum motorista fixo'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Km Acumulado</span>
                            <span className="cadastros-modal-value">
                              {t.kmAcumulado ? `${t.kmAcumulado.toLocaleString('pt-BR')} km` : '---'}
                            </span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Vencimento da Inspeção</span>
                            <span className="cadastros-modal-value">{t.dataVencimentoInspecao || 'Não informada'}</span>
                          </div>
                        </div>
                      </section>
                    </>
                  );
                })()}

                {/* Visualização de Fazenda */}
                {selectedItem.type === 'fazenda' && (() => {
                  const f = selectedItem.data as FazendaModel;
                  const pec = userMap.get(f.pecuaristaId);
                  return (
                    <>
                      <section className="cadastros-modal-section">
                        <h3 className="cadastros-modal-section-title">Dados da Propriedade</h3>
                        <div className="cadastros-modal-grid">
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Nome da Fazenda</span>
                            <span className="cadastros-modal-value">{f.nome}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Razão Social</span>
                            <span className="cadastros-modal-value">{f.razaoSocial || 'Produtor Rural'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">CNPJ / CPF</span>
                            <span className="cadastros-modal-value">{f.cnpj || 'Não informado'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Inscrição Estadual</span>
                            <span className="cadastros-modal-value">{f.inscricaoEstadual || 'Isento'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Capacidade de Embarque</span>
                            <span className="cadastros-modal-value">{f.capacidadeEmbarqueCabecas || 0} cabeças por lote</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Status Cadastral</span>
                            <span className="cadastros-modal-value">{f.ativo ? 'Ativa para Operação' : 'Inativa'}</span>
                          </div>
                        </div>
                      </section>

                      <section className="cadastros-modal-section">
                        <h3 className="cadastros-modal-section-title">Localização e Pecuarista Titular</h3>
                        <div className="cadastros-modal-grid">
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Município / UF</span>
                            <span className="cadastros-modal-value">{f.cidade} / {f.uf}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Endereço Rural</span>
                            <span className="cadastros-modal-value">{f.logradouro || 'Zona Rural'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Pecuarista Responsável</span>
                            <span className="cadastros-modal-value">{pec?.nome || 'Titular Vinculado'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Contato do Pecuarista</span>
                            <span className="cadastros-modal-value">{pec?.telefone || pec?.email || 'Contato em cadastro'}</span>
                          </div>
                        </div>
                      </section>
                    </>
                  );
                })()}

                {/* Visualização de Frigorífico */}
                {selectedItem.type === 'frigorifico' && (() => {
                  const u = selectedItem.data as UnidadeFrigorificaModel;
                  const ana = userMap.get(u.analistaId);
                  const cur = userMap.get(u.curraleiroId);
                  const man = userMap.get(u.manobristaId);
                  return (
                    <>
                      <section className="cadastros-modal-section">
                        <h3 className="cadastros-modal-section-title">Dados da Unidade SIF</h3>
                        <div className="cadastros-modal-grid">
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Nome da Unidade</span>
                            <span className="cadastros-modal-value">{u.nome}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Registro SIF</span>
                            <span className="cadastros-modal-value">{u.registroSif}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Razão Social</span>
                            <span className="cadastros-modal-value">{u.razaoSocial || 'Indústria Frigorífica'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">CNPJ</span>
                            <span className="cadastros-modal-value">{u.cnpj || 'Não informado'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Capacidade de Abate</span>
                            <span className="cadastros-modal-value">{u.capacidadeAbateDiario.toLocaleString('pt-BR')} cabeças/dia</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Currais de Recepção</span>
                            <span className="cadastros-modal-value">{u.qtdCurrais || 8} currais ativos</span>
                          </div>
                        </div>
                      </section>

                      <section className="cadastros-modal-section">
                        <h3 className="cadastros-modal-section-title">Equipe SIF e Localização</h3>
                        <div className="cadastros-modal-grid">
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Analista de Bem-Estar</span>
                            <span className="cadastros-modal-value">{ana?.nome || 'Designação Pendente'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Curraleiro SIF</span>
                            <span className="cadastros-modal-value">{cur?.nome || 'Designação Pendente'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Manobrista de Pátio</span>
                            <span className="cadastros-modal-value">{man?.nome || 'Designação Pendente'}</span>
                          </div>
                          <div className="cadastros-modal-field">
                            <span className="cadastros-modal-label">Município / UF</span>
                            <span className="cadastros-modal-value">{u.cidade} / {u.uf}</span>
                          </div>
                          <div className="cadastros-modal-field" style={{ gridColumn: 'span 2' }}>
                            <span className="cadastros-modal-label">Endereço da Planta</span>
                            <span className="cadastros-modal-value">{u.logradouro || 'Distrito Industrial'}</span>
                          </div>
                        </div>
                      </section>
                    </>
                  );
                })()}
              </div>

              <footer className="cadastros-modal-footer">
                <button
                  type="button"
                  className="cadastros-modal-primary-btn"
                  onClick={() => setSelectedItem(null)}
                >
                  Concluir Visualização
                </button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

export default CadastrosConsulta;
