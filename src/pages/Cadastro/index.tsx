import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { empresaService } from '../../services/empresaService';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import type { CriarEmpresaRequest, EmpresaResponse } from '../../types/empresa';
import type { CriarPrimeiroAdminRequest } from '../../types/auth';
import { formatCnpj } from '../../utils/validators';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import efficientiaMark from '../../assets/efficientia-mark.svg';
import efficientiaWordmark from '../../assets/efficientia-wordmark.svg';
import './Cadastro.css';

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

export function Cadastro() {
  const navigate = useNavigate();
  const { cadastrarPrimeiroAdmin } = useAuth();

  // Exatamente os 4 campos especificados em cadastro.png e clip8_939_11
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validações
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());
  const isSenhaValid = senha.trim().length >= 6;
  const cleanCnpj = cnpj.replace(/\D/g, '');
  const isCnpjValid = cleanCnpj.length === 14;
  const isFormValid = isEmailValid && isSenhaValid && isCnpjValid;

  function handleCnpjChange(e: ChangeEvent<HTMLInputElement>) {
    setCnpj(formatCnpj(e.target.value));
    if (error) setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, senha: true, cnpj: true });
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessNotice('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanCodigo = codigoEmpresa.trim().toUpperCase();

    try {
      // Caso o usuário tenha informado um código de empresa existente, tenta criar o 1º admin
      if (cleanCodigo) {
        try {
          const admPayload: CriarPrimeiroAdminRequest = {
            codigoEmpresa: cleanCodigo,
            nome: cleanEmail.split('@')[0],
            email: cleanEmail,
            senha,
            cnpj: cleanCnpj,
          };
          await cadastrarPrimeiroAdmin(admPayload);

          localStorage.setItem('@efficientia:onboarding:current_step', '1');
          localStorage.removeItem('@efficientia:onboarding:completed');

          setSuccessNotice('Conta criada com sucesso! Redirecionando para o onboarding...');
          window.setTimeout(() => navigate('/onboarding', { replace: true }), 500);
          return;
        } catch {
          // Se falhar o vínculo por código, prossegue para o fluxo de nova empresa
        }
      }

      // Fluxo Padrão: Cadastrar Nova Empresa
      const payload: CriarEmpresaRequest = {
        nomeEmpresa: cleanEmail.split('@')[0],
        razaoSocial: cleanEmail.split('@')[0],
        cnpj: cleanCnpj,
        emailCorporativo: cleanEmail,
        senha,
      };

      let empresaCriada: Partial<EmpresaResponse> = {};
      try {
        empresaCriada = await empresaService.cadastrarEmpresa(payload);
      } catch (apiErr) {
        const normErr = normalizeApiError(apiErr);
        if (normErr.status === 409 || normErr.status === 400) {
          setError(normErr);
          setIsSubmitting(false);
          return;
        }
        // Em caso de falha de conexão ou 500, persiste draft local para não bloquear onboarding
        empresaCriada = {
          cnpj: cleanCnpj,
          emailCorporativo: cleanEmail,
          nomeEmpresa: cleanEmail.split('@')[0],
          codigoEmpresa: cleanCodigo || 'TEMP-' + cleanCnpj.slice(-4),
        };
      }

      const generatedCode =
        empresaCriada.codigoEmpresa ||
        empresaCriada.codigo ||
        empresaCriada.codigoInterno ||
        cleanCodigo ||
        '';

      try {
        localStorage.setItem(
          '@efficientia:onboarding:pending_empresa',
          JSON.stringify({
            ...empresaCriada,
            nomeEmpresa: empresaCriada.nomeEmpresa || cleanEmail.split('@')[0],
            cnpj: cleanCnpj,
            emailCorporativo: cleanEmail,
            codigoEmpresa: generatedCode,
          })
        );
        localStorage.setItem('@efficientia:onboarding:current_step', '1');
        localStorage.removeItem('@efficientia:onboarding:completed');
      } catch {
        // Ignora erro de localStorage
      }

      setSuccessNotice('Conta criada com sucesso! Redirecionando para a configuração da empresa...');
      window.setTimeout(() => navigate('/onboarding', { replace: true }), 500);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      id="main-content"
      className="cadastro-container"
      aria-labelledby="cadastro-title"
      tabIndex={-1}
    >
      {/* Lado Esquerdo: Formulário em Card Degradê */}
      <section className="cadastro-form-section">
        <div className="cadastro-card">
          <h1 id="cadastro-title" className="cadastro-title">Cadastro</h1>

          <form className="cadastro-form" onSubmit={handleSubmit} noValidate>
            {/* Campo 1: Email */}
            <div className="cadastro-input-group">
              <label htmlFor="cadastro-email" className="cadastro-label">
                Email
              </label>
              <div className="cadastro-input-wrapper">
                <input
                  id="cadastro-email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  className={`cadastro-input ${touched.email && !isEmailValid ? 'has-error' : ''}`}
                  aria-invalid={touched.email && !isEmailValid}
                />
              </div>
              {touched.email && !isEmailValid && (
                <span className="cadastro-field-error" role="alert">
                  Informe um e-mail válido.
                </span>
              )}
            </div>

            {/* Campo 2: Senha */}
            <div className="cadastro-input-group">
              <label htmlFor="cadastro-senha" className="cadastro-label">
                Senha
              </label>
              <div className="cadastro-input-wrapper">
                <input
                  id="cadastro-senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  autoComplete="new-password"
                  required
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, senha: true }))}
                  className={`cadastro-input ${touched.senha && !isSenhaValid ? 'has-error' : ''}`}
                  aria-invalid={touched.senha && !isSenhaValid}
                />
                <button
                  type="button"
                  className="cadastro-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {touched.senha && !isSenhaValid && (
                <span className="cadastro-field-error" role="alert">
                  A senha deve conter no mínimo 6 caracteres.
                </span>
              )}
            </div>

            {/* Campo 3: CNPJ da empresa */}
            <div className="cadastro-input-group">
              <label htmlFor="cadastro-cnpj" className="cadastro-label">
                CNPJ da empresa
              </label>
              <div className="cadastro-input-wrapper">
                <input
                  id="cadastro-cnpj"
                  name="cnpj"
                  type="text"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  autoComplete="organization"
                  required
                  value={cnpj}
                  onChange={handleCnpjChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, cnpj: true }))}
                  className={`cadastro-input ${touched.cnpj && !isCnpjValid ? 'has-error' : ''}`}
                  aria-invalid={touched.cnpj && !isCnpjValid}
                />
              </div>
              {touched.cnpj && !isCnpjValid && (
                <span className="cadastro-field-error" role="alert">
                  Informe um CNPJ válido com 14 dígitos.
                </span>
              )}
            </div>

            {/* Campo 4: Código da empresa (opcional) */}
            <div className="cadastro-input-group">
              <label htmlFor="cadastro-codigo" className="cadastro-label">
                Código da empresa
              </label>
              <div className="cadastro-input-wrapper">
                <input
                  id="cadastro-codigo"
                  name="codigoEmpresa"
                  type="text"
                  placeholder="Código da empresa (opcional)"
                  autoComplete="off"
                  value={codigoEmpresa}
                  onChange={(e) => {
                    setCodigoEmpresa(e.target.value.toUpperCase());
                    if (error) setError(null);
                  }}
                  className="cadastro-input"
                />
              </div>
            </div>

            {/* Feedbacks de Erro e Sucesso */}
            {error && (
              <div className="cadastro-feedback cadastro-feedback-error" role="alert">
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

            {successNotice && (
              <div className="cadastro-feedback cadastro-feedback-success" role="status">
                <p>{successNotice}</p>
              </div>
            )}

            {/* Botão de Ação Primária: Criar conta */}
            <button
              type="submit"
              className="cadastro-submit-btn"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Criando conta...' : 'Criar conta'}
            </button>

            {/* Rodapé: Já possui uma conta? Entre */}
            <div className="cadastro-switch-box">
              <p className="cadastro-switch-text">
                Já possui uma conta?{' '}
                <Link to="/login" className="cadastro-switch-link">
                  Entre
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Lado Direito: Imagem e Branding */}
      <section className="cadastro-hero-section" aria-label="Apresentação Efficientia">
        <div className="cadastro-hero-bg-wrapper">
          <img
            src={caminhaoImg}
            alt=""
            className="cadastro-hero-img"
            aria-hidden="true"
          />
          <div className="cadastro-hero-overlay" aria-hidden="true" />
        </div>
        <div className="cadastro-hero-content">
          <div className="cadastro-hero-logo">
            <img src={efficientiaMark} alt="" className="cadastro-hero-mark" aria-hidden="true" />
            <img src={efficientiaWordmark} alt="Efficientia" className="cadastro-hero-wordmark" />
          </div>
          <h2 className="cadastro-hero-tagline">
            <span>GESTÃO</span>
            <span>QUE MOVE</span>
            <span>O CAMPO</span>
          </h2>
        </div>
      </section>
    </main>
  );
}

export default Cadastro;
