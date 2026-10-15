import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  LogoCompletaIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  RouteActiveIcon,
  NavConfiguracoesIcon,
  NavFazendasUnidadesIcon,
  NavMotoristasIcon,
  NavFrotaIcon,
  KpiMortalidadeIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
} from '../../components/icons';
import { formatCnpj, formatCpf, formatTelefone } from '../../utils/validators';
import './Onboarding.css';

const STEP2_STORAGE_KEY = '@efficientia:onboarding:step2';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

/**
 * Dados da equipe operacional da unidade frigorífica
 */
export interface EquipeFrigorificoData {
  // Analista
  analistaNome: string;
  analistaCpf: string;
  analistaRegistro: string;
  analistaEmail: string;

  // Manobrista
  manobristaNome: string;
  manobristaCpf: string;
  manobristaCnh: string;

  // Curraleiro
  curraleiroNome: string;
  curraleiroCpf: string;
  curraleiroCurral: string;
}

/**
 * Dados da unidade frigorífica de destino
 */
export interface UnidadeFrigorificaData {
  nome: string;
  cnpj: string;
  qtdCurrais: number;
  municipio: string;
  uf: string;
}

/**
 * Dados do motorista condutor
 */
export interface MotoristaData {
  nome: string;
  cpf: string;
  cnhNumero: string;
  categoriaCnh: string;
  dataVencimentoCnh: string;
  telefone: string;
}

/**
 * Dados da frota (Cavalo mecânico e Carreta boiadeira)
 */
export interface FrotaCaminhaoData {
  // Cavalo Mecânico (Unidade de Tração)
  cavaloPlaca: string;
  cavaloKmAcumulado: number;
  cavaloVencimentoInspecao: string;

  // Carreta Boiadeira (Implemento)
  carretaPlaca: string;
  carretaCapacidadeCabecas: number;
  carretaVencimentoInspecao: string;
}

/**
 * Parâmetros operacionais regulatórios da frota
 */
export interface ParametrosOperacionaisData {
  tempoMaxViagemHoras: number;
  metaMortalidade: number;
  mortalidadeBloqueioCabecas: number;
  prazoAnaliseHoras: number;
  alertaTempoParadaImprevista: number;
  qtdAssinaturasObrigatorias: number;
  alertaInspecaoDias: number;
  alertaSireneRe: boolean;
  alertaCnhVencida: boolean;
}

export interface Step2Data {
  equipe: EquipeFrigorificoData;
  unidade: UnidadeFrigorificaData;
  motorista: MotoristaData;
  frota: FrotaCaminhaoData;
  parametros: ParametrosOperacionaisData;
}

const defaultStep2: Step2Data = {
  equipe: {
    analistaNome: '',
    analistaCpf: '',
    analistaRegistro: '',
    analistaEmail: '',
    manobristaNome: '',
    manobristaCpf: '',
    manobristaCnh: '',
    curraleiroNome: '',
    curraleiroCpf: '',
    curraleiroCurral: '',
  },
  unidade: {
    nome: '',
    cnpj: '',
    qtdCurrais: 10,
    municipio: '',
    uf: 'SP',
  },
  motorista: {
    nome: '',
    cpf: '',
    cnhNumero: '',
    categoriaCnh: 'E',
    dataVencimentoCnh: '',
    telefone: '',
  },
  frota: {
    cavaloPlaca: '',
    cavaloKmAcumulado: 120000,
    cavaloVencimentoInspecao: '',
    carretaPlaca: '',
    carretaCapacidadeCabecas: 30,
    carretaVencimentoInspecao: '',
  },
  parametros: {
    tempoMaxViagemHoras: 12,
    metaMortalidade: 0.10,
    mortalidadeBloqueioCabecas: 1,
    prazoAnaliseHoras: 24,
    alertaTempoParadaImprevista: 30,
    qtdAssinaturasObrigatorias: 4,
    alertaInspecaoDias: 15,
    alertaSireneRe: true,
    alertaCnhVencida: true,
  },
};

function loadStep2Data(): Step2Data {
  try {
    const raw = localStorage.getItem(STEP2_STORAGE_KEY);
    if (!raw) return defaultStep2;
    const parsed = JSON.parse(raw);
    return {
      equipe: { ...defaultStep2.equipe, ...(parsed.equipe || {}) },
      unidade: { ...defaultStep2.unidade, ...(parsed.unidade || parsed.frigorifico || {}) },
      motorista: { ...defaultStep2.motorista, ...(parsed.motorista || {}) },
      frota: { ...defaultStep2.frota, ...(parsed.frota || {}) },
      parametros: { ...defaultStep2.parametros, ...(parsed.parametros || parsed.configuracao || {}) },
    };
  } catch {
    return defaultStep2;
  }
}

function formatPlaca(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

export function OnboardingStep2() {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const [data, setData] = useState<Step2Data>(loadStep2Data);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STEP2_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage fallback
    }
  }, [data]);

  const updateEquipe = (field: keyof EquipeFrigorificoData, value: string) => {
    setData((curr) => ({
      ...curr,
      equipe: { ...curr.equipe, [field]: value },
    }));
  };

  const updateUnidade = (field: keyof UnidadeFrigorificaData, value: string | number) => {
    setData((curr) => ({
      ...curr,
      unidade: { ...curr.unidade, [field]: value },
    }));
  };

  const updateMotorista = (field: keyof MotoristaData, value: string) => {
    setData((curr) => ({
      ...curr,
      motorista: { ...curr.motorista, [field]: value },
    }));
  };

  const updateFrota = (field: keyof FrotaCaminhaoData, value: string | number) => {
    setData((curr) => ({
      ...curr,
      frota: { ...curr.frota, [field]: value },
    }));
  };

  const updateParametros = <K extends keyof ParametrosOperacionaisData>(
    field: K,
    value: ParametrosOperacionaisData[K]
  ) => {
    setData((curr) => ({
      ...curr,
      parametros: { ...curr.parametros, [field]: value },
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    // 1. Validação da Equipe da Unidade Frigorífica
    const { equipe, unidade, motorista, frota, parametros } = data;

    if (!equipe.analistaNome.trim() || !equipe.analistaCpf.trim()) {
      setFeedback('Informe o Nome e o CPF do Analista da Unidade Frigorífica.');
      return;
    }
    if (equipe.analistaCpf.replace(/\D/g, '').length !== 11) {
      setFeedback('O CPF do Analista deve conter 11 dígitos.');
      return;
    }

    if (!equipe.manobristaNome.trim() || !equipe.manobristaCpf.trim()) {
      setFeedback('Informe o Nome e o CPF do Manobrista da Unidade Frigorífica.');
      return;
    }
    if (equipe.manobristaCpf.replace(/\D/g, '').length !== 11) {
      setFeedback('O CPF do Manobrista deve conter 11 dígitos.');
      return;
    }

    if (!equipe.curraleiroNome.trim() || !equipe.curraleiroCpf.trim()) {
      setFeedback('Informe o Nome e o CPF do Curraleiro da Recepção.');
      return;
    }
    if (equipe.curraleiroCpf.replace(/\D/g, '').length !== 11) {
      setFeedback('O CPF do Curraleiro deve conter 11 dígitos.');
      return;
    }

    // 2. Validação da Unidade Frigorífica
    if (!unidade.nome.trim() || !unidade.cnpj.trim() || !unidade.municipio.trim()) {
      setFeedback('Preencha os dados obrigatórios da Unidade Frigorífica (Nome, CNPJ e Município).');
      return;
    }
    if (unidade.cnpj.replace(/\D/g, '').length !== 14) {
      setFeedback('O CNPJ da Unidade Frigorífica deve conter 14 dígitos.');
      return;
    }
    if (Number(unidade.qtdCurrais) <= 0) {
      setFeedback('A quantidade de currais de recepção deve ser no mínimo 1.');
      return;
    }

    // 3. Validação do Motorista Condutor
    if (!motorista.nome.trim() || !motorista.cpf.trim() || !motorista.cnhNumero.trim()) {
      setFeedback('Preencha os dados obrigatórios do Motorista (Nome, CPF e Número da CNH).');
      return;
    }
    if (motorista.cpf.replace(/\D/g, '').length !== 11) {
      setFeedback('O CPF do Motorista deve conter 11 dígitos.');
      return;
    }

    // 4. Validação da Frota (Cavalo e Carreta)
    if (!frota.cavaloPlaca.trim() || frota.cavaloPlaca.trim().length < 7) {
      setFeedback('Informe a placa completa do Cavalo Mecânico (7 caracteres).');
      return;
    }
    if (!frota.carretaPlaca.trim() || frota.carretaPlaca.trim().length < 7) {
      setFeedback('Informe a placa completa da Carreta Boiadeira (7 caracteres).');
      return;
    }
    if (Number(frota.carretaCapacidadeCabecas) <= 0) {
      setFeedback('A capacidade de carga da carreta boiadeira deve ser de pelo menos 1 cabeça.');
      return;
    }

    // 5. Validação dos Parâmetros Operacionais
    if (!parametros.tempoMaxViagemHoras || parametros.tempoMaxViagemHoras <= 0) {
      setFeedback('O tempo máximo de viagem contínua deve ser de pelo menos 1 hora.');
      return;
    }

    setIsSaving(true);

    try {
      localStorage.setItem(STEP2_STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem('@efficientia:onboarding:current_step', '3');
      window.setTimeout(() => navigate('/onboarding/etapa-3'), 300);
    } catch {
      setFeedback('Não foi possível salvar esta etapa. Tente novamente.');
      setIsSaving(false);
    }
  };

  const displayName = empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Administrador';

  return (
    <div className="onb-shell">
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-brand">
            <LogoCompletaIcon height={42} className="vg-brand-logo" />
          </div>
          <div className="vg-topbar-divider" aria-hidden="true" />
          <div className="vg-page-heading">
            <h1>Onboarding Inicial</h1>
            <p className="vg-page-subtitle">Passo 2 • Unidade Frigorífica, Equipe e Frota</p>
          </div>
        </div>
        <div className="vg-topbar-right">
          <div className="vg-avatar-wrapper" title="Perfil corporativo">
            <GenericUserAvatar size={38} name={displayName} />
          </div>
        </div>
      </header>

      <div className="onb-main-container">
        <main className="onb-content-area" aria-labelledby="step2-title">
          <div className="onb-center-wrapper">
            <div className="onb-header-group">
              <div className="onb-step-badge">
                <span className="onb-step-tag">ETAPA 2 DE 3</span>
                <span className="onb-step-status">Unidade, Equipe e Frota</span>
              </div>
              <div className="onb-stepper-bars" aria-label="Progresso do onboarding">
                <div
                  className="onb-step-bar active"
                  title="Etapa 1: Pecuarista e Transportadora"
                  onClick={() => navigate('/onboarding')}
                />
                <div className="onb-step-bar active" title="Etapa 2: Unidade, Equipe e Frota" />
                <div className="onb-step-bar" title="Etapa 3: Administrador da conta" />
              </div>
              <h2 className="onb-title" id="step2-title">Unidade de Destino, Equipe e Frota</h2>
              <p className="onb-subtitle">
                Cadastre a equipe técnica e a unidade frigorífica de destino, o condutor responsável, o conjunto de
                transporte e as diretrizes regulatórias da frota.
              </p>
            </div>

            {feedback && (
              <div className="onb-alert onb-alert-error" role="alert">
                <AlertTriangleIcon size={16} />
                <span>{feedback}</span>
              </div>
            )}

            <form className="onb-grid-step2" onSubmit={handleSubmit} noValidate>
              {/* ========================================================================= */}
              {/* 1. PARTE DA UNIDADE FRIGORÍFICA: PRIMEIRO ANALISTA, MANOBRISTA E CURRALEIRO */}
              {/* ========================================================================= */}
              <article className="onb-form-card onb-card-full-width">
                <div className="onb-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <KpiMortalidadeIcon size={22} />
                    <h3 className="onb-card-title">Equipe da Unidade Frigorífica</h3>
                  </div>
                  <span className="onb-tag-destino">Equipe Técnica no Destino</span>
                </div>

                <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#64748b' }}>
                  Profissionais da unidade frigorífica responsáveis pela auditoria veterinária, manobras de descarga e
                  conferência dos bovinos nos currais.
                </p>

                <div className="onb-form-layout">
                  {/* SUBSEÇÃO: ANALISTA */}
                  <div className="onb-security-block" style={{ marginTop: 0 }}>
                    <div className="onb-security-title">
                      <ShieldCheckIcon size={16} />
                      <span>1. Analista de Controle e Auditoria</span>
                    </div>
                    <div className="onb-form-row">
                      <div className="onb-form-field">
                        <label htmlFor="ana-nome" className="onb-label">
                          Nome completo do analista <span className="onb-req">*</span>
                        </label>
                        <input
                          id="ana-nome"
                          type="text"
                          required
                          className="onb-input"
                          placeholder="Ex: Dra. Mariana Ferreira"
                          value={data.equipe.analistaNome}
                          onChange={(e) => updateEquipe('analistaNome', e.target.value)}
                        />
                      </div>
                      <div className="onb-form-field">
                        <label htmlFor="ana-cpf" className="onb-label">
                          CPF do analista <span className="onb-req">*</span>
                        </label>
                        <input
                          id="ana-cpf"
                          type="text"
                          required
                          className="onb-input"
                          placeholder="000.000.000-00"
                          value={data.equipe.analistaCpf}
                          onChange={(e) => updateEquipe('analistaCpf', formatCpf(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="onb-form-row">
                      <div className="onb-form-field">
                        <label htmlFor="ana-registro" className="onb-label">Registro Técnico / CRMV</label>
                        <input
                          id="ana-registro"
                          type="text"
                          className="onb-input"
                          placeholder="Ex: CRMV-SP 12345"
                          value={data.equipe.analistaRegistro}
                          onChange={(e) => updateEquipe('analistaRegistro', e.target.value)}
                        />
                      </div>
                      <div className="onb-form-field">
                        <label htmlFor="ana-email" className="onb-label">E-mail corporativo do analista</label>
                        <input
                          id="ana-email"
                          type="email"
                          className="onb-input"
                          placeholder="auditoria@frigorifico.com.br"
                          value={data.equipe.analistaEmail}
                          onChange={(e) => updateEquipe('analistaEmail', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SUBSEÇÃO: MANOBRISTA */}
                  <div className="onb-security-block">
                    <div className="onb-security-title">
                      <RouteActiveIcon size={16} />
                      <span>2. Manobrista da Unidade</span>
                    </div>
                    <div className="onb-form-row">
                      <div className="onb-form-field">
                        <label htmlFor="man-nome" className="onb-label">
                          Nome completo do manobrista <span className="onb-req">*</span>
                        </label>
                        <input
                          id="man-nome"
                          type="text"
                          required
                          className="onb-input"
                          placeholder="Ex: Roberto Silveira"
                          value={data.equipe.manobristaNome}
                          onChange={(e) => updateEquipe('manobristaNome', e.target.value)}
                        />
                      </div>
                      <div className="onb-form-field">
                        <label htmlFor="man-cpf" className="onb-label">
                          CPF do manobrista <span className="onb-req">*</span>
                        </label>
                        <input
                          id="man-cpf"
                          type="text"
                          required
                          className="onb-input"
                          placeholder="000.000.000-00"
                          value={data.equipe.manobristaCpf}
                          onChange={(e) => updateEquipe('manobristaCpf', formatCpf(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="onb-form-field">
                      <label htmlFor="man-cnh" className="onb-label">Número da CNH do manobrista</label>
                      <input
                        id="man-cnh"
                        type="text"
                        className="onb-input"
                        placeholder="Ex: 01234567890"
                        value={data.equipe.manobristaCnh}
                        onChange={(e) => updateEquipe('manobristaCnh', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* SUBSEÇÃO: CURRALEIRO */}
                  <div className="onb-security-block">
                    <div className="onb-security-title">
                      <NavFazendasUnidadesIcon size={16} />
                      <span>3. Curraleiro da Recepção</span>
                    </div>
                    <div className="onb-form-row">
                      <div className="onb-form-field">
                        <label htmlFor="cur-nome" className="onb-label">
                          Nome completo do curraleiro <span className="onb-req">*</span>
                        </label>
                        <input
                          id="cur-nome"
                          type="text"
                          required
                          className="onb-input"
                          placeholder="Ex: José Benedito"
                          value={data.equipe.curraleiroNome}
                          onChange={(e) => updateEquipe('curraleiroNome', e.target.value)}
                        />
                      </div>
                      <div className="onb-form-field">
                        <label htmlFor="cur-cpf" className="onb-label">
                          CPF do curraleiro <span className="onb-req">*</span>
                        </label>
                        <input
                          id="cur-cpf"
                          type="text"
                          required
                          className="onb-input"
                          placeholder="000.000.000-00"
                          value={data.equipe.curraleiroCpf}
                          onChange={(e) => updateEquipe('curraleiroCpf', formatCpf(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="onb-form-field">
                      <label htmlFor="cur-curral" className="onb-label">Setor / Currais de atuação</label>
                      <input
                        id="cur-curral"
                        type="text"
                        className="onb-input"
                        placeholder="Ex: Currais de Recepção e Espera Setor A"
                        value={data.equipe.curraleiroCurral}
                        onChange={(e) => updateEquipe('curraleiroCurral', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </article>

              {/* DADOS DA UNIDADE FRIGORÍFICA */}
              <article className="onb-form-card onb-card-full-width">
                <div className="onb-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <NavFazendasUnidadesIcon size={20} />
                    <h3 className="onb-card-title">Dados da Unidade Frigorífica de Destino</h3>
                  </div>
                  <span className="onb-card-hint">* Campos obrigatórios</span>
                </div>

                <div className="onb-form-layout">
                  <div className="onb-form-field">
                    <label htmlFor="frig-nome" className="onb-label">
                      Nome da unidade frigorífica <span className="onb-req">*</span>
                    </label>
                    <input
                      id="frig-nome"
                      type="text"
                      required
                      className="onb-input"
                      placeholder="Ex: Friboi Lins - Unidade Industrial"
                      value={data.unidade.nome}
                      onChange={(e) => updateUnidade('nome', e.target.value)}
                    />
                  </div>

                  <div className="onb-form-row">
                    <div className="onb-form-field">
                      <label htmlFor="frig-cnpj" className="onb-label">
                        CNPJ da unidade <span className="onb-req">*</span>
                      </label>
                      <input
                        id="frig-cnpj"
                        type="text"
                        required
                        className="onb-input"
                        placeholder="00.000.000/0000-00"
                        value={data.unidade.cnpj}
                        onChange={(e) => updateUnidade('cnpj', formatCnpj(e.target.value))}
                      />
                    </div>
                    <div className="onb-form-field">
                      <label htmlFor="frig-currais" className="onb-label">
                        Quantidade de currais de recepção <span className="onb-req">*</span>
                      </label>
                      <input
                        id="frig-currais"
                        type="number"
                        min="1"
                        required
                        className="onb-input"
                        placeholder="10"
                        value={data.unidade.qtdCurrais}
                        onChange={(e) => updateUnidade('qtdCurrais', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="frig-municipio" className="onb-label">
                        Município da unidade <span className="onb-req">*</span>
                      </label>
                      <input
                        id="frig-municipio"
                        type="text"
                        required
                        className="onb-input"
                        placeholder="Ex: Lins"
                        value={data.unidade.municipio}
                        onChange={(e) => updateUnidade('municipio', e.target.value)}
                      />
                    </div>
                    <div className="onb-form-field onb-field-right">
                      <label htmlFor="frig-uf" className="onb-label">
                        UF da unidade <span className="onb-req">*</span>
                      </label>
                      <select
                        id="frig-uf"
                        className="onb-select"
                        value={data.unidade.uf}
                        onChange={(e) => updateUnidade('uf', e.target.value)}
                      >
                        {ESTADOS_BRASIL.map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </article>

              {/* ========================================================================= */}
              {/* 2. INFORMAÇÕES DO MOTORISTA CONDUTOR                                      */}
              {/* ========================================================================= */}
              <article className="onb-form-card">
                <div className="onb-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <NavMotoristasIcon size={20} />
                    <h3 className="onb-card-title">Motorista Condutor</h3>
                  </div>
                  <span className="onb-card-hint">* Condução e bem-estar</span>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748b' }}>
                  Motorista habilitado responsável pela condução do veículo e registro de ocorrências durante a rota.
                </p>

                <div className="onb-form-layout">
                  <div className="onb-form-field">
                    <label htmlFor="mot-nome" className="onb-label">
                      Nome completo do motorista <span className="onb-req">*</span>
                    </label>
                    <input
                      id="mot-nome"
                      type="text"
                      required
                      className="onb-input"
                      placeholder="Ex: Marcos Antônio Ferreira"
                      value={data.motorista.nome}
                      onChange={(e) => updateMotorista('nome', e.target.value)}
                    />
                  </div>

                  <div className="onb-form-field">
                    <label htmlFor="mot-cpf" className="onb-label">
                      CPF do motorista <span className="onb-req">*</span>
                    </label>
                    <input
                      id="mot-cpf"
                      type="text"
                      required
                      className="onb-input"
                      placeholder="000.000.000-00"
                      value={data.motorista.cpf}
                      onChange={(e) => updateMotorista('cpf', formatCpf(e.target.value))}
                    />
                  </div>

                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="mot-cnh" className="onb-label">
                        Número da CNH <span className="onb-req">*</span>
                      </label>
                      <input
                        id="mot-cnh"
                        type="text"
                        required
                        className="onb-input"
                        placeholder="Ex: 09876543210"
                        value={data.motorista.cnhNumero}
                        onChange={(e) => updateMotorista('cnhNumero', e.target.value)}
                      />
                    </div>
                    <div className="onb-form-field onb-field-right">
                      <label htmlFor="mot-cat" className="onb-label">
                        Categoria CNH <span className="onb-req">*</span>
                      </label>
                      <select
                        id="mot-cat"
                        className="onb-select"
                        value={data.motorista.categoriaCnh}
                        onChange={(e) => updateMotorista('categoriaCnh', e.target.value)}
                      >
                        <option value="E">Categoria E (Articulados)</option>
                        <option value="D">Categoria D</option>
                        <option value="C">Categoria C</option>
                      </select>
                    </div>
                  </div>

                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="mot-venc-cnh" className="onb-label">
                        Validade da CNH <span className="onb-req">*</span>
                      </label>
                      <input
                        id="mot-venc-cnh"
                        type="date"
                        required
                        className="onb-input"
                        value={data.motorista.dataVencimentoCnh}
                        onChange={(e) => updateMotorista('dataVencimentoCnh', e.target.value)}
                      />
                    </div>
                    <div className="onb-form-field onb-field-right">
                      <label htmlFor="mot-tel" className="onb-label">Telefone de contato</label>
                      <input
                        id="mot-tel"
                        type="tel"
                        className="onb-input"
                        placeholder="(67) 99777-4321"
                        value={data.motorista.telefone}
                        onChange={(e) => updateMotorista('telefone', formatTelefone(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </article>

              {/* ========================================================================= */}
              {/* 3. INFORMAÇÕES DA CARRETA E CAVALO DOS CAMINHÕES                          */}
              {/* ========================================================================= */}
              <article className="onb-form-card">
                <div className="onb-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <NavFrotaIcon size={20} />
                    <h3 className="onb-card-title">Caminhão da Frota (Cavalo e Carreta)</h3>
                  </div>
                  <span className="onb-card-hint">* Conjunto boiadeiro</span>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#64748b' }}>
                  Unidade de tração mecânica e implemento rodoviário para o transporte dos bovinos.
                </p>

                <div className="onb-form-layout">
                  {/* CAVALO MECÂNICO */}
                  <div style={{ paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f51ae', display: 'block', marginBottom: 10 }}>
                      Cavalo Mecânico (Unidade de Tração)
                    </span>
                    <div className="onb-form-row">
                      <div className="onb-form-field onb-field-left">
                        <label htmlFor="cav-placa" className="onb-label">
                          Placa do cavalo <span className="onb-req">*</span>
                        </label>
                        <input
                          id="cav-placa"
                          type="text"
                          required
                          className="onb-input"
                          placeholder="ABC1D23"
                          maxLength={7}
                          value={data.frota.cavaloPlaca}
                          onChange={(e) => updateFrota('cavaloPlaca', formatPlaca(e.target.value))}
                        />
                      </div>
                      <div className="onb-form-field onb-field-right">
                        <label htmlFor="cav-km" className="onb-label">KM acumulado</label>
                        <input
                          id="cav-km"
                          type="number"
                          className="onb-input"
                          placeholder="120000"
                          value={data.frota.cavaloKmAcumulado}
                          onChange={(e) => updateFrota('cavaloKmAcumulado', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="onb-form-field" style={{ marginTop: 8 }}>
                      <label htmlFor="cav-insp" className="onb-label">Vencimento da inspeção veicular</label>
                      <input
                        id="cav-insp"
                        type="date"
                        className="onb-input"
                        value={data.frota.cavaloVencimentoInspecao}
                        onChange={(e) => updateFrota('cavaloVencimentoInspecao', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* CARRETA BOIADEIRA */}
                  <div style={{ paddingTop: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', display: 'block', marginBottom: 10 }}>
                      Carreta Boiadeira (Implemento de Carga)
                    </span>
                    <div className="onb-form-row">
                      <div className="onb-form-field onb-field-left">
                        <label htmlFor="car-placa" className="onb-label">
                          Placa da carreta <span className="onb-req">*</span>
                        </label>
                        <input
                          id="car-placa"
                          type="text"
                          required
                          className="onb-input"
                          placeholder="XYZ9A87"
                          maxLength={7}
                          value={data.frota.carretaPlaca}
                          onChange={(e) => updateFrota('carretaPlaca', formatPlaca(e.target.value))}
                        />
                      </div>
                      <div className="onb-form-field onb-field-right">
                        <label htmlFor="car-cap" className="onb-label">
                          Capacidade (cabeças) <span className="onb-req">*</span>
                        </label>
                        <input
                          id="car-cap"
                          type="number"
                          min="1"
                          required
                          className="onb-input"
                          placeholder="30"
                          value={data.frota.carretaCapacidadeCabecas}
                          onChange={(e) => updateFrota('carretaCapacidadeCabecas', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="onb-form-field" style={{ marginTop: 8 }}>
                      <label htmlFor="car-insp" className="onb-label">Vencimento da inspeção da carreta</label>
                      <input
                        id="car-insp"
                        type="date"
                        className="onb-input"
                        value={data.frota.carretaVencimentoInspecao}
                        onChange={(e) => updateFrota('carretaVencimentoInspecao', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </article>

              {/* ========================================================================= */}
              {/* 4. PARÂMETROS OPERACIONAIS DA FROTA                                       */}
              {/* ========================================================================= */}
              <article className="onb-form-card onb-card-full-width">
                <div className="onb-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <NavConfiguracoesIcon size={20} />
                    <h3 className="onb-card-title">Parâmetros Operacionais da Frota</h3>
                  </div>
                  <span className="onb-card-hint">* Diretrizes de trânsito e bem-estar</span>
                </div>

                <div className="onb-form-layout">
                  <div className="onb-params-grid">
                    <div className="onb-form-field">
                      <label htmlFor="p-tempo" className="onb-label">Tempo Máx. Viagem (horas) *</label>
                      <input
                        id="p-tempo"
                        type="number"
                        min="1"
                        max="48"
                        required
                        className="onb-input"
                        value={data.parametros.tempoMaxViagemHoras}
                        onChange={(e) => updateParametros('tempoMaxViagemHoras', Number(e.target.value))}
                      />
                      <span className="onb-field-hint">Trânsito contínuo de gado vivo sem descanso obrigatório</span>
                    </div>

                    <div className="onb-form-field">
                      <label htmlFor="p-morta" className="onb-label">Meta Máx. Mortalidade (%) *</label>
                      <input
                        id="p-morta"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        className="onb-input"
                        value={data.parametros.metaMortalidade}
                        onChange={(e) => updateParametros('metaMortalidade', Number(e.target.value))}
                      />
                      <span className="onb-field-hint">Tolerância aceitável sob boas práticas pecuárias</span>
                    </div>

                    <div className="onb-form-field">
                      <label htmlFor="p-bloq" className="onb-label">Bloqueio por Mortes (cabeças) *</label>
                      <input
                        id="p-bloq"
                        type="number"
                        min="1"
                        max="20"
                        required
                        className="onb-input"
                        value={data.parametros.mortalidadeBloqueioCabecas}
                        onChange={(e) => updateParametros('mortalidadeBloqueioCabecas', Number(e.target.value))}
                      />
                      <span className="onb-field-hint">Mortes que acionam retenção para auditoria</span>
                    </div>

                    <div className="onb-form-field">
                      <label htmlFor="p-sla" className="onb-label">Prazo de Análise / SLA (horas) *</label>
                      <input
                        id="p-sla"
                        type="number"
                        min="1"
                        max="168"
                        required
                        className="onb-input"
                        value={data.parametros.prazoAnaliseHoras}
                        onChange={(e) => updateParametros('prazoAnaliseHoras', Number(e.target.value))}
                      />
                      <span className="onb-field-hint">SLA para homologação técnica pós-desembarque</span>
                    </div>

                    <div className="onb-form-field">
                      <label htmlFor="p-parada" className="onb-label">Tolerância Parada Imprevista (min) *</label>
                      <input
                        id="p-parada"
                        type="number"
                        min="5"
                        max="240"
                        required
                        className="onb-input"
                        value={data.parametros.alertaTempoParadaImprevista}
                        onChange={(e) => updateParametros('alertaTempoParadaImprevista', Number(e.target.value))}
                      />
                      <span className="onb-field-hint">Tempo sem movimento até disparo de alerta à torre</span>
                    </div>
                  </div>

                  <div className="onb-security-block">
                    <div className="onb-security-title">
                      <ShieldCheckIcon size={16} />
                      <span>Conformidade Operacional</span>
                    </div>
                    <div className="onb-form-row">
                      <label className="onb-switch-label">
                        <input
                          type="checkbox"
                          className="onb-switch-input"
                          checked={data.parametros.alertaSireneRe}
                          onChange={(e) => updateParametros('alertaSireneRe', e.target.checked)}
                        />
                        <span>
                          <strong>Sirene de Ré:</strong> Exigir alerta sonoro ativo nas manobras de atracação.
                        </span>
                      </label>

                      <label className="onb-switch-label">
                        <input
                          type="checkbox"
                          className="onb-switch-input"
                          checked={data.parametros.alertaCnhVencida}
                          onChange={(e) => updateParametros('alertaCnhVencida', e.target.checked)}
                        />
                        <span>
                          <strong>Bloqueio de CNH Vencida:</strong> Impedir escalonamento de condutor fora da validade.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </article>

              {/* BARRAS DE NAVEGAÇÃO E AÇÕES */}
              <div className="onb-step2-actions-bar">
                <button
                  type="button"
                  className="onb-btn-back"
                  onClick={() => navigate('/onboarding')}
                >
                  <ArrowLeftIcon size={14} className="onb-btn-icon-prefix" />
                  <span>Voltar para Pecuarista e Empresa</span>
                </button>
                <button
                  type="submit"
                  className="onb-btn-forward"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    'Salvando...'
                  ) : (
                    <>
                      <span>Salvar e continuar para o Administrador</span>
                      <ArrowRightIcon size={14} className="onb-btn-icon-suffix" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default OnboardingStep2;
