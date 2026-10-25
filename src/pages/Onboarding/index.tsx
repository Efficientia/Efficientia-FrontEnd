function readInitialEmpresa(): Partial<import('../../types/empresa').EmpresaResponse> | null {
  try {
    const pending = localStorage.getItem(PENDING_EMPRESA_STORAGE_KEY);
    if (pending) return JSON.parse(pending);
  } catch {
    // fallback
  }
  return null;
}
import { useState, useCallback, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { empresaService } from '../../services/empresaService';
import { formatCnpj, formatTelefone } from '../../utils/validators';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  BullBrandLogo,
} from '../Dashboard/DashboardIcons';
import './Onboarding.css';

const LOCAL_LOGO_STORAGE_KEY = '@efficientia:empresa:logo_data';
const PENDING_EMPRESA_STORAGE_KEY = '@efficientia:onboarding:pending_empresa';

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function Onboarding() {
  const navigate = useNavigate();
  const { empresa, atualizarEmpresaLocal } = useAuth();

  const initialEmpresa = empresa || readInitialEmpresa();

  // Estados dos campos da Etapa 1 (Dados da Empresa)
  const [cnpj, setCnpj] = useState(() => initialEmpresa?.cnpj ? formatCnpj(initialEmpresa.cnpj) : '');
  const [razaoSocial, setRazaoSocial] = useState(() => initialEmpresa?.razaoSocial || '');
  const [nomeFantasia, setNomeFantasia] = useState(() => initialEmpresa?.nomeEmpresa || initialEmpresa?.nomeFantasia || '');
  const [emailCorporativo, setEmailCorporativo] = useState(() => initialEmpresa?.emailCorporativo || '');
  const [telefone, setTelefone] = useState(() => initialEmpresa?.telefone ? formatTelefone(initialEmpresa.telefone) : '');
  const [cep, setCep] = useState(() => initialEmpresa?.endereco?.cep ? formatCep(initialEmpresa.endereco.cep) : '');
  const [logradouro, setLogradouro] = useState(() => initialEmpresa?.endereco?.logradouro || '');
  const [numero, setNumero] = useState(() => initialEmpresa?.endereco?.numero || '');
  const [cidade, setCidade] = useState(() => initialEmpresa?.endereco?.cidade || '');
  const [estado, setEstado] = useState(() => initialEmpresa?.endereco?.estado || initialEmpresa?.endereco?.uf || '');

  // Estado do logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(() => {
    try {
      return initialEmpresa?.logoUrl || localStorage.getItem(LOCAL_LOGO_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de submissão e feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);



  const processFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Selecione uma imagem válida (PNG, JPG ou SVG).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'O arquivo de logo deve ter no máximo 5MB.' });
      return;
    }

    setLogoFile(file);

    // Converte o arquivo para Base64 para garantir persistência imediata e offline
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      setLogoPreviewUrl(base64Url);
      try {
        localStorage.setItem(LOCAL_LOGO_STORAGE_KEY, base64Url);
      } catch {
        // Se a cota do localStorage for excedida, utiliza object URL
        setLogoPreviewUrl(URL.createObjectURL(file));
      }
    };
    reader.onerror = () => {
      setLogoPreviewUrl(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);

    setFeedback(null);
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  const handleDragLeave = () => {
    setIsDraggingLogo(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoFile(null);
    setLogoPreviewUrl(null);
    try {
      localStorage.removeItem(LOCAL_LOGO_STORAGE_KEY);
    } catch {
      // Ignora erro de limpeza local
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!cnpj.trim() || !razaoSocial.trim() || !emailCorporativo.trim()) {
        setFeedback({
          type: 'error',
          message: 'Por favor, preencha os campos obrigatórios (CNPJ, Razão Social e E-mail corporativo).',
        });
        return;
      }

      setIsSubmitting(true);
      setFeedback(null);

      const dadosAtualizados = {
        cnpj: cnpj.replace(/\D/g, ''),
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim() || razaoSocial.trim(),
        nomeEmpresa: nomeFantasia.trim() || razaoSocial.trim(),
        emailCorporativo: emailCorporativo.trim(),
        telefone: telefone.replace(/\D/g, ''),
        cep: cep.replace(/\D/g, ''),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        uf: estado.trim(),
        logoUrl: logoPreviewUrl,
      };

      try {
        // Tenta enviar para a API se houver empresa cadastrada no backend
        if (empresa?.id) {
          try {
            await empresaService.atualizarDadosComplementares(empresa.id, dadosAtualizados);
            if (logoFile) {
              const uploadRes = await empresaService.uploadLogo(empresa.id, logoFile);
              if (uploadRes?.logoUrl) {
                dadosAtualizados.logoUrl = uploadRes.logoUrl;
              }
            }
          } catch (apiErr: unknown) {
            console.warn('API remota indisponível ou offline. Aplicando persistência local segura:', apiErr);
          }
        }

        // Persistência local imediata e garantida no estado global e localStorage
        atualizarEmpresaLocal(dadosAtualizados);
        if (logoPreviewUrl) {
          try {
            localStorage.setItem(LOCAL_LOGO_STORAGE_KEY, logoPreviewUrl);
          } catch {
            // Ignora erro de cota
          }
        }

        setFeedback({
          type: 'success',
          message: 'Dados da empresa salvos com sucesso! Vamos continuar para a etapa 2…',
        });
        setTimeout(() => {
          navigate('/onboarding/etapa-2');
        }, 1200);
      } catch (err: unknown) {
        console.error('Erro ao salvar dados do onboarding:', err);
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Não foi possível salvar os dados. Tente novamente.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [cnpj, razaoSocial, nomeFantasia, emailCorporativo, telefone, cep, logradouro, numero, cidade, estado, empresa, logoFile, logoPreviewUrl, atualizarEmpresaLocal, navigate]
  );

  return (
    <div className="onb-shell">
      {/* TOPBAR */}
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-brand">
            <BullBrandLogo />
            <div className="vg-brand-text">
              <span className="vg-brand-title">
                Efficien<span className="vg-brand-highlight">tia</span>
              </span>
              <span className="vg-brand-Check">
                <span className="vg-brand-green">Eficiência</span> que viaja junto com você
              </span>
            </div>
          </div>

          <div className="vg-topbar-divider" aria-hidden="true" />

          <div className="vg-page-heading">
            <h1 id="onboarding-heading">Onboarding Inicial</h1>
            <p className="vg-page-subtitle">Passo 1 • Identificação e dados da transportadora</p>
          </div>
        </div>

        <div className="vg-topbar-right">
          <div className="vg-avatar-wrapper" title="Perfil corporativo">
            <GenericUserAvatar size={38} name={nomeFantasia || razaoSocial || 'Administrador'} />
          </div>
        </div>
      </header>

      <div className="onb-main-container">
        {/* SIDEBAR */}

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <main className="onb-content-area" aria-labelledby="onboarding-heading">
          <div className="onb-center-wrapper">
            {/* HEADER DA ETAPA E STEPPER */}
            <div className="onb-header-group">
              <div className="onb-step-badge">
                <span className="onb-step-tag">ETAPA 1 DE 3</span>
                <span className="onb-step-status">Configuração Inicial</span>
              </div>
              <div className="onb-stepper-bars">
                <div className="onb-step-bar active" title="Etapa 1: Dados da empresa" />
                <div className="onb-step-bar" title="Etapa 2: Operação e unidades" />
                <div className="onb-step-bar" title="Etapa 3: Administrador da conta" />
              </div>
              <h2 className="onb-title">Dados da empresa</h2>
              <p className="onb-subtitle">
                Preencha as informações que constarão nos relatórios, diários de bordo e documentos fiscais da sua operação.
              </p>
            </div>

            {feedback && (
              <div
                className={`onb-alert ${
                  feedback.type === 'success' ? 'onb-alert-success' : 'onb-alert-error'
                }`}
                role="alert"
              >
                {feedback.message}
              </div>
            )}

            {/* FORMULÁRIO PRINCIPAL */}
            <form className="onb-grid" onSubmit={handleSubmit} noValidate>
              {/* CARD ESQUERDO: IDENTIFICAÇÃO LEGAL */}
              <article className="onb-form-card">
                <div className="onb-card-header">
                  <h3 className="onb-card-title">Identificação legal e endereço</h3>
                  <span className="onb-card-hint">* Campos obrigatórios</span>
                </div>

                <div className="onb-form-layout">
                  {/* Linha 1: CNPJ e Razão Social */}
                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="onb-cnpj" className="onb-label">
                        CNPJ <span className="onb-req">*</span>
                      </label>
                      <input
                        id="onb-cnpj"
                        type="text"
                        required
                        value={cnpj}
                        onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                        className="onb-input"
                        autoComplete="organization"
                      />
                    </div>

                    <div className="onb-form-field onb-field-right">
                      <label htmlFor="onb-razao" className="onb-label">
                        Razão social <span className="onb-req">*</span>
                      </label>
                      <input
                        id="onb-razao"
                        type="text"
                        required
                        value={razaoSocial}
                        onChange={(e) => setRazaoSocial(e.target.value)}
                        className="onb-input"
                        autoComplete="organization"
                      />
                    </div>
                  </div>

                  {/* Linha 2: Nome Fantasia e E-mail Corporativo */}
                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="onb-fantasia" className="onb-label">
                        Nome fantasia
                      </label>
                      <input
                        id="onb-fantasia"
                        type="text"
                        value={nomeFantasia}
                        onChange={(e) => setNomeFantasia(e.target.value)}
                        className="onb-input"
                      />
                    </div>

                    <div className="onb-form-field onb-field-right">
                      <label htmlFor="onb-email" className="onb-label">
                        E-mail corporativo <span className="onb-req">*</span>
                      </label>
                      <input
                        id="onb-email"
                        type="email"
                        required
                        value={emailCorporativo}
                        onChange={(e) => setEmailCorporativo(e.target.value)}
                        className="onb-input"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Linha 3: Telefone e CEP + UF */}
                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="onb-telefone" className="onb-label">
                        Telefone de contato
                      </label>
                      <input
                        id="onb-telefone"
                        type="tel"
                        value={telefone}
                        placeholder="+55 (67) 99999-2048"
                        onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                        className="onb-input"
                        autoComplete="tel"
                      />
                    </div>

                    <div className="onb-field-split-group onb-field-right">
                      <div className="onb-form-field onb-field-split">
                        <label htmlFor="onb-cep" className="onb-label">
                          CEP
                        </label>
                        <input
                          id="onb-cep"
                          type="text"
                          value={cep}
                          placeholder="79002-190"
                          onChange={(e) => setCep(formatCep(e.target.value))}
                          className="onb-input"
                          autoComplete="postal-code"
                        />
                      </div>

                      <div className="onb-form-field onb-field-split">
                        <label htmlFor="onb-estado" className="onb-label">
                          UF
                        </label>
                        <select
                          id="onb-estado"
                          value={estado}
                          onChange={(e) => setEstado(e.target.value)}
                          className="onb-select"
                        >
                          <option value="">Selecione a UF</option>
                          <option value="MS">MS - Mato Grosso do Sul</option>
                          <option value="MT">MT - Mato Grosso</option>
                          <option value="GO">GO - Goiás</option>
                          <option value="SP">SP - São Paulo</option>
                          <option value="MG">MG - Minas Gerais</option>
                          <option value="PR">PR - Paraná</option>
                          <option value="RO">RO - Rondônia</option>
                          <option value="PA">PA - Pará</option>
                          <option value="TO">TO - Tocantins</option>
                          <option value="BA">BA - Bahia</option>
                          <option value="RS">RS - Rio Grande do Sul</option>
                          <option value="SC">SC - Santa Catarina</option>
                          <option value="RJ">RJ - Rio de Janeiro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Linha 4: Logradouro e Número + Cidade */}
                  <div className="onb-form-row">
                    <div className="onb-form-field onb-field-left">
                      <label htmlFor="onb-logradouro" className="onb-label">
                        Logradouro
                      </label>
                      <input
                        id="onb-logradouro"
                        type="text"
                        value={logradouro}
                        placeholder="Av. Afonso Pena"
                        onChange={(e) => setLogradouro(e.target.value)}
                        className="onb-input"
                        autoComplete="street-address"
                      />
                    </div>

                    <div className="onb-field-split-group onb-field-right">
                      <div className="onb-form-field onb-field-split">
                        <label htmlFor="onb-numero" className="onb-label">
                          Número
                        </label>
                        <input
                          id="onb-numero"
                          type="text"
                          value={numero}
                          placeholder="2450"
                          onChange={(e) => setNumero(e.target.value)}
                          className="onb-input"
                        />
                      </div>

                      <div className="onb-form-field onb-field-split">
                        <label htmlFor="onb-cidade" className="onb-label">
                          Cidade
                        </label>
                        <input
                          id="onb-cidade"
                          type="text"
                          value={cidade}
                          placeholder="Campo Grande"
                          onChange={(e) => setCidade(e.target.value)}
                          className="onb-input"
                          autoComplete="address-level2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              {/* COLUNA DIREITA: LOGO DA EMPRESA E AÇÃO */}
              <div className="onb-side-column">
                <article
                  className={`onb-logo-card ${isDraggingLogo ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <h3 className="onb-logo-title">LOGO DA EMPRESA</h3>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleLogoChange}
                  />

                  <div
                    className="onb-logo-circle"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    title="Clique para selecionar o logotipo da empresa"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="Prévia do logo da empresa" className="onb-logo-preview" />
                    ) : (
                      <div className="onb-logo-placeholder-box">
                        <svg
                          className="onb-logo-vector"
                          viewBox="0 0 22 34"
                          width="24"
                          height="36"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M0 33.12V0H21.62V5.842H6.26V12.926H18.86V18.768H6.26V27.278H21.62V33.12H0Z"
                            fill="#168A46"
                          />
                        </svg>
                        <span className="onb-logo-add-icon" aria-hidden="true">+</span>
                      </div>
                    )}
                  </div>

                  <p className="onb-logo-format-info">
                    Formatos <strong>PNG, JPG ou SVG</strong> • até 5 MB
                  </p>

                  <div className="onb-logo-buttons-group">
                    <button
                      type="button"
                      className="onb-btn-upload-logo"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreviewUrl ? 'Alterar logo' : 'Enviar logo'}
                    </button>
                    {logoPreviewUrl && (
                      <button
                        type="button"
                        className="onb-btn-remove-logo"
                        onClick={handleRemoveLogo}
                        title="Remover logo selecionado"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </article>

                <div className="onb-actions-wrapper">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="onb-btn-primary"
                  >
                    {isSubmitting ? (
                      <span className="onb-btn-loading">Salvando dados...</span>
                    ) : (
                      <>
                        <span>Salvar e continuar</span>
                        <span className="onb-btn-arrow" aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                  <p className="onb-action-helper">Você poderá editar essas informações depois no painel de configurações.</p>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Onboarding;
