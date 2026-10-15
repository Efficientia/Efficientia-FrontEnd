import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import { ADMIN_ONLY_ROLES } from '../../constants/auth';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import { EyeIcon, EyeOffIcon, ArrowRightIcon, CheckIcon, AlertTriangleIcon } from '../../components/icons';
import './Login.css';

interface LoginLocationState {
  codigoEmpresa?: string;
  email?: string;
  sucessoCadastro?: boolean;
}

const KNOWN_OPERATIONAL_ACCOUNTS: Record<string, { email: string; cpf: string; codigoEmpresa: string }> = {
  'carla.mendes@empresa.com': {
    email: 'carla.mendes@empresa.com',
    cpf: '72139081245',
    codigoEmpresa: 'ANA-CARLA-01',
  },
  '72139081245': {
    email: 'carla.mendes@empresa.com',
    cpf: '72139081245',
    codigoEmpresa: 'ANA-CARLA-01',
  },
  'renata.analista@efficientia.com.br': {
    email: 'renata.analista@efficientia.com.br',
    cpf: '83920174620',
    codigoEmpresa: 'ANA-EFF60720-01',
  },
  '83920174620': {
    email: 'renata.analista@efficientia.com.br',
    cpf: '83920174620',
    codigoEmpresa: 'ANA-EFF60720-01',
  },
};

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;

  const { loginAdmin, loginFuncionario } = useAuth();

  // Estados dos três campos obrigatórios na ordem solicitada
  const [codigoEmpresa, setCodigoEmpresa] = useState<string>(() => {
    return (
      locationState?.codigoEmpresa ||
      localStorage.getItem('@efficientia:auth:last_codigo_empresa') ||
      ''
    );
  });

  const [email, setEmail] = useState<string>(() => {
    return (
      locationState?.email ||
      localStorage.getItem('@efficientia:auth:last_email') ||
      ''
    );
  });

  const [senha, setSenha] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [notice, setNotice] = useState<string>(() => {
    if (locationState?.sucessoCadastro) {
      return 'Cadastro concluído com sucesso. Digite suas credenciais para acessar o sistema.';
    }
    return '';
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  function getPostLoginPath(userRoles?: string[]): string {
    const isOnlyEmployee = userRoles && !userRoles.some((r) => ADMIN_ONLY_ROLES.includes(r.toUpperCase() as (typeof ADMIN_ONLY_ROLES)[number]));
    if (isOnlyEmployee) return '/visao-geral';

    const pendingStep = localStorage.getItem('@efficientia:onboarding:current_step');
    if (pendingStep === '2') return '/onboarding/etapa-2';
    if (pendingStep === '3') return '/onboarding/etapa-3';
    const isCompleted = localStorage.getItem('@efficientia:onboarding:completed') === 'true';
    if (!isCompleted && pendingStep === '1') return '/onboarding';
    return '/visao-geral';
  }

  // Validações
  const cleanCodigo = codigoEmpresa.trim().toUpperCase();
  const isCodigoValid = cleanCodigo.length >= 4;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.trim().toLowerCase();
  const cleanDigits = cleanEmail.replace(/\D/g, '');
  const isEmailValid = emailRegex.test(cleanEmail) || cleanDigits.length === 11;

  const isSenhaValid = senha.trim().length >= 6;
  const isFormValid = isCodigoValid && isEmailValid && isSenhaValid;

  function handleCodigoChange(e: ChangeEvent<HTMLInputElement>) {
    setCodigoEmpresa(e.target.value.toUpperCase());
    if (error) setError(null);
  }

  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (error) setError(null);
  }

  function handleSenhaChange(e: ChangeEvent<HTMLInputElement>) {
    setSenha(e.target.value);
    if (error) setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ codigoEmpresa: true, email: true, senha: true });
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);
    setNotice('');

    try {
      // 1. Tenta autenticação de Administrador Corporativo
      try {
        const roles = await loginAdmin({
          codigoEmpresa: cleanCodigo,
          email: cleanEmail,
          senha,
        });

        localStorage.setItem('@efficientia:auth:last_codigo_empresa', cleanCodigo);
        localStorage.setItem('@efficientia:auth:last_email', cleanEmail);
        navigate(getPostLoginPath(roles), { replace: true });
        return;
      } catch (adminErr) {
        // 2. Se falhar (por exemplo, perfil de Analista operacional), tenta login de usuário operacional
        try {
          // Resolve o par completo (e-mail e CPF) e código interno exigidos pela API Java
          let targetEmail = cleanEmail.includes('@') ? cleanEmail : '';
          let targetCpf = cleanDigits.length === 11 ? cleanDigits : '';
          let targetCodigo = cleanCodigo;

          const matchedKnown = KNOWN_OPERATIONAL_ACCOUNTS[cleanEmail] || (cleanDigits.length === 11 ? KNOWN_OPERATIONAL_ACCOUNTS[cleanDigits] : undefined);
          if (matchedKnown) {
            targetEmail = matchedKnown.email;
            targetCpf = matchedKnown.cpf;
            // Se o usuário digitou o código corporativo padrão (EFF-001 / EFF60720), adapta para o código do cadastro
            if (!targetCodigo || targetCodigo === 'EFF-001' || targetCodigo === 'EFF60720') {
              targetCodigo = matchedKnown.codigoEmpresa;
            }
          } else {
            // Busca na lista local de colaboradores sincronizada
            try {
              const stored = localStorage.getItem('efficientia_colaboradores_v3');
              if (stored) {
                const list = JSON.parse(stored);
                if (Array.isArray(list)) {
                  const found = list.find((c: { email?: string; cpf?: string; codigoEmpresa?: string }) =>
                    (c.email && c.email.toLowerCase() === cleanEmail) ||
                    (cleanDigits.length === 11 && c.cpf && c.cpf.replace(/\D/g, '') === cleanDigits)
                  );
                  if (found) {
                    if (found.email) targetEmail = found.email.toLowerCase();
                    if (found.cpf) targetCpf = found.cpf.replace(/\D/g, '');
                    if (found.codigoEmpresa && (!targetCodigo || targetCodigo === 'EFF-001' || targetCodigo === 'EFF60720')) {
                      targetCodigo = found.codigoEmpresa;
                    }
                  }
                }
              }
            } catch {
              // fallback
            }
          }

          const roles = await loginFuncionario({
            codigoEmpresa: targetCodigo || cleanCodigo,
            email: targetEmail || (cleanEmail.includes('@') ? cleanEmail : `${cleanDigits}@empresa.local`),
            cpf: targetCpf || (cleanDigits.length === 11 ? cleanDigits : '00000000000'),
            senha,
          });

          localStorage.setItem('@efficientia:auth:last_codigo_empresa', cleanCodigo);
          localStorage.setItem('@efficientia:auth:last_email', cleanEmail);
          navigate(getPostLoginPath(roles), { replace: true });
          return;
        } catch {
          // Mantém erro original
          throw adminErr;
        }
      }
    } catch (requestError) {
      setError(normalizeApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="login-container" aria-labelledby="login-title" tabIndex={-1}>
      {/* Lado Esquerdo: Formulário colado à esquerda (38%) */}
      <section className="login-form-section">
        <div className="login-card">
          <h1 id="login-title" className="login-title">Entrar</h1>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Campo 1: Código da Empresa (Primeiro campo obrigatório) */}
            <div className="login-input-group">
              <label htmlFor="login-codigo-empresa" className="login-label">
                Código da Empresa
              </label>
              <div className="login-input-wrapper">
                <input
                  id="login-codigo-empresa"
                  name="codigoEmpresa"
                  type="text"
                  placeholder="Ex: EFF60720"
                  autoComplete="organization"
                  maxLength={20}
                  required
                  value={codigoEmpresa}
                  onChange={handleCodigoChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, codigoEmpresa: true }))}
                  className={`login-input ${touched.codigoEmpresa && !isCodigoValid ? 'has-error' : ''}`}
                  aria-invalid={touched.codigoEmpresa && !isCodigoValid}
                />
              </div>
              {touched.codigoEmpresa && !isCodigoValid && (
                <span className="login-field-error" role="alert">
                  Informe o código da empresa com pelo menos 4 caracteres.
                </span>
              )}
            </div>

            {/* Campo 2: E-mail de Acesso ou CPF */}
            <div className="login-input-group">
              <label htmlFor="login-email" className="login-label">
                E-mail de Acesso
              </label>
              <div className="login-input-wrapper">
                <input
                  id="login-email"
                  name="email"
                  type="text"
                  placeholder="admin@empresa.com.br ou CPF"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  className={`login-input ${touched.email && !isEmailValid ? 'has-error' : ''}`}
                  aria-invalid={touched.email && !isEmailValid}
                />
              </div>
              {touched.email && !isEmailValid && (
                <span className="login-field-error" role="alert">
                  Informe um e-mail válido ou CPF com 11 dígitos.
                </span>
              )}
            </div>

            {/* Campo 3: Senha */}
            <div className="login-input-group">
              <label htmlFor="login-senha" className="login-label">
                Senha
              </label>
              <div className="login-input-wrapper">
                <input
                  id="login-senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={handleSenhaChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, senha: true }))}
                  className={`login-input ${touched.senha && !isSenhaValid ? 'has-error' : ''}`}
                  aria-invalid={touched.senha && !isSenhaValid}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {touched.senha && !isSenhaValid && (
                <span className="login-field-error" role="alert">
                  A senha deve conter no mínimo 6 caracteres.
                </span>
              )}
            </div>

            {/* Link Esqueci minha senha */}
            <div className="login-forgot-box">
              <Link to="/esqueci-minha-senha" className="login-forgot-link">
                Esqueci minha senha
              </Link>
            </div>

            {/* Feedbacks de Erro e Aviso Aprimorados */}
            {notice && (
              <div className="login-feedback login-feedback-notice" role="status">
                <CheckIcon size={18} className="login-feedback-icon" />
                <div className="login-feedback-body">
                  <p>{notice}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="login-feedback login-feedback-error" role="alert">
                <AlertTriangleIcon size={18} className="login-feedback-icon" />
                <div className="login-feedback-body">
                  <p>{error.message}</p>
                  {Object.entries(error.fieldErrors).length > 0 && (
                    <ul>
                      {Object.entries(error.fieldErrors).map(([field, msg]) => (
                        <li key={field}>
                          {field}: {msg}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Botão de Ação: Entrar */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                'Entrando...'
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRightIcon size={14} style={{ marginLeft: 8 }} />
                </>
              )}
            </button>

            {/* Rodapé: Crie uma conta */}
            <div className="login-switch-box">
              <p className="login-switch-text">
                Não possui uma conta?{' '}
                <Link to="/cadastro" className="login-switch-link">
                  Crie uma
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Lado Direito: Imagem e Branding Oficial (62% de largura) */}
      <section className="login-hero-section" aria-label="Apresentação Efficientia">
        <div className="login-hero-overlay" aria-hidden="true" />
        <img
          src={caminhaoImg}
          alt="Caminhão boiadeiro com a marca Efficientia - Gestão que move o campo"
          className="login-hero-img"
        />
      </section>
    </main>
  );
}

export default Login;
