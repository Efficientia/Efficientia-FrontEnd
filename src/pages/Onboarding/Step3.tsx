import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  LogoCompletaIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  RouteActiveIcon,
  ShieldCheckIcon,
} from '../../components/icons';
import { checkPasswordSecurity, generateSecurePassword } from '../../utils/passwordSecurity';
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
  const [reviewSummary] = useState(() => {
    let pecuaristaInfo = 'Pecuarista cadastrado';
    let fazendaInfo = 'Fazenda de origem';
    try {
      const pecRaw = localStorage.getItem('@efficientia:onboarding:pecuarista');
      if (pecRaw) {
        const pec = JSON.parse(pecRaw);
        if (pec.nome) pecuaristaInfo = `${pec.nome}`;
        if (pec.nomeFazenda) fazendaInfo = `${pec.nomeFazenda} (${pec.municipioFazenda || ''}/${pec.ufFazenda || 'UF'})`;
      }
    } catch {
      // fallback
    }

    let frigInfo = 'Unidade frigorífica';
    let equipeInfo = 'Analista, Manobrista e Curraleiro';
    let motoristaInfo = 'Motorista condutor';
    let frotaInfo = 'Cavalo e Carreta boiadeira';
    let tempoMax = '12h contínuas';

    try {
      const step2Raw = localStorage.getItem('@efficientia:onboarding:step2');
      if (step2Raw) {
        const s2 = JSON.parse(step2Raw);
        if (s2.unidade?.nome) {
          frigInfo = `${s2.unidade.nome} (${s2.unidade.municipio || ''}/${s2.unidade.uf || 'UF'})`;
        }
        if (s2.equipe?.analistaNome) {
          equipeInfo = `Analista: ${s2.equipe.analistaNome}`;
        }
        if (s2.motorista?.nome) {
          motoristaInfo = `${s2.motorista.nome} (Cat. ${s2.motorista.categoriaCnh || 'E'})`;
        }
        if (s2.frota?.cavaloPlaca && s2.frota?.carretaPlaca) {
          frotaInfo = `Cavalo: ${s2.frota.cavaloPlaca} • Carreta: ${s2.frota.carretaPlaca}`;
        }
        if (s2.parametros?.tempoMaxViagemHoras) {
          tempoMax = `${s2.parametros.tempoMaxViagemHoras}h máx`;
        }
      }
    } catch {
      // fallback
    }

    return {
      pecuaristaInfo,
      fazendaInfo,
      frigInfo,
      equipeInfo,
      motoristaInfo,
      frotaInfo,
      tempoMax,
    };
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pwdGeneratedNotice, setPwdGeneratedNotice] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
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

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword();
    update('senha', generated);
    update('confirmarSenha', generated);
    setShowPwd(true);
    setPwdGeneratedNotice('Senha segura gerada e aplicada nos dois campos!');
    setFeedback(null);
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
    const pwdSecurity = checkPasswordSecurity(data.senha);
    if (pwdSecurity.isCompromised) {
      setFeedback('A senha informada é comum e vulnerável a vazamentos. Clique em "Gerar senha segura" para definir uma credencial protegida.');
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
          <div className="vg-brand">
            <LogoCompletaIcon height={42} className="vg-brand-logo" />
          </div>
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
                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <div className="onb-label-row">
                        <label htmlFor="onb3-senha" className="onb-label">Senha de acesso <span className="onb-req">*</span></label>
                        <button
                          type="button"
                          className="onb-suggest-pwd-btn"
                          onClick={handleGeneratePassword}
                          title="Gera uma credencial de alta entropia"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ShieldCheckIcon size={12} />
                          <span>Gerar senha segura</span>
                        </button>
                      </div>
                      <div className="onb-input-pwd-wrapper">
                        <input
                          id="onb3-senha"
                          type={showPwd ? 'text' : 'password'}
                          className="onb-input"
                          value={data.senha}
                          onChange={(event) => update('senha', event.target.value)}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          className="onb-pwd-toggle-btn"
                          onClick={() => setShowPwd(!showPwd)}
                          aria-label={showPwd ? 'Ocultar senha' : 'Exibir senha'}
                        >
                          {showPwd ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="onb-form-field onb-field-right">
                      <div className="onb-label-row">
                        <label htmlFor="onb3-confirmar" className="onb-label">Confirmar senha <span className="onb-req">*</span></label>
                      </div>
                      <div className="onb-input-pwd-wrapper">
                        <input
                          id="onb3-confirmar"
                          type={showPwd ? 'text' : 'password'}
                          className="onb-input"
                          value={data.confirmarSenha}
                          onChange={(event) => update('confirmarSenha', event.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  {pwdGeneratedNotice && (
                    <div className="onb-pwd-notice" role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CheckIcon size={14} />
                      <span>{pwdGeneratedNotice}</span>
                    </div>
                  )}
                </div>
              </article>

              <article className="onb-form-card onb-review-card">
                <div className="onb-card-header"><h3 className="onb-card-title">Tudo pronto</h3><span className="onb-card-hint">Revisão final</span></div>
                <div className="onb-review-content">
                  <div className="onb-review-icon" aria-hidden="true">
                    <CheckIcon size={24} />
                  </div>
                  <h4>Revise seus dados</h4>
                  <p>Ao concluir, sua empresa estará pronta para acessar o painel e iniciar os diários de rota.</p>
                  <dl className="onb-review-list">
                    <div><dt>Empresa</dt><dd>{empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Dados da empresa'}</dd></div>
                    <div><dt>Pecuarista (Origem)</dt><dd>{reviewSummary.pecuaristaInfo}</dd></div>
                    <div><dt>Fazenda (Origem)</dt><dd>{reviewSummary.fazendaInfo}</dd></div>
                    <div><dt>Frigorífico (Destino)</dt><dd>{reviewSummary.frigInfo}</dd></div>
                    <div><dt>Equipe Técnica</dt><dd>{reviewSummary.equipeInfo}</dd></div>
                    <div><dt>Motorista</dt><dd>{reviewSummary.motoristaInfo}</dd></div>
                    <div><dt>Frota</dt><dd>{reviewSummary.frotaInfo}</dd></div>
                    <div><dt>Trânsito Máximo</dt><dd>{reviewSummary.tempoMax}</dd></div>
                  </dl>
                  <div className="onb-mobile-banner">
                    <RouteActiveIcon size={22} className="onb-mobile-banner-icon" />
                    <div className="onb-mobile-banner-text">
                      <span className="onb-mobile-banner-title">Acesso seguro</span>
                      <span className="onb-mobile-banner-desc">Use seu e-mail e senha para entrar na plataforma.</span>
                    </div>
                  </div>
                </div>
              </article>

              <div className="onb-step2-actions-bar">
                <button
                  type="button"
                  className="onb-btn-back"
                  onClick={() => navigate('/onboarding/etapa-2')}
                >
                  <ArrowLeftIcon size={14} className="onb-btn-icon-prefix" />
                  <span>Voltar</span>
                </button>
                <button
                  type="submit"
                  className="onb-btn-forward"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    'Concluindo...'
                  ) : (
                    <>
                      <span>Concluir configuração</span>
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

export default OnboardingStep3;
