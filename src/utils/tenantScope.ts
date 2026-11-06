import type { AdminResponse, UsuarioResponse } from '../types/auth';
import type { EmpresaResponse } from '../types/empresa';
import type { RelatorioViagemResponse } from '../types/relatorio';

export interface TenantIdentity {
  empresaId: number;
  codigoEmpresa: string;
  nomeEmpresa?: string;
  isPrimaryDemoTenant: boolean;
}

const LOCAL_EMPRESAS_STORAGE_KEY = '@efficientia:empresas_cadastradas_v1';

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
 * Gera código oficial de empresa no mesmo padrão do CodigoEmpresaGenerator.java do backend:
 * 3 letras maiúsculas extraídas do nome fantasia/empresa + 5 dígitos numéricos (ex.: FRI48291).
 */
export function generateOfficialCompanyCode(nomeEmpresa: string): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const normalized = (nomeEmpresa || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();

  let prefix = normalized.slice(0, 3);
  while (prefix.length < 3) {
    prefix += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  const existingCodes = new Set(readLocalEmpresas().map((e) => e.codigoEmpresa?.toUpperCase()));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = String(Math.floor(10000 + Math.random() * 90000));
    const candidate = `${prefix}${suffix}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }

  return `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;
}

/**
 * Lê todas as empresas registradas localmente no navegador.
 */
export function readLocalEmpresas(): EmpresaResponse[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_EMPRESAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Salva ou atualiza uma empresa no registro local persistente.
 */
export function saveLocalEmpresa(empresa: EmpresaResponse): EmpresaResponse {
  if (typeof window === 'undefined') return empresa;
  try {
    const list = readLocalEmpresas();
    const cleanCode = normalizeCompanyCode(empresa.codigoEmpresa || empresa.codigo || empresa.codigoInterno);
    const cleanCnpj = (empresa.cnpj || '').replace(/\D/g, '');

    const normalized: EmpresaResponse = {
      ...empresa,
      id:
        empresa.id && Number.isFinite(Number(empresa.id)) && Number(empresa.id) > 0
          ? Number(empresa.id)
          : deriveDeterministicEmpresaId(cleanCode),
      codigoEmpresa: cleanCode,
      codigo: cleanCode,
      codigoInterno: cleanCode,
      cnpj: cleanCnpj || empresa.cnpj || '',
      nomeEmpresa: empresa.nomeEmpresa || empresa.nomeFantasia || empresa.nome || `Empresa ${cleanCode}`,
      nome: empresa.nome || empresa.nomeFantasia || empresa.nomeEmpresa || `Empresa ${cleanCode}`,
      nomeFantasia: empresa.nomeFantasia || empresa.nomeEmpresa || empresa.nome || `Empresa ${cleanCode}`,
      emailCorporativo: (empresa.emailCorporativo || empresa.email || '').trim().toLowerCase(),
      email: (empresa.email || empresa.emailCorporativo || '').trim().toLowerCase(),
      atualizadoEm: new Date().toISOString(),
    };

    const existingIdx = list.findIndex(
      (item) =>
        (cleanCode && normalizeCompanyCode(item.codigoEmpresa) === cleanCode) ||
        (cleanCnpj && (item.cnpj || '').replace(/\D/g, '') === cleanCnpj) ||
        (normalized.id && item.id === normalized.id)
    );

    if (existingIdx >= 0) {
      const prev = list[existingIdx];
      const merged: EmpresaResponse = {
        ...prev,
        ...normalized,
        id: normalized.id || prev.id,
        codigoEmpresa: normalized.codigoEmpresa || prev.codigoEmpresa,
        codigo: normalized.codigo || prev.codigo,
        codigoInterno: normalized.codigoInterno || prev.codigoInterno,
        nomeFantasia: normalized.nomeFantasia || prev.nomeFantasia,
        nomeEmpresa: normalized.nomeEmpresa || prev.nomeEmpresa,
        nome: normalized.nome || prev.nome,
        razaoSocial: normalized.razaoSocial || prev.razaoSocial,
        cnpj: normalized.cnpj || prev.cnpj,
        emailCorporativo: normalized.emailCorporativo || prev.emailCorporativo,
        email: normalized.email || prev.email,
        telefone: normalized.telefone ?? prev.telefone,
        cep: normalized.cep ?? prev.cep,
        logradouro: normalized.logradouro ?? prev.logradouro,
        numero: normalized.numero ?? prev.numero,
        cidade: normalized.cidade ?? prev.cidade,
        estado: normalized.estado ?? prev.estado,
        uf: normalized.uf ?? normalized.estado ?? prev.uf ?? prev.estado,
        logoUrl: normalized.logoUrl ?? prev.logoUrl,
        endereco: {
          id: normalized.endereco?.id ?? prev.endereco?.id ?? null,
          cep: normalized.cep ?? normalized.endereco?.cep ?? prev.cep ?? prev.endereco?.cep ?? null,
          logradouro:
            normalized.logradouro ??
            normalized.endereco?.logradouro ??
            prev.logradouro ??
            prev.endereco?.logradouro ??
            null,
          numero:
            normalized.numero ?? normalized.endereco?.numero ?? prev.numero ?? prev.endereco?.numero ?? null,
          cidade:
            normalized.cidade ?? normalized.endereco?.cidade ?? prev.cidade ?? prev.endereco?.cidade ?? null,
          estado:
            normalized.estado ?? normalized.endereco?.estado ?? prev.estado ?? prev.endereco?.estado ?? null,
          uf:
            normalized.uf ??
            normalized.estado ??
            normalized.endereco?.uf ??
            prev.uf ??
            prev.estado ??
            prev.endereco?.uf ??
            null,
        },
      };
      list[existingIdx] = merged;
      localStorage.setItem(LOCAL_EMPRESAS_STORAGE_KEY, JSON.stringify(list));
      return merged;
    }

    list.push(normalized);
    localStorage.setItem(LOCAL_EMPRESAS_STORAGE_KEY, JSON.stringify(list));
    return normalized;
  } catch {
    return empresa;
  }
}

export function findLocalEmpresaByCode(codigo?: string | null): EmpresaResponse | null {
  const clean = normalizeCompanyCode(codigo);
  if (!clean) return null;
  const list = readLocalEmpresas();
  return list.find((item) => normalizeCompanyCode(item.codigoEmpresa) === clean) ?? null;
}

export function findLocalEmpresaByCnpj(cnpj?: string | null): EmpresaResponse | null {
  const clean = (cnpj || '').replace(/\D/g, '');
  if (!clean) return null;
  const list = readLocalEmpresas();
  return list.find((item) => (item.cnpj || '').replace(/\D/g, '') === clean) ?? null;
}

export function findLocalEmpresaById(id?: number | null): EmpresaResponse | null {
  if (id == null || !Number.isFinite(Number(id))) return null;
  const numId = Number(id);
  const list = readLocalEmpresas();
  return list.find((item) => Number(item.id) === numId) ?? null;
}


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
  const storedLocal =
    findLocalEmpresaByCode(normalizedCode) ||
    (empresaId ? findLocalEmpresaById(Number(empresaId)) : null);
  const mergedPartial: Partial<EmpresaResponse> = {
    ...(storedLocal || {}),
    ...(partial || {}),
  };

  const known = KNOWN_COMPANY_CODES[normalizedCode];
  const resolvedId =
    empresaId && Number.isFinite(Number(empresaId)) && Number(empresaId) > 0
      ? Number(empresaId)
      : mergedPartial.id && Number.isFinite(Number(mergedPartial.id)) && Number(mergedPartial.id) > 0
      ? Number(mergedPartial.id)
      : known?.empresaId ?? deriveDeterministicEmpresaId(normalizedCode);

  const defaultName =
    mergedPartial?.nomeFantasia ||
    mergedPartial?.nomeEmpresa ||
    mergedPartial?.nome ||
    mergedPartial?.razaoSocial ||
    known?.nomeFantasia ||
    `Empresa ${normalizedCode}`;

  const defaultEmail = mergedPartial?.emailCorporativo || mergedPartial?.email || '';

  return {
    id: resolvedId,
    codigoEmpresa: normalizedCode,
    codigo: normalizedCode,
    codigoInterno: normalizedCode,
    nomeEmpresa: defaultName,
    nome: defaultName,
    nomeFantasia: defaultName,
    razaoSocial: mergedPartial?.razaoSocial || `${defaultName} S.A.`,
    cnpj: mergedPartial?.cnpj || '',
    email: defaultEmail,
    emailCorporativo: defaultEmail,
    telefone: mergedPartial?.telefone || null,
    enderecoId: mergedPartial?.enderecoId ?? null,
    endereco: mergedPartial?.endereco ?? {
      id: null,
      cep: mergedPartial?.cep ?? null,
      logradouro: mergedPartial?.logradouro ?? null,
      numero: mergedPartial?.numero ?? null,
      cidade: mergedPartial?.cidade ?? null,
      estado: mergedPartial?.estado ?? null,
      uf: mergedPartial?.uf ?? mergedPartial?.estado ?? null,
    },
    cep: mergedPartial?.cep || null,
    logradouro: mergedPartial?.logradouro || null,
    numero: mergedPartial?.numero || null,
    cidade: mergedPartial?.cidade || null,
    uf: mergedPartial?.uf || mergedPartial?.estado || null,
    estado: mergedPartial?.estado || mergedPartial?.uf || null,
    logoUrl: mergedPartial?.logoUrl || null,
    etapaCadastro: mergedPartial?.etapaCadastro ?? 3,
    cadastroCompleto: mergedPartial?.cadastroCompleto ?? true,
    status: mergedPartial?.status || 'ATIVO',
    requerPrimeiroAdmin: mergedPartial?.requerPrimeiroAdmin ?? false,
    proximoPasso: mergedPartial?.proximoPasso || 'PAINEL_ADMINISTRATIVO',
    mensagem: mergedPartial?.mensagem || null,
    criadoEm: mergedPartial?.criadoEm || null,
    atualizadoEm: mergedPartial?.atualizadoEm || null,
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
  const storedLocal = findLocalEmpresaByCode(codigoEmpresa);

  const rawEmpresaId =
    empresa?.id ??
    (user && 'empresaId' in user && user.empresaId != null ? Number(user.empresaId) : null) ??
    storedLocal?.id ??
    null;

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
    nomeEmpresa:
      empresa?.nomeFantasia ||
      empresa?.nomeEmpresa ||
      empresa?.razaoSocial ||
      storedLocal?.nomeFantasia ||
      storedLocal?.nomeEmpresa ||
      undefined,
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
