import { useCallback, useEffect, useMemo, useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/Layout/AuthenticatedLayout';
import { useAuth } from '../../hooks/useAuth';
import { useTheme, type FontSizeScale } from '../../contexts/ThemeContext';
import { empresaService } from '../../services/empresaService';
import type { EmpresaResponse } from '../../types/empresa';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import {
  getTenantStorageKey,
  normalizeCompanyCode,
  resolveCurrentTenant,
  type TenantIdentity,
} from '../../utils/tenantScope';
import {
  UploadIcon,
  CheckIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CopyIcon,
  BuildingIcon,
  SlidersIcon,
  BellIcon,
  AccessibilityIcon,
  KeyboardIcon,
  ResetIcon,
  SunIcon,
  MoonIcon,
  ShieldCheckIcon,
  LockIcon,
  InfoIcon,
} from '../../components/icons';
import './Configuracao.css';

const STORAGE_KEY = '@efficientia:configuracao';

export interface ConfigurationData {
  // 1. Dados da Empresa e Sede Operacional
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  codigoInterno: string;
  emailCorporativo: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  cidade: string;
  estado: string;

  // 2. Parâmetros Operacionais de Transporte
  tempoMaxViagemHoras: number;
  prazoAnaliseHoras: number;
  mortalidadeBloqueioCabecas: number;
  metaMortalidade: number;
  qtdAssinaturasObrigatorias: number;

  // 3. Alertas e Gestão Preventiva de Risco
  alertaSireneRe: boolean;
  alertaInspecaoDias: number;
  alertaCnhVencida: boolean;
  alertaTempoParadaImprevista: number;

  // 4. Acessibilidade & Interface (WCAG 2.1)
  tema: 'claro' | 'escuro';
  contraste: boolean;
  escalaFonte: FontSizeScale;
  reducaoMovimento: boolean;
  focoReforcado: boolean;
  espacamentoTexto: boolean;
}

const DEFAULT_CONFIG: ConfigurationData = {
  razaoSocial: 'Transboi Transportes Rodoviários Ltda.',
  nomeFantasia: 'Transboi Logística Viva',
  cnpj: '12.345.678/0001-90',
  codigoInterno: 'EFF60720',
  emailCorporativo: 'operacoes@transboi.com.br',
  telefone: '(65) 3612-4000',
  cep: '78000-000',
  logradouro: 'Rodovia BR-163, KM 204',
  numero: 'S/N - Bloco A',
  cidade: 'Cuiabá',
  estado: 'MT',

  tempoMaxViagemHoras: 8,
  prazoAnaliseHoras: 24,
  mortalidadeBloqueioCabecas: 1,
  metaMortalidade: 0.5,
  qtdAssinaturasObrigatorias: 4,

  alertaSireneRe: true,
  alertaInspecaoDias: 15,
  alertaCnhVencida: true,
  alertaTempoParadaImprevista: 60,

  tema: 'claro',
  contraste: false,
  escalaFonte: 'normal',
  reducaoMovimento: false,
  focoReforcado: false,
  espacamentoTexto: false,
};

function loadStoredConfiguration(
  tenant: TenantIdentity,
  empresa?: EmpresaResponse | null
): ConfigurationData {
  try {
    const scopedKey = getTenantStorageKey(STORAGE_KEY, tenant);
    const saved =
      localStorage.getItem(scopedKey) ||
      (tenant.isPrimaryDemoTenant ? localStorage.getItem(STORAGE_KEY) : null);
    const parsed = saved ? (JSON.parse(saved) as Partial<ConfigurationData>) : {};
    const baseConfig: ConfigurationData = tenant.isPrimaryDemoTenant
      ? DEFAULT_CONFIG
      : {
          ...DEFAULT_CONFIG,
          razaoSocial: empresa?.razaoSocial || empresa?.nomeEmpresa || '',
          nomeFantasia: empresa?.nomeFantasia || empresa?.nomeEmpresa || '',
          cnpj: empresa?.cnpj || '',
          codigoInterno: tenant.codigoEmpresa,
          emailCorporativo: empresa?.emailCorporativo || empresa?.email || '',
          telefone: empresa?.telefone || '',
          cep: empresa?.cep || empresa?.endereco?.cep || '',
          logradouro: empresa?.logradouro || empresa?.endereco?.logradouro || '',
          numero: empresa?.numero || empresa?.endereco?.numero || '',
          cidade: empresa?.cidade || empresa?.endereco?.cidade || '',
          estado: empresa?.estado || empresa?.uf || empresa?.endereco?.estado || empresa?.endereco?.uf || '',
        };
    return {
      ...baseConfig,
      ...(empresa?.nomeFantasia ? { nomeFantasia: empresa.nomeFantasia } : {}),
      ...(empresa?.razaoSocial ? { razaoSocial: empresa.razaoSocial } : {}),
      ...(empresa?.cnpj ? { cnpj: empresa.cnpj } : {}),
      ...(empresa?.codigoEmpresa || empresa?.codigo || empresa?.codigoInterno || tenant.codigoEmpresa
        ? {
            codigoInterno: normalizeCompanyCode(
              empresa?.codigoEmpresa ||
                empresa?.codigo ||
                empresa?.codigoInterno ||
                tenant.codigoEmpresa
            ),
          }
        : {}),
      ...(empresa?.emailCorporativo || empresa?.email
        ? { emailCorporativo: empresa.emailCorporativo || empresa.email || '' }
        : {}),
      ...(empresa?.telefone ? { telefone: empresa.telefone } : {}),
      ...(empresa?.cep || empresa?.endereco?.cep
        ? { cep: empresa.cep || empresa.endereco?.cep || '' }
        : {}),
      ...(empresa?.logradouro || empresa?.endereco?.logradouro
        ? { logradouro: empresa.logradouro || empresa.endereco?.logradouro || '' }
        : {}),
      ...(empresa?.numero || empresa?.endereco?.numero
        ? { numero: empresa.numero || empresa.endereco?.numero || '' }
        : {}),
      ...(empresa?.cidade || empresa?.endereco?.cidade
        ? { cidade: empresa.cidade || empresa.endereco?.cidade || '' }
        : {}),
      ...(empresa?.estado || empresa?.uf || empresa?.endereco?.estado || empresa?.endereco?.uf
        ? { estado: empresa.estado || empresa.uf || empresa.endereco?.estado || empresa.endereco?.uf || '' }
        : {}),
      ...parsed,
      codigoInterno:
        normalizeCompanyCode(
          empresa?.codigoEmpresa ||
            empresa?.codigo ||
            empresa?.codigoInterno ||
            tenant.codigoEmpresa
        ) || tenant.codigoEmpresa,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function Configuracao() {
  const navigate = useNavigate();
  const { user, empresa } = useAuth();
  const tenant = useMemo(() => resolveCurrentTenant(user, empresa), [user, empresa]);
  const scopedStorageKey = useMemo(() => getTenantStorageKey(STORAGE_KEY, tenant), [tenant]);
  const {
    theme,
    setTheme,
    comfortableContrast,
    setComfortableContrast,
    fontSize,
    setFontSize,
    reducedMotion,
    setReducedMotion,
    enhancedFocus,
    setEnhancedFocus,
    textSpacing,
    setTextSpacing,
    resetAccessibility,
  } = useTheme();

  const [data, setData] = useState<ConfigurationData>(() => loadStoredConfiguration(tenant, empresa));
  const [saved, setSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Logo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(empresa?.logoUrl || null);

  const empresaId = empresa?.id ?? tenant.empresaId;
  const companyName = data.nomeFantasia || empresa?.nomeFantasia || empresa?.nomeEmpresa || 'Minha Empresa';
  const companyCode =
    normalizeCompanyCode(data.codigoInterno || empresa?.codigoEmpresa || empresa?.codigo || tenant.codigoEmpresa) ||
    tenant.codigoEmpresa;

  const update = useCallback(<K extends keyof ConfigurationData>(key: K, value: ConfigurationData[K]) => {
    setData((current) => {
      const next = { ...current, [key]: value };
      try {
        localStorage.setItem(scopedStorageKey, JSON.stringify(next));
      } catch {
        // Ignora erro de storage
      }
      return next;
    });
    setSaved(false);
  }, [scopedStorageKey]);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(companyCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleSubmit = useCallback((event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    try {
      localStorage.setItem(scopedStorageKey, JSON.stringify(data));
      if (empresaId) {
        empresaService
          .atualizarDadosParcialmente(empresaId, {
            nomeFantasia: data.nomeFantasia,
            razaoSocial: data.razaoSocial,
            cnpj: data.cnpj,
            emailCorporativo: data.emailCorporativo,
            telefone: data.telefone,
            cep: data.cep,
            logradouro: data.logradouro,
            numero: data.numero,
            cidade: data.cidade,
            estado: data.estado,
          })
          .catch(() => {
            // Em caso de API indisponível, os dados persistem em localStorage normalmente
          });
      }
    } catch {
      // Ignora erro de quota
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }, [data, empresaId, scopedStorageKey]);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleSubmit();
        } else if (e.key === '1') {
          e.preventDefault();
          navigate('/visao-geral');
        } else if (e.key === '2') {
          e.preventDefault();
          navigate('/colaboradores');
        } else if (e.key === '3') {
          e.preventDefault();
          navigate('/frota');
        } else if (e.key === '4') {
          e.preventDefault();
          navigate('/fazenda-unidades');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, navigate]);

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/svg+xml', 'image/jpeg'].includes(file.type)) {
      setLogoFeedback({ type: 'error', msg: 'Formato inválido. Selecione uma imagem PNG, SVG ou JPEG.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoFeedback({ type: 'error', msg: 'Arquivo muito grande. O logotipo deve ter até 5 MB.' });
      return;
    }

    setLogoUploading(true);
    setLogoFeedback(null);
    try {
      if (empresaId) {
        const response = await empresaService.uploadLogo(empresaId, file);
        setCurrentLogoUrl(response.logoUrl || empresaService.obterUrlLogo(empresaId));
      } else {
        const localPreview = URL.createObjectURL(file);
        setCurrentLogoUrl(localPreview);
      }
      setLogoFeedback({ type: 'success', msg: 'Logotipo atualizado com sucesso!' });
      window.setTimeout(() => setLogoFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao fazer upload da logomarca.';
      setLogoFeedback({ type: 'error', msg });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleResetA11y = () => {
    resetAccessibility();
    update('tema', 'claro');
    update('contraste', false);
    update('escalaFonte', 'normal');
    update('reducaoMovimento', false);
    update('focoReforcado', false);
    update('espacamentoTexto', false);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <AuthenticatedLayout
      title="Configurações do Sistema"
      subtitle="Parâmetros operacionais, dados corporativos, regras de viagem e acessibilidade"
      headerRight={
        <button
          type="button"
          onClick={() => handleSubmit()}
          className="configuration-save-top"
          aria-label="Salvar alterações de configuração"
        >
          {saved ? (
            <>
              <CheckIcon size={16} style={{ marginRight: 6 }} />
              <span>Salvo com sucesso</span>
            </>
          ) : (
            <>
              <span>Salvar alterações</span>
              <span className="save-shortcut-badge">Alt + S</span>
              <ArrowRightIcon size={14} style={{ marginLeft: 6 }} />
            </>
          )}
        </button>
      }
    >
      <main className="configuration-content" id="main-content" tabIndex={-1}>
        <div className="configuration-container">
          {/* Navegação Rápida entre Seções (Página Única) */}
          <nav className="config-quick-nav" aria-label="Navegação rápida pelas seções de configuração">
            <button type="button" onClick={() => scrollToSection('secao-empresa')} className="quick-nav-item">
              <BuildingIcon size={15} />
              <span>Dados da Empresa</span>
            </button>
            <button type="button" onClick={() => scrollToSection('secao-operacao')} className="quick-nav-item">
              <SlidersIcon size={15} />
              <span>Parâmetros Operacionais</span>
            </button>
            <button type="button" onClick={() => scrollToSection('secao-alertas')} className="quick-nav-item">
              <BellIcon size={15} />
              <span>Alertas e Risco</span>
            </button>
            <button type="button" onClick={() => scrollToSection('secao-acessibilidade')} className="quick-nav-item">
              <AccessibilityIcon size={15} />
              <span>Acessibilidade</span>
            </button>
          </nav>

          {/* Banner de Feedback Global quando Salvo */}
          {saved && (
            <div className="config-global-alert" role="status">
              <CheckIcon size={18} />
              <span>Todas as configurações foram salvas com sucesso no sistema.</span>
            </div>
          )}

          <form id="configuration-form" onSubmit={handleSubmit} noValidate className="config-single-page-form">
            {/* ==========================================================
                SEÇÃO 1: IDENTIFICAÇÃO E DADOS DA EMPRESA
                ========================================================== */}
            <section id="secao-empresa" className="configuration-section">
              <div className="config-section-header">
                <div className="section-header-title">
                  <div className="section-icon-wrap">
                    <BuildingIcon size={20} />
                  </div>
                  <div>
                    <h2>Identificação e Dados da Empresa</h2>
                    <p className="configuration-card-description">
                      Informações institucionais utilizadas em cabeçalhos de relatórios, identificação da transportadora e acesso administrativo.
                    </p>
                  </div>
                </div>
              </div>

              {/* Logotipo e Código Corporativo */}
              <div className="config-empresa-box">
                <div className="config-logo-preview">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt={`Logo da empresa ${companyName}`}
                      className="config-logo-img"
                      onError={() => setCurrentLogoUrl(null)}
                    />
                  ) : (
                    <GenericUserAvatar size={80} name={companyName} />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    style={{ display: 'none' }}
                    onChange={handleLogoFileChange}
                  />
                  <button
                    type="button"
                    className="config-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    <UploadIcon size={15} />
                    <span>{logoUploading ? 'Enviando...' : 'Alterar Logotipo'}</span>
                  </button>
                </div>

                {/* Bloco do Código Corporativo Unificado (Web & App Mobile) */}
                <div className="config-empresa-pairing">
                  <div className="pairing-header">
                    <div className="pairing-header-left">
                      <LockIcon size={16} />
                      <strong>Código Corporativo de Acesso</strong>
                    </div>
                    <span className="pairing-badge-web">Credencial Web &amp; App Mobile</span>
                  </div>

                  <div className="pairing-code-row">
                    <span className="pairing-code-display">{companyCode}</span>
                    <button
                      type="button"
                      className="copy-code-btn"
                      onClick={handleCopyCode}
                      title="Copiar código corporativo para a área de transferência"
                    >
                      {copiedCode ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                      <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="pairing-notice-box">
                    <InfoIcon size={16} />
                    <p>
                      <strong>Importante:</strong> Este código corporativo é uma <strong>credencial obrigatória de acesso para toda a operação</strong> — tanto o <strong>Administrador</strong> e o <strong>Analista</strong> (na plataforma Web) quanto o <strong>Motorista</strong> (no aplicativo Mobile) utilizam este campo de credencial juntamente com seu CPF/e-mail e senha para realizar login e vincular seus registros à empresa.
                    </p>
                  </div>
                </div>
              </div>

              {logoFeedback && (
                <div className={`modal-alert modal-alert-${logoFeedback.type === 'success' ? 'success' : 'error'}`}>
                  {logoFeedback.type === 'success' ? <CheckIcon size={16} /> : <AlertTriangleIcon size={16} />}
                  <span>{logoFeedback.msg}</span>
                </div>
              )}

              {/* Grid de Dados Cadastrais */}
              <div className="config-form-grid">
                <label>
                  <span>Razão Social</span>
                  <input
                    type="text"
                    value={data.razaoSocial}
                    onChange={(e) => update('razaoSocial', e.target.value)}
                    placeholder="Ex: Transboi Transportes Rodoviários Ltda."
                  />
                </label>

                <label>
                  <span>Nome Fantasia</span>
                  <input
                    type="text"
                    value={data.nomeFantasia}
                    onChange={(e) => update('nomeFantasia', e.target.value)}
                    placeholder="Ex: Transboi Logística Viva"
                  />
                </label>

                <label>
                  <span>CNPJ</span>
                  <input
                    type="text"
                    value={data.cnpj}
                    onChange={(e) => update('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </label>

                <label>
                  <span>E-mail Corporativo</span>
                  <input
                    type="email"
                    value={data.emailCorporativo}
                    onChange={(e) => update('emailCorporativo', e.target.value)}
                    placeholder="operacoes@empresa.com.br"
                  />
                </label>

                <label>
                  <span>Telefone / WhatsApp</span>
                  <input
                    type="text"
                    value={data.telefone}
                    onChange={(e) => update('telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </label>
              </div>

              <div className="configuration-divider" />

              {/* Endereço da Sede Operacional */}
              <h3 className="config-subheading">Endereço da Sede Operacional</h3>
              <div className="config-form-grid">
                <label>
                  <span>CEP</span>
                  <input
                    type="text"
                    value={data.cep}
                    onChange={(e) => update('cep', e.target.value)}
                    placeholder="00000-000"
                  />
                </label>

                <label className="grid-col-span-2">
                  <span>Logradouro / Rodovia</span>
                  <input
                    type="text"
                    value={data.logradouro}
                    onChange={(e) => update('logradouro', e.target.value)}
                    placeholder="Ex: Rodovia BR-163, KM 204"
                  />
                </label>

                <label>
                  <span>Número / KM</span>
                  <input
                    type="text"
                    value={data.numero}
                    onChange={(e) => update('numero', e.target.value)}
                    placeholder="S/N ou número"
                  />
                </label>

                <label>
                  <span>Cidade</span>
                  <input
                    type="text"
                    value={data.cidade}
                    onChange={(e) => update('cidade', e.target.value)}
                    placeholder="Ex: Cuiabá"
                  />
                </label>

                <label>
                  <span>Estado / UF</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={data.estado}
                    onChange={(e) => update('estado', e.target.value.toUpperCase())}
                    placeholder="MT"
                  />
                </label>
              </div>

              <div className="section-inline-footer">
                <button
                  type="button"
                  className="section-redirect-link"
                  onClick={() => navigate('/colaboradores')}
                >
                  <span>Gerenciar Colaboradores e Usuários da Empresa</span>
                  <ArrowRightIcon size={14} />
                </button>
              </div>
            </section>

            {/* ==========================================================
                SEÇÃO 2: PARÂMETROS OPERACIONAIS E BEM-ESTAR ANIMAL
                ========================================================== */}
            <section id="secao-operacao" className="configuration-section">
              <div className="config-section-header">
                <div className="section-header-title">
                  <div className="section-icon-wrap">
                    <SlidersIcon size={20} />
                  </div>
                  <div>
                    <h2>Parâmetros Operacionais e Bem-Estar Animal</h2>
                    <p className="configuration-card-description">
                      Limites de viagem, critérios zootécnicos de transporte e prazos para condução e auditoria dos diários de rota.
                    </p>
                  </div>
                </div>
              </div>

              <div className="config-cards-split">
                <div className="config-field-card">
                  <div className="field-card-top">
                    <strong>Tempo Máximo de Viagem Contínua</strong>
                    <span className="field-unit-pill">Descanso Obrigatório</span>
                  </div>
                  <p className="field-description">
                    Limite contínuo de rodagem sem parada obrigatória para descanso e hidratação do lote bovino, conforme regulamento de transporte de carga viva.
                  </p>
                  <div className="field-input-row">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={data.tempoMaxViagemHoras}
                      onChange={(e) => update('tempoMaxViagemHoras', Number(e.target.value) || 8)}
                    />
                    <span className="input-suffix">horas</span>
                  </div>
                </div>

                <div className="config-field-card">
                  <div className="field-card-top">
                    <strong>Prazo de Auditoria da Viagem</strong>
                    <span className="field-unit-pill">Parecer do Analista</span>
                  </div>
                  <p className="field-description">
                    Prazo limite para o analista responsável auditar os checklists de embarque e emitir o parecer final sobre a viagem.
                  </p>
                  <div className="field-input-row">
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={data.prazoAnaliseHoras}
                      onChange={(e) => update('prazoAnaliseHoras', Number(e.target.value) || 24)}
                    />
                    <span className="input-suffix">horas</span>
                  </div>
                </div>

                <div className="config-field-card">
                  <div className="field-card-top">
                    <strong>Mortalidade com Bloqueio Automático</strong>
                    <span className="field-unit-pill">Controle de Perdas</span>
                  </div>
                  <p className="field-description">
                    Quantidade de óbitos no percurso que suspende a liberação direta do relatório e exige verificação técnica imediata.
                  </p>
                  <div className="field-input-row">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={data.mortalidadeBloqueioCabecas}
                      onChange={(e) => update('mortalidadeBloqueioCabecas', Number(e.target.value) || 1)}
                    />
                    <span className="input-suffix">animais</span>
                  </div>
                </div>

                <div className="config-field-card">
                  <div className="field-card-top">
                    <strong>Meta de Perda Máxima Tolerada</strong>
                    <span className="field-unit-pill">Índice Geral</span>
                  </div>
                  <p className="field-description">
                    Teto de tolerância zootécnica para o índice consolidado de mortalidade e lesões em trânsito da frota.
                  </p>
                  <div className="field-input-row">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.05"
                      value={data.metaMortalidade}
                      onChange={(e) => update('metaMortalidade', Number(e.target.value) || 0.5)}
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>

              <div className="configuration-divider" />

              {/* Fluxo de Assinaturas Digitais Obrigatórias */}
              <div className="signatures-config-box">
                <div className="signatures-header">
                  <ShieldCheckIcon size={20} />
                  <div>
                    <strong>Assinaturas Digitais Obrigatórias no Diário de Viagem</strong>
                    <p className="configuration-card-description" style={{ margin: 0 }}>
                      O sistema exige 4 confirmações registradas durante as etapas da viagem para fechamento e auditoria:
                    </p>
                  </div>
                </div>

                <div className="signatures-roles-grid">
                  <div className="role-tag">
                    <span className="role-number">1</span>
                    <div>
                      <strong>Pecuarista</strong>
                      <small>Embarque na Fazenda (sem senha, assina no celular)</small>
                    </div>
                  </div>
                  <div className="role-tag">
                    <span className="role-number">2</span>
                    <div>
                      <strong>Motorista</strong>
                      <small>Condução e Checklist do Trajeto</small>
                    </div>
                  </div>
                  <div className="role-tag">
                    <span className="role-number">3</span>
                    <div>
                      <strong>Manobrista</strong>
                      <small>Pátio do Frigorífico e Estacionamento</small>
                    </div>
                  </div>
                  <div className="role-tag">
                    <span className="role-number">4</span>
                    <div>
                      <strong>Curraleiro</strong>
                      <small>Recepção e Desembarque no Curral</small>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ==========================================================
                SEÇÃO 3: ALERTAS E GESTÃO PREVENTIVA DE RISCO
                ========================================================== */}
            <section id="secao-alertas" className="configuration-section">
              <div className="config-section-header">
                <div className="section-header-title">
                  <div className="section-icon-wrap">
                    <BellIcon size={20} />
                  </div>
                  <div>
                    <h2>Alertas e Gestão Preventiva de Risco</h2>
                    <p className="configuration-card-description">
                      Configuração dos gatilhos automáticos de segurança veicular, conformidade de condutores e desvios de rota.
                    </p>
                  </div>
                </div>
              </div>

              <div className="alerts-config-list">
                <div className="alert-config-row">
                  <div className="alert-config-info">
                    <strong>Falha em Sirene de Ré e Climatização / Ventilação</strong>
                    <p>
                      Dispara aviso prioritário no centro de operações caso o checklist diário aponte inoperância do alarme sonoro de marcha à ré ou exaustores da carroceria boiadeira.
                    </p>
                  </div>
                  <label className="toggle-switch-label" aria-label="Ativar alerta de falha de sirene de ré e ventilação">
                    <input
                      type="checkbox"
                      checked={data.alertaSireneRe}
                      onChange={(e) => update('alertaSireneRe', e.target.checked)}
                    />
                    <i />
                  </label>
                </div>

                <div className="alert-config-row">
                  <div className="alert-config-info">
                    <strong>Inspeção Sanitária e Veicular Preventiva</strong>
                    <p>
                      Alerta a administração com antecedência antes do vencimento do laudo técnico de desinfecção ou inspeção periódica do caminhão.
                    </p>
                  </div>
                  <div className="alert-number-control">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={data.alertaInspecaoDias}
                      onChange={(e) => update('alertaInspecaoDias', Number(e.target.value) || 15)}
                    />
                    <span>dias de antecedência</span>
                  </div>
                </div>

                <div className="alert-config-row">
                  <div className="alert-config-info">
                    <strong>CNH Profissional do Motorista Próxima ao Vencimento</strong>
                    <p>
                      Notifica a gestão 30 dias antes do vencimento da Carteira Nacional de Habilitação (categorias C, D e E) dos motoristas da frota.
                    </p>
                  </div>
                  <label className="toggle-switch-label" aria-label="Ativar notificação de vencimento de CNH">
                    <input
                      type="checkbox"
                      checked={data.alertaCnhVencida}
                      onChange={(e) => update('alertaCnhVencida', e.target.checked)}
                    />
                    <i />
                  </label>
                </div>

                <div className="alert-config-row">
                  <div className="alert-config-info">
                    <strong>Tolerância para Parada Não Programada em Trânsito</strong>
                    <p>
                      Tempo máximo em minutos que um caminhão com gado carregado pode permanecer parado sem justificativa antes de abrir ocorrência crítica de rota.
                    </p>
                  </div>
                  <div className="alert-number-control">
                    <input
                      type="number"
                      min="15"
                      max="300"
                      step="5"
                      value={data.alertaTempoParadaImprevista}
                      onChange={(e) => update('alertaTempoParadaImprevista', Number(e.target.value) || 60)}
                    />
                    <span>minutos</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ==========================================================
                SEÇÃO 4: ACESSIBILIDADE E PREFERÊNCIAS VISUAIS (WCAG 2.1)
                ========================================================== */}
            <section id="secao-acessibilidade" className="configuration-section">
              <div className="config-section-header">
                <div className="section-header-title">
                  <div className="section-icon-wrap">
                    <AccessibilityIcon size={20} />
                  </div>
                  <div>
                    <h2>Acessibilidade e Preferências de Interface</h2>
                    <p className="configuration-card-description">
                      Personalize a visualização para leitura confortável em ambientes externos, modo escuro e recursos para tecnologias assistivas.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="reset-a11y-btn"
                  onClick={handleResetA11y}
                  title="Redefinir acessibilidade para as configurações padrão"
                >
                  <ResetIcon size={14} />
                  <span>Restaurar Padrões</span>
                </button>
              </div>

              {/* 1. Modo de Tema */}
              <div className="a11y-section-row">
                <div className="a11y-info">
                  <strong>Tema Visual (Modo Escuro / Claro)</strong>
                  <p>
                    Alterne entre o tema claro para escritórios e o tema escuro para reduzir o cansaço visual em jornadas noturnas.
                  </p>
                </div>
                <div className="theme-toggle-buttons" role="group" aria-label="Seleção de tema">
                  <button
                    type="button"
                    className={`theme-btn ${theme === 'light' ? 'selected' : ''}`}
                    onClick={() => {
                      setTheme('light');
                      update('tema', 'claro');
                    }}
                  >
                    <SunIcon size={16} />
                    <span>Claro</span>
                  </button>
                  <button
                    type="button"
                    className={`theme-btn ${theme === 'dark' ? 'selected' : ''}`}
                    onClick={() => {
                      setTheme('dark');
                      update('tema', 'escuro');
                    }}
                  >
                    <MoonIcon size={16} />
                    <span>Escuro</span>
                  </button>
                </div>
              </div>

              <div className="configuration-divider" />

              {/* 2. Contraste Confortável / Alto Contraste */}
              <div className="a11y-section-row">
                <div className="a11y-info">
                  <strong>Contraste Confortável / Bordas Reforçadas</strong>
                  <p>
                    Aumenta a espessura de bordas e intensifica a distinção visual entre blocos de informação, ideal para telas de tablets em campo.
                  </p>
                </div>
                <label className="toggle-switch-label" aria-label="Ativar contraste confortável">
                  <input
                    type="checkbox"
                    checked={comfortableContrast}
                    onChange={(e) => {
                      setComfortableContrast(e.target.checked);
                      update('contraste', e.target.checked);
                    }}
                  />
                  <i />
                </label>
              </div>

              <div className="configuration-divider" />

              {/* 3. Escala do Tamanho da Fonte */}
              <div className="a11y-section-row vertical">
                <div className="a11y-info">
                  <strong>Escala e Tamanho da Fonte</strong>
                  <p>
                    Ajuste o tamanho tipográfico em até 125% para facilitar a leitura sem quebrar a estrutura da página.
                  </p>
                </div>
                <div className="font-scale-selector" role="group" aria-label="Tamanho da fonte">
                  {(
                    [
                      { key: 'normal', label: 'Padrão (100%)' },
                      { key: 'medio', label: 'Médio (110%)' },
                      { key: 'grande', label: 'Grande (120%)' },
                      { key: 'extragrande', label: 'Extra Grande (130%)' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`font-scale-btn ${fontSize === item.key ? 'active' : ''}`}
                      onClick={() => {
                        setFontSize(item.key);
                        update('escalaFonte', item.key);
                      }}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="font-preview-box">
                  <span className="font-preview-caption">Pré-visualização da leitura:</span>
                  <p className="font-preview-text">
                    "O bem-estar animal no transporte rodoviário garante conformidade sanitária e eficiência operacional."
                  </p>
                </div>
              </div>

              <div className="configuration-divider" />

              {/* 4. Redução de Movimento e Animações */}
              <div className="a11y-section-row">
                <div className="a11y-info">
                  <strong>Redução de Movimento e Transições</strong>
                  <p>
                    Desativa transições rápidas e efeitos visuais contínuos, útil para evitar desconforto visual e economizar bateria.
                  </p>
                </div>
                <label className="toggle-switch-label" aria-label="Ativar redução de movimento">
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => {
                      setReducedMotion(e.target.checked);
                      update('reducaoMovimento', e.target.checked);
                    }}
                  />
                  <i />
                </label>
              </div>

              <div className="configuration-divider" />

              {/* 5. Foco Teclado Reforçado */}
              <div className="a11y-section-row">
                <div className="a11y-info">
                  <strong>Indicador de Foco Teclado Reforçado</strong>
                  <p>
                    Exibe um anel de destaque visível ao navegar pelos campos usando a tecla Tab, atendendo ao critério WCAG 2.4.7.
                  </p>
                </div>
                <label className="toggle-switch-label" aria-label="Ativar foco teclado reforçado">
                  <input
                    type="checkbox"
                    checked={enhancedFocus}
                    onChange={(e) => {
                      setEnhancedFocus(e.target.checked);
                      update('focoReforcado', e.target.checked);
                    }}
                  />
                  <i />
                </label>
              </div>

              <div className="configuration-divider" />

              {/* 6. Espaçamento de Texto para Leitura Confortável */}
              <div className="a11y-section-row">
                <div className="a11y-info">
                  <strong>Espaçamento Ampliado de Leitura</strong>
                  <p>
                    Aumenta o espaçamento entre linhas e caracteres para facilitar a leitura por pessoas com dislexia ou fadiga visual.
                  </p>
                </div>
                <label className="toggle-switch-label" aria-label="Ativar espaçamento ampliado de leitura">
                  <input
                    type="checkbox"
                    checked={textSpacing}
                    onChange={(e) => {
                      setTextSpacing(e.target.checked);
                      update('espacamentoTexto', e.target.checked);
                    }}
                  />
                  <i />
                </label>
              </div>

              <div className="configuration-divider" />

              {/* 7. Atalhos de Teclado */}
              <div className="keyboard-shortcuts-card">
                <div className="shortcuts-title">
                  <KeyboardIcon size={18} />
                  <strong>Atalhos de Teclado Disponíveis</strong>
                </div>
                <div className="shortcuts-grid">
                  <div className="shortcut-item">
                    <kbd>Alt</kbd> + <kbd>S</kbd>
                    <span>Salvar alterações das configurações</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Alt</kbd> + <kbd>1</kbd>
                    <span>Ir para o Dashboard (Visão Geral)</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Alt</kbd> + <kbd>2</kbd>
                    <span>Ir para Colaboradores</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Alt</kbd> + <kbd>3</kbd>
                    <span>Ir para Gestão de Frota</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Alt</kbd> + <kbd>4</kbd>
                    <span>Ir para Fazendas e Frigoríficos</span>
                  </div>
                </div>
              </div>
            </section>

            {/* BARRA DE AÇÃO FIXA / RODAPÉ DO FORMULÁRIO */}
            <div className="config-form-bottom-actions">
              <span className="bottom-save-hint">
                As alterações são salvas localmente e sincronizadas com a sua conta.
              </span>
              <button
                type="submit"
                className="config-save-btn-primary"
                aria-label="Salvar todas as configurações"
              >
                {saved ? (
                  <>
                    <CheckIcon size={16} />
                    <span>Alterações Salvas!</span>
                  </>
                ) : (
                  <>
                    <span>Salvar Alterações</span>
                    <span className="save-shortcut-badge">Alt + S</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}

export default Configuracao;
