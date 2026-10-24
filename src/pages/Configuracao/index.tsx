import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useFetchData } from '../../hooks/useFetchData';
import { funcionarioService } from '../../services/funcionarioService';
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
import './Configuracao.css';

const STORAGE_KEY = '@efficientia:configuracao';

type ConfigurationData = {
  tempoTolerancia: string;
  mortalidadeBloqueio: string;
  prazoAnalise: string;
  assinaturasObrigatorias: boolean;
  alertaSirene: boolean;
  alertaInspecao: boolean;
  alertaCnh: boolean;
  alertaParada: boolean;
  tema: 'claro' | 'escuro';
  contraste: boolean;
};

const initialData: ConfigurationData = {
  tempoTolerancia: '40',
  mortalidadeBloqueio: '5',
  prazoAnalise: '24',
  assinaturasObrigatorias: true,
  alertaSirene: true,
  alertaInspecao: true,
  alertaCnh: true,
  alertaParada: true,
  tema: 'claro',
  contraste: false,
};

function loadConfiguration(): ConfigurationData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialData;
    return { ...initialData, ...JSON.parse(saved) } as ConfigurationData;
  } catch {
    return initialData;
  }
}

export function Configuracao() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const { setTheme, setComfortableContrast } = useTheme();
  const [data, setData] = useState<ConfigurationData>(loadConfiguration);
  const [saved, setSaved] = useState(false);
  const displayName = empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Administrador';
  const empresaId = empresa?.id;
  const fetchTeam = useCallback(
    (signal: AbortSignal) => empresaId ? funcionarioService.listarFuncionarios(empresaId, signal) : Promise.resolve([]),
    [empresaId]
  );
  const { data: team, error: teamError, isLoading: isTeamLoading } = useFetchData(fetchTeam);
  const teamList = Array.isArray(team) ? team : [];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // A tela continua editável mesmo quando o navegador bloqueia o storage.
    }
  }, [data]);

  const update = <K extends keyof ConfigurationData>(key: K, value: ConfigurationData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // O feedback ainda informa a ação concluída na sessão atual.
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="configuration-shell">
      <header className="vg-topbar configuration-topbar">
        <div className="vg-topbar-left">
          <div className="vg-brand"><BullBrandLogo /><div className="vg-brand-text"><span className="vg-brand-title">Efficien<span className="vg-brand-highlight">tia</span></span><span className="vg-brand-Check"><span className="vg-brand-green">Eficiência</span> que viaja junto com você</span></div></div>
          <div className="vg-topbar-divider" aria-hidden="true" />
          <div className="vg-page-heading"><h1>Configurações</h1><p className="vg-page-subtitle">Regras de auditoria, alertas e permissões</p></div>
        </div>
        <div className="vg-topbar-right">
          <div className="vg-search-box"><SearchMagnifierIcon /><input type="search" className="vg-search-input" placeholder="Buscar GTA, placa ou motorista" /></div>
          <button type="button" className="vg-bell-btn" aria-label="Notificações"><TopbarBellIcon /></button>
          <button type="submit" form="configuration-form" className="configuration-save-top">{saved ? 'Salvo ✓' : 'Salvar alterações →'}</button>
          <div className="vg-avatar-wrapper"><GenericUserAvatar size={38} name={displayName} /></div>
        </div>
      </header>

      <div className="configuration-layout">
        <aside className="vg-sidebar" aria-label="Menu lateral">
          <nav className="vg-nav-top">
            <button type="button" className="vg-nav-item" title="Visão Geral" onClick={() => navigate('/visao-geral')}><SidebarIconGrid /></button>
            <button type="button" className="vg-nav-item" title="Diários e Relatórios" onClick={() => navigate('/diarios')}><SidebarIconDoc /></button>
            <button type="button" className="vg-nav-item" title="Auditoria" onClick={() => navigate('/auditoria')}><SidebarIconFolder /></button>
            <button type="button" className="vg-nav-item" title="Motoristas e Equipe" onClick={() => navigate('/motoristas')}><SidebarIconUsers /></button>
            <button type="button" className="vg-nav-item" title="Frota de Caminhões" onClick={() => navigate('/frota')}><SidebarIconTruck /></button>
            <button type="button" className="vg-nav-item" title="Fazendas e Unidades" onClick={() => navigate('/fazenda-unidades')}><SidebarIconBuilding /></button>
          </nav>
          <div className="vg-nav-bottom"><button type="button" className="vg-nav-item active" title="Configurações"><SidebarIconSettings /></button><div className="vg-sidebar-divider" /><div className="vg-sidebar-avatar"><GenericUserAvatar size={42} name={displayName} /></div></div>
        </aside>

        <main className="configuration-content" aria-labelledby="configuration-title">
          <form id="configuration-form" onSubmit={handleSubmit}>
            <div className="configuration-grid">
              <section className="configuration-card">
                <h2 id="configuration-title">Regras da operação</h2>
                <p className="configuration-card-description">Defina como a equipe deve operar e analisar os diários.</p>
                <div className="configuration-fields">
                  <label>Tempo de tolerância <span>minutos</span><input type="number" min="0" value={data.tempoTolerancia} onChange={(event) => update('tempoTolerancia', event.target.value)} /></label>
                  <label>Mortalidade que bloqueia aprovação <span>animais</span><input type="number" min="0" value={data.mortalidadeBloqueio} onChange={(event) => update('mortalidadeBloqueio', event.target.value)} /></label>
                  <label>Prazo para análise <span>horas</span><input type="number" min="1" value={data.prazoAnalise} onChange={(event) => update('prazoAnalise', event.target.value)} /></label>
                </div>
                <div className="configuration-divider" />
                <label className="configuration-checkbox"><input type="checkbox" checked={data.assinaturasObrigatorias} onChange={(event) => update('assinaturasObrigatorias', event.target.checked)} /><span><strong>Assinaturas obrigatórias</strong><small>Exigir assinatura do motorista, pecuarista e curraleiro.</small></span></label>
              </section>

              <section className="configuration-card">
                <h2>Alertas automáticos</h2>
                <p className="configuration-card-description">Escolha os eventos que precisam de atenção da equipe.</p>
                <div className="configuration-switches">
                  <label><span>Sirene com falha</span><input type="checkbox" checked={data.alertaSirene} onChange={(event) => update('alertaSirene', event.target.checked)} /><i /></label>
                  <label><span>Inspeção do veículo vencendo em 15 dias</span><input type="checkbox" checked={data.alertaInspecao} onChange={(event) => update('alertaInspecao', event.target.checked)} /><i /></label>
                  <label><span>CNH do motorista</span><input type="checkbox" checked={data.alertaCnh} onChange={(event) => update('alertaCnh', event.target.checked)} /><i /></label>
                  <label><span>Parada acima de 40 min</span><input type="checkbox" checked={data.alertaParada} onChange={(event) => update('alertaParada', event.target.checked)} /><i /></label>
                </div>
              </section>

              <section className="configuration-card">
                <h2>Equipe e permissões</h2>
                <p className="configuration-card-description">Acesso ao espaço administrativo</p>
                <div className="configuration-team-list">{isTeamLoading && <p className="configuration-card-description">Carregando equipe…</p>}{teamError && <p className="configuration-card-description">Não foi possível carregar a equipe. Acesse Motoristas para tentar novamente.</p>}{!isTeamLoading && !teamError && teamList.length === 0 && <p className="configuration-card-description">Nenhuma pessoa cadastrada nesta empresa.</p>}{!isTeamLoading && !teamError && teamList.slice(0, 3).map((member) => <div key={member.id}><GenericUserAvatar size={32} name={member.nome} /><span><strong>{member.nome}</strong><small>{member.cargo || member.tipo}</small></span><b>{member.tipo?.toUpperCase() || 'EQUIPE'}</b></div>)}</div>
                <button type="button" className="configuration-outline-button">+ Adicionar pessoa</button>
              </section>

              <section className="configuration-card configuration-preferences">
                <h2>Preferências</h2>
                <p className="configuration-card-description">Personalize sua experiência no Efficientia.</p>
                <label className="configuration-select-label">Tema da interface<select value={data.tema} onChange={(event) => { const tema = event.target.value as ConfigurationData['tema']; update('tema', tema); setTheme(tema === 'escuro' ? 'dark' : 'light'); }}><option value="claro">Claro</option><option value="escuro">Escuro</option></select></label>
                <label className="configuration-checkbox"><input type="checkbox" checked={data.contraste} onChange={(event) => { const enabled = event.target.checked; update('contraste', enabled); setComfortableContrast(enabled); }} /><span><strong>Contraste confortável</strong><small>Melhorar a leitura dos elementos da interface.</small></span></label>
              </section>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default Configuracao;
