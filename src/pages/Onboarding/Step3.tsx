import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  BullBrandLogo,
} from '../Dashboard/DashboardIcons';
import './Onboarding.css';

const STEP3_STORAGE_KEY = '@efficientia:onboarding:step3';

type Step3Data = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cargo: string;
  senha: string;
  confirmarSenha: string;
};

const emptyStep3: Step3Data = {
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  cargo: '',
  senha: '',
  confirmarSenha: '',
};

function loadStep3Data(): Step3Data {
  try {
    const stored = localStorage.getItem(STEP3_STORAGE_KEY);
    if (!stored) return emptyStep3;
    return { ...emptyStep3, ...JSON.parse(stored) } as Step3Data;
  } catch {
    return emptyStep3;
  }
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function OnboardingStep3() {
  const navigate = useNavigate();
  const { empresa, cadastrarPrimeiroAdmin } = useAuth();
  const [data, setData] = useState<Step3Data>(loadStep3Data);
  const [operationRegion] = useState(() => {
    try {
      const stored = localStorage.getItem('@efficientia:onboarding:step2');
      const region = stored ? (JSON.parse(stored) as { regiaoAtuacao?: string }).regiaoAtuacao : '';
      return region ? region.replaceAll('_', ' ') : 'Não informado';
    } catch {
      return 'Não informado';
    }
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(STEP3_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Mantém os dados em memória se o armazenamento estiver indisponível.
    }
  }, [data]);

  const update = (field: keyof Step3Data, value: string) => {
    setData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data.nome.trim() || !data.cpf.trim() || !data.email.trim() || !data.telefone.trim()) {
      setFeedback('Preencha nome, CPF, e-mail e telefone do administrador.');
      return;
    }
    if (!data.senha || data.senha.length < 6) {
      setFeedback('Informe uma senha com pelo menos 6 caracteres.');
      return;
    }
    if (data.senha !== data.confirmarSenha) {
      setFeedback('As senhas informadas não coincidem.');
      return;
    }

    let pendingEmpresa: { codigoEmpresa?: string; cnpj?: string } = {};
    try {
      const raw = localStorage.getItem('@efficientia:onboarding:pending_empresa');
      if (raw) pendingEmpresa = JSON.parse(raw) as typeof pendingEmpresa;
    } catch {
      // Usa os dados da sessão quando o storage não estiver disponível.
    }

    const codigoEmpresa = empresa?.codigoEmpresa || empresa?.codigo || pendingEmpresa.codigoEmpresa;
    if (!codigoEmpresa) {
      setFeedback('Não encontramos o código da empresa. Volte à Etapa 1 e salve os dados novamente.');
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await cadastrarPrimeiroAdmin({
        codigoEmpresa,
        cnpj: empresa?.cnpj || pendingEmpresa.cnpj || null,
        nome: data.nome.trim(),
        email: data.email.trim().toLowerCase(),
        senha: data.senha,
        cpf: data.cpf.replace(/\D/g, '') || null,
        telefone: data.telefone.replace(/\D/g, '') || null,
        cargo: data.cargo.trim() || null,
      });
      localStorage.setItem(STEP3_STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem('@efficientia:onboarding:completed', 'true');
      localStorage.removeItem('@efficientia:onboarding:pending_empresa');
      window.setTimeout(() => navigate('/visao-geral', { replace: true }), 400);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível criar o primeiro administrador. Tente novamente.');
      setIsSaving(false);
    }
  };
  const displayName = empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Administrador';

  return (
    <div className="onb-shell">
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-brand"><BullBrandLogo /><div className="vg-brand-text"><span className="vg-brand-title">Efficien<span className="vg-brand-highlight">tia</span></span><span className="vg-brand-Check"><span className="vg-brand-green">Eficiência</span> que viaja junto com você</span></div></div>
          <div className="vg-topbar-divider" aria-hidden="true" />
          <div className="vg-page-heading"><h1>Onboarding Inicial</h1><p className="vg-page-subtitle">Passo 3 • Administrador da conta e revisão</p></div>
        </div>
        <div className="vg-topbar-right">
          <div className="vg-avatar-wrapper" title="Perfil corporativo"><GenericUserAvatar size={38} name={displayName} /></div>
        </div>
      </header>

      <div className="onb-main-container">

        <main className="onb-content-area" aria-labelledby="step3-title">
          <div className="onb-center-wrapper">
            <div className="onb-header-group">
              <div className="onb-step-badge"><span className="onb-step-tag">ETAPA 3 DE 3</span><span className="onb-step-status">Finalização</span></div>
              <div className="onb-stepper-bars" aria-label="Progresso do onboarding"><div className="onb-step-bar active" /><div className="onb-step-bar active" /><div className="onb-step-bar active" /></div>
              <h2 className="onb-title" id="step3-title">Finalize sua configuração</h2>
              <p className="onb-subtitle">Cadastre o administrador da conta e revise as informações antes de concluir.</p>
            </div>

            {feedback && <div className="onb-alert onb-alert-error" role="alert">{feedback}</div>}

            <form className="onb-grid-step2" onSubmit={handleSubmit} noValidate>
              <article className="onb-form-card">
                <div className="onb-card-header"><h3 className="onb-card-title">Administrador da conta</h3><span className="onb-card-hint">* Campos obrigatórios</span></div>
                <div className="onb-form-layout">
                  <div className="onb-form-field"><label htmlFor="onb3-nome" className="onb-label">Nome completo <span className="onb-req">*</span></label><input id="onb3-nome" type="text" className="onb-input" value={data.nome} onChange={(event) => update('nome', event.target.value)} autoComplete="name" required /></div>
                  <div className="onb-form-row"><div className="onb-form-field onb-field-left"><label htmlFor="onb3-cpf" className="onb-label">CPF <span className="onb-req">*</span></label><input id="onb3-cpf" type="text" className="onb-input" value={data.cpf} onChange={(event) => update('cpf', formatCpf(event.target.value))} required /></div><div className="onb-form-field onb-field-right"><label htmlFor="onb3-cargo" className="onb-label">Cargo</label><input id="onb3-cargo" type="text" className="onb-input" value={data.cargo} onChange={(event) => update('cargo', event.target.value)} /></div></div>
                  <div className="onb-form-row"><div className="onb-form-field onb-field-left"><label htmlFor="onb3-email" className="onb-label">E-mail de acesso <span className="onb-req">*</span></label><input id="onb3-email" type="email" className="onb-input" value={data.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" required /></div><div className="onb-form-field onb-field-right"><label htmlFor="onb3-telefone" className="onb-label">Telefone <span className="onb-req">*</span></label><input id="onb3-telefone" type="tel" className="onb-input" value={data.telefone} onChange={(event) => update('telefone', formatPhone(event.target.value))} autoComplete="tel" required /></div></div>
                  <div className="onb-form-row"><div className="onb-form-field onb-field-left"><label htmlFor="onb3-senha" className="onb-label">Senha de acesso</label><input id="onb3-senha" type="password" className="onb-input" value={data.senha} onChange={(event) => update('senha', event.target.value)} autoComplete="new-password" /></div><div className="onb-form-field onb-field-right"><label htmlFor="onb3-confirmar" className="onb-label">Confirmar senha</label><input id="onb3-confirmar" type="password" className="onb-input" value={data.confirmarSenha} onChange={(event) => update('confirmarSenha', event.target.value)} autoComplete="new-password" /></div></div>
                </div>
              </article>

              <article className="onb-form-card onb-review-card">
                <div className="onb-card-header"><h3 className="onb-card-title">Tudo pronto</h3><span className="onb-card-hint">Revisão final</span></div>
                <div className="onb-review-content">
                  <div className="onb-review-icon" aria-hidden="true">✓</div>
                  <h4>Revise seus dados</h4>
                  <p>Ao concluir, sua empresa estará pronta para acessar o painel e iniciar os diários de rota.</p>
                  <dl className="onb-review-list"><div><dt>Empresa</dt><dd>{empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Dados da empresa'}</dd></div><div><dt>Região</dt><dd>{operationRegion}</dd></div><div><dt>Etapas</dt><dd>3 de 3 concluídas</dd></div></dl>
                  <div className="onb-mobile-banner"><div className="onb-mobile-banner-text"><span className="onb-mobile-banner-title">Acesso seguro</span><span className="onb-mobile-banner-desc">Use seu e-mail e senha para entrar na plataforma.</span></div></div>
                </div>
              </article>

              <div className="onb-step2-actions-bar"><button type="button" className="onb-btn-back" onClick={() => navigate('/onboarding/etapa-2')}>← Voltar</button><button type="submit" className="onb-btn-forward" disabled={isSaving}>{isSaving ? 'Concluindo...' : <>Concluir configuração <span aria-hidden="true">→</span></>}</button></div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default OnboardingStep3;
