import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import { formatCnpj } from '../../utils/validators';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import efficientiaMark from '../../assets/efficientia-mark.svg';
import efficientiaWordmark from '../../assets/efficientia-wordmark.svg';
import './Login.css';

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="23" x2="23" y2="1" />
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();

  const [cnpj, setCnpj] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getPostLoginPath(): string {
    const pendingStep = localStorage.getItem('@efficientia:onboarding:current_step');
    if (pendingStep === '2') return '/onboarding/etapa-2';
    if (pendingStep === '3') return '/onboarding/etapa-3';
    const isCompleted = localStorage.getItem('@efficientia:onboarding:completed') === 'true';
    if (!isCompleted && pendingStep === '1') return '/onboarding';
    return '/visao-geral';
  }

  const cleanCnpjDigits = cnpj.replace(/\D/g, '');
  const isCnpjValid =
    cleanCnpjDigits.length === 14 ||
    (cnpj.includes('@') && cnpj.trim().length >= 5) ||
    cleanCnpjDigits.length === 11;
  const isSenhaValid = senha.trim().length >= 6;
  const isFormValid = isCnpjValid && isSenhaValid;

  function handleCnpjChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.includes('@')) {
      setCnpj(val);
    } else {
      setCnpj(formatCnpj(val));
    }
    if (error) setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ cnpj: true, senha: true });
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);
    setNotice('');

    try {
      const cleanDigits = cnpj.replace(/\D/g, '');

      try {
        const email = cnpj.includes('@') ? cnpj.trim().toLowerCase() : `${cleanDigits}@empresa.local`;
        await loginAdmin({
          email,
          cnpj: cleanDigits.length === 14 ? cleanDigits : undefined,
          senha,
        });
        navigate(getPostLoginPath(), { replace: true });
        return;
      } catch (adminErr) {
        if (cleanDigits.length === 14) {
          try {
            const empRes = await authService.loginEmpresa({
              cnpj: cleanDigits,
              identificador: cleanDigits,
              senha,
            });
            if (empRes?.token) {
              navigate(getPostLoginPath(), { replace: true });
              return;
            }
          } catch {
            // mantém erro original
          }
        }
        throw adminErr;
      }
    } catch (requestError) {
      setError(normalizeApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="login-container" aria-labelledby="login-title" tabIndex={-1}>
      {/* Lado Esquerdo: Formulário em Card Degradê */}
      <section className="login-form-section">
        <div className="login-card">
          <h1 id="login-title" className="login-title">Entrar</h1>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Campo CNPJ */}
            <div className="login-input-group">
              <label htmlFor="login-cnpj" className="login-label">
                CNPJ
              </label>
              <div className="login-input-wrapper">
                <input
                  id="login-cnpj"
                  name="cnpj"
                  type="text"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  autoComplete="organization"
                  required
                  value={cnpj}
                  onChange={handleCnpjChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, cnpj: true }))}
                  className={`login-input ${touched.cnpj && !isCnpjValid ? 'has-error' : ''}`}
                  aria-invalid={touched.cnpj && !isCnpjValid}
                />
              </div>
              {touched.cnpj && !isCnpjValid && (
                <span className="login-field-error" role="alert">
                  Informe um CNPJ válido com 14 dígitos.
                </span>
              )}
            </div>

            {/* Campo Senha */}
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
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (error) setError(null);
                  }}
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

            {/* Feedbacks de Erro e Aviso */}
            {error && (
              <div className="login-feedback login-feedback-error" role="alert">
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
            )}

            {notice && (
              <div className="login-feedback login-feedback-notice" role="status">
                <p>{notice}</p>
              </div>
            )}

            {/* Botão de Ação: Entrar */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
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

      {/* Lado Direito: Imagem e Branding */}
      <section className="login-hero-section" aria-label="Apresentação Efficientia">
        <div className="login-hero-bg-wrapper">
          <img
            src={caminhaoImg}
            alt=""
            className="login-hero-img"
            aria-hidden="true"
          />
          <div className="login-hero-overlay" aria-hidden="true" />
        </div>
        <div className="login-hero-content">
          <div className="login-hero-logo">
            <img src={efficientiaMark} alt="" className="login-hero-mark" aria-hidden="true" />
            <img src={efficientiaWordmark} alt="Efficientia" className="login-hero-wordmark" />
          </div>
          <h2 className="login-hero-tagline">
            <span>GESTÃO</span>
            <span>QUE MOVE</span>
            <span>O CAMPO</span>
          </h2>
        </div>
      </section>
    </main>
  );
}

export default Login;
