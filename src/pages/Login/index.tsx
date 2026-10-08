import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import type { LoginAdminRequest, LoginRequest } from '../../types/auth';
import { DASHBOARD_ALLOWED_ROLES } from '../../constants/auth';
import './Login.css';

type LoginMode = 'employee' | 'administrator';

export function Login() {
  const navigate = useNavigate();
  const { loginFuncionario, loginAdmin } = useAuth();
  const [mode, setMode] = useState<LoginMode>('employee');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice('');
    setIsSubmitting(true);

    try {
      let roles: string[];
      if (mode === 'employee') {
        const request: LoginRequest = {
          cpf: cpf.replace(/\D/g, ''),
          email: email.trim(),
          senha: password,
          codigoEmpresa: companyCode.trim(),
        };
        roles = await loginFuncionario(request);
      } else {
        const request: LoginAdminRequest = {
          email: identifier.trim(),
          senha: password,
          codigoEmpresa: companyCode.trim() || null,
          cnpj: cnpj.trim() || null,
        };
        roles = await loginAdmin(request);
      }

      const canOpenDashboard = roles.some((role) =>
        DASHBOARD_ALLOWED_ROLES.some((allowedRole) => allowedRole === role.toUpperCase())
      );
      if (canOpenDashboard) {
        navigate('/dashboard', { replace: true });
      } else {
        setNotice('A autenticação foi concluída, mas este perfil não tem acesso ao painel web.');
      }
    } catch (requestError) {
      setError(normalizeApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page" aria-labelledby="login-title">
      <section className="login-card">
        <Link className="login-back-link" to="/">Voltar ao início</Link>
        <h1 id="login-title">Acessar Efficientia</h1>
        <p className="login-description">Entre com as credenciais cadastradas pela sua empresa.</p>

        <form onSubmit={handleSubmit}>
          <fieldset className="login-mode">
            <legend>Tipo de acesso</legend>
            <label>
              <input
                type="radio"
                name="login-mode"
                value="employee"
                checked={mode === 'employee'}
                onChange={() => setMode('employee')}
              />
              Funcionário
            </label>
            <label>
              <input
                type="radio"
                name="login-mode"
                value="administrator"
                checked={mode === 'administrator'}
                onChange={() => setMode('administrator')}
              />
              Administrador da empresa
            </label>
          </fieldset>

          {mode === 'employee' ? (
            <>
              <label className="login-field" htmlFor="login-cpf">
                CPF
                <input
                  id="login-cpf"
                  name="cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  required
                  pattern="[0-9.\\-]{11,14}"
                  title="Informe um CPF com 11 dígitos. Pontos e hífen são opcionais."
                  value={cpf}
                  onChange={(event) => setCpf(event.target.value)}
                />
              </label>
              <label className="login-field" htmlFor="login-email">
                E-mail
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label className="login-field" htmlFor="login-identifier">
                E-mail ou CPF
                <input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </label>
              <label className="login-field" htmlFor="login-cnpj">
                CNPJ <span>(opcional)</span>
                <input
                  id="login-cnpj"
                  name="cnpj"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cnpj}
                  onChange={(event) => setCnpj(event.target.value)}
                />
              </label>
            </>
          )}

          <label className="login-field" htmlFor="login-company-code">
            Código da empresa {mode === 'administrator' && <span>(opcional)</span>}
            <input
              id="login-company-code"
              name="codigoEmpresa"
              type="text"
              autoComplete="organization"
              required={mode === 'employee'}
              value={companyCode}
              onChange={(event) => setCompanyCode(event.target.value)}
            />
          </label>

          <label className="login-field" htmlFor="login-password">
            Senha
            <input
              id="login-password"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <div className="login-feedback login-feedback-error" role="alert">
              <p>{error.message}</p>
              {Object.entries(error.fieldErrors).length > 0 && (
                <ul>
                  {Object.entries(error.fieldErrors).map(([field, message]) => (
                    <li key={field}>{field}: {message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {notice && <p className="login-feedback" role="status">{notice}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
