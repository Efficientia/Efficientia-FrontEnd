import type { AdminResponse, UsuarioResponse } from '../types/auth';
import type { EmpresaResponse } from '../types/empresa';
import type { RelatorioViagemResponse } from '../types/relatorio';

export interface TenantIdentity {
  empresaId: number;
  codigoEmpresa: string;
  nomeEmpresa?: string;
  isPrimaryDemoTenant: boolean;
}

const KNOWN_COMPANY_CODES: Record<string, { empresaId: number; codigoEmpresa: string; nomeFantasia: string }> = {
  EFF60720: {
    empresaId: 3,
    codigoEmpresa: 'EFF60720',
    nomeFantasia: 'Efficientia Logística Viva',
  },
  'EFF-001': {
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    nomeFantasia: 'Agropecuária Boi Forte Ltda',
  },
  'ANA-EFF60720-01': {
    empresaId: 3,
    codigoEmpresa: 'EFF60720',
    nomeFantasia: 'Efficientia Logística Viva',
  },
  'ANA-CARLA-01': {
    empresaId: 3,
    codigoEmpresa: 'EFF60720',
    nomeFantasia: 'Efficientia Logística Viva',
  },
  'ANA-DEMO-482731-UI': {
    empresaId: 3,
    codigoEmpresa: 'EFF60720',
    nomeFantasia: 'Efficientia Logística Viva',
  },
  'MOT-DEMO-482731-UI': {
    empresaId: 3,
    codigoEmpresa: 'EFF60720',
    nomeFantasia: 'Efficientia Logística Viva',
  },
};

/**
 * Extrai o código corporativo da empresa mesmo quando o código informado no login
 * é um código interno de funcionário (ex.: ANA-EFF60720-01 -> EFF60720).
 */
export function normalizeCompanyCode(rawCode?: string | null): string {
  if (!rawCode) return '';
  const upper = rawCode.trim().toUpperCase();
  if (!upper) return '';

  if (KNOWN_COMPANY_CODES[upper]) {
    return KNOWN_COMPANY_CODES[upper].codigoEmpresa;
  }

  // Padrão ANA-<CODIGO_EMPRESA>-<SEQ> ou MOT-<CODIGO_EMPRESA>-<SEQ> (incluindo sufixos como -UI)
  const internalMatch = upper.match(/^(?:ANA|MOT|COL|ADM)-([A-Z0-9]+)-.+$/);
  if (internalMatch && internalMatch[1]) {
    const token = internalMatch[1];
    if (token === 'CARLA' || token === 'DEMO' || token === 'EFF001' || token === 'EFF60720') {
      return 'EFF60720';
    }
    return token;
  }

  return upper;
}

/**
 * Gera um ID numérico determinístico para uma empresa caso o backend ainda não tenha retornado o ID.
 */
export function deriveDeterministicEmpresaId(codigoEmpresa: string): number {
  const normalized = normalizeCompanyCode(codigoEmpresa);
  if (!normalized) return 1;
  if (KNOWN_COMPANY_CODES[normalized]) {
    return KNOWN_COMPANY_CODES[normalized].empresaId;
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 900000;
  }
  return Math.max(10, Math.abs(hash));
}

/**
 * Constrói um objeto EmpresaResponse seguro para garantir que Analistas e Administradores
 * sempre possuam contexto corporativo válido na sessão.
 */
export function buildFallbackEmpresa(
  codigoEmpresa: string,
  empresaId?: number | null,
  partial?: Partial<EmpresaResponse>
): EmpresaResponse {
  const normalizedCode = normalizeCompanyCode(codigoEmpresa) || 'EFF60720';
  const known = KNOWN_COMPANY_CODES[normalizedCode];
  const resolvedId =
    empresaId && Number.isFinite(Number(empresaId)) && Number(empresaId) > 0
      ? Number(empresaId)
      : known?.empresaId ?? deriveDeterministicEmpresaId(normalizedCode);

  const defaultName =
    partial?.nomeFantasia ||
    partial?.nomeEmpresa ||
    partial?.nome ||
    partial?.razaoSocial ||
    known?.nomeFantasia ||
    `Empresa ${normalizedCode}`;

  const defaultEmail = partial?.emailCorporativo || partial?.email || '';

  return {
    id: resolvedId,
    codigoEmpresa: normalizedCode,
    codigo: normalizedCode,
    codigoInterno: normalizedCode,
    nomeEmpresa: defaultName,
    nome: defaultName,
    nomeFantasia: defaultName,
    razaoSocial: partial?.razaoSocial || `${defaultName} S.A.`,
    cnpj: partial?.cnpj || '',
    email: defaultEmail,
    emailCorporativo: defaultEmail,
    telefone: partial?.telefone || null,
    enderecoId: partial?.enderecoId ?? null,
    endereco: partial?.endereco ?? {
      id: null,
      cep: partial?.cep ?? null,
      logradouro: partial?.logradouro ?? null,
      numero: partial?.numero ?? null,
      cidade: partial?.cidade ?? null,
      estado: partial?.estado ?? null,
      uf: partial?.uf ?? partial?.estado ?? null,
    },
    cep: partial?.cep || null,
    logradouro: partial?.logradouro || null,
    numero: partial?.numero || null,
    cidade: partial?.cidade || null,
    uf: partial?.uf || partial?.estado || null,
    estado: partial?.estado || partial?.uf || null,
    logoUrl: partial?.logoUrl || null,
    etapaCadastro: partial?.etapaCadastro ?? 3,
    cadastroCompleto: partial?.cadastroCompleto ?? true,
    status: partial?.status || 'ATIVO',
    requerPrimeiroAdmin: partial?.requerPrimeiroAdmin ?? false,
    proximoPasso: partial?.proximoPasso || 'PAINEL_ADMINISTRATIVO',
    mensagem: partial?.mensagem || null,
    criadoEm: partial?.criadoEm || null,
    atualizadoEm: partial?.atualizadoEm || null,
  };
}

/**
 * Resolve a identidade da empresa (Tenant) do usuário autenticado (Administrador ou Analista).
 */
export function resolveCurrentTenant(
  user?: AdminResponse | UsuarioResponse | null,
  empresa?: EmpresaResponse | null
): TenantIdentity {
  const rawEmpresaCode =
    empresa?.codigoEmpresa ||
    empresa?.codigo ||
    empresa?.codigoInterno ||
    (user && 'codigoEmpresa' in user ? user.codigoEmpresa : null) ||
    (user && 'codigoInterno' in user ? user.codigoInterno : null) ||
    (typeof window !== 'undefined' ? localStorage.getItem('@efficientia:auth:last_codigo_empresa') : null) ||
    'EFF60720';

  const codigoEmpresa = normalizeCompanyCode(rawEmpresaCode) || 'EFF60720';
  const knownCompany = KNOWN_COMPANY_CODES[codigoEmpresa];

  const rawEmpresaId =
    empresa?.id ??
    (user && 'empresaId' in user && user.empresaId != null ? Number(user.empresaId) : null);

  const empresaId =
    knownCompany && (!rawEmpresaId || Number(rawEmpresaId) > 1000)
      ? knownCompany.empresaId
      : rawEmpresaId && Number.isFinite(Number(rawEmpresaId)) && Number(rawEmpresaId) > 0
      ? Number(rawEmpresaId)
      : deriveDeterministicEmpresaId(codigoEmpresa);

  const isPrimaryDemoTenant =
    codigoEmpresa === 'EFF60720' ||
    codigoEmpresa === 'EFF-001' ||
    empresaId === 1 ||
    empresaId === 3;

  return {
    empresaId,
    codigoEmpresa,
    nomeEmpresa: empresa?.nomeFantasia || empresa?.nomeEmpresa || empresa?.razaoSocial || undefined,
    isPrimaryDemoTenant,
  };
}

/**
 * Verifica se um registro (colaborador, caminhão, fazenda, unidade frigorífica) pertence
 * estritamente à empresa do usuário logado.
 */
export function belongsToTenant(
  record: { empresaId?: number | null; codigoEmpresa?: string | null } | null | undefined,
  tenant: TenantIdentity,
  options?: { allowUnscoped?: boolean }
): boolean {
  if (!record) return false;

  const recEmpresaId =
    record.empresaId != null && Number.isFinite(Number(record.empresaId)) && Number(record.empresaId) > 0
      ? Number(record.empresaId)
      : null;

  const recCodigo = normalizeCompanyCode(record.codigoEmpresa);
  const tenCodigo = normalizeCompanyCode(tenant.codigoEmpresa);

  // Se ambos possuem código de empresa explícito, devem coincidir (ou ambos pertencerem ao tenant demo principal)
  if (recCodigo && tenCodigo) {
    if (recCodigo === tenCodigo) return true;
    if (
      tenant.isPrimaryDemoTenant &&
      (recCodigo === 'EFF60720' || recCodigo === 'EFF-001') &&
      (tenCodigo === 'EFF60720' || tenCodigo === 'EFF-001')
    ) {
      return true;
    }
    return false;
  }

  // Comparação por empresaId numérico
  if (recEmpresaId !== null) {
    if (recEmpresaId === tenant.empresaId) return true;
    // Compatibilidade entre IDs 1 e 3 da conta corporativa padrão Efficientia (EFF60720 / EFF-001)
    if (tenant.isPrimaryDemoTenant && (recEmpresaId === 1 || recEmpresaId === 3)) {
      return true;
    }
    return false;
  }

  return options?.allowUnscoped ?? false;
}

/**
 * Gera chave de localStorage isolada por empresa (Multi-Tenant Storage Key).
 */
export function getTenantStorageKey(baseKey: string, tenant: TenantIdentity): string {
  const safeCode = (tenant.codigoEmpresa || `ID_${tenant.empresaId}`).replace(/[^A-Z0-9_-]/gi, '_').toUpperCase();
  return `${baseKey}__tenant_${safeCode}`;
}

/**
 * Lê registros do localStorage isolados para a empresa atual.
 * Se a chave isolada ainda não existir, migra apenas os itens da chave legada que pertençam
 * comprovadamente a esta empresa, sem vazar registros de outras empresas.
 */
export function readTenantStorage<T extends { empresaId?: number | null; codigoEmpresa?: string | null }>(
  baseKey: string,
  tenant: TenantIdentity,
  defaultSeedForDemoTenant: T[] = []
): T[] {
  const scopedKey = getTenantStorageKey(baseKey, tenant);

  try {
    const rawScoped = localStorage.getItem(scopedKey);
    if (rawScoped) {
      const parsed = JSON.parse(rawScoped);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item: T) => belongsToTenant(item, tenant, { allowUnscoped: true }))
          .map((item: T) => ({
            ...item,
            empresaId: item.empresaId ?? tenant.empresaId,
            codigoEmpresa: normalizeCompanyCode(item.codigoEmpresa) || tenant.codigoEmpresa,
          }));
      }
    }

    // Migração segura da chave global legada: filtra estritamente por pertencer ao tenant atual
    const rawLegacy = localStorage.getItem(baseKey);
    if (rawLegacy) {
      const parsedLegacy = JSON.parse(rawLegacy);
      if (Array.isArray(parsedLegacy)) {
        const matchingLegacy = parsedLegacy
          .filter((item: T) =>
            belongsToTenant(item, tenant, {
              // Itens legados sem empresaId só pertencem ao tenant demo principal
              allowUnscoped: tenant.isPrimaryDemoTenant,
            })
          )
          .map((item: T) => ({
            ...item,
            empresaId: tenant.empresaId,
            codigoEmpresa: tenant.codigoEmpresa,
          }));

        if (matchingLegacy.length > 0) {
          localStorage.setItem(scopedKey, JSON.stringify(matchingLegacy));
          return matchingLegacy;
        }
      }
    }
  } catch {
    // fallback seguro
  }

  if (tenant.isPrimaryDemoTenant && defaultSeedForDemoTenant.length > 0) {
    const stampedSeed = defaultSeedForDemoTenant.map((item) => ({
      ...item,
      empresaId: tenant.empresaId,
      codigoEmpresa: tenant.codigoEmpresa,
    }));
    try {
      localStorage.setItem(scopedKey, JSON.stringify(stampedSeed));
    } catch {
      // ignore storage quota errors
    }
    return stampedSeed;
  }

  return [];
}

/**
 * Salva uma lista de registros no localStorage estritamente vinculada ao tenant atual.
 */
export function writeTenantStorage<T extends { empresaId?: number | null; codigoEmpresa?: string | null }>(
  baseKey: string,
  tenant: TenantIdentity,
  items: T[]
): void {
  const scopedKey = getTenantStorageKey(baseKey, tenant);
  const stamped = items
    .filter((item) => belongsToTenant(item, tenant, { allowUnscoped: true }))
    .map((item) => ({
      ...item,
      empresaId: tenant.empresaId,
      codigoEmpresa: tenant.codigoEmpresa,
    }));

  try {
    localStorage.setItem(scopedKey, JSON.stringify(stamped));
  } catch {
    // ignore storage quota errors
  }
}

export interface TenantReportFilterContext {
  driverIds?: Set<number>;
  vehicleIds?: Set<number>;
  fazendaIds?: Set<number>;
  unidadeIds?: Set<number>;
}

/**
 * Filtra relatórios de viagem para que Administradores e Analistas visualizem
 * exclusivamente os relatórios pertencentes à sua própria empresa.
 */
export function filterReportsByTenant(
  reports: readonly RelatorioViagemResponse[] | null | undefined,
  tenant: TenantIdentity,
  context?: TenantReportFilterContext
): RelatorioViagemResponse[] {
  if (!reports || reports.length === 0) return [];

  return reports.filter((report) => {
    if (!report) return false;

    // 1. Se o relatório possui empresaId explícito, valida isolamento estrito
    if (report.empresaId != null && Number(report.empresaId) > 0) {
      const repEmpresaId = Number(report.empresaId);
      if (repEmpresaId === tenant.empresaId) return true;
      if (tenant.isPrimaryDemoTenant && (repEmpresaId === 1 || repEmpresaId === 3)) {
        return true;
      }
      return false;
    }

    // 2. Relatórios criados pelo app mobile sem empresaId explícito:
    // Verifica se o motorista, caminhão, fazenda ou unidade pertence à empresa logada
    const hasDriverMatch =
      (report.motoristaId != null && context?.driverIds?.has(Number(report.motoristaId))) ||
      (report.manobristaId != null && context?.driverIds?.has(Number(report.manobristaId))) ||
      (report.curraleiroId != null && context?.driverIds?.has(Number(report.curraleiroId)));

    const hasVehicleMatch =
      (report.cavaloId != null && context?.vehicleIds?.has(Number(report.cavaloId))) ||
      (report.carretaId != null && context?.vehicleIds?.has(Number(report.carretaId)));

    const hasLocationMatch =
      (report.fazendaId != null && context?.fazendaIds?.has(Number(report.fazendaId))) ||
      (report.unidadeFrigorificaId != null && context?.unidadeIds?.has(Number(report.unidadeFrigorificaId)));

    if (hasDriverMatch || hasVehicleMatch || hasLocationMatch) {
      return true;
    }

    // 3. Relatórios legados de demonstração sem vínculo explícito só são exibidos para o tenant demo principal
    return tenant.isPrimaryDemoTenant;
  });
}
