import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { normalizeApiError, type ApiRequestError } from '../../services/api';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import './EsqueciSenha.css';

export function EsqueciSenha() {
  const [identificador, setIdentificador] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanDigits = identificador.replace(/\D/g, '');
  const isCnpjValid = cleanDigits.length === 14;
  const isEmailValid = emailRegex.test(identificador.trim());
  const isValid = isCnpjValid || isEmailValid;

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
    setTouched(true);
    setError(null);
    setSuccessNotice('');

    if (!isValid) return;
    setIsSubmitting(true);
    try {
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 800);
      await promise;
      setSuccessNotice(
        'Instruções enviadas com sucesso! Verifique a caixa de entrada e a pasta de spam do seu e-mail para redefinir sua senha.'
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
      <section className="esqueci-form-section">
        <div className="esqueci-content">
          <h1 id="esqueci-title" className="esqueci-title">
            Recuperar Senha
          </h1>
          <p className="esqueci-subtitle">
            Informe seu e-mail corporativo ou CNPJ cadastrado para receber as instruções de recuperação.
          </p>

          <p className="form-legend">
            <span className="field-required">*</span> Campos obrigatórios
          </p>

          <form className="esqueci-form" onSubmit={handleSubmit} noValidate>
            <div className="esqueci-input-group">
              <label htmlFor="esqueci-identificador" className="field-label">
                <span>E-mail ou CNPJ <span className="field-required">*</span></span>
              </label>
              <input
                id="esqueci-identificador"
                name="identificador"
                type="text"
                placeholder="E-mail ou CNPJ"
                autoComplete="email"
                required
                value={identificador}
                onBlur={() => setTouched(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setIdentificador(val.includes('@') ? val : (val.replace(/\D/g, '').length > 0 && !/[a-zA-Z]/.test(val) ? formatCnpj(val) : val));
                  if (error) setError(null);
                }}
                className={`esqueci-input ${touched && !isValid ? 'has-error' : ''}`}
                aria-invalid={touched && !isValid}
              />
              {touched && !isValid && (
                <span className="esqueci-field-error" role="alert">
                  Informe um e-mail válido ou CNPJ com 14 dígitos.
                </span>
              )}
            </div>

            {error && (
              <div className="esqueci-feedback esqueci-feedback-error" role="alert">
                <p>{error.message}</p>
              </div>
            )}

            {successNotice && (
              <div className="esqueci-feedback esqueci-feedback-success" role="status">
                <p>{successNotice}</p>
              </div>
            )}

            <div className="esqueci-switch-box">
              <p className="esqueci-switch-text">
                Lembrou sua senha?{' '}
                <Link to="/login" className="esqueci-switch-link">
                  Entre
                </Link>
              </p>
            </div>

            <button
              type="submit"
              className="esqueci-submit-btn"
              disabled={isSubmitting || !isValid}
              title={!isValid ? 'Informe um e-mail válido ou CNPJ com 14 dígitos' : undefined}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar instruções'}
            </button>
          </form>
        </div>
      </section>

      <section className="esqueci-hero-section" aria-label="Apresentação Efficientia">
        <div className="esqueci-hero-overlay" />
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
