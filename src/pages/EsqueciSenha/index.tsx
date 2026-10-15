import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import { ArrowRightIcon, AlertTriangleIcon, CheckIcon } from '../../components/icons';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import './EsqueciSenha.css';

export function EsqueciSenha() {
  const [codigoEmpresa, setCodigoEmpresa] = useState(() => {
    return localStorage.getItem('@efficientia:auth:last_codigo_empresa') || '';
  });
  const [emailCorporativo, setEmailCorporativo] = useState(() => {
    return localStorage.getItem('@efficientia:auth:last_email') || '';
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isCodigoValid = codigoEmpresa.trim().length >= 4;
  const isEmailValid = emailRegex.test(emailCorporativo.trim());
  const isFormValid = isCodigoValid && isEmailValid;

  function handleCodigoChange(e: ChangeEvent<HTMLInputElement>) {
    setCodigoEmpresa(e.target.value.toUpperCase());
    if (error) setError(null);
  }

  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    setEmailCorporativo(e.target.value);
    if (error) setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ codigoEmpresa: true, email: true });
    setError(null);
    setSuccessNotice('');

    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      // Simula a solicitação segura de redefinição de senha vinculada à empresa e ao e-mail
      await new Promise<void>((resolve) => setTimeout(resolve, 800));

      const cleanEmail = emailCorporativo.trim().toLowerCase();
      setSuccessNotice(
        `Instruções de redefinição enviadas para ${cleanEmail}! Verifique sua caixa de entrada e a pasta de spam.`
      );
    } catch (requestError) {
      setError(normalizeApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      id="main-content"
      className="esqueci-container"
      aria-labelledby="esqueci-title"
      tabIndex={-1}
    >
      {/* Lado Esquerdo: Formulário colado à esquerda (38%) */}
      <section className="esqueci-form-section">
        <div className="esqueci-card">
          <header className="esqueci-header">
            <h1 id="esqueci-title" className="esqueci-title">
              Recuperar Senha
            </h1>
            <p className="esqueci-subtitle">
              Informe o código corporativo da sua empresa e o seu e-mail de acesso cadastrado para receber o link seguro de recuperação.
            </p>
          </header>

          <form className="esqueci-form" onSubmit={handleSubmit} noValidate>
            {/* Campo 1: Código da Empresa */}
            <div className="esqueci-input-group">
              <label htmlFor="esqueci-codigo-empresa" className="esqueci-label">
                Código da Empresa <span className="esqueci-required">*</span>
              </label>
              <div className="esqueci-input-wrapper">
                <input
                  id="esqueci-codigo-empresa"
                  name="codigoEmpresa"
                  type="text"
                  placeholder="Ex: EFF60720"
                  autoComplete="organization"
                  maxLength={20}
                  required
                  value={codigoEmpresa}
                  onChange={handleCodigoChange}
                  onBlur={() => setTouched((p) => ({ ...p, codigoEmpresa: true }))}
                  className={`esqueci-input ${touched.codigoEmpresa && !isCodigoValid ? 'has-error' : ''}`}
                  style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                />
              </div>
              {touched.codigoEmpresa && !isCodigoValid && (
                <span className="esqueci-field-error" role="alert">
                  Informe o código da empresa com pelo menos 4 dígitos.
                </span>
              )}
            </div>

            {/* Campo 2: E-mail Corporativo */}
            <div className="esqueci-input-group">
              <label htmlFor="esqueci-email" className="esqueci-label">
                E-mail Corporativo <span className="esqueci-required">*</span>
              </label>
              <div className="esqueci-input-wrapper">
                <input
                  id="esqueci-email"
                  name="email"
                  type="email"
                  placeholder="usuario@empresa.com.br"
                  autoComplete="email"
                  required
                  value={emailCorporativo}
                  onChange={handleEmailChange}
                  onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                  className={`esqueci-input ${touched.email && !isEmailValid ? 'has-error' : ''}`}
                />
              </div>
              {touched.email && !isEmailValid && (
                <span className="esqueci-field-error" role="alert">
                  Informe um e-mail corporativo válido.
                </span>
              )}
            </div>

            {/* Feedbacks de Erro e Sucesso */}
            {error && (
              <div className="esqueci-feedback esqueci-feedback-error" role="alert">
                <AlertTriangleIcon size={18} className="esqueci-feedback-icon" />
                <div className="esqueci-feedback-body">
                  <p>{error.message}</p>
                </div>
              </div>
            )}

            {successNotice && (
              <div className="esqueci-feedback esqueci-feedback-notice" role="status">
                <CheckIcon size={18} className="esqueci-feedback-icon" />
                <div className="esqueci-feedback-body">
                  <p>{successNotice}</p>
                </div>
              </div>
            )}

            {/* Botão de Envio Estilo Login */}
            <button
              type="submit"
              className="esqueci-submit-btn"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                'Enviando instruções...'
              ) : (
                <>
                  <span>Enviar instruções</span>
                  <ArrowRightIcon size={14} style={{ marginLeft: 8 }} />
                </>
              )}
            </button>

            {/* Rodapé: Lembrou a senha? Fazer login */}
            <div className="esqueci-switch-box">
              <p className="esqueci-switch-text">
                Lembrou sua senha?{' '}
                <Link to="/login" className="esqueci-switch-link">
                  Fazer login
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* Lado Direito: Imagem e Branding Oficial (62% de largura) */}
      <section className="esqueci-hero-section" aria-label="Apresentação Efficientia">
        <div className="esqueci-hero-overlay" aria-hidden="true" />
        <img
          src={caminhaoImg}
          alt="Caminhão boiadeiro com a marca Efficientia - Gestão que move o campo"
          className="esqueci-hero-img"
        />
      </section>
    </main>
  );
}

export default EsqueciSenha;
