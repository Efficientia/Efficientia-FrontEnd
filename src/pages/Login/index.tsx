import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import type { LoginAdminRequest } from '../../types/auth';
import { DASHBOARD_ALLOWED_ROLES } from '../../constants/auth';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function formatCnpj(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice('');
    setIsSubmitting(true);

    try {
      const cleanCnpj = cnpj.replace(/\D/g, '');
      const request: LoginAdminRequest = {
        email: cleanCnpj,
        cnpj: cleanCnpj,
        senha: password,
      };

      const roles = await loginAdmin(request);

      const canOpenDashboard = roles.some((role) =>
        DASHBOARD_ALLOWED_ROLES.some((allowedRole) => allowedRole === role.toUpperCase())
      );
      if (canOpenDashboard) {
        navigate('/dashboard', { replace: true });
      } else {
        setNotice('Autenticação concluída, mas seu perfil não possui acesso ao painel.');
      }
    } catch (requestError) {
      setError(normalizeApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="login-container" aria-labelledby="login-title" tabIndex={-1}>
      <section className="login-form-section">
        <div className="login-content">
          <h1 id="login-title" className="login-title">Entrar</h1>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-input-group">
              <label htmlFor="login-cnpj" className="visually-hidden">CNPJ</label>
              <input
                id="login-cnpj"
                name="cnpj"
                type="text"
                placeholder="CNPJ"
                autoComplete="organization"
                required
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                className="login-input"
              />
            </div>

            <div className="login-input-group">
              <label htmlFor="login-senha" className="visually-hidden">Senha</label>
              <input
                id="login-senha"
                name="senha"
                type="password"
                placeholder="Senha"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
              />
            </div>

            <div className="login-forgot-box">
              <Link to="/esqueci-minha-senha" className="login-forgot-link">
                Esqueci minha senha
              </Link>
            </div>

            {error && (
              <div className="login-feedback login-feedback-error" role="alert">
                <p>{error.message}</p>
                {Object.entries(error.fieldErrors).length > 0 && (
                  <ul>
                    {Object.entries(error.fieldErrors).map(([field, msg]) => (
                      <li key={field}>{field}: {msg}</li>
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

            <div className="login-switch-box">
              <p className="login-switch-text">
                Não possui uma conta?{' '}
                <Link to="/cadastro" className="login-switch-link">
                  Crie uma
                </Link>
              </p>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </section>

      <section className="login-hero-section" aria-label="Apresentação Efficientia">
        <div className="login-hero-overlay" />
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
