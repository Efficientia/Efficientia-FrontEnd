import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import type { LoginAdminRequest, LoginRequest } from '../../types/auth';
import { DASHBOARD_ALLOWED_ROLES } from '../../constants/auth';
import { formatCnpj, formatCpf } from '../../utils/validators';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import './Login.css';

type LoginMode = 'admin' | 'operacional';

export function Login() {
  const navigate = useNavigate();
  const { loginAdmin, loginFuncionario } = useAuth();

  const [mode, setMode] = useState<LoginMode>('admin');

  // Modo Administrador (POST /api/v1/auth/adm/login)
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Modo Operacional (POST /api/v1/auth/login: CPF + Email + Codigo + Senha)
  const [opCpf, setOpCpf] = useState('');
  const [opEmail, setOpEmail] = useState('');
  const [opCompanyCode, setOpCompanyCode] = useState('');
  const [opPassword, setOpPassword] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validações Admin
  const cleanAdminDigits = adminIdentifier.replace(/\D/g, '');
  const isAdminCnpj = cleanAdminDigits.length === 14;
  const isAdminEmail = adminIdentifier.includes('@') && adminIdentifier.trim().length >= 5;
  const isAdminIdentifierValid = isAdminCnpj || isAdminEmail || cleanAdminDigits.length === 11;
  const isAdminPasswordValid = adminPassword.trim().length >= 6;
  const isAdminFormValid = isAdminIdentifierValid && isAdminPasswordValid;

  // Validações Operacional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanOpCpf = opCpf.replace(/\D/g, '');
  const isOpCpfValid = cleanOpCpf.length === 11;
  const isOpEmailValid = emailRegex.test(opEmail.trim());
  const isOpCompanyCodeValid = opCompanyCode.trim().length >= 2;
  const isOpPasswordValid = opPassword.trim().length >= 6;
  const isOperacionalFormValid =
    isOpCpfValid && isOpEmailValid && isOpCompanyCodeValid && isOpPasswordValid;

  const isFormValid = mode === 'admin' ? isAdminFormValid : isOperacionalFormValid;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice('');

    if (mode === 'admin') {
      setTouched({ adminIdentifier: true, adminPassword: true });
      if (!isAdminFormValid) return;

      setIsSubmitting(true);
      try {
        let loginEmail = adminIdentifier.trim();

        // Se for CNPJ, consulta o e-mail corporativo correspondente ou envia o identificador
        if (isAdminCnpj) {
          try {
            const empresaInfo = await authService.loginEmpresa({ identificador: cleanAdminDigits });
            if (empresaInfo.empresa?.emailCorporativo) {
              loginEmail = empresaInfo.empresa.emailCorporativo;
            }
          } catch {
            // Se falhar a busca, mantém o identificador informado
          }
        }

        const request: LoginAdminRequest = {
          email: loginEmail,
          senha: adminPassword,
          ...(isAdminCnpj ? { cnpj: cleanAdminDigits } : {}),
        };

        const roles = await loginAdmin(request);
        const canOpenDashboard = roles.some((role) =>
          DASHBOARD_ALLOWED_ROLES.some((allowedRole) => allowedRole === role.toUpperCase())
        );

        if (canOpenDashboard) {
          navigate('/dashboard', { replace: true });
        } else {
          setNotice('Autenticação corporativa concluída com sucesso!');
        }
      } catch (requestError) {
        setError(normalizeApiError(requestError));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setTouched({ opCpf: true, opEmail: true, opCompanyCode: true, opPassword: true });
      if (!isOperacionalFormValid) return;

      setIsSubmitting(true);
      try {
        const request: LoginRequest = {
          cpf: cleanOpCpf,
          email: opEmail.trim().toLowerCase(),
          codigoEmpresa: opCompanyCode.trim().toUpperCase(),
          senha: opPassword,
        };

        const roles = await loginFuncionario(request);
        const canOpenDashboard = roles.some((role) =>
          DASHBOARD_ALLOWED_ROLES.some((allowedRole) => allowedRole === role.toUpperCase())
        );

        if (canOpenDashboard) {
          navigate('/dashboard', { replace: true });
        } else {
          setNotice('Login operacional concluído com sucesso!');
        }
      } catch (requestError) {
        setError(normalizeApiError(requestError));
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <main id="main-content" className="login-container" aria-labelledby="login-title" tabIndex={-1}>
      <section className="login-form-section">
        <div className="login-content">
          <h1 id="login-title" className="login-title">Entrar</h1>

          {/* Alternador de Modo de Autenticação */}
          <div className="auth-mode-selector" role="tablist" aria-label="Selecione o tipo de login">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'admin'}
              className={`auth-mode-btn ${mode === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setMode('admin');
                setError(null);
                setNotice('');
              }}
            >
              Administrador
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'operacional'}
              className={`auth-mode-btn ${mode === 'operacional' ? 'active' : ''}`}
              onClick={() => {
                setMode('operacional');
                setError(null);
                setNotice('');
              }}
            >
              Usuário Operacional
            </button>
          </div>

          <p className="form-legend">
            <span className="field-required">*</span> Campos obrigatórios
          </p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {mode === 'admin' ? (
              /* Formulário de Administrador (POST /api/v1/auth/adm/login) */
              <>
                <div className="login-input-group">
                  <label htmlFor="login-admin-identificador" className="field-label">
                    <span>CNPJ ou E-mail <span className="field-required">*</span></span>
                  </label>
                  <input
                    id="login-admin-identificador"
                    name="adminIdentifier"
                    type="text"
                    placeholder="CNPJ ou E-mail"
                    autoComplete="username"
                    required
                    value={adminIdentifier}
                    onBlur={() => setTouched((prev) => ({ ...prev, adminIdentifier: true }))}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdminIdentifier(val.includes('@') ? val : (val.replace(/\D/g, '').length > 0 && !/[a-zA-Z]/.test(val) ? formatCnpj(val) : val));
                      if (error) setError(null);
                    }}
                    className={`login-input ${
                      touched.adminIdentifier && !isAdminIdentifierValid ? 'has-error' : ''
                    }`}
                    aria-invalid={touched.adminIdentifier && !isAdminIdentifierValid}
                  />
                  {touched.adminIdentifier && !isAdminIdentifierValid && (
                    <span className="login-field-error" role="alert">
                      Informe um CNPJ válido (14 dígitos) ou e-mail corporativo.
                    </span>
                  )}
                </div>

                <div className="login-input-group">
                  <label htmlFor="login-admin-senha" className="field-label">
                    <span>Senha <span className="field-required">*</span></span>
                  </label>
                  <input
                    id="login-admin-senha"
                    name="adminSenha"
                    type="password"
                    placeholder="Senha"
                    autoComplete="current-password"
                    required
                    value={adminPassword}
                    onBlur={() => setTouched((prev) => ({ ...prev, adminPassword: true }))}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`login-input ${
                      touched.adminPassword && !isAdminPasswordValid ? 'has-error' : ''
                    }`}
                    aria-invalid={touched.adminPassword && !isAdminPasswordValid}
                  />
                  {touched.adminPassword && !isAdminPasswordValid && (
                    <span className="login-field-error" role="alert">
                      A senha deve conter no mínimo 6 caracteres.
                    </span>
                  )}
                </div>
              </>
            ) : (
              /* Formulário Operacional (POST /api/v1/auth/login) */
              <>
                <div className="login-input-group">
                  <label htmlFor="login-op-cpf" className="field-label">
                    <span>CPF <span className="field-required">*</span></span>
                  </label>
                  <input
                    id="login-op-cpf"
                    name="opCpf"
                    type="text"
                    placeholder="CPF"
                    autoComplete="username"
                    required
                    value={opCpf}
                    onBlur={() => setTouched((prev) => ({ ...prev, opCpf: true }))}
                    onChange={(e) => {
                      setOpCpf(formatCpf(e.target.value));
                      if (error) setError(null);
                    }}
                    className={`login-input ${touched.opCpf && !isOpCpfValid ? 'has-error' : ''}`}
                    aria-invalid={touched.opCpf && !isOpCpfValid}
                  />
                  {touched.opCpf && !isOpCpfValid && (
                    <span className="login-field-error" role="alert">
                      O CPF deve conter exatamente 11 dígitos.
                    </span>
                  )}
                </div>

                <div className="login-input-group">
                  <label htmlFor="login-op-email" className="field-label">
                    <span>E-mail <span className="field-required">*</span></span>
                  </label>
                  <input
                    id="login-op-email"
                    name="opEmail"
                    type="email"
                    placeholder="E-mail"
                    autoComplete="email"
                    required
                    value={opEmail}
                    onBlur={() => setTouched((prev) => ({ ...prev, opEmail: true }))}
                    onChange={(e) => {
                      setOpEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`login-input ${touched.opEmail && !isOpEmailValid ? 'has-error' : ''}`}
                    aria-invalid={touched.opEmail && !isOpEmailValid}
                  />
                  {touched.opEmail && !isOpEmailValid && (
                    <span className="login-field-error" role="alert">
                      Informe um e-mail válido.
                    </span>
                  )}
                </div>

                <div className="login-input-group">
                  <label htmlFor="login-op-codigo" className="field-label">
                    <span>Código da empresa <span className="field-required">*</span></span>
                  </label>
                  <input
                    id="login-op-codigo"
                    name="opCompanyCode"
                    type="text"
                    placeholder="Código da empresa"
                    autoComplete="organization"
                    required
                    value={opCompanyCode}
                    onBlur={() => setTouched((prev) => ({ ...prev, opCompanyCode: true }))}
                    onChange={(e) => {
                      setOpCompanyCode(e.target.value.toUpperCase());
                      if (error) setError(null);
                    }}
                    className={`login-input ${
                      touched.opCompanyCode && !isOpCompanyCodeValid ? 'has-error' : ''
                    }`}
                    aria-invalid={touched.opCompanyCode && !isOpCompanyCodeValid}
                  />
                  {touched.opCompanyCode && !isOpCompanyCodeValid && (
                    <span className="login-field-error" role="alert">
                      Informe o código da empresa.
                    </span>
                  )}
                </div>

                <div className="login-input-group">
                  <label htmlFor="login-op-senha" className="field-label">
                    <span>Senha <span className="field-required">*</span></span>
                  </label>
                  <input
                    id="login-op-senha"
                    name="opSenha"
                    type="password"
                    placeholder="Senha"
                    autoComplete="current-password"
                    required
                    value={opPassword}
                    onBlur={() => setTouched((prev) => ({ ...prev, opPassword: true }))}
                    onChange={(e) => {
                      setOpPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`login-input ${
                      touched.opPassword && !isOpPasswordValid ? 'has-error' : ''
                    }`}
                    aria-invalid={touched.opPassword && !isOpPasswordValid}
                  />
                  {touched.opPassword && !isOpPasswordValid && (
                    <span className="login-field-error" role="alert">
                      A senha deve conter no mínimo 6 caracteres.
                    </span>
                  )}
                </div>
              </>
            )}

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
              disabled={isSubmitting || !isFormValid}
              title={
                !isFormValid
                  ? mode === 'admin'
                    ? 'Preencha o CNPJ ou e-mail corporativo e senha'
                    : 'Preencha CPF, e-mail, código da empresa e senha'
                  : undefined
              }
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
