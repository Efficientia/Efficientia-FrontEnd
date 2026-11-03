import { useState, useCallback, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { empresaService } from '../../services/empresaService';
import { formatTelefone, formatCpf } from '../../utils/validators';
import { checkPasswordSecurity, generateSecurePassword } from '../../utils/passwordSecurity';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  LogoCompletaIcon,
  PlusIcon,
  CloseIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
  CheckIcon,
  CalendarioIcon,
} from '../../components/icons';
import './Onboarding.css';

const LOCAL_LOGO_STORAGE_KEY = '@efficientia:empresa:logo_data';
const PENDING_EMPRESA_STORAGE_KEY = '@efficientia:onboarding:pending_empresa';

export interface PendingEmpresaData {
  id?: number;
  codigoEmpresa: string;
  cnpj: string;
  nomeEmpresa: string;
  nomeFantasia: string;
  razaoSocial: string;
  emailCorporativo: string;
}

function readPendingEmpresa(): PendingEmpresaData {
  try {
    const raw = localStorage.getItem(PENDING_EMPRESA_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    codigoEmpresa: 'EFF60720',
    cnpj: '',
    nomeEmpresa: 'Minha Empresa',
    nomeFantasia: 'Minha Empresa',
    razaoSocial: 'Minha Empresa Ltda',
    emailCorporativo: 'admin@empresa.com.br',
  };
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function Onboarding() {
  const navigate = useNavigate();
  const { cadastrarPrimeiroAdmin } = useAuth();

  const pending = readPendingEmpresa();

  // 1. Dados da Empresa (Endereço e Logo)
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOCAL_LOGO_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 2. Dados do Administrador
  const [adminNome, setAdminNome] = useState('');
  const [adminCargo, setAdminCargo] = useState('Diretor de Operações');
  const [adminCpf, setAdminCpf] = useState('');
  const [adminDataNascimento, setAdminDataNascimento] = useState('');
  const [adminEmail, setAdminEmail] = useState(pending.emailCorporativo || '');
  const [adminTelefone, setAdminTelefone] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [adminConfirmarSenha, setAdminConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<string | null>(null);

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

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      setLogoPreviewUrl(base64Url);
      try {
        localStorage.setItem(LOCAL_LOGO_STORAGE_KEY, base64Url);
      } catch {
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
      // Ignora erro
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSuggestPassword = () => {
    const generated = generateSecurePassword();
    setAdminSenha(generated);
    setAdminConfirmarSenha(generated);
    setShowPassword(true);
    setPwdFeedback('Senha de alta entropia gerada e aplicada nos dois campos.');
  };

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setFeedback(null);

      // Validação de Endereço da Empresa
      if (!cep.trim() || !logradouro.trim() || !numero.trim() || !cidade.trim() || !estado.trim()) {
        setFeedback({
          type: 'error',
          message: 'Preencha o endereço completo da sede da empresa (CEP, Logradouro, Número, Cidade e UF).',
        });
        return;
      }

      // Validação do Administrador
      if (!adminNome.trim() || !adminCpf.trim() || !adminEmail.trim() || !adminSenha.trim()) {
        setFeedback({
          type: 'error',
          message: 'Preencha todos os campos obrigatórios do administrador (Nome, CPF, E-mail e Senha).',
        });
        return;
      }

      const cpfLimpo = adminCpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        setFeedback({
          type: 'error',
          message: 'O CPF do administrador deve conter exatamente 11 dígitos.',
        });
        return;
      }

      if (adminSenha.length < 6) {
        setFeedback({
          type: 'error',
          message: 'A senha de acesso deve ter pelo menos 6 caracteres.',
        });
        return;
      }

      if (adminSenha !== adminConfirmarSenha) {
        setFeedback({
          type: 'error',
          message: 'A confirmação de senha não confere com a senha digitada.',
        });
        return;
      }

      const pwdSecurity = checkPasswordSecurity(adminSenha);
      if (pwdSecurity.isCompromised) {
        setFeedback({
          type: 'error',
          message: 'A senha informada é fraca ou comum. Utilize o gerador de senha segura.',
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const codigoEmpresa = pending.codigoEmpresa || 'EFF60720';

        // 1. Atualiza endereço e logo da empresa na API se houver ID
        if (pending.id) {
          try {
            await empresaService.atualizarDadosComplementares(pending.id, {
              cep: cep.replace(/\D/g, ''),
              logradouro: logradouro.trim(),
              numero: numero.trim(),
              cidade: cidade.trim(),
              estado: estado.trim(),
            });

            if (logoFile) {
              await empresaService.uploadLogo(pending.id, logoFile);
            }
          } catch (apiErr) {
            console.warn('Atualização remota complementar de empresa ignorada em fallback:', apiErr);
          }
        }

        // 2. Cadastra o primeiro administrador via endpoint oficial
        await cadastrarPrimeiroAdmin({
          codigoEmpresa,
          cnpj: pending.cnpj ? pending.cnpj.replace(/\D/g, '') : null,
          nome: adminNome.trim(),
          email: adminEmail.trim().toLowerCase(),
          senha: adminSenha,
          cpf: cpfLimpo,
          telefone: adminTelefone.replace(/\D/g, '') || null,
          cargo: adminCargo.trim() || 'Administrador',
        });

        // 3. Salva sessão concluída e limpa pendências
        localStorage.setItem('@efficientia:onboarding:completed', 'true');
        localStorage.setItem('@efficientia:auth:last_codigo_empresa', codigoEmpresa);
        localStorage.setItem('@efficientia:auth:last_email', adminEmail.trim().toLowerCase());
        localStorage.removeItem(PENDING_EMPRESA_STORAGE_KEY);

        setFeedback({
          type: 'success',
          message: 'Cadastro concluído com sucesso! Redirecionando para a tela de login...',
        });

        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: {
              codigoEmpresa,
              email: adminEmail.trim().toLowerCase(),
              sucessoCadastro: true,
            },
          });
        }, 1000);
      } catch (err: unknown) {
        console.error('Erro ao cadastrar primeiro administrador:', err);
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Não foi possível concluir o cadastro. Verifique os dados.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      cep,
      logradouro,
      numero,
      cidade,
      estado,
      adminNome,
      adminCargo,
      adminCpf,
      adminEmail,
      adminTelefone,
      adminSenha,
      adminConfirmarSenha,
      pending,
      logoFile,
      cadastrarPrimeiroAdmin,
      navigate,
    ]
  );

  return (
    <div className="onb-shell">
      {/* TOPBAR */}
      <header className="vg-topbar">
        <div className="vg-topbar-left">
          <div className="vg-brand">
            <LogoCompletaIcon height={42} className="vg-brand-logo" />
          </div>

          <div className="vg-topbar-divider" aria-hidden="true" />

          <div className="vg-page-heading">
            <h1 id="onboarding-heading">Configuração da Conta</h1>
            <p className="vg-page-subtitle">Endereço corporativo e administrador da empresa</p>
          </div>
        </div>

        <div className="vg-topbar-right">
          <div className="vg-avatar-wrapper" title="Perfil corporativo">
            <GenericUserAvatar size={38} name={adminNome || pending.nomeFantasia || 'Administrador'} />
          </div>
        </div>
      </header>

      <div className="onb-main-container">
        <main className="onb-content-area" aria-labelledby="onboarding-heading">
          <div className="onb-center-wrapper">
            {/* HEADER DA ETAPA */}
            <div className="onb-header-group">
              <div className="onb-step-badge">
                <span className="onb-step-tag">CÓDIGO: {pending.codigoEmpresa || 'EFF60720'}</span>
                <span className="onb-step-status">Finalização do Cadastro</span>
              </div>
              <h2 className="onb-title">Dados Complementares e Acesso do Administrador</h2>
              <p className="onb-subtitle">
                Complete o endereço da sede, o logotipo e informe os dados pessoais e credenciais de acesso do
                primeiro administrador da <strong>{pending.nomeFantasia || pending.razaoSocial}</strong>.
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

            {/* FORMULÁRIO PRINCIPAL COM LAYOUT REESTRUTURADO E BALANCEADO */}
            <form className="onb-setup-form" onSubmit={handleSubmit} noValidate>
              {/* LINHA SUPERIOR: ENDEREÇO DA SEDE (ESQUERDA) + LOGOTIPO (DIREITA) */}
              <div className="onb-top-row">
                {/* 1. ENDEREÇO DA SEDE DA EMPRESA */}
                <article className="onb-form-card onb-address-card">
                  <div className="onb-card-header">
                    <h3 className="onb-card-title">Endereço da Sede da Empresa</h3>
                    <span className="onb-card-hint">* Campos obrigatórios</span>
                  </div>

                  <p className="onb-card-desc">
                    Localização da sede da transportadora que constará nos relatórios e diários de rota.
                  </p>

                  <div className="onb-form-layout">
                    {/* Linha: CEP e UF */}
                    <div className="onb-form-row">
                      <div className="onb-form-field">
                        <label htmlFor="onb-cep" className="onb-label">
                          CEP da empresa <span className="onb-req">*</span>
                        </label>
                        <input
                          id="onb-cep"
                          type="text"
                          required
                          value={cep}
                          placeholder="79002-190"
                          onChange={(e) => setCep(formatCep(e.target.value))}
                          className="onb-input"
                          autoComplete="postal-code"
                        />
                      </div>

                      <div className="onb-form-field">
                        <label htmlFor="onb-estado" className="onb-label">
                          Estado / UF <span className="onb-req">*</span>
                        </label>
                        <select
                          id="onb-estado"
                          value={estado}
                          onChange={(e) => setEstado(e.target.value)}
                          className="onb-select"
                        >
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

                    {/* Linha: Logradouro */}
                    <div className="onb-form-field">
                      <label htmlFor="onb-logradouro" className="onb-label">
                        Logradouro (Rua, Avenida, Rodovia) <span className="onb-req">*</span>
                      </label>
                      <input
                        id="onb-logradouro"
                        type="text"
                        required
                        value={logradouro}
                        placeholder="Ex: Av. Afonso Pena"
                        onChange={(e) => setLogradouro(e.target.value)}
                        className="onb-input"
                        autoComplete="street-address"
                      />
                    </div>

                    {/* Linha: Número e Município */}
                    <div className="onb-form-row">
                      <div className="onb-form-field">
                        <label htmlFor="onb-numero" className="onb-label">
                          Número <span className="onb-req">*</span>
                        </label>
                        <input
                          id="onb-numero"
                          type="text"
                          required
                          value={numero}
                          placeholder="Ex: 2450"
                          onChange={(e) => setNumero(e.target.value)}
                          className="onb-input"
                        />
                      </div>

                      <div className="onb-form-field">
                        <label htmlFor="onb-cidade" className="onb-label">
                          Município / Cidade <span className="onb-req">*</span>
                        </label>
                        <input
                          id="onb-cidade"
                          type="text"
                          required
                          value={cidade}
                          placeholder="Ex: Campo Grande"
                          onChange={(e) => setCidade(e.target.value)}
                          className="onb-input"
                          autoComplete="address-level2"
                        />
                      </div>
                    </div>
                  </div>
                </article>

                {/* LOGOTIPO DA EMPRESA */}
                <article
                  className={`onb-logo-card ${isDraggingLogo ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <h3 className="onb-logo-title">LOGOTIPO DA EMPRESA</h3>

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
                      <img src={logoPreviewUrl} alt="Prévia do logotipo" className="onb-logo-preview" />
                    ) : (
                      <div className="onb-logo-placeholder-box">
                        <span className="onb-logo-add-icon" aria-hidden="true">
                          <PlusIcon size={20} />
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="onb-logo-format-info">
                    Formatos <strong>PNG, JPG ou SVG</strong> • até 5 MB
                  </p>

                  <div className="onb-logo-actions">
                    <button
                      type="button"
                      className="onb-btn-upload"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Selecionar logotipo
                    </button>

                    {logoPreviewUrl && (
                      <button
                        type="button"
                        className="onb-btn-remove-logo"
                        onClick={handleRemoveLogo}
                        title="Remover logotipo"
                      >
                        <CloseIcon size={14} className="onb-btn-icon-prefix" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </article>
              </div>

              {/* 2. DADOS DO PRIMEIRO ADMINISTRADOR (CARD EM LARGURA TOTAL) */}
              <article className="onb-form-card onb-admin-card">
                <div className="onb-card-header">
                  <h3 className="onb-card-title">Dados do Administrador da Conta</h3>
                  <span className="onb-card-hint">* Campos obrigatórios</span>
                </div>

                <p className="onb-card-desc">
                  O primeiro administrador terá acesso total à plataforma para gerenciar frota, equipes e parâmetros operacionais.
                </p>

                <div className="onb-form-layout">
                  {/* Linha 1: Nome e Cargo */}
                  <div className="onb-form-row">
                    <div className="onb-form-field">
                      <label htmlFor="adm-nome" className="onb-label">
                        Nome completo <span className="onb-req">*</span>
                      </label>
                      <input
                        id="adm-nome"
                        type="text"
                        required
                        value={adminNome}
                        placeholder="Ex: Roberto Silva"
                        onChange={(e) => setAdminNome(e.target.value)}
                        className="onb-input"
                        autoComplete="name"
                      />
                    </div>

                    <div className="onb-form-field">
                      <label htmlFor="adm-cargo" className="onb-label">
                        Cargo corporativo <span className="onb-req">*</span>
                      </label>
                      <input
                        id="adm-cargo"
                        type="text"
                        required
                        value={adminCargo}
                        placeholder="Ex: Diretor de Operações"
                        onChange={(e) => setAdminCargo(e.target.value)}
                        className="onb-input"
                      />
                    </div>
                  </div>

                  {/* Linha 2: CPF e Data de Nascimento */}
                  <div className="onb-form-row">
                    <div className="onb-form-field">
                      <label htmlFor="adm-cpf" className="onb-label">
                        CPF <span className="onb-req">*</span>
                      </label>
                      <input
                        id="adm-cpf"
                        type="text"
                        required
                        value={adminCpf}
                        placeholder="000.000.000-00"
                        onChange={(e) => setAdminCpf(formatCpf(e.target.value))}
                        className="onb-input"
                      />
                    </div>

                    <div className="onb-form-field">
                      <label htmlFor="adm-nasc" className="onb-label">
                        Data de nascimento
                      </label>
                      <div className="onb-input-date-wrapper">
                        <input
                          id="adm-nasc"
                          ref={dateInputRef}
                          type="date"
                          value={adminDataNascimento}
                          onChange={(e) => setAdminDataNascimento(e.target.value)}
                          className="onb-input onb-input-date"
                        />
                        <button
                          type="button"
                          className="onb-date-picker-btn"
                          onClick={() => {
                            try {
                              dateInputRef.current?.showPicker();
                            } catch {
                              dateInputRef.current?.focus();
                            }
                          }}
                          tabIndex={-1}
                          aria-label="Abrir calendário para selecionar data de nascimento"
                        >
                          <CalendarioIcon size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Linha 3: E-mail e Telefone */}
                  <div className="onb-form-row">
                    <div className="onb-form-field">
                      <label htmlFor="adm-email" className="onb-label">
                        E-mail de acesso corporativo <span className="onb-req">*</span>
                      </label>
                      <input
                        id="adm-email"
                        type="email"
                        required
                        value={adminEmail}
                        placeholder="admin@boigordo.com.br"
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="onb-input"
                        autoComplete="email"
                      />
                    </div>

                    <div className="onb-form-field">
                      <label htmlFor="adm-tel" className="onb-label">
                        Telefone / Celular
                      </label>
                      <input
                        id="adm-tel"
                        type="tel"
                        value={adminTelefone}
                        placeholder="(67) 99888-7766"
                        onChange={(e) => setAdminTelefone(formatTelefone(e.target.value))}
                        className="onb-input"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Linha 4: Senha e Confirmação de Senha (100% Simétricas e Alinhadas) */}
                  <div className="onb-form-row">
                    <div className="onb-form-field">
                      <div className="onb-label-row">
                        <label htmlFor="adm-senha" className="onb-label">
                          Senha de acesso <span className="onb-req">*</span>
                        </label>
                        <button
                          type="button"
                          className="onb-suggest-pwd-btn"
                          onClick={handleSuggestPassword}
                          title="Gera credencial segura de alta entropia"
                        >
                          <ShieldCheckIcon size={13} />
                          <span>Gerar senha forte</span>
                        </button>
                      </div>
                      <div className="onb-input-pwd-wrapper">
                        <input
                          id="adm-senha"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={adminSenha}
                          onChange={(e) => setAdminSenha(e.target.value)}
                          className="onb-input"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="onb-pwd-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                        >
                          {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="onb-form-field">
                      <div className="onb-label-row">
                        <label htmlFor="adm-conf-senha" className="onb-label">
                          Confirmar senha <span className="onb-req">*</span>
                        </label>
                        <span className="onb-label-spacer" aria-hidden="true" />
                      </div>
                      <div className="onb-input-pwd-wrapper">
                        <input
                          id="adm-conf-senha"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={adminConfirmarSenha}
                          onChange={(e) => setAdminConfirmarSenha(e.target.value)}
                          className="onb-input"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="onb-pwd-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                        >
                          {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {pwdFeedback && (
                    <div className="onb-pwd-notice" role="status">
                      <CheckIcon size={14} />
                      <span>{pwdFeedback}</span>
                    </div>
                  )}
                </div>
              </article>

              {/* AÇÃO PRINCIPAL CENTRALIZADA E PROEMINENTE */}
              <div className="onb-action-bar">
                <button
                  type="submit"
                  className="onb-btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Concluindo cadastro...'
                  ) : (
                    <>
                      <span>Concluir e ir para o Login</span>
                      <ArrowRightIcon size={16} className="onb-btn-icon-suffix" />
                    </>
                  )}
                </button>
                <p className="onb-terms-notice">
                  Após concluir, você poderá acessar o sistema utilizando o código da empresa, e-mail e senha.
                </p>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Onboarding;
