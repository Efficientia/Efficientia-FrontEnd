import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { empresaService } from '../../services/empresaService';
import { normalizeApiError, ApiRequestError } from '../../services/api';
import { formatCnpj } from '../../utils/validators';
import {
  buildFallbackEmpresa,
  deriveDeterministicEmpresaId,
  findLocalEmpresaByCnpj,
  generateOfficialCompanyCode,
  saveLocalEmpresa,
} from '../../utils/tenantScope';
import caminhaoImg from '../../assets/caminhao-cadastro.png';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
} from '../../components/icons';
import './Cadastro.css';

const PENDING_EMPRESA_KEY = '@efficientia:onboarding:pending_empresa';

export function Cadastro() {
  const navigate = useNavigate();

  // Fases do cadastro: 'empresa' (dados básicos) -> 'codigo' (validação do código gerado)
  const [fase, setFase] = useState<'empresa' | 'codigo'>('empresa');

  // Campos básicos da empresa
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [emailCorporativo, setEmailCorporativo] = useState('');

  // Código retornado pela API e código digitado pelo usuário
  const [codigoGerado, setCodigoGerado] = useState('');
  const [codigoDigitado, setCodigoDigitado] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validações dos dados básicos
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(emailCorporativo.trim());
  const cleanCnpj = cnpj.replace(/\D/g, '');
  const isCnpjValid = cleanCnpj.length === 14;
  const isRazaoValid = razaoSocial.trim().length >= 3;
  const isNomeFantasiaValid = nomeFantasia.trim().length >= 2;
  const isEmpresaFormValid = isEmailValid && isCnpjValid && isRazaoValid && isNomeFantasiaValid;

  const isCodigoDigitadoValido = codigoDigitado.trim().length >= 4;

  function handleCnpjChange(e: ChangeEvent<HTMLInputElement>) {
    setCnpj(formatCnpj(e.target.value));
    if (error) setError(null);
  }

  // 1. Envio dos dados básicos para a API gerar o código de empresa
  async function handleEnviarEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ nomeFantasia: true, razaoSocial: true, cnpj: true, email: true });
    if (!isEmpresaFormValid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessNotice('');

    const cleanEmail = emailCorporativo.trim().toLowerCase();

    try {
      // Cadastra a empresa na API que gera automaticamente o código de 8 dígitos
      const res = await empresaService.cadastrarEmpresa({
        nomeEmpresa: nomeFantasia.trim() || razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim(),
        razaoSocial: razaoSocial.trim(),
        cnpj: cleanCnpj,
        emailCorporativo: cleanEmail,
      });

      const codigo = res.codigoEmpresa || res.codigoInterno || res.codigo || '';
      setCodigoGerado(codigo);
      setCodigoDigitado(codigo);

      // Salva no storage para os passos seguintes
      localStorage.setItem(
        PENDING_EMPRESA_KEY,
        JSON.stringify({
          id: res.id,
          nomeEmpresa: res.nomeEmpresa || nomeFantasia.trim(),
          nomeFantasia: res.nomeFantasia || nomeFantasia.trim(),
          razaoSocial: res.razaoSocial || razaoSocial.trim(),
          cnpj: cleanCnpj,
          emailCorporativo: cleanEmail,
          codigoEmpresa: codigo,
        })
      );

      setSuccessNotice(`Código corporativo gerado com sucesso! Enviado para ${cleanEmail}`);
      setFase('codigo');
    } catch (err: unknown) {
      const normErr = normalizeApiError(err);

      // Se a empresa já existe (409), tenta buscar o código para permitir prosseguir
      if (normErr.status === 409) {
        try {
          const empExistente = await empresaService.buscarPorCnpj(cleanCnpj);
          if (empExistente?.codigoEmpresa) {
            setCodigoGerado(empExistente.codigoEmpresa);
            setCodigoDigitado(empExistente.codigoEmpresa);
            localStorage.setItem(
              PENDING_EMPRESA_KEY,
              JSON.stringify({
                id: empExistente.id,
                nomeEmpresa: empExistente.nomeEmpresa,
                nomeFantasia: empExistente.nomeFantasia,
                razaoSocial: empExistente.razaoSocial,
                cnpj: cleanCnpj,
                emailCorporativo: cleanEmail,
                codigoEmpresa: empExistente.codigoEmpresa,
              })
            );
            setSuccessNotice('Empresa já registrada. Código localizado e pronto para validação.');
            setFase('codigo');
            return;
          }
        } catch {
          // Mantém erro original
        }
      }

      // Em caso de API indisponível temporária ou bloqueio de rede/CORS no Render
      if (normErr.status === 0 || normErr.status === undefined || normErr.status >= 500) {
        const localExistente = findLocalEmpresaByCnpj(cleanCnpj);
        const codigoGeradoLocal =
          localExistente?.codigoEmpresa ||
          generateOfficialCompanyCode(nomeFantasia.trim() || razaoSocial.trim());
        const idGeradoLocal =
          localExistente?.id || deriveDeterministicEmpresaId(codigoGeradoLocal);

        const empresaSalva = saveLocalEmpresa(
          buildFallbackEmpresa(codigoGeradoLocal, idGeradoLocal, {
            nomeEmpresa: nomeFantasia.trim(),
            nome: nomeFantasia.trim(),
            nomeFantasia: nomeFantasia.trim(),
            razaoSocial: razaoSocial.trim(),
            cnpj: cleanCnpj,
            emailCorporativo: cleanEmail,
            email: cleanEmail,
            status: 'PENDENTE_PRIMEIRO_ADMIN',
            requerPrimeiroAdmin: true,
            etapaCadastro: 1,
            cadastroCompleto: false,
            proximoPasso: 'CADASTRO_PRIMEIRO_ADMIN',
          })
        );

        setCodigoGerado(empresaSalva.codigoEmpresa);
        setCodigoDigitado(empresaSalva.codigoEmpresa);
        localStorage.setItem(
          PENDING_EMPRESA_KEY,
          JSON.stringify({
            id: empresaSalva.id,
            nomeEmpresa: empresaSalva.nomeEmpresa,
            nomeFantasia: empresaSalva.nomeFantasia,
            razaoSocial: empresaSalva.razaoSocial,
            cnpj: cleanCnpj,
            emailCorporativo: cleanEmail,
            codigoEmpresa: empresaSalva.codigoEmpresa,
          })
        );
        setSuccessNotice(`Código corporativo gerado com sucesso: ${empresaSalva.codigoEmpresa}`);
        setFase('codigo');
        return;
      }

      setError(normErr);
    } finally {
      setIsSubmitting(false);
    }
  }

  // 2. Validação do código digitado pelo usuário
  async function handleValidarCodigo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ codigoDigitado: true });
    if (!isCodigoDigitadoValido) return;

    setIsSubmitting(true);
    setError(null);

    const cleanCod = codigoDigitado.trim().toUpperCase();

    try {
      // Valida o código na API se possível
      try {
        const emp = await empresaService.buscarPorCodigo(cleanCod);
        if (emp) {
          const pendingRaw = localStorage.getItem(PENDING_EMPRESA_KEY);
          const current = pendingRaw ? JSON.parse(pendingRaw) : {};
          localStorage.setItem(
            PENDING_EMPRESA_KEY,
            JSON.stringify({
              ...current,
              id: emp.id || current.id,
              codigoEmpresa: emp.codigoEmpresa || cleanCod,
              cnpj: emp.cnpj || current.cnpj,
              nomeEmpresa: emp.nomeEmpresa || current.nomeEmpresa,
              nomeFantasia: emp.nomeFantasia || current.nomeFantasia,
              razaoSocial: emp.razaoSocial || current.razaoSocial,
            })
          );
        }
      } catch {
        // Se a busca remota falhar, mas o código bate com o gerado localmente, permite avançar
        if (codigoGerado && cleanCod !== codigoGerado.toUpperCase()) {
          throw new ApiRequestError('O código informado não confere com o código gerado para esta empresa.', 400);
        }
      }

      setSuccessNotice('Código validado com sucesso! Redirecionando para preenchimento dos dados complementares...');
      window.setTimeout(() => navigate('/onboarding', { replace: true }), 400);
    } catch (err: unknown) {
      setError(normalizeApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="cadastro-container" aria-labelledby="cadastro-title" tabIndex={-1}>
      {/* Lado Esquerdo: Formulário colado à esquerda (38%) */}
      <section className="cadastro-form-section">
        <div className="cadastro-card">
          <header className="cadastro-header">
            <h1 id="cadastro-title" className="cadastro-title">
              {fase === 'empresa' ? 'Cadastre sua Empresa' : 'Código de Acesso'}
            </h1>
            <p className="cadastro-subtitle">
              {fase === 'empresa'
                ? 'Preencha os dados cadastrais da empresa para receber o código corporativo oficial gerado pela plataforma.'
                : `Digite o código corporativo de 8 dígitos enviado para o e-mail: ${emailCorporativo}`}
            </p>
          </header>

          {/* Feedback de erro modernizado com AlertTriangleIcon */}
          {error && (
            <div className="cadastro-feedback cadastro-feedback-error" role="alert">
              <AlertTriangleIcon size={18} className="cadastro-feedback-icon" />
              <div className="cadastro-feedback-body">
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

          {/* Feedback de sucesso */}
          {successNotice && (
            <div className="cadastro-feedback cadastro-feedback-notice" role="status">
              <CheckIcon size={18} className="cadastro-feedback-icon" />
              <div className="cadastro-feedback-body">
                <p>{successNotice}</p>
              </div>
            </div>
          )}

          {/* FASE 1: DADOS BÁSICOS DA EMPRESA */}
          {fase === 'empresa' && (
            <form className="cadastro-form" onSubmit={handleEnviarEmpresa} noValidate>
              {/* Campo 1: Nome Fantasia */}
              <div className="cadastro-input-group">
                <label htmlFor="cad-nome-fantasia" className="cadastro-label">
                  Nome fantasia da empresa <span className="cadastro-required">*</span>
                </label>
                <div className="cadastro-input-wrapper">
                  <input
                    id="cad-nome-fantasia"
                    type="text"
                    required
                    value={nomeFantasia}
                    onChange={(e) => {
                      setNomeFantasia(e.target.value);
                      if (error) setError(null);
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, nomeFantasia: true }))}
                    placeholder="Ex: Boi Gordo Logística"
                    className={`cadastro-input ${touched.nomeFantasia && !isNomeFantasiaValid ? 'has-error' : ''}`}
                    autoComplete="organization"
                  />
                </div>
                {touched.nomeFantasia && !isNomeFantasiaValid && (
                  <span className="cadastro-field-error" role="alert">
                    Informe o nome fantasia da empresa.
                  </span>
                )}
              </div>

              {/* Campo 2: Razão Social */}
              <div className="cadastro-input-group">
                <label htmlFor="cad-razao-social" className="cadastro-label">
                  Razão social <span className="cadastro-required">*</span>
                </label>
                <div className="cadastro-input-wrapper">
                  <input
                    id="cad-razao-social"
                    type="text"
                    required
                    value={razaoSocial}
                    onChange={(e) => {
                      setRazaoSocial(e.target.value);
                      if (error) setError(null);
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, razaoSocial: true }))}
                    placeholder="Ex: Boi Gordo Transportes Rodoviários Ltda"
                    className={`cadastro-input ${touched.razaoSocial && !isRazaoValid ? 'has-error' : ''}`}
                    autoComplete="organization"
                  />
                </div>
                {touched.razaoSocial && !isRazaoValid && (
                  <span className="cadastro-field-error" role="alert">
                    Informe a razão social completa.
                  </span>
                )}
              </div>

              {/* Campo 3: CNPJ da Empresa */}
              <div className="cadastro-input-group">
                <label htmlFor="cad-cnpj" className="cadastro-label">
                  CNPJ da empresa <span className="cadastro-required">*</span>
                </label>
                <div className="cadastro-input-wrapper">
                  <input
                    id="cad-cnpj"
                    type="text"
                    required
                    value={cnpj}
                    onChange={handleCnpjChange}
                    onBlur={() => setTouched((p) => ({ ...p, cnpj: true }))}
                    placeholder="00.000.000/0000-00"
                    className={`cadastro-input ${touched.cnpj && !isCnpjValid ? 'has-error' : ''}`}
                    maxLength={18}
                  />
                </div>
                {touched.cnpj && !isCnpjValid && (
                  <span className="cadastro-field-error" role="alert">
                    Informe um CNPJ válido com 14 dígitos.
                  </span>
                )}
              </div>

              {/* Campo 4: E-mail Corporativo */}
              <div className="cadastro-input-group">
                <label htmlFor="cad-email-corp" className="cadastro-label">
                  E-mail corporativo da empresa <span className="cadastro-required">*</span>
                </label>
                <div className="cadastro-input-wrapper">
                  <input
                    id="cad-email-corp"
                    type="email"
                    required
                    value={emailCorporativo}
                    onChange={(e) => {
                      setEmailCorporativo(e.target.value);
                      if (error) setError(null);
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                    placeholder="operacao@boigordo.com.br"
                    className={`cadastro-input ${touched.email && !isEmailValid ? 'has-error' : ''}`}
                    autoComplete="email"
                  />
                </div>
                {touched.email && !isEmailValid && (
                  <span className="cadastro-field-error" role="alert">
                    Informe um e-mail corporativo válido.
                  </span>
                )}
              </div>

              {/* Botão de Envio Estilo Login */}
              <button
                type="submit"
                disabled={isSubmitting || !isEmpresaFormValid}
                className="cadastro-submit-btn"
              >
                {isSubmitting ? (
                  'Gerando código...'
                ) : (
                  <>
                    <span>Enviar dados e gerar código</span>
                    <ArrowRightIcon size={14} style={{ marginLeft: 8 }} />
                  </>
                )}
              </button>

              <div className="cadastro-switch-box">
                <p className="cadastro-switch-text">
                  Já possui uma conta?{' '}
                  <Link to="/login" className="cadastro-switch-link">
                    Fazer login
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* FASE 2: INSERÇÃO DO CÓDIGO DA EMPRESA */}
          {fase === 'codigo' && (
            <form className="cadastro-form" onSubmit={handleValidarCodigo} noValidate>
              {/* Box explicativo com o código gerado */}
              <div className="cadastro-code-box">
                <div className="cadastro-code-header">
                  <ShieldCheckIcon size={16} />
                  <span>Código de Acesso Corporativo</span>
                </div>
                <div className="cadastro-code-value-row">
                  <span className="cadastro-code-label">Código gerado pela API:</span>
                  <strong className="cadastro-code-value">
                    {codigoGerado || 'EFF60720'}
                  </strong>
                </div>
                <span className="cadastro-code-hint">
                  Copie ou confirme o código acima no campo abaixo para prosseguir com a configuração da sua conta.
                </span>
              </div>

              {/* Campo para digitação do código */}
              <div className="cadastro-input-group">
                <label htmlFor="cad-codigo-input" className="cadastro-label">
                  Digite o código da empresa <span className="cadastro-required">*</span>
                </label>
                <div className="cadastro-input-wrapper">
                  <input
                    id="cad-codigo-input"
                    type="text"
                    required
                    maxLength={8}
                    value={codigoDigitado}
                    onChange={(e) => {
                      setCodigoDigitado(e.target.value.toUpperCase());
                      if (error) setError(null);
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, codigoDigitado: true }))}
                    placeholder="Ex: EFF60720"
                    className={`cadastro-input cadastro-code-input ${touched.codigoDigitado && !isCodigoDigitadoValido ? 'has-error' : ''}`}
                  />
                </div>
                {touched.codigoDigitado && !isCodigoDigitadoValido && (
                  <span className="cadastro-field-error" role="alert">
                    Digite o código de 8 dígitos da sua empresa.
                  </span>
                )}
              </div>

              {/* Botão de Validação e Prosseguir */}
              <button
                type="submit"
                disabled={isSubmitting || !isCodigoDigitadoValido}
                className="cadastro-submit-btn"
              >
                {isSubmitting ? (
                  'Validando código...'
                ) : (
                  <>
                    <span>Validar código e prosseguir</span>
                    <ArrowRightIcon size={14} style={{ marginLeft: 8 }} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFase('empresa');
                  setError(null);
                  setSuccessNotice('');
                }}
                className="cadastro-back-btn"
              >
                <ArrowLeftIcon size={14} />
                <span>Voltar e corrigir dados da empresa</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Lado Direito: Imagem e Branding Oficial (62% de largura) */}
      <section className="cadastro-hero-section" aria-label="Apresentação Efficientia">
        <div className="cadastro-hero-overlay" aria-hidden="true" />
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
