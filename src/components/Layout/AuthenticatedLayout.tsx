import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { GenericUserAvatar } from '../Feedback/GenericUserAvatar';
import { CinttiaChatWidget } from '../CinttiaChat/CinttiaChatWidget';
import {
  LogoCompletaIcon,
  NavVisaoGeralIcon,
  NavDiariosIcon,
  NavAuditoriaIcon,
  NavMotoristasIcon,
  NavFrotaIcon,
  NavFazendasUnidadesIcon,
  NavTabelasIcon,
  NavSuporteIcon,
  NavConfiguracoesIcon,
  LogoutIcon,
  SearchIcon,
  CloseIcon,
  NotificationBadgeIcon,
  SunIcon,
  MoonIcon,
  CinttiaIcon,
} from '../icons';
import './AuthenticatedLayout.css';

export interface AuthenticatedLayoutProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly searchPlaceholder?: string;
  readonly searchValue?: string;
  readonly onSearchChange?: (value: string) => void;
  readonly searchDropdown?: React.ReactNode;
  readonly headerCenter?: React.ReactNode;
  readonly headerRight?: React.ReactNode;
  readonly children: React.ReactNode;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  title,
  subtitle,
  searchPlaceholder = 'Buscar GTA, placa ou motorista',
  searchValue = '',
  onSearchChange,
  searchDropdown,
  headerCenter,
  headerRight,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, empresa, logout, roles } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const pathname = location.pathname;

  const displayName = user?.nome || empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Administrador';
  const displayRole = user?.cargo || ('tipo' in (user || {}) ? (user as { tipo: string }).tipo : 'Administrador');
  const companyName = empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Minha Empresa';
  const companyCode = empresa?.codigoEmpresa || empresa?.codigo || '';
  const avatarUrl = empresa?.logoUrl || ('fotoUrl' in (user || {}) ? (user as { fotoUrl?: string }).fotoUrl : null);

  const isAnalista =
    !roles.some((r) =>
      ['ADMIN', 'ADMINISTRADOR', 'ADM_EMPRESA', 'SISTEMA_DEV'].includes(r.toUpperCase())
    ) &&
    (roles.map((r) => r.toUpperCase()).includes('ANALISTA') ||
      (user && 'tipo' in user && user.tipo === 'analista') ||
      displayRole.toLowerCase().includes('analista'));

  const roleTitle = user?.cargo || (isAnalista ? 'Analista de bem-estar animal' : 'Administrador');

  const handleLogout = () => {
    setShowProfileMenu(false);
    logout();
    navigate('/login', { replace: true });
  };

  // Link de e-mail de suporte pré-configurado
  const supportEmail = 'efficientia.inter@gmail.com';
  const supportSubject = `[Suporte Efficientia] Solicitação de Ajuda - ${companyName}${companyCode ? ` (${companyCode})` : ''}`;
  const supportBody = `Olá equipe de suporte da Efficientia,\n\nPreciso de auxílio com a seguinte situação na operação:\n\n[Descreva aqui sua dúvida ou problema]\n\nAtenciosamente,\n${displayName}\n${companyName}`;
  const mailtoSupportUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;

  const isNavActive = (path: string): boolean => {
    if (path === '/visao-geral') {
      return pathname === '/visao-geral' || pathname === '/dashboard';
    }
    if (path === '/colaboradores') {
      return pathname === '/colaboradores' || pathname === '/motoristas' || pathname === '/usuarios';
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="layout-shell">
      {/* ==============================================================
          BARRA SUPERIOR (TOPBAR)
          ============================================================== */}
      <header className="layout-topbar" role="banner">
        <div className="layout-topbar-left">
          <Link to="/visao-geral" className="layout-brand" title="Efficientia - Visão Geral">
            <LogoCompletaIcon height={42} className="layout-brand-logo" />
          </Link>

          <div className="layout-topbar-divider" aria-hidden="true" />

          {title && (
            <div className="layout-page-heading">
              <h1>{title}</h1>
              {subtitle && <p className="layout-page-subtitle">{subtitle}</p>}
            </div>
          )}
        </div>

        {headerCenter && <div className="layout-topbar-center">{headerCenter}</div>}

        <div className="layout-topbar-right">
          {onSearchChange && (
            <div className="layout-search-box-wrap" ref={searchContainerRef}>
              <div className="layout-search-box">
                <SearchIcon size={18} className="layout-search-icon" />
                <label className="visually-hidden" htmlFor="layout-global-search">
                  {searchPlaceholder}
                </label>
                <input
                  id="layout-global-search"
                  className="layout-search-input"
                  type="text"
                  autoComplete="off"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsSearchFocused(false);
                    }
                  }}
                />
                {searchValue && (
                  <button
                    type="button"
                    className="layout-search-clear-btn"
                    onClick={() => {
                      onSearchChange('');
                      setIsSearchFocused(false);
                    }}
                    title="Limpar pesquisa"
                    aria-label="Limpar pesquisa"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>

              {isSearchFocused && searchValue.trim().length > 0 && searchDropdown && (
                <div className="layout-search-dropdown-menu" role="region" aria-label="Resultados da busca rápida">
                  {searchDropdown}
                </div>
              )}
            </div>
          )}

          {headerRight}



          <button
            type="button"
            className="layout-icon-btn"
            title={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>

          <button
            type="button"
            className="layout-icon-btn layout-bell-btn"
            title="Notificações e Alertas"
            aria-label="Notificações"
            onClick={() => navigate('/visao-geral')}
          >
            <NotificationBadgeIcon size={20} />
          </button>

          {/* Avatar com menu dropdown de perfil */}
          <div className="layout-avatar-container">
            <button
              type="button"
              className="layout-avatar-btn"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              aria-expanded={showProfileMenu}
              aria-haspopup="true"
              title={`Perfil: ${displayName}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="layout-user-photo" />
              ) : (
                <GenericUserAvatar size={38} name={displayName} />
              )}
            </button>

            {showProfileMenu && (
              <div className="layout-profile-dropdown" role="menu">
                <div className="layout-profile-header">
                  <strong>{displayName}</strong>
                  <span>{displayRole}</span>
                  <small>{companyName}</small>
                </div>
                <div className="layout-profile-divider" />
                <button
                  type="button"
                  className="layout-profile-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/configuracao');
                  }}
                  role="menuitem"
                >
                  <NavConfiguracoesIcon size={16} />
                  <span>Configurações</span>
                </button>
                <a
                  href={mailtoSupportUrl}
                  className="layout-profile-item"
                  role="menuitem"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <NavSuporteIcon size={16} />
                  <span>Ajuda & Suporte</span>
                </a>
                <div className="layout-profile-divider" />
                <button
                  type="button"
                  className="layout-profile-item layout-profile-logout"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                    navigate('/login', { replace: true });
                  }}
                  role="menuitem"
                >
                  <span>Sair da conta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ==============================================================
          CORPO (SIDEBAR + MAIN CONTENT)
          ============================================================== */}
      <div className="layout-body">
        <div className="layout-sidebar-wrapper">
          <aside
            className={`layout-sidebar ${isSidebarHovered ? 'expanded' : ''}`}
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
            aria-label="Navegação principal"
          >
            <nav className="layout-nav-top">
              <button
                type="button"
                className={`layout-nav-item ${isNavActive('/visao-geral') ? 'active' : ''}`}
                title="Visão Geral"
                onClick={() => navigate('/visao-geral')}
                aria-current={isNavActive('/visao-geral') ? 'page' : undefined}
              >
                <span className="layout-nav-icon">
                  <NavVisaoGeralIcon size={24} />
                </span>
                <span className="layout-nav-label">Visão geral</span>
              </button>

              {isAnalista ? (
                <>
                  <button
                    type="button"
                    className={`layout-nav-item ${isNavActive('/diarios') ? 'active' : ''}`}
                    title="Diários de Rota"
                    onClick={() => navigate('/diarios')}
                    aria-current={isNavActive('/diarios') ? 'page' : undefined}
                  >
                    <span className="layout-nav-icon">
                      <NavDiariosIcon size={24} />
                    </span>
                    <span className="layout-nav-label">Diários de rota</span>
                  </button>

                  <button
                    type="button"
                    className={`layout-nav-item ${isNavActive('/auditoria') ? 'active' : ''}`}
                    title="Auditoria de Relatórios"
                    onClick={() => navigate('/auditoria')}
                    aria-current={isNavActive('/auditoria') ? 'page' : undefined}
                  >
                    <span className="layout-nav-icon">
                      <NavAuditoriaIcon size={24} />
                    </span>
                    <span className="layout-nav-label">Auditoria</span>
                  </button>

                  <button
                    type="button"
                    className={`layout-nav-item ${isNavActive('/cadastros-consulta') ? 'active' : ''}`}
                    title="Tabelas e Cadastros (Consulta e Filtros)"
                    onClick={() => navigate('/cadastros-consulta')}
                    aria-current={isNavActive('/cadastros-consulta') ? 'page' : undefined}
                  >
                    <span className="layout-nav-icon">
                      <NavTabelasIcon size={24} />
                    </span>
                    <span className="layout-nav-label">Tabelas e cadastros</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`layout-nav-item ${isNavActive('/colaboradores') ? 'active' : ''}`}
                    title="Colaboradores e Usuários"
                    onClick={() => navigate('/colaboradores')}
                    aria-current={isNavActive('/colaboradores') ? 'page' : undefined}
                  >
                    <span className="layout-nav-icon">
                      <NavMotoristasIcon size={24} />
                    </span>
                    <span className="layout-nav-label">Colaboradores</span>
                  </button>

                  <button
                    type="button"
                    className={`layout-nav-item ${isNavActive('/frota') ? 'active' : ''}`}
                    title="Frota de Caminhões"
                    onClick={() => navigate('/frota')}
                    aria-current={isNavActive('/frota') ? 'page' : undefined}
                  >
                    <span className="layout-nav-icon">
                      <NavFrotaIcon size={24} />
                    </span>
                    <span className="layout-nav-label">Frota</span>
                  </button>

                  <button
                    type="button"
                    className={`layout-nav-item ${isNavActive('/fazenda-unidades') ? 'active' : ''}`}
                    title="Fazendas e Unidades Frigoríficas"
                    onClick={() => navigate('/fazenda-unidades')}
                    aria-current={isNavActive('/fazenda-unidades') ? 'page' : undefined}
                  >
                    <span className="layout-nav-icon">
                      <NavFazendasUnidadesIcon size={24} />
                    </span>
                    <span className="layout-nav-label">Fazendas e unidades</span>
                  </button>
                </>
              )}
            </nav>

            <div className="layout-nav-bottom">
              {/* Suporte como atalho de e-mail pré-definido */}
              <a
                href={mailtoSupportUrl}
                className="layout-nav-item"
                title="Suporte por E-mail (efficientia.inter@gmail.com)"
                aria-label="Enviar e-mail para o suporte"
              >
                <span className="layout-nav-icon">
                  <NavSuporteIcon size={24} />
                </span>
                <span className="layout-nav-label">Suporte</span>
              </a>

              <button
                type="button"
                className={`layout-nav-item ${isNavActive('/configuracao') ? 'active' : ''}`}
                title="Configurações da Operação"
                onClick={() => navigate('/configuracao')}
                aria-current={isNavActive('/configuracao') ? 'page' : undefined}
              >
                <span className="layout-nav-icon">
                  <NavConfiguracoesIcon size={24} />
                </span>
                <span className="layout-nav-label">Configurações</span>
              </button>

              <div className="layout-sidebar-divider" aria-hidden="true" />

              {/* Perfil & Logout no rodapé da barra lateral */}
              <div className="layout-sidebar-profile-card">
                <button
                  type="button"
                  className="layout-sidebar-avatar-btn"
                  title={`${displayName} • ${companyName}`}
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  aria-label="Abrir menu de perfil"
                >
                  <span className="layout-sidebar-avatar-slot">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="layout-user-photo-sm" />
                    ) : (
                      <GenericUserAvatar size={38} name={displayName} />
                    )}
                  </span>
                </button>

                <div className="layout-sidebar-profile-info">
                  <strong className="layout-sidebar-profile-name" title={displayName}>
                    {displayName}
                  </strong>
                  <span className="layout-sidebar-profile-role" title={roleTitle}>
                    {roleTitle}
                  </span>
                </div>

                <button
                  type="button"
                  className="layout-sidebar-logout-btn"
                  onClick={handleLogout}
                  title="Sair da conta"
                  aria-label="Sair da conta"
                >
                  <LogoutIcon size={20} />
                </button>
              </div>
            </div>
          </aside>
        </div>

        <main id="main-content" className="layout-main-content">
          {children}
        </main>
      </div>

      {/* Janela Flutuante do Chat da Cinttia (Widget acoplado acima do botão) */}
      <CinttiaChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Botão Flutuante da Cinttia (FAB no canto inferior direito) */}
      <button
        type="button"
        className={`layout-cinttia-fab ${isChatOpen ? 'active' : ''}`}
        title={isChatOpen ? 'Fechar chat com a Cinttia' : 'Conversar com a Cinttia'}
        aria-label={isChatOpen ? 'Fechar chat com a Cinttia' : 'Conversar com a Cinttia'}
        aria-expanded={isChatOpen}
        onClick={() => setIsChatOpen((prev) => !prev)}
      >
        <span className="layout-cinttia-fab-icon-box">
          <CinttiaIcon size={26} stroke="#ffffff" fill="#ffffff" />
        </span>
        <span className="layout-cinttia-fab-label">
          {isChatOpen ? 'Fechar chat' : 'Conversar com a Cinttia'}
        </span>
      </button>
    </div>
  );
};

export default AuthenticatedLayout;
