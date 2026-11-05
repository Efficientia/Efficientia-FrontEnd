import React, { useCallback, useMemo, useState } from 'react';
import { AuthenticatedLayout } from '../../components/Layout/AuthenticatedLayout';
import { useAuth } from '../../hooks/useAuth';
import type { FuncionarioEmpresaResponse } from '../../types/funcionario';
import {
  NavFazendasUnidadesIcon,
  BuildingIcon,
  PlusIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  EditIcon,
  TrashIcon,
  MapPinIcon,
  SearchIcon,
  NavMotoristasIcon,
} from '../../components/icons';
import {
  readTenantStorage,
  resolveCurrentTenant,
  writeTenantStorage,
} from '../../utils/tenantScope';
import './FazendasUnidades.css';

export interface FazendaModel {
  id: number;
  empresaId?: number | null;
  codigoEmpresa?: string | null;
  nome: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
  pecuaristaId: number;
  cidade: string;
  uf: string;
  logradouro?: string | null;
  numero?: string | null;
  cep?: string | null;
  capacidadeEmbarqueCabecas?: number | null;
  ativo: boolean;
}

export interface UnidadeFrigorificaModel {
  id: number;
  empresaId?: number | null;
  codigoEmpresa?: string | null;
  nome: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  registroSif: string;
  analistaId: number;
  curraleiroId: number;
  manobristaId: number;
  cidade: string;
  uf: string;
  logradouro?: string | null;
  numero?: string | null;
  cep?: string | null;
  capacidadeAbateDiario: number;
  qtdCurrais?: number;
  ativo: boolean;
}

const FAZENDAS_STORAGE_KEY = 'efficientia_fazendas_v4';
const FRIGORIFICOS_STORAGE_KEY = 'efficientia_frigorificos_v4';
const COLABORADORES_STORAGE_KEY = 'efficientia_colaboradores_v3';

// Colaboradores padrão para garantir que os selects sempre tenham dados na empresa demo
const DEFAULT_COLLABORATORS: FuncionarioEmpresaResponse[] = [
  {
    id: 1,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'administrador',
    nome: 'Administrador Principal',
    cpf: '012.345.678-99',
    email: 'admin@efficientia.com',
    telefone: '(11) 98765-4321',
    cargo: 'Administrador Geral',
    ativo: true,
    criadoEm: '2026-01-10T10:00:00Z',
    isCurrentUser: true,
  },
  {
    id: 101,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'administrador',
    nome: 'Carlos Henrique Ramos',
    cpf: '219.843.512-00',
    email: 'carlos.ramos@empresa.com',
    telefone: '(11) 97123-4567',
    cargo: 'Gerente Geral de Logística',
    ativo: true,
    criadoEm: '2026-02-15T09:30:00Z',
  },
  {
    id: 102,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'motorista',
    nome: 'Jonas Ribeiro',
    cpf: '342.981.442-10',
    email: 'jonas.ribeiro@empresa.com',
    telefone: '(67) 99823-4411',
    cargo: 'Motorista Carreteiro',
    cnhNumero: '98765432100',
    categoriaCnh: 'E',
    dataVencimentoCnh: '2027-08-15',
    ativo: true,
    criadoEm: '2026-03-01T14:20:00Z',
  },
  {
    id: 103,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'motorista',
    nome: 'Marcos Tavares',
    cpf: '812.441.902-33',
    email: 'marcos.tavares@empresa.com',
    telefone: '(65) 99182-3091',
    cargo: 'Motorista Bi-trem',
    cnhNumero: '12345678901',
    categoriaCnh: 'E',
    dataVencimentoCnh: '2026-12-10',
    ativo: true,
    criadoEm: '2026-03-05T11:00:00Z',
  },
  {
    id: 116,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'motorista',
    nome: 'Sebastião Lima',
    cpf: '452.190.812-77',
    email: 'sebastiao.lima@empresa.com',
    telefone: '(66) 99654-7722',
    cargo: 'Motorista Rodo-Trem Boiadeiro',
    cnhNumero: '45678901234',
    categoriaCnh: 'E',
    dataVencimentoCnh: '2027-04-20',
    ativo: true,
    criadoEm: '2026-03-08T09:15:00Z',
  },
  {
    id: 117,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'motorista',
    nome: 'Paulo Henrique Costa',
    cpf: '612.390.441-55',
    email: 'paulo.costa@empresa.com',
    telefone: '(18) 99742-1133',
    cargo: 'Motorista Truck Boiadeiro',
    cnhNumero: '78901234567',
    categoriaCnh: 'D',
    dataVencimentoCnh: '2028-01-18',
    ativo: true,
    criadoEm: '2026-03-10T15:40:00Z',
  },
  {
    id: 104,
    empresaId: 1,
    codigoEmpresa: 'ANA-CARLA-01',
    tipo: 'analista',
    nome: 'Carla Mendes',
    cpf: '721.390.812-45',
    email: 'carla.mendes@empresa.com',
    telefone: '(65) 99341-8722',
    cargo: 'Analista de Bem-Estar Animal',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 105,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'curraleiro',
    nome: 'Tiago Ferreira',
    cpf: '552.129.831-77',
    email: 'tiago.ferreira@frigorifico.com',
    telefone: '(67) 99654-1289',
    cargo: 'Curraleiro de Desembarque',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 106,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'pecuarista',
    nome: 'Roberto Silveira',
    cpf: '198.452.901-22',
    email: 'roberto@fazendaboigordo.com.br',
    telefone: '(66) 99912-4450',
    cargo: 'Produtor Rural / Pecuarista',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 107,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'manobrista',
    nome: 'André Luís Moreira',
    cpf: '632.781.990-14',
    email: 'andre.moreira@patio.com',
    telefone: '(65) 98841-7720',
    cargo: 'Manobrista de Pátio SIF',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 108,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'pecuarista',
    nome: 'Antônio Marcos Prado',
    cpf: '334.812.901-44',
    email: 'antonio.prado@santamaria.agr.br',
    telefone: '(18) 99721-3344',
    cargo: 'Produtor Rural / Pecuarista',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 109,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'pecuarista',
    nome: 'Eduardo Fontes',
    cpf: '450.912.338-09',
    email: 'eduardo@estreladosul.com.br',
    telefone: '(67) 99988-1234',
    cargo: 'Produtor Rural / Pecuarista',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 110,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'pecuarista',
    nome: 'Valdir Siqueira',
    cpf: '581.204.991-32',
    email: 'valdir@araguaiapecuaria.com.br',
    telefone: '(66) 99844-3321',
    cargo: 'Produtor Rural / Pecuarista',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 111,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'curraleiro',
    nome: 'Danilo Vasconcelos',
    cpf: '441.902.118-72',
    email: 'danilo.vasconcelos@marfrig.com.br',
    telefone: '(14) 99812-7788',
    cargo: 'Curraleiro SIF',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 112,
    empresaId: 1,
    codigoEmpresa: 'ANA-EFF60720-01',
    tipo: 'analista',
    nome: 'Renata Bittencourt',
    cpf: '839.201.746-20',
    email: 'renata.analista@efficientia.com.br',
    telefone: '(17) 99712-4040',
    cargo: 'Analista de Qualidade e Bem-Estar',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 113,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'curraleiro',
    nome: 'Renato Albuquerque',
    cpf: '772.331.009-88',
    email: 'renato.albuquerque@minervafoods.com',
    telefone: '(17) 99655-9011',
    cargo: 'Curraleiro Técnico',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 114,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'manobrista',
    nome: 'Marcos Vinícius Pires',
    cpf: '883.210.455-61',
    email: 'marcos.pires@patio.com',
    telefone: '(17) 99122-3844',
    cargo: 'Manobrista de Carga Viva',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
  {
    id: 115,
    empresaId: 1,
    codigoEmpresa: 'EFF-001',
    tipo: 'curraleiro',
    nome: 'Maurício Neves',
    cpf: '912.440.812-55',
    email: 'mauricio.neves@barramansa.com.br',
    telefone: '(66) 99711-2289',
    cargo: 'Curraleiro SIF',
    ativo: true,
    criadoEm: '2026-01-10T08:00:00Z',
  },
];

const DEFAULT_FAZENDAS: FazendaModel[] = [
  {
    id: 1,
    nome: 'Fazenda Boi Gordo',
    razaoSocial: 'Agropecuária Boi Gordo Ltda',
    cnpj: '08.123.456/0001-90',
    inscricaoEstadual: '13.442.810-9',
    pecuaristaId: 106,
    cidade: 'Barra do Garças',
    uf: 'MT',
    logradouro: 'Rodovia BR-070, KM 48 - Zona Rural',
    numero: 'S/N',
    cep: '78600-000',
    capacidadeEmbarqueCabecas: 450,
    ativo: true,
  },
  {
    id: 2,
    nome: 'Fazenda Santa Maria',
    razaoSocial: 'Agro Santa Maria Participações',
    cnpj: '14.887.652/0001-14',
    inscricaoEstadual: '18.912.334-0',
    pecuaristaId: 108,
    cidade: 'Andradina',
    uf: 'SP',
    logradouro: 'Estrada Municipal AND-020, KM 12',
    numero: 'S/N',
    cep: '16900-000',
    capacidadeEmbarqueCabecas: 380,
    ativo: true,
  },
  {
    id: 3,
    nome: 'Fazenda Estrela do Sul',
    razaoSocial: 'Pecuária Estrela do Sul',
    cnpj: '22.341.988/0001-55',
    inscricaoEstadual: '28.114.770-3',
    pecuaristaId: 109,
    cidade: 'Três Lagoas',
    uf: 'MS',
    logradouro: 'Rodovia BR-262, KM 85',
    numero: 'S/N',
    cep: '79600-000',
    capacidadeEmbarqueCabecas: 300,
    ativo: true,
  },
  {
    id: 4,
    nome: 'Fazenda Vale do Araguaia',
    razaoSocial: 'Agropecuária Araguaia Ltda',
    cnpj: '31.908.122/0001-08',
    inscricaoEstadual: '13.998.411-2',
    pecuaristaId: 110,
    cidade: 'São Félix do Araguaia',
    uf: 'MT',
    logradouro: 'Estrada da Balsa, Linha 3',
    numero: 'S/N',
    cep: '78670-000',
    capacidadeEmbarqueCabecas: 520,
    ativo: true,
  },
];

const DEFAULT_FRIGORIFICOS: UnidadeFrigorificaModel[] = [
  {
    id: 1,
    nome: 'JBS Frigorífico SIF 450',
    razaoSocial: 'JBS S.A.',
    cnpj: '02.916.265/0001-00',
    registroSif: 'SIF 450',
    analistaId: 104,
    curraleiroId: 105,
    manobristaId: 107,
    cidade: 'Campo Grande',
    uf: 'MS',
    logradouro: 'Av. Duque de Caxias, 5500 - Serradinho',
    numero: '5500',
    cep: '79103-900',
    capacidadeAbateDiario: 2400,
    qtdCurrais: 12,
    ativo: true,
  },
  {
    id: 2,
    nome: 'Marfrig Global Foods SIF 2015',
    razaoSocial: 'Marfrig Global Foods S.A.',
    cnpj: '03.853.896/0001-40',
    registroSif: 'SIF 2015',
    analistaId: 104,
    curraleiroId: 111,
    manobristaId: 107,
    cidade: 'Promissão',
    uf: 'SP',
    logradouro: 'Rodovia Marechal Rondon, KM 452',
    numero: 'S/N',
    cep: '16370-000',
    capacidadeAbateDiario: 1800,
    qtdCurrais: 8,
    ativo: true,
  },
  {
    id: 3,
    nome: 'Minerva Foods SIF 1940',
    razaoSocial: 'Minerva S.A.',
    cnpj: '67.620.377/0001-30',
    registroSif: 'SIF 1940',
    analistaId: 112,
    curraleiroId: 113,
    manobristaId: 114,
    cidade: 'Barretos',
    uf: 'SP',
    logradouro: 'Av. Antônio F. de Rezende, 100',
    numero: '100',
    cep: '14781-545',
    capacidadeAbateDiario: 2100,
    qtdCurrais: 10,
    ativo: true,
  },
  {
    id: 4,
    nome: 'Frigorífico Barra Mansa SIF 324',
    razaoSocial: 'Barra Mansa Alimentos S.A.',
    cnpj: '48.910.422/0001-88',
    registroSif: 'SIF 324',
    analistaId: 104,
    curraleiroId: 115,
    manobristaId: 107,
    cidade: 'Rondonópolis',
    uf: 'MT',
    logradouro: 'Rodovia BR-364, KM 204',
    numero: 'S/N',
    cep: '78700-000',
    capacidadeAbateDiario: 1500,
    qtdCurrais: 6,
    ativo: true,
  },
];

export function FazendasUnidades() {
  const { empresa, user } = useAuth();
  const tenant = useMemo(() => resolveCurrentTenant(user, empresa), [user, empresa]);

  // Aba ativa: 'FAZENDAS' ou 'FRIGORIFICOS'
  const [activeTab, setActiveTab] = useState<'FAZENDAS' | 'FRIGORIFICOS'>('FAZENDAS');
  const [query, setQuery] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');

  // Colaboradores cadastrados isolados por empresa
  const [collaborators, setCollaborators] = useState<FuncionarioEmpresaResponse[]>(() =>
    readTenantStorage<FuncionarioEmpresaResponse>(COLABORADORES_STORAGE_KEY, tenant, DEFAULT_COLLABORATORS)
  );

  // Fazendas cadastradas isoladas por empresa
  const [fazendas, setFazendas] = useState<FazendaModel[]>(() =>
    readTenantStorage<FazendaModel>(FAZENDAS_STORAGE_KEY, tenant, DEFAULT_FAZENDAS)
  );

  // Frigoríficos cadastrados isolados por empresa
  const [frigorificos, setFrigorificos] = useState<UnidadeFrigorificaModel[]>(() =>
    readTenantStorage<UnidadeFrigorificaModel>(FRIGORIFICOS_STORAGE_KEY, tenant, DEFAULT_FRIGORIFICOS)
  );

  const persistFazendas = useCallback(
    (updated: FazendaModel[]) => {
      const stamped = updated.map((item) => ({
        ...item,
        empresaId: tenant.empresaId,
        codigoEmpresa: tenant.codigoEmpresa,
      }));
      setFazendas(stamped);
      writeTenantStorage(FAZENDAS_STORAGE_KEY, tenant, stamped);
    },
    [tenant]
  );

  const persistFrigorificos = useCallback(
    (updated: UnidadeFrigorificaModel[]) => {
      const stamped = updated.map((item) => ({
        ...item,
        empresaId: tenant.empresaId,
        codigoEmpresa: tenant.codigoEmpresa,
      }));
      setFrigorificos(stamped);
      writeTenantStorage(FRIGORIFICOS_STORAGE_KEY, tenant, stamped);
    },
    [tenant]
  );

  const persistCollaborators = useCallback(
    (updated: FuncionarioEmpresaResponse[]) => {
      const stamped = updated.map((item) => ({
        ...item,
        empresaId: tenant.empresaId,
        codigoEmpresa: tenant.codigoEmpresa,
      }));
      setCollaborators(stamped);
      writeTenantStorage(COLABORADORES_STORAGE_KEY, tenant, stamped);
    },
    [tenant]
  );

  // Listas filtradas de profissionais por cargo
  const pecuaristas = useMemo(
    () => collaborators.filter((c) => c.tipo === 'pecuarista' && c.ativo !== false),
    [collaborators]
  );
  const analistas = useMemo(
    () => collaborators.filter((c) => c.tipo === 'analista' && c.ativo !== false),
    [collaborators]
  );
  const curraleiros = useMemo(
    () => collaborators.filter((c) => c.tipo === 'curraleiro' && c.ativo !== false),
    [collaborators]
  );
  const manobristas = useMemo(
    () => collaborators.filter((c) => c.tipo === 'manobrista' && c.ativo !== false),
    [collaborators]
  );

  // Helpers para encontrar nomes de colaboradores
  const getColabName = useCallback(
    (id: number): string => {
      const found = collaborators.find((c) => c.id === id);
      return found ? found.nome : 'Colaborador não identificado';
    },
    [collaborators]
  );

  const getColabPhone = useCallback(
    (id: number): string | null => {
      const found = collaborators.find((c) => c.id === id);
      return found?.telefone || null;
    },
    [collaborators]
  );

  // --------------------------------------------------------------------------
  // MODAL DE FAZENDA
  // --------------------------------------------------------------------------
  const [showFazendaModal, setShowFazendaModal] = useState(false);
  const [editingFazenda, setEditingFazenda] = useState<FazendaModel | null>(null);
  const [deleteFazendaCandidate, setDeleteFazendaCandidate] = useState<FazendaModel | null>(null);

  const [formFazNome, setFormFazNome] = useState('');
  const [formFazRazao, setFormFazRazao] = useState('');
  const [formFazCnpj, setFormFazCnpj] = useState('');
  const [formFazIe, setFormFazIe] = useState('');
  const [formFazPecuaristaId, setFormFazPecuaristaId] = useState<number>(() => pecuaristas[0]?.id || 106);
  const [formFazCidade, setFormFazCidade] = useState('');
  const [formFazUf, setFormFazUf] = useState('MT');
  const [formFazLogradouro, setFormFazLogradouro] = useState('');
  const [formFazNumero, setFormFazNumero] = useState('S/N');
  const [formFazCep, setFormFazCep] = useState('');
  const [formFazCapacidade, setFormFazCapacidade] = useState('400');
  const [formFazAtivo, setFormFazAtivo] = useState(true);

  const [fazendaModalError, setFazendaModalError] = useState<string | null>(null);
  const [fazendaModalSuccess, setFazendaModalSuccess] = useState<string | null>(null);

  // Submodal de Novo Pecuarista
  const [showNovoPecuaristaModal, setShowNovoPecuaristaModal] = useState(false);
  const [novoPecNome, setNovoPecNome] = useState('');
  const [novoPecCpf, setNovoPecCpf] = useState('');
  const [novoPecTelefone, setNovoPecTelefone] = useState('');
  const [novoPecEmail, setNovoPecEmail] = useState('');
  const [novoPecError, setNovoPecError] = useState<string | null>(null);

  // Abrir modal de nova fazenda
  const handleOpenNewFazenda = () => {
    setEditingFazenda(null);
    setFormFazNome('');
    setFormFazRazao('');
    setFormFazCnpj('');
    setFormFazIe('');
    setFormFazPecuaristaId(pecuaristas[0]?.id || 106);
    setFormFazCidade('');
    setFormFazUf('MT');
    setFormFazLogradouro('');
    setFormFazNumero('S/N');
    setFormFazCep('');
    setFormFazCapacidade('400');
    setFormFazAtivo(true);
    setFazendaModalError(null);
    setFazendaModalSuccess(null);
    setShowFazendaModal(true);
  };

  // Abrir modal de edição de fazenda
  const handleOpenEditFazenda = (item: FazendaModel) => {
    setEditingFazenda(item);
    setFormFazNome(item.nome);
    setFormFazRazao(item.razaoSocial || '');
    setFormFazCnpj(item.cnpj || '');
    setFormFazIe(item.inscricaoEstadual || '');
    setFormFazPecuaristaId(item.pecuaristaId);
    setFormFazCidade(item.cidade);
    setFormFazUf(item.uf);
    setFormFazLogradouro(item.logradouro || '');
    setFormFazNumero(item.numero || 'S/N');
    setFormFazCep(item.cep || '');
    setFormFazCapacidade(item.capacidadeEmbarqueCabecas ? item.capacidadeEmbarqueCabecas.toString() : '');
    setFormFazAtivo(item.ativo !== false);
    setFazendaModalError(null);
    setFazendaModalSuccess(null);
    setShowFazendaModal(true);
  };

  // Salvar Fazenda
  const handleSaveFazenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFazNome.trim()) {
      setFazendaModalError('O nome da fazenda é obrigatório.');
      return;
    }
    if (!formFazCidade.trim()) {
      setFazendaModalError('A cidade/município da fazenda é obrigatória.');
      return;
    }
    if (!formFazPecuaristaId) {
      setFazendaModalError('É obrigatório vincular um pecuarista responsável.');
      return;
    }

    const payload: FazendaModel = {
      id: editingFazenda ? editingFazenda.id : Date.now(),
      empresaId: tenant.empresaId,
      codigoEmpresa: tenant.codigoEmpresa,
      nome: formFazNome.trim(),
      razaoSocial: formFazRazao.trim() || null,
      cnpj: formFazCnpj.trim() || null,
      inscricaoEstadual: formFazIe.trim() || null,
      pecuaristaId: Number(formFazPecuaristaId),
      cidade: formFazCidade.trim(),
      uf: formFazUf,
      logradouro: formFazLogradouro.trim() || null,
      numero: formFazNumero.trim() || 'S/N',
      cep: formFazCep.trim() || null,
      capacidadeEmbarqueCabecas: formFazCapacidade ? parseInt(formFazCapacidade, 10) : null,
      ativo: formFazAtivo,
    };

    if (editingFazenda) {
      const updated = fazendas.map((f) => (f.id === editingFazenda.id ? payload : f));
      persistFazendas(updated);
      setFazendaModalSuccess('Fazenda atualizada com sucesso!');
    } else {
      const updated = [payload, ...fazendas];
      persistFazendas(updated);
      setFazendaModalSuccess('Fazenda cadastrada com sucesso!');
    }

    setTimeout(() => {
      setShowFazendaModal(false);
      setFazendaModalSuccess(null);
    }, 1000);
  };

  // Alternar Status da Fazenda
  const handleToggleFazendaStatus = (item: FazendaModel) => {
    const updated = fazendas.map((f) => (f.id === item.id ? { ...f, ativo: !f.ativo } : f));
    persistFazendas(updated);
  };

  // Excluir Fazenda
  const handleConfirmDeleteFazenda = () => {
    if (!deleteFazendaCandidate) return;
    const updated = fazendas.filter((f) => f.id !== deleteFazendaCandidate.id);
    persistFazendas(updated);
    setDeleteFazendaCandidate(null);
  };

  // Cadastrar Novo Pecuarista instantaneamente
  const handleSaveNovoPecuarista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPecNome.trim()) {
      setNovoPecError('O nome do pecuarista é obrigatório.');
      return;
    }
    if (!novoPecTelefone.trim() && !novoPecCpf.trim()) {
      setNovoPecError('Informe ao menos o telefone ou o CPF do pecuarista.');
      return;
    }

    const newId = Date.now();
    const newPec: FuncionarioEmpresaResponse = {
      id: newId,
      empresaId: tenant.empresaId,
      codigoEmpresa: tenant.codigoEmpresa,
      tipo: 'pecuarista',
      nome: novoPecNome.trim(),
      cpf: novoPecCpf.trim() || '000.000.000-00',
      telefone: novoPecTelefone.trim(),
      email:
        novoPecEmail.trim().toLowerCase() ||
        `${novoPecNome.trim().toLowerCase().replace(/\s+/g, '.')}@pecuarista.com`,
      cargo: 'Produtor Rural / Pecuarista',
      ativo: true,
      criadoEm: new Date().toISOString(),
    };

    const updatedColabs = [...collaborators, newPec];
    persistCollaborators(updatedColabs);

    // Auto-seleciona o pecuarista recém-criado na fazenda
    setFormFazPecuaristaId(newId);
    setShowNovoPecuaristaModal(false);
    setNovoPecNome('');
    setNovoPecCpf('');
    setNovoPecTelefone('');
    setNovoPecEmail('');
    setNovoPecError(null);
  };

  // --------------------------------------------------------------------------
  // MODAL DE UNIDADE FRIGORÍFICA
  // --------------------------------------------------------------------------
  const [showFrigoModal, setShowFrigoModal] = useState(false);
  const [editingFrigo, setEditingFrigo] = useState<UnidadeFrigorificaModel | null>(null);
  const [deleteFrigoCandidate, setDeleteFrigoCandidate] = useState<UnidadeFrigorificaModel | null>(null);

  const [formFrigoNome, setFormFrigoNome] = useState('');
  const [formFrigoRazao, setFormFrigoRazao] = useState('');
  const [formFrigoCnpj, setFormFrigoCnpj] = useState('');
  const [formFrigoSif, setFormFrigoSif] = useState('');
  const [formFrigoAnalistaId, setFormFrigoAnalistaId] = useState<number>(() => analistas[0]?.id || 104);
  const [formFrigoCurraleiroId, setFormFrigoCurraleiroId] = useState<number>(() => curraleiros[0]?.id || 105);
  const [formFrigoManobristaId, setFormFrigoManobristaId] = useState<number>(() => manobristas[0]?.id || 107);
  const [formFrigoCidade, setFormFrigoCidade] = useState('');
  const [formFrigoUf, setFormFrigoUf] = useState('MS');
  const [formFrigoLogradouro, setFormFrigoLogradouro] = useState('');
  const [formFrigoNumero, setFormFrigoNumero] = useState('S/N');
  const [formFrigoCep, setFormFrigoCep] = useState('');
  const [formFrigoCapacidade, setFormFrigoCapacidade] = useState('2000');
  const [formFrigoCurrais, setFormFrigoCurrais] = useState('10');
  const [formFrigoAtivo, setFormFrigoAtivo] = useState(true);

  const [frigoModalError, setFrigoModalError] = useState<string | null>(null);
  const [frigoModalSuccess, setFrigoModalSuccess] = useState<string | null>(null);

  // Abrir modal de novo frigorífico
  const handleOpenNewFrigo = () => {
    setEditingFrigo(null);
    setFormFrigoNome('');
    setFormFrigoRazao('');
    setFormFrigoCnpj('');
    setFormFrigoSif('');
    setFormFrigoAnalistaId(analistas[0]?.id || 104);
    setFormFrigoCurraleiroId(curraleiros[0]?.id || 105);
    setFormFrigoManobristaId(manobristas[0]?.id || 107);
    setFormFrigoCidade('');
    setFormFrigoUf('MS');
    setFormFrigoLogradouro('');
    setFormFrigoNumero('S/N');
    setFormFrigoCep('');
    setFormFrigoCapacidade('2000');
    setFormFrigoCurrais('10');
    setFormFrigoAtivo(true);
    setFrigoModalError(null);
    setFrigoModalSuccess(null);
    setShowFrigoModal(true);
  };

  // Abrir modal de edição de frigorífico
  const handleOpenEditFrigo = (item: UnidadeFrigorificaModel) => {
    setEditingFrigo(item);
    setFormFrigoNome(item.nome);
    setFormFrigoRazao(item.razaoSocial || '');
    setFormFrigoCnpj(item.cnpj || '');
    setFormFrigoSif(item.registroSif);
    setFormFrigoAnalistaId(item.analistaId);
    setFormFrigoCurraleiroId(item.curraleiroId);
    setFormFrigoManobristaId(item.manobristaId);
    setFormFrigoCidade(item.cidade);
    setFormFrigoUf(item.uf);
    setFormFrigoLogradouro(item.logradouro || '');
    setFormFrigoNumero(item.numero || 'S/N');
    setFormFrigoCep(item.cep || '');
    setFormFrigoCapacidade(item.capacidadeAbateDiario.toString());
    setFormFrigoCurrais(item.qtdCurrais ? item.qtdCurrais.toString() : '10');
    setFormFrigoAtivo(item.ativo !== false);
    setFrigoModalError(null);
    setFrigoModalSuccess(null);
    setShowFrigoModal(true);
  };

  // Salvar Frigorífico
  const handleSaveFrigo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFrigoNome.trim()) {
      setFrigoModalError('O nome da unidade frigorífica é obrigatório.');
      return;
    }
    if (!formFrigoSif.trim()) {
      setFrigoModalError('O número de registro SIF é obrigatório.');
      return;
    }
    if (!formFrigoCidade.trim()) {
      setFrigoModalError('A cidade/município da planta é obrigatória.');
      return;
    }
    if (!formFrigoAnalistaId || !formFrigoCurraleiroId || !formFrigoManobristaId) {
      setFrigoModalError('É obrigatório vincular o Analista, Curraleiro e Manobrista da unidade.');
      return;
    }

    const payload: UnidadeFrigorificaModel = {
      id: editingFrigo ? editingFrigo.id : Date.now(),
      empresaId: tenant.empresaId,
      codigoEmpresa: tenant.codigoEmpresa,
      nome: formFrigoNome.trim(),
      razaoSocial: formFrigoRazao.trim() || null,
      cnpj: formFrigoCnpj.trim() || null,
      registroSif: formFrigoSif.trim().toUpperCase(),
      analistaId: Number(formFrigoAnalistaId),
      curraleiroId: Number(formFrigoCurraleiroId),
      manobristaId: Number(formFrigoManobristaId),
      cidade: formFrigoCidade.trim(),
      uf: formFrigoUf,
      logradouro: formFrigoLogradouro.trim() || null,
      numero: formFrigoNumero.trim() || 'S/N',
      cep: formFrigoCep.trim() || null,
      capacidadeAbateDiario: formFrigoCapacidade ? parseInt(formFrigoCapacidade, 10) : 2000,
      qtdCurrais: formFrigoCurrais ? parseInt(formFrigoCurrais, 10) : 10,
      ativo: formFrigoAtivo,
    };

    if (editingFrigo) {
      const updated = frigorificos.map((u) => (u.id === editingFrigo.id ? payload : u));
      persistFrigorificos(updated);
      setFrigoModalSuccess('Unidade frigorífica atualizada com sucesso!');
    } else {
      const updated = [payload, ...frigorificos];
      persistFrigorificos(updated);
      setFrigoModalSuccess('Unidade frigorífica cadastrada com sucesso!');
    }

    setTimeout(() => {
      setShowFrigoModal(false);
      setFrigoModalSuccess(null);
    }, 1000);
  };

  // Alternar Status do Frigorífico
  const handleToggleFrigoStatus = (item: UnidadeFrigorificaModel) => {
    const updated = frigorificos.map((u) => (u.id === item.id ? { ...u, ativo: !u.ativo } : u));
    persistFrigorificos(updated);
  };

  // Excluir Frigorífico
  const handleConfirmDeleteFrigo = () => {
    if (!deleteFrigoCandidate) return;
    const updated = frigorificos.filter((u) => u.id !== deleteFrigoCandidate.id);
    persistFrigorificos(updated);
    setDeleteFrigoCandidate(null);
  };

  // --------------------------------------------------------------------------
  // FILTRAGEM
  // --------------------------------------------------------------------------
  const filteredFazendas = useMemo(() => {
    const term = query.trim().toLowerCase();
    return fazendas.filter((f) => {
      if (statusFiltro === 'ATIVOS' && !f.ativo) return false;
      if (statusFiltro === 'INATIVOS' && f.ativo) return false;
      if (!term) return true;

      const pecuarista = getColabName(f.pecuaristaId);
      const str = [f.nome, f.razaoSocial, f.cnpj, f.cidade, f.uf, pecuarista]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return str.includes(term);
    });
  }, [fazendas, query, statusFiltro, getColabName]);

  const filteredFrigorificos = useMemo(() => {
    const term = query.trim().toLowerCase();
    return frigorificos.filter((u) => {
      if (statusFiltro === 'ATIVOS' && !u.ativo) return false;
      if (statusFiltro === 'INATIVOS' && u.ativo) return false;
      if (!term) return true;

      const analista = getColabName(u.analistaId);
      const curraleiro = getColabName(u.curraleiroId);
      const manobrista = getColabName(u.manobristaId);
      const str = [u.nome, u.razaoSocial, u.registroSif, u.cnpj, u.cidade, u.uf, analista, curraleiro, manobrista]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return str.includes(term);
    });
  }, [frigorificos, query, statusFiltro, getColabName]);

  // --------------------------------------------------------------------------
  // KPIS
  // --------------------------------------------------------------------------
  const totalFazendas = fazendas.length;
  const fazendasAtivas = fazendas.filter((f) => f.ativo).length;
  const totalCapacidadeEmbarque = fazendas
    .filter((f) => f.ativo)
    .reduce((acc, f) => acc + (f.capacidadeEmbarqueCabecas || 0), 0);
  const pecuaristasUnicos = new Set(fazendas.map((f) => f.pecuaristaId)).size;

  const totalFrigorificos = frigorificos.length;
  const frigorificosAtivos = frigorificos.filter((u) => u.ativo).length;
  const totalCapacidadeAbate = frigorificos
    .filter((u) => u.ativo)
    .reduce((acc, u) => acc + (u.capacidadeAbateDiario || 0), 0);
  const totalCurrais = frigorificos.reduce((acc, u) => acc + (u.qtdCurrais || 0), 0);

  return (
    <AuthenticatedLayout
      title="Fazendas e Unidades Frigoríficas"
      subtitle="Polos de origem (embarque de gado) e destinos frigoríficos inspecionados (SIF)"
      headerRight={
        activeTab === 'FAZENDAS' ? (
          <button type="button" className="polo-novo-btn" onClick={handleOpenNewFazenda}>
            <PlusIcon size={16} />
            <span>Cadastrar Fazenda</span>
          </button>
        ) : (
          <button type="button" className="polo-novo-btn" onClick={handleOpenNewFrigo}>
            <PlusIcon size={16} />
            <span>Cadastrar Frigorífico</span>
          </button>
        )
      }
    >
      <div className="polos-page-shell">
        {/* SELETOR DE ABAS PRINCIPAIS: FAZENDAS vs UNIDADES FRIGORÍFICAS */}
        <div className="polos-primary-tabs" role="tablist" aria-label="Visualização de polos operacionais">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'FAZENDAS'}
            className={`polos-tab-btn ${activeTab === 'FAZENDAS' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('FAZENDAS');
              setQuery('');
            }}
          >
            <NavFazendasUnidadesIcon size={18} />
            <span>Fazendas Produtoras (Origem)</span>
            <span className="polos-tab-counter">{totalFazendas}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'FRIGORIFICOS'}
            className={`polos-tab-btn ${activeTab === 'FRIGORIFICOS' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('FRIGORIFICOS');
              setQuery('');
            }}
          >
            <BuildingIcon size={18} />
            <span>Unidades Frigoríficas SIF (Destino)</span>
            <span className="polos-tab-counter">{totalFrigorificos}</span>
          </button>
        </div>

        {/* ==============================================================
            VISÃO 1: FAZENDAS PRODUTORAS
            ============================================================== */}
        {activeTab === 'FAZENDAS' && (
          <div className="polos-view-container">
            {/* CARDS DE RESUMO (KPIS DAS FAZENDAS) */}
            <section className="polos-kpis-grid" aria-label="Resumo operacional de fazendas">
              <article className="polo-kpi-card">
                <span className="kpi-label">Fazendas Cadastradas</span>
                <strong className="kpi-number">{totalFazendas}</strong>
                <small className="kpi-detail">{fazendasAtivas} propriedades ativas</small>
              </article>

              <article className="polo-kpi-card">
                <span className="kpi-label">Pecuaristas Responsáveis</span>
                <strong className="kpi-number">{pecuaristasUnicos}</strong>
                <small className="kpi-detail">{pecuaristas.length} produtores na base</small>
              </article>

              <article className="polo-kpi-card">
                <span className="kpi-label">Capacidade de Embarque</span>
                <strong className="kpi-number">{totalCapacidadeEmbarque.toLocaleString('pt-BR')}</strong>
                <small className="kpi-detail">Bovinos prontos para transporte</small>
              </article>

              <article className="polo-kpi-card">
                <span className="kpi-label">UFs de Origem</span>
                <strong className="kpi-number">
                  {new Set(fazendas.map((f) => f.uf)).size} Estados
                </strong>
                <small className="kpi-detail">Malha Centro-Oeste / Sudeste</small>
              </article>
            </section>

            {/* BARRA DE PESQUISA, FILTROS E AÇÃO */}
            <div className="polos-toolbar">
              <div className="polos-search-wrap">
                <SearchIcon size={16} />
                <input
                  type="search"
                  placeholder="Buscar fazenda por nome, pecuarista, cidade ou UF..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="polos-search-input"
                />
              </div>

              <div className="polos-status-wrap">
                <label htmlFor="filtro-status-fazenda">Status:</label>
                <select
                  id="filtro-status-fazenda"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as typeof statusFiltro)}
                >
                  <option value="TODOS">Todos os status</option>
                  <option value="ATIVOS">Apenas Ativas</option>
                  <option value="INATIVOS">Apenas Inativas</option>
                </select>
              </div>

              <button type="button" className="polos-action-btn-green" onClick={handleOpenNewFazenda}>
                <PlusIcon size={16} />
                <span>Nova Fazenda</span>
              </button>
            </div>

            {/* TABELA DE FAZENDAS */}
            {filteredFazendas.length === 0 ? (
              <div className="polos-empty-state">
                <NavFazendasUnidadesIcon size={44} />
                <h3>Nenhuma fazenda encontrada</h3>
                <p>Não há propriedades correspondentes aos filtros de busca aplicados.</p>
                <button type="button" className="polo-novo-btn" onClick={handleOpenNewFazenda}>
                  <PlusIcon size={14} />
                  <span>Cadastrar Nova Fazenda</span>
                </button>
              </div>
            ) : (
              <div className="polos-table-card">
                <table className="polos-table">
                  <thead>
                    <tr>
                      <th>Fazenda / Propriedade Rural</th>
                      <th>Pecuarista Responsável</th>
                      <th>Localização Geográfica</th>
                      <th>Capacidade de Embarque</th>
                      <th>Status Operacional</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFazendas.map((faz) => {
                      const pecName = getColabName(faz.pecuaristaId);
                      const pecTel = getColabPhone(faz.pecuaristaId);

                      return (
                        <tr key={faz.id}>
                          {/* FAZENDA / NOME */}
                          <td>
                            <div className="polo-ident-cell">
                              <strong className="polo-name">{faz.nome}</strong>
                              <div className="polo-subinfo">
                                {faz.razaoSocial && <span>{faz.razaoSocial}</span>}
                                {faz.cnpj && <span className="cnpj-tag">CNPJ: {faz.cnpj}</span>}
                              </div>
                            </div>
                          </td>

                          {/* PECUARISTA RESPONSÁVEL */}
                          <td>
                            <div className="colab-link-cell">
                              <div className="colab-link-top">
                                <span className="colab-avatar-mini">
                                  <NavMotoristasIcon size={14} />
                                </span>
                                <div>
                                  <strong className="colab-name">{pecName}</strong>
                                </div>
                              </div>
                              {pecTel && <small className="colab-phone">{pecTel}</small>}
                            </div>
                          </td>

                          {/* LOCALIZAÇÃO */}
                          <td>
                            <div className="polo-location-cell">
                              <div className="city-state">
                                <MapPinIcon size={13} />
                                <strong>
                                  {faz.cidade} - {faz.uf}
                                </strong>
                              </div>
                              {faz.logradouro && (
                                <small className="polo-address" title={faz.logradouro}>
                                  {faz.logradouro}
                                </small>
                              )}
                            </div>
                          </td>

                          {/* CAPACIDADE */}
                          <td>
                            {faz.capacidadeEmbarqueCabecas ? (
                              <div className="polo-capacity-cell">
                                <strong>{faz.capacidadeEmbarqueCabecas.toLocaleString('pt-BR')} cabeças</strong>
                                <small>por lote de embarque</small>
                              </div>
                            ) : (
                              <span className="polo-no-capacity">Livre / Sob Demanda</span>
                            )}
                          </td>

                          {/* STATUS */}
                          <td>
                            <span className={`polo-status-pill ${faz.ativo ? 'active' : 'inactive'}`}>
                              {faz.ativo ? (
                                <>
                                  <CheckIcon size={12} />
                                  <span>Ativa</span>
                                </>
                              ) : (
                                <span>Inativa</span>
                              )}
                            </span>
                          </td>

                          {/* AÇÕES */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="polo-actions-group">
                              <button
                                type="button"
                                className="action-btn edit"
                                onClick={() => handleOpenEditFazenda(faz)}
                                title="Editar fazenda"
                              >
                                <EditIcon size={13} />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn toggle"
                                onClick={() => handleToggleFazendaStatus(faz)}
                                title={faz.ativo ? 'Desativar fazenda' : 'Reativar fazenda'}
                              >
                                {faz.ativo ? 'Desativar' : 'Reativar'}
                              </button>
                              <button
                                type="button"
                                className="action-btn delete"
                                onClick={() => setDeleteFazendaCandidate(faz)}
                                title="Excluir fazenda"
                              >
                                <TrashIcon size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            VISÃO 2: UNIDADES FRIGORÍFICAS (SIF)
            ============================================================== */}
        {activeTab === 'FRIGORIFICOS' && (
          <div className="polos-view-container">
            {/* CARDS DE RESUMO (KPIS DOS FRIGORÍFICOS) */}
            <section className="polos-kpis-grid" aria-label="Resumo operacional de frigoríficos">
              <article className="polo-kpi-card">
                <span className="kpi-label">Plantas Frigoríficas SIF</span>
                <strong className="kpi-number">{totalFrigorificos}</strong>
                <small className="kpi-detail">{frigorificosAtivos} plantas ativas para abate</small>
              </article>

              <article className="polo-kpi-card">
                <span className="kpi-label">Capacidade de Abate Total</span>
                <strong className="kpi-number">{totalCapacidadeAbate.toLocaleString('pt-BR')}</strong>
                <small className="kpi-detail">Bovinos/dia nas unidades ativas</small>
              </article>

              <article className="polo-kpi-card">
                <span className="kpi-label">Currais de Espera</span>
                <strong className="kpi-number">{totalCurrais} currais</strong>
                <small className="kpi-detail">Descanso pré-abate regulamentar</small>
              </article>

              <article className="polo-kpi-card">
                <span className="kpi-label">Equipe SIF Vinculada</span>
                <strong className="kpi-number">
                  {analistas.length + curraleiros.length + manobristas.length} Membros
                </strong>
                <small className="kpi-detail">Analistas, Curraleiros e Manobristas</small>
              </article>
            </section>

            {/* BARRA DE PESQUISA, FILTROS E AÇÃO */}
            <div className="polos-toolbar">
              <div className="polos-search-wrap">
                <SearchIcon size={16} />
                <input
                  type="search"
                  placeholder="Buscar frigorífico por nome, SIF, cidade ou analista..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="polos-search-input"
                />
              </div>

              <div className="polos-status-wrap">
                <label htmlFor="filtro-status-frigo">Status:</label>
                <select
                  id="filtro-status-frigo"
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as typeof statusFiltro)}
                >
                  <option value="TODOS">Todos os status</option>
                  <option value="ATIVOS">Apenas Ativos</option>
                  <option value="INATIVOS">Apenas Inativos</option>
                </select>
              </div>

              <button type="button" className="polos-action-btn-green" onClick={handleOpenNewFrigo}>
                <PlusIcon size={16} />
                <span>Novo Frigorífico</span>
              </button>
            </div>

            {/* TABELA DE FRIGORÍFICOS */}
            {filteredFrigorificos.length === 0 ? (
              <div className="polos-empty-state">
                <BuildingIcon size={44} />
                <h3>Nenhum frigorífico encontrado</h3>
                <p>Não há plantas frigoríficas correspondentes aos filtros de busca aplicados.</p>
                <button type="button" className="polo-novo-btn" onClick={handleOpenNewFrigo}>
                  <PlusIcon size={14} />
                  <span>Cadastrar Novo Frigorífico</span>
                </button>
              </div>
            ) : (
              <div className="polos-table-card">
                <table className="polos-table">
                  <thead>
                    <tr>
                      <th>Planta Frigorífica / Razão Social</th>
                      <th>Registro SIF</th>
                      <th>Equipe Vinculada (Analista / Curraleiro / Manobrista)</th>
                      <th>Localização Geográfica</th>
                      <th>Capacidade de Abate / Currais</th>
                      <th>Status Operacional</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFrigorificos.map((frigo) => {
                      const analistaName = getColabName(frigo.analistaId);
                      const curraleiroName = getColabName(frigo.curraleiroId);
                      const manobristaName = getColabName(frigo.manobristaId);

                      return (
                        <tr key={frigo.id}>
                          {/* PLANTA / RAZÃO SOCIAL */}
                          <td>
                            <div className="polo-ident-cell">
                              <strong className="polo-name">{frigo.nome}</strong>
                              <div className="polo-subinfo">
                                {frigo.razaoSocial && <span>{frigo.razaoSocial}</span>}
                                {frigo.cnpj && <span className="cnpj-tag">CNPJ: {frigo.cnpj}</span>}
                              </div>
                            </div>
                          </td>

                          {/* SIF */}
                          <td>
                            <span className="sif-pill-badge">{frigo.registroSif}</span>
                          </td>

                          {/* EQUIPE VINCULADA (3 PAPEIS OBRIGATÓRIOS) */}
                          <td>
                            <div className="frigo-team-cell">
                              <div className="team-role-row">
                                <span className="role-chip analista">Analista:</span>
                                <strong>{analistaName}</strong>
                              </div>
                              <div className="team-role-row">
                                <span className="role-chip curraleiro">Curraleiro:</span>
                                <strong>{curraleiroName}</strong>
                              </div>
                              <div className="team-role-row">
                                <span className="role-chip manobrista">Manobrista:</span>
                                <strong>{manobristaName}</strong>
                              </div>
                            </div>
                          </td>

                          {/* LOCALIZAÇÃO */}
                          <td>
                            <div className="polo-location-cell">
                              <div className="city-state">
                                <MapPinIcon size={13} />
                                <strong>
                                  {frigo.cidade} - {frigo.uf}
                                </strong>
                              </div>
                              {frigo.logradouro && (
                                <small className="polo-address" title={frigo.logradouro}>
                                  {frigo.logradouro}
                                </small>
                              )}
                            </div>
                          </td>

                          {/* CAPACIDADE */}
                          <td>
                            <div className="polo-capacity-cell">
                              <strong>{frigo.capacidadeAbateDiario.toLocaleString('pt-BR')} bovinos/dia</strong>
                              <small>{frigo.qtdCurrais || 10} currais de recepção</small>
                            </div>
                          </td>

                          {/* STATUS */}
                          <td>
                            <span className={`polo-status-pill ${frigo.ativo ? 'active' : 'inactive'}`}>
                              {frigo.ativo ? (
                                <>
                                  <CheckIcon size={12} />
                                  <span>Ativo</span>
                                </>
                              ) : (
                                <span>Inativo</span>
                              )}
                            </span>
                          </td>

                          {/* AÇÕES */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="polo-actions-group">
                              <button
                                type="button"
                                className="action-btn edit"
                                onClick={() => handleOpenEditFrigo(frigo)}
                                title="Editar frigorífico"
                              >
                                <EditIcon size={13} />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn toggle"
                                onClick={() => handleToggleFrigoStatus(frigo)}
                                title={frigo.ativo ? 'Desativar frigorífico' : 'Reativar frigorífico'}
                              >
                                {frigo.ativo ? 'Desativar' : 'Reativar'}
                              </button>
                              <button
                                type="button"
                                className="action-btn delete"
                                onClick={() => setDeleteFrigoCandidate(frigo)}
                                title="Excluir frigorífico"
                              >
                                <TrashIcon size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            MODAL DE CADASTRO / EDIÇÃO DE FAZENDA
            ============================================================== */}
        {showFazendaModal && (
          <div className="modal-backdrop" onClick={() => setShowFazendaModal(false)}>
            <div className="modal-window modal-window-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>{editingFazenda ? 'Editar Fazenda Produtora' : 'Cadastrar Nova Fazenda'}</h3>
                  <p>Propriedade rural de origem do gado para embarque e transporte rodoviário.</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setShowFazendaModal(false)}>
                  <CloseIcon size={18} />
                </button>
              </div>

              {fazendaModalError && (
                <div className="modal-alert modal-alert-error">
                  <AlertTriangleIcon size={16} />
                  <span>{fazendaModalError}</span>
                </div>
              )}

              {fazendaModalSuccess && (
                <div className="modal-alert modal-alert-success">
                  <CheckIcon size={16} />
                  <span>{fazendaModalSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveFazenda} className="modal-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="faz-nome">Nome da Fazenda *</label>
                    <input
                      id="faz-nome"
                      type="text"
                      placeholder="Ex: Fazenda Boi Gordo"
                      value={formFazNome}
                      onChange={(e) => setFormFazNome(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="faz-razao">Razão Social / Nome do Titular</label>
                    <input
                      id="faz-razao"
                      type="text"
                      placeholder="Ex: Agropecuária Boi Gordo Ltda"
                      value={formFazRazao}
                      onChange={(e) => setFormFazRazao(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="faz-cnpj">CNPJ / CPF do Produtor</label>
                    <input
                      id="faz-cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={formFazCnpj}
                      onChange={(e) => setFormFazCnpj(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="faz-ie">Inscrição Estadual (IE)</label>
                    <input
                      id="faz-ie"
                      type="text"
                      placeholder="Ex: 13.442.810-9"
                      value={formFazIe}
                      onChange={(e) => setFormFazIe(e.target.value)}
                    />
                  </div>
                </div>

                {/* CAMPO DO PECUARISTA COM BOTÃO NOVO PECUARISTA */}
                <div className="form-group pecuarista-select-group">
                  <div className="pecuarista-field-header">
                    <label htmlFor="faz-pecuarista">Pecuarista Responsável *</label>
                    <button
                      type="button"
                      className="novo-pecuarista-inline-btn"
                      onClick={() => setShowNovoPecuaristaModal(true)}
                    >
                      <PlusIcon size={13} />
                      <span>Novo Pecuarista</span>
                    </button>
                  </div>
                  <select
                    id="faz-pecuarista"
                    value={formFazPecuaristaId}
                    onChange={(e) => setFormFazPecuaristaId(Number(e.target.value))}
                    required
                  >
                    {pecuaristas.length === 0 ? (
                      <option value="">Nenhum pecuarista cadastrado. Clique em Novo Pecuarista.</option>
                    ) : (
                      pecuaristas.map((pec) => (
                        <option key={pec.id} value={pec.id}>
                          {pec.nome} — CPF: {pec.cpf} {pec.telefone ? `(${pec.telefone})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <small className="field-hint">
                    O pecuarista assina digitalmente a liberação do lote de animais na saída da fazenda.
                  </small>
                </div>

                {/* ENDEREÇO DA FAZENDA */}
                <div className="form-grid-3">
                  <div className="form-group">
                    <label htmlFor="faz-cidade">Cidade / Município *</label>
                    <input
                      id="faz-cidade"
                      type="text"
                      placeholder="Ex: Barra do Garças"
                      value={formFazCidade}
                      onChange={(e) => setFormFazCidade(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="faz-uf">Estado (UF) *</label>
                    <input
                      id="faz-uf"
                      type="text"
                      maxLength={2}
                      placeholder="MT"
                      value={formFazUf}
                      onChange={(e) => setFormFazUf(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="faz-cep">CEP</label>
                    <input
                      id="faz-cep"
                      type="text"
                      placeholder="00000-000"
                      value={formFazCep}
                      onChange={(e) => setFormFazCep(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="faz-logradouro">Estrada Rural / Rodovia / Linha</label>
                    <input
                      id="faz-logradouro"
                      type="text"
                      placeholder="Ex: Rodovia BR-070, KM 48 - Zona Rural"
                      value={formFazLogradouro}
                      onChange={(e) => setFormFazLogradouro(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="faz-cap">Capacidade por Embarque (bovinos)</label>
                    <input
                      id="faz-cap"
                      type="number"
                      min="1"
                      placeholder="400"
                      value={formFazCapacidade}
                      onChange={(e) => setFormFazCapacidade(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-checkbox-row">
                  <input
                    type="checkbox"
                    id="faz-ativo"
                    checked={formFazAtivo}
                    onChange={(e) => setFormFazAtivo(e.target.checked)}
                  />
                  <label htmlFor="faz-ativo">Propriedade rural ativa para solicitação de transporte</label>
                </div>

                <div className="modal-footer-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowFazendaModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save">
                    {editingFazenda ? 'Salvar Alterações' : 'Cadastrar Fazenda'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==============================================================
            SUBMODAL: CADASTRAR NOVO PECUARISTA (RÁPIDO)
            ============================================================== */}
        {showNovoPecuaristaModal && (
          <div className="modal-backdrop submodal-backdrop" onClick={() => setShowNovoPecuaristaModal(false)}>
            <div className="modal-window submodal-window" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Cadastrar Novo Pecuarista</h3>
                  <p>O pecuarista será incluído na base de colaboradores e vinculado à fazenda.</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setShowNovoPecuaristaModal(false)}>
                  <CloseIcon size={16} />
                </button>
              </div>

              {novoPecError && (
                <div className="modal-alert modal-alert-error">
                  <AlertTriangleIcon size={14} />
                  <span>{novoPecError}</span>
                </div>
              )}

              <form onSubmit={handleSaveNovoPecuarista} className="modal-form">
                <div className="form-group">
                  <label htmlFor="novo-pec-nome">Nome Completo do Pecuarista *</label>
                  <input
                    id="novo-pec-nome"
                    type="text"
                    placeholder="Ex: João da Silva Pecuária"
                    value={novoPecNome}
                    onChange={(e) => setNovoPecNome(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="novo-pec-cpf">CPF do Produtor</label>
                    <input
                      id="novo-pec-cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={novoPecCpf}
                      onChange={(e) => setNovoPecCpf(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="novo-pec-tel">Telefone / WhatsApp *</label>
                    <input
                      id="novo-pec-tel"
                      type="text"
                      placeholder="(66) 99999-0000"
                      value={novoPecTelefone}
                      onChange={(e) => setNovoPecTelefone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="novo-pec-email">E-mail (opcional)</label>
                  <input
                    id="novo-pec-email"
                    type="email"
                    placeholder="pecuarista@fazenda.com.br"
                    value={novoPecEmail}
                    onChange={(e) => setNovoPecEmail(e.target.value)}
                  />
                  <small className="field-hint">
                    Pecuaristas não necessitam de senha no sistema web; assinam o relatório de saída no celular do motorista.
                  </small>
                </div>

                <div className="modal-footer-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowNovoPecuaristaModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save">
                    Cadastrar e Selecionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==============================================================
            MODAL DE CADASTRO / EDIÇÃO DE UNIDADE FRIGORÍFICA
            ============================================================== */}
        {showFrigoModal && (
          <div className="modal-backdrop" onClick={() => setShowFrigoModal(false)}>
            <div className="modal-window modal-window-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>{editingFrigo ? 'Editar Unidade Frigorífica' : 'Cadastrar Unidade Frigorífica'}</h3>
                  <p>Planta industrial com inspeção federal (SIF) para desembarque e abate.</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setShowFrigoModal(false)}>
                  <CloseIcon size={18} />
                </button>
              </div>

              {frigoModalError && (
                <div className="modal-alert modal-alert-error">
                  <AlertTriangleIcon size={16} />
                  <span>{frigoModalError}</span>
                </div>
              )}

              {frigoModalSuccess && (
                <div className="modal-alert modal-alert-success">
                  <CheckIcon size={16} />
                  <span>{frigoModalSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveFrigo} className="modal-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="frigo-nome">Nome da Planta Frigorífica *</label>
                    <input
                      id="frigo-nome"
                      type="text"
                      placeholder="Ex: JBS Frigorífico SIF 450"
                      value={formFrigoNome}
                      onChange={(e) => setFormFrigoNome(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="frigo-sif">Número de Registro SIF *</label>
                    <input
                      id="frigo-sif"
                      type="text"
                      placeholder="Ex: SIF 450"
                      value={formFrigoSif}
                      onChange={(e) => setFormFrigoSif(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="frigo-razao">Razão Social</label>
                    <input
                      id="frigo-razao"
                      type="text"
                      placeholder="Ex: JBS S.A."
                      value={formFrigoRazao}
                      onChange={(e) => setFormFrigoRazao(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="frigo-cnpj">CNPJ</label>
                    <input
                      id="frigo-cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={formFrigoCnpj}
                      onChange={(e) => setFormFrigoCnpj(e.target.value)}
                    />
                  </div>
                </div>

                {/* VÍNCULOS DA EQUIPE TÉCNICA (ANALISTA, CURRALEIRO E MANOBRISTA) */}
                <div className="form-team-links-box">
                  <strong className="team-links-title">Equipe Técnica Vinculada (Assinatura e Auditoria) *</strong>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label htmlFor="frigo-analista">Analista de Bem-Estar *</label>
                      <select
                        id="frigo-analista"
                        value={formFrigoAnalistaId}
                        onChange={(e) => setFormFrigoAnalistaId(Number(e.target.value))}
                        required
                      >
                        {analistas.map((an) => (
                          <option key={an.id} value={an.id}>
                            {an.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="frigo-curraleiro">Curraleiro de Recepção *</label>
                      <select
                        id="frigo-curraleiro"
                        value={formFrigoCurraleiroId}
                        onChange={(e) => setFormFrigoCurraleiroId(Number(e.target.value))}
                        required
                      >
                        {curraleiros.map((cur) => (
                          <option key={cur.id} value={cur.id}>
                            {cur.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="frigo-manobrista">Manobrista de Pátio *</label>
                      <select
                        id="frigo-manobrista"
                        value={formFrigoManobristaId}
                        onChange={(e) => setFormFrigoManobristaId(Number(e.target.value))}
                        required
                      >
                        {manobristas.map((man) => (
                          <option key={man.id} value={man.id}>
                            {man.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* LOCALIZAÇÃO E CAPACIDADE */}
                <div className="form-grid-3">
                  <div className="form-group">
                    <label htmlFor="frigo-cidade">Cidade *</label>
                    <input
                      id="frigo-cidade"
                      type="text"
                      placeholder="Ex: Campo Grande"
                      value={formFrigoCidade}
                      onChange={(e) => setFormFrigoCidade(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="frigo-uf">Estado (UF) *</label>
                    <input
                      id="frigo-uf"
                      type="text"
                      maxLength={2}
                      placeholder="MS"
                      value={formFrigoUf}
                      onChange={(e) => setFormFrigoUf(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="frigo-cep">CEP</label>
                    <input
                      id="frigo-cep"
                      type="text"
                      placeholder="00000-000"
                      value={formFrigoCep}
                      onChange={(e) => setFormFrigoCep(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="frigo-logradouro">Logradouro / Avenida / Rodovia</label>
                    <input
                      id="frigo-logradouro"
                      type="text"
                      placeholder="Ex: Av. Duque de Caxias, 5500"
                      value={formFrigoLogradouro}
                      onChange={(e) => setFormFrigoLogradouro(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="frigo-cap">Capacidade de Abate (bovinos/dia) *</label>
                    <input
                      id="frigo-cap"
                      type="number"
                      min="1"
                      placeholder="2400"
                      value={formFrigoCapacidade}
                      onChange={(e) => setFormFrigoCapacidade(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-checkbox-row">
                  <input
                    type="checkbox"
                    id="frigo-ativo"
                    checked={formFrigoAtivo}
                    onChange={(e) => setFormFrigoAtivo(e.target.checked)}
                  />
                  <label htmlFor="frigo-ativo">Planta frigorífica ativa para recebimento de gado</label>
                </div>

                <div className="modal-footer-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowFrigoModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save">
                    {editingFrigo ? 'Salvar Alterações' : 'Cadastrar Frigorífico'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE FAZENDA */}
        {deleteFazendaCandidate && (
          <div className="modal-backdrop" onClick={() => setDeleteFazendaCandidate(null)}>
            <div className="modal-window modal-window-small" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Excluir Fazenda</h3>
                  <p>Confirme a remoção da propriedade da sua base.</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setDeleteFazendaCandidate(null)}>
                  <CloseIcon size={16} />
                </button>
              </div>
              <p className="delete-warning-text">
                Deseja realmente remover <strong>{deleteFazendaCandidate.nome}</strong>? Os históricos de diários passados
                serão preservados.
              </p>
              <div className="modal-footer-actions">
                <button type="button" className="btn-cancel" onClick={() => setDeleteFazendaCandidate(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn-delete-confirm" onClick={handleConfirmDeleteFazenda}>
                  Excluir Fazenda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE FRIGORÍFICO */}
        {deleteFrigoCandidate && (
          <div className="modal-backdrop" onClick={() => setDeleteFrigoCandidate(null)}>
            <div className="modal-window modal-window-small" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Excluir Unidade Frigorífica</h3>
                  <p>Confirme a remoção da planta SIF da sua base.</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setDeleteFrigoCandidate(null)}>
                  <CloseIcon size={16} />
                </button>
              </div>
              <p className="delete-warning-text">
                Deseja realmente remover <strong>{deleteFrigoCandidate.nome}</strong> ({deleteFrigoCandidate.registroSif})?
                Os históricos de diários passados serão preservados.
              </p>
              <div className="modal-footer-actions">
                <button type="button" className="btn-cancel" onClick={() => setDeleteFrigoCandidate(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn-delete-confirm" onClick={handleConfirmDeleteFrigo}>
                  Excluir Frigorífico
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

export default FazendasUnidades;
