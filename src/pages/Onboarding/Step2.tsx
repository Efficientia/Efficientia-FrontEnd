import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  BullBrandLogo,
} from '../Dashboard/DashboardIcons';
import './Onboarding.css';

const STEP2_STORAGE_KEY = '@efficientia:onboarding:step2';

type Step2Data = {
  tipoOperacao: string;
  quantidadeCompartimentos: string;
  volumeMedio: string;
  regiaoAtuacao: string;
  nomeUnidade: string;
  tipoUnidade: string;
  municipio: string;
  responsavel: string;
  codigoInterno: string;
};

const emptyStep2: Step2Data = {
  tipoOperacao: '',
  quantidadeCompartimentos: '',
  volumeMedio: '',
  regiaoAtuacao: '',
  nomeUnidade: '',
  tipoUnidade: '',
  municipio: '',
  responsavel: '',
  codigoInterno: '',
};

function loadStep2Data(): Step2Data {
  try {
    const stored = localStorage.getItem(STEP2_STORAGE_KEY);
    if (!stored) return emptyStep2;
    return { ...emptyStep2, ...JSON.parse(stored) } as Step2Data;
  } catch {
    return emptyStep2;
  }
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
      // A persistência principal continua no estado da tela caso o storage esteja indisponível.
    }
  }, [data]);

  const update = (field: keyof Step2Data, value: string) => {
    setData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!data.tipoOperacao || !data.nomeUnidade || !data.tipoUnidade || !data.municipio) {
      setFeedback('Preencha o tipo de operação e os dados obrigatórios da primeira unidade.');
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      localStorage.setItem(STEP2_STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem('@efficientia:onboarding:current_step', '3');
      window.setTimeout(() => navigate('/onboarding/etapa-3'), 350);
    } catch {
      setFeedback('Não foi possível persistir esta etapa. Tente novamente.');
      setIsSaving(false);
    }
  };

  const displayName = empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Administrador';

  return (
    <div className="onb-shell">
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-brand">
            <BullBrandLogo />
            <div className="vg-brand-text">
              <span className="vg-brand-title">Efficien<span className="vg-brand-highlight">tia</span></span>
              <span className="vg-brand-Check"><span className="vg-brand-green">Eficiência</span> que viaja junto com você</span>
            </div>
          </div>
          <div className="vg-topbar-divider" aria-hidden="true" />
          <div className="vg-page-heading">
            <h1>Onboarding Inicial</h1>
            <p className="vg-page-subtitle">Passo 2 • Operação e primeira unidade</p>
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
                <span className="onb-step-status">Operação e unidades</span>
              </div>
              <div className="onb-stepper-bars" aria-label="Progresso do onboarding">
                <div className="onb-step-bar active" title="Etapa 1: Dados da empresa" onClick={() => navigate('/onboarding')} />
                <div className="onb-step-bar active" title="Etapa 2: Operação e unidades" />
                <div className="onb-step-bar" title="Etapa 3: Administrador da conta" />
              </div>
              <h2 className="onb-title" id="step2-title">Conte sobre sua operação</h2>
              <p className="onb-subtitle">Personalize o perfil operacional e cadastre a primeira unidade da sua empresa.</p>
            </div>

            {feedback && <div className="onb-alert onb-alert-error" role="alert">{feedback}</div>}

            <form className="onb-grid-step2" onSubmit={handleSubmit} noValidate>
              <article className="onb-form-card">
                <div className="onb-card-header">
                  <h3 className="onb-card-title">Perfil operacional</h3>
                  <span className="onb-card-hint">* Campos obrigatórios</span>
                </div>
                <div className="onb-form-layout">
                  <div className="onb-form-field">
                    <label htmlFor="onb2-tipo-operacao" className="onb-label">Tipo de operação <span className="onb-req">*</span></label>
                    <select id="onb2-tipo-operacao" className="onb-select" value={data.tipoOperacao} onChange={(event) => update('tipoOperacao', event.target.value)} required>
                      <option value="">Selecione o tipo de operação</option>
                      <option value="TRANSPORTE_BOVINOS">Transporte de bovinos</option>
                      <option value="TRANSPORTE_CARGAS">Transporte de cargas</option>
                      <option value="TRANSPORTE_MISTO">Transporte misto</option>
                    </select>
                  </div>
                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="onb2-quantidade" className="onb-label">Quantidade de compartimentos</label>
                      <input id="onb2-quantidade" type="number" min="0" className="onb-input" value={data.quantidadeCompartimentos} onChange={(event) => update('quantidadeCompartimentos', event.target.value)} />
                    </div>
                    <div className="onb-form-field onb-field-right">
                      <label htmlFor="onb2-volume" className="onb-label">Volume médio mensal</label>
                      <input id="onb2-volume" type="text" className="onb-input" value={data.volumeMedio} onChange={(event) => update('volumeMedio', event.target.value)} />
                    </div>
                  </div>
                  <div className="onb-form-field">
                    <label htmlFor="onb2-regiao" className="onb-label">Região de atuação</label>
                    <select id="onb2-regiao" className="onb-select" value={data.regiaoAtuacao} onChange={(event) => update('regiaoAtuacao', event.target.value)}>
                      <option value="">Selecione a região</option>
                      <option value="CENTRO_OESTE">Centro-Oeste</option>
                      <option value="NORTE">Norte</option>
                      <option value="NORDESTE">Nordeste</option>
                      <option value="SUDESTE">Sudeste</option>
                      <option value="SUL">Sul</option>
                      <option value="NACIONAL">Nacional</option>
                    </select>
                  </div>
                  <div className="onb-mobile-banner">
                    <svg className="onb-mobile-banner-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    <div className="onb-mobile-banner-text"><span className="onb-mobile-banner-title">Dados conectados ao mobile</span><span className="onb-mobile-banner-desc">Essas informações ajudam a organizar a origem e o destino dos seus roteiros.</span></div>
                  </div>
                </div>
              </article>

              <article className="onb-form-card">
                <div className="onb-card-header">
                  <h3 className="onb-card-title">Primeira unidade</h3>
                  <span className="onb-card-hint">* Campos obrigatórios</span>
                </div>
                <div className="onb-form-layout">
                  <div className="onb-form-field">
                    <label htmlFor="onb2-nome-unidade" className="onb-label">Nome da unidade <span className="onb-req">*</span></label>
                    <input id="onb2-nome-unidade" type="text" className="onb-input" value={data.nomeUnidade} onChange={(event) => update('nomeUnidade', event.target.value)} required />
                  </div>
                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="onb2-tipo-unidade" className="onb-label">Tipo <span className="onb-req">*</span></label>
                      <select id="onb2-tipo-unidade" className="onb-select" value={data.tipoUnidade} onChange={(event) => update('tipoUnidade', event.target.value)} required>
                        <option value="">Selecione</option>
                        <option value="FAZENDA">Fazenda</option>
                        <option value="FRIGORIFICO">Frigorífico</option>
                        <option value="BASE_OPERACIONAL">Base operacional</option>
                      </select>
                    </div>
                    <div className="onb-form-field onb-field-right">
                      <label htmlFor="onb2-municipio" className="onb-label">Município <span className="onb-req">*</span></label>
                      <input id="onb2-municipio" type="text" className="onb-input" value={data.municipio} onChange={(event) => update('municipio', event.target.value)} required />
                    </div>
                  </div>
                  <div className="onb-form-field">
                    <label htmlFor="onb2-responsavel" className="onb-label">Responsável</label>
                    <input id="onb2-responsavel" type="text" className="onb-input" value={data.responsavel} onChange={(event) => update('responsavel', event.target.value)} />
                  </div>
                  <div className="onb-form-field">
                    <label htmlFor="onb2-codigo" className="onb-label">Código interno</label>
                    <input id="onb2-codigo" type="text" className="onb-input" value={data.codigoInterno} onChange={(event) => update('codigoInterno', event.target.value)} />
                  </div>
                  <div className="onb-add-unit-box"><button type="button" className="onb-btn-add-unit" onClick={() => setFeedback('A primeira unidade já está pronta para ser cadastrada. Você poderá adicionar outras no painel.')}>+ Adicionar unidade</button></div>
                </div>
              </article>

              <div className="onb-step2-actions-bar">
                <button type="button" className="onb-btn-back" onClick={() => navigate('/onboarding')}>← Voltar</button>
                <button type="submit" className="onb-btn-forward" disabled={isSaving}>{isSaving ? 'Salvando...' : <>Salvar e continuar <span aria-hidden="true">→</span></>}</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default OnboardingStep2;
