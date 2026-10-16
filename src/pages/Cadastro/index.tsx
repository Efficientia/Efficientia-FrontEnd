import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import type { CriarPrimeiroAdminRequest } from '../../types/auth';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import './Cadastro.css';

export function Cadastro() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [successNotice, setSuccessNotice] = useState('');
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
    setSuccessNotice('');
    setIsSubmitting(true);

    try {
      const cleanCnpj = cnpj.replace(/\D/g, '');
      const requestData: CriarPrimeiroAdminRequest = {
        nome: email.split('@')[0] || 'Administrador',
        email: email.trim(),
        senha: password,
        cnpj: cleanCnpj || null,
        codigoEmpresa: companyCode.trim() || null,
      };

      await authService.cadastrarPrimeiroAdmin(requestData);
      setSuccessNotice('Cadastro realizado com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1800);
    } catch (requestError) {
      setError(normalizeApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="cadastro-container" aria-labelledby="cadastro-title" tabIndex={-1}>
      <section className="cadastro-form-section">
        <div className="cadastro-content">
          <h1 id="cadastro-title" className="cadastro-title">Cadastro</h1>

          <form className="cadastro-form" onSubmit={handleSubmit} noValidate>
            <div className="cadastro-input-group">
              <label htmlFor="cadastro-email" className="visually-hidden">Email</label>
              <input
                id="cadastro-email"
                name="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cadastro-input"
              />
            </div>

            <div className="cadastro-input-group">
              <label htmlFor="cadastro-senha" className="visually-hidden">Senha</label>
              <input
                id="cadastro-senha"
                name="senha"
                type="password"
                placeholder="Senha"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cadastro-input"
              />
            </div>

            <div className="cadastro-input-group">
              <label htmlFor="cadastro-cnpj" className="visually-hidden">CNPJ da empresa</label>
              <input
                id="cadastro-cnpj"
                name="cnpj"
                type="text"
                placeholder="CNPJ da empresa"
                autoComplete="organization"
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                className="cadastro-input"
              />
            </div>

            <div className="cadastro-input-group">
              <label htmlFor="cadastro-codigo" className="visually-hidden">Código da empresa</label>
              <input
                id="cadastro-codigo"
                name="codigoEmpresa"
                type="text"
                placeholder="Código da empresa"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                className="cadastro-input"
              />
            </div>

            {error && (
              <div className="cadastro-feedback cadastro-feedback-error" role="alert">
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

            {successNotice && (
              <div className="cadastro-feedback cadastro-feedback-success" role="status">
                <p>{successNotice}</p>
              </div>
            )}

            <div className="cadastro-switch-box">
              <p className="cadastro-switch-text">
                Já possui uma conta?{' '}
                <Link to="/login" className="cadastro-switch-link">
                  Entre
                </Link>
              </p>
            </div>

            <button
              type="submit"
              className="cadastro-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Cadastrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </section>

      <section className="cadastro-hero-section" aria-label="Apresentação Efficientia">
        <div className="cadastro-hero-overlay" />
        <img
          src={caminhaoImg}
          alt="Caminhão boiadeiro com a marca Efficientia - Gestão que move o campo"
          className="cadastro-hero-img"
        />
      </section>
    </main>
  );
}

export default Cadastro;
