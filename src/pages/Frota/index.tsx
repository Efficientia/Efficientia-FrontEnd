import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetchData } from '../../hooks/useFetchData';
import { caminhaoService } from '../../services/caminhaoService';
import type { CaminhaoResponse, TipoVeiculo, StatusUsoCaminhao } from '../../types/frota';
import type { FuncionarioEmpresaResponse } from '../../types/funcionario';
import { AuthenticatedLayout } from '../../components/Layout/AuthenticatedLayout';
import {
  NavFrotaIcon,
  PlusIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  CalendarioIcon,
  EditIcon,
  TrashIcon,
  WrenchIcon,
  MapPinIcon,
  EyeIcon,
  InfoIcon,
} from '../../components/icons';
import {
  belongsToTenant,
  readTenantStorage,
  resolveCurrentTenant,
  writeTenantStorage,
  type TenantIdentity,
} from '../../utils/tenantScope';
import './Frota.css';

const FLEET_STORAGE_KEY = 'efficientia_frota_v3';

function getStoredDriversForTenant(tenant: TenantIdentity): { id: number; nome: string }[] {
  const stored = readTenantStorage<FuncionarioEmpresaResponse>(
    'efficientia_colaboradores_v3',
    tenant,
    []
  );
  const drivers = stored
    .filter((c) => c.tipo === 'motorista' && c.ativo !== false)
    .map((c) => ({ id: c.id, nome: c.nome }));

  if (drivers.length > 0) return drivers;

  if (tenant.isPrimaryDemoTenant) {
    return [
      { id: 102, nome: 'Jonas Ribeiro' },
      { id: 103, nome: 'Marcos Tavares' },
    ];
  }
  return [];
}

function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return '---';
  return `${km.toLocaleString('pt-BR')} km`;
}

function getInspectionStatus(dateStr: string | null): {
  status: 'valid' | 'warning' | 'expired' | 'none';
  label: string;
  formatted: string;
} {
  if (!dateStr) {
    return { status: 'none', label: 'Não informada', formatted: 'Não informada' };
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { status: 'none', label: dateStr, formatted: dateStr };
  }
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const formatted = date.toLocaleDateString('pt-BR');

  if (diffDays < 0) {
    return { status: 'expired', label: `Vencida (${formatted})`, formatted };
  }
  if (diffDays <= 30) {
    return { status: 'warning', label: `Vence em ${diffDays}d (${formatted})`, formatted };
  }
  return { status: 'valid', label: `Em dia (${formatted})`, formatted };
}

const DEFAULT_FLEET: CaminhaoResponse[] = [
  {
    id: 1,
    tipo: 'CONJUNTO',
    placa: 'BRA2E19',
    placaCarreta: 'KRM4B22',
    empresaId: 1,
    ativo: true,
    dataVencimentoInspecao: '2027-05-10',
    kmAcumulado: 148500,
    capacidadeCabecas: 42,
    marca: 'Scania',
    modelo: 'R450 6x2',
    anoFabricacao: 2023,
    tipoCarreta: '2 Pisos Randon Boiadeira',
    statusUso: 'EM_USO',
    relatorioAtualId: 301,
    motoristaAtualId: 102,
    motoristaAtualNome: 'Jonas Ribeiro',
  },
  {
    id: 2,
    tipo: 'CONJUNTO',
    placa: 'MTB8C34',
    placaCarreta: 'JLS9A88',
    empresaId: 1,
    ativo: true,
    dataVencimentoInspecao: '2027-09-22',
    kmAcumulado: 82300,
    capacidadeCabecas: 64,
    marca: 'Volvo',
    modelo: 'FH 540 6x4',
    anoFabricacao: 2024,
    tipoCarreta: '3 Pisos Tri-trem Boiadeiro',
    statusUso: 'EM_USO',
    relatorioAtualId: 302,
    motoristaAtualId: 103,
    motoristaAtualNome: 'Marcos Tavares',
  },
  {
    id: 3,
    tipo: 'CONJUNTO',
    placa: 'MSD4H12',
    placaCarreta: 'QWE1F44',
    empresaId: 1,
    ativo: true,
    dataVencimentoInspecao: '2026-11-20',
    kmAcumulado: 210000,
    capacidadeCabecas: 44,
    marca: 'Mercedes-Benz',
    modelo: 'Actros 2651',
    anoFabricacao: 2022,
    tipoCarreta: '2 Pisos Facchini',
    statusUso: 'DISPONIVEL',
    relatorioAtualId: null,
    motoristaAtualId: null,
    motoristaAtualNome: null,
  },
  {
    id: 4,
    tipo: 'CAVALO',
    placa: 'DAF9G55',
    placaCarreta: null,
    empresaId: 1,
    ativo: true,
    dataVencimentoInspecao: '2027-04-18',
    kmAcumulado: 115400,
    capacidadeCabecas: null,
    marca: 'DAF',
    modelo: 'XF 530 6x4',
    anoFabricacao: 2023,
    tipoCarreta: null,
    statusUso: 'DISPONIVEL',
    relatorioAtualId: null,
    motoristaAtualId: null,
    motoristaAtualNome: null,
  },
  {
    id: 5,
    tipo: 'CAVALO',
    placa: 'RNK3A71',
    placaCarreta: null,
    empresaId: 1,
    ativo: false,
    dataVencimentoInspecao: '2026-12-05',
    kmAcumulado: 340000,
    capacidadeCabecas: null,
    marca: 'Scania',
    modelo: 'R500 6x2',
    anoFabricacao: 2021,
    tipoCarreta: null,
    statusUso: 'MANUTENCAO',
    relatorioAtualId: null,
    motoristaAtualId: null,
    motoristaAtualNome: null,
  },
  {
    id: 6,
    tipo: 'CARRETA',
    placa: 'CRT2B80',
    placaCarreta: null,
    empresaId: 1,
    ativo: true,
    dataVencimentoInspecao: '2027-08-30',
    kmAcumulado: 95000,
    capacidadeCabecas: 40,
    marca: 'Randon',
    modelo: 'Gaiola Boiadeira Rebaixada',
    anoFabricacao: 2023,
    tipoCarreta: 'Gaiola Rebaixada 2 Pisos',
    statusUso: 'DISPONIVEL',
    relatorioAtualId: null,
    motoristaAtualId: null,
    motoristaAtualNome: null,
  },
  {
    id: 7,
    tipo: 'CARRETA',
    placa: 'FAC7E19',
    placaCarreta: null,
    empresaId: 1,
    ativo: true,
    dataVencimentoInspecao: '2027-10-15',
    kmAcumulado: 48000,
    capacidadeCabecas: 60,
    marca: 'Facchini',
    modelo: 'Gaiola Boiadeira 3 Pisos',
    anoFabricacao: 2024,
    tipoCarreta: '3 Pisos Tri-trem',
    statusUso: 'EM_USO',
    relatorioAtualId: 304,
    motoristaAtualId: null,
    motoristaAtualNome: 'Vinculada a Jonas Ribeiro',
  },
  {
    id: 8,
    tipo: 'CONJUNTO',
    placa: 'VLV5J88',
    placaCarreta: 'GTR6H33',
    empresaId: 1,
    ativo: false,
    dataVencimentoInspecao: '2026-08-14',
    kmAcumulado: 412000,
    capacidadeCabecas: 38,
    marca: 'Volvo',
    modelo: 'FM 380 6x2',
    anoFabricacao: 2020,
    tipoCarreta: '2 Pisos Convencional',
    statusUso: 'MANUTENCAO',
    relatorioAtualId: null,
    motoristaAtualId: null,
    motoristaAtualNome: null,
  },
  {
    id: 9,
    tipo: 'CONJUNTO',
    placa: 'AGR1B05',
    placaCarreta: 'BGD9E33',
    empresaId: 1,
    ativo: true,
    dataVencimentoInspecao: '2027-11-12',
    kmAcumulado: 35000,
    capacidadeCabecas: 46,
    marca: 'Volkswagen',
    modelo: 'Meteor 29.520 6x4',
    anoFabricacao: 2024,
    tipoCarreta: '2 Pisos Randon Boiadeira',
    statusUso: 'DISPONIVEL',
    relatorioAtualId: null,
    motoristaAtualId: null,
    motoristaAtualNome: null,
  },
  {
    id: 10,
    tipo: 'CARRETA',
    placa: 'PTA6D90',
    placaCarreta: null,
    empresaId: 1,
    ativo: true,
    dataVencimentoInspecao: '2027-02-28',
    kmAcumulado: 160000,
    capacidadeCabecas: 44,
    marca: 'Guerra',
    modelo: 'Boiadeira 2 Pisos',
    anoFabricacao: 2022,
    tipoCarreta: '2 Pisos Convencional',
    statusUso: 'DISPONIVEL',
    relatorioAtualId: null,
    motoristaAtualId: null,
    motoristaAtualNome: null,
  },
];

export function Frota() {
  const { empresa, user, roles } = useAuth();

  const tenant = useMemo(() => resolveCurrentTenant(user, empresa), [user, empresa]);
  const empresaId = tenant.empresaId;

  const isAnalista = useMemo(() => {
    const rolesList = (roles || []).map((r) => r.toUpperCase());
    const isExplicitAdmin = rolesList.some((r) =>
      ['ADMIN', 'ADMINISTRADOR', 'ADM_EMPRESA', 'SISTEMA_DEV'].includes(r)
    );
    if (isExplicitAdmin) return false;
    return (
      rolesList.includes('ANALISTA') ||
      (user && 'tipo' in user && user.tipo === 'analista') ||
      Boolean(user?.cargo && user.cargo.toLowerCase().includes('analista'))
    );
  }, [roles, user]);

  const canEdit = !isAnalista;
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | 'CONJUNTO' | 'CAVALO' | 'CARRETA'>('TODOS');
  const [statusFiltro, setStatusFiltro] = useState<
    'TODOS' | 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO' | 'INATIVOS'
  >('TODOS');

  // Estado Local Persistido isolado por empresa
  const [localFleet, setLocalFleet] = useState<CaminhaoResponse[]>(() =>
    readTenantStorage<CaminhaoResponse>(FLEET_STORAGE_KEY, tenant, DEFAULT_FLEET)
  );

  // Consulta à API remota com fallback resiliente e filtro por empresaId
  const fetchFleet = useCallback(
    async (signal: AbortSignal) => {
      if (!empresaId) return [];
      try {
        const response = await caminhaoService.listar({ empresaId }, signal);
        if (Array.isArray(response) && response.length > 0) {
          return response.filter((v) => belongsToTenant(v, tenant, { allowUnscoped: false }));
        }
      } catch {
        // Fallback silencioso
      }
      return [];
    },
    [empresaId, tenant]
  );

  const { data: remoteFleet, isLoading, refetch } = useFetchData(fetchFleet);

  // Lista unificada estritamente isolada para o tenant atual
  const allFleet = useMemo(() => {
    const scopedLocal = localFleet.filter((v) =>
      belongsToTenant(v, tenant, { allowUnscoped: false })
    );
    if (Array.isArray(remoteFleet) && remoteFleet.length > 0) {
      const merged = [...scopedLocal];
      remoteFleet
        .filter((v) => belongsToTenant(v, tenant, { allowUnscoped: false }))
        .forEach((remote) => {
          if (
            !merged.some(
              (item) =>
                item.id === remote.id ||
                item.placa.toUpperCase() === (remote.placa || '').toUpperCase()
            )
          ) {
            merged.push({ ...remote, empresaId: tenant.empresaId });
          }
        });
      return merged;
    }
    return scopedLocal;
  }, [remoteFleet, localFleet, tenant]);

  // Função para sincronizar e persistir na chave isolada da empresa
  const persistFleet = useCallback(
    (updatedList: CaminhaoResponse[]) => {
      const stamped = updatedList.map((v) => ({
        ...v,
        empresaId: tenant.empresaId,
      }));
      setLocalFleet(stamped);
      writeTenantStorage(FLEET_STORAGE_KEY, tenant, stamped);
    },
    [tenant]
  );

  // Motoristas disponíveis para vinculação exclusivamente desta empresa
  const driversList = useMemo(() => getStoredDriversForTenant(tenant), [tenant]);

  // Estados dos Modais
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<CaminhaoResponse | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CaminhaoResponse | null>(null);

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Campos do Formulário
  const [formTipo, setFormTipo] = useState<TipoVeiculo>('CONJUNTO');
  const [formPlaca, setFormPlaca] = useState('');
  const [formPlacaCarreta, setFormPlacaCarreta] = useState('');
  const [formMarca, setFormMarca] = useState('');
  const [formModelo, setFormModelo] = useState('');
  const [formAno, setFormAno] = useState(new Date().getFullYear().toString());
  const [formCapacidade, setFormCapacidade] = useState('42');
  const [formTipoCarreta, setFormTipoCarreta] = useState('2 Pisos Convencional');
  const [formKm, setFormKm] = useState('');
  const [formInspecao, setFormInspecao] = useState('');
  const [formStatusUso, setFormStatusUso] = useState<string>('DISPONIVEL');
  const [formMotoristaId, setFormMotoristaId] = useState<string>('');
  const [formAtivo, setFormAtivo] = useState(true);

  // Filtragem
  const filteredVehicles = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return allFleet.filter((vehicle) => {
      // Filtro por Tipo de Veículo
      if (tipoFiltro !== 'TODOS' && vehicle.tipo !== tipoFiltro) {
        return false;
      }

      // Filtro por Status
      if (statusFiltro === 'DISPONIVEL') {
        if (vehicle.statusUso !== 'DISPONIVEL' || vehicle.ativo === false) return false;
      } else if (statusFiltro === 'EM_USO') {
        if (vehicle.statusUso !== 'EM_USO') return false;
      } else if (statusFiltro === 'MANUTENCAO') {
        if (vehicle.statusUso !== 'MANUTENCAO') return false;
      } else if (statusFiltro === 'INATIVOS') {
        if (vehicle.ativo !== false) return false;
      }

      // Busca por Texto
      if (!normalized) return true;

      const haystack = [
        vehicle.placa,
        vehicle.placaCarreta,
        vehicle.tipo,
        vehicle.marca,
        vehicle.modelo,
        vehicle.tipoCarreta,
        vehicle.motoristaAtualNome,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [allFleet, tipoFiltro, statusFiltro, query]);

  // Métricas para os KPIs
  const totalVehicles = allFleet.length;
  const inUseCount = allFleet.filter((v) => v.statusUso === 'EM_USO').length;
  const availableCount = allFleet.filter((v) => v.statusUso === 'DISPONIVEL' && v.ativo !== false).length;

  const totalCapacity = useMemo(() => {
    return allFleet
      .filter((v) => v.ativo !== false && typeof v.capacidadeCabecas === 'number')
      .reduce((acc, curr) => acc + (curr.capacidadeCabecas || 0), 0);
  }, [allFleet]);

  const inspectionMetrics = useMemo(() => {
    let valid = 0;
    let attention = 0;
    allFleet.forEach((v) => {
      const insp = getInspectionStatus(v.dataVencimentoInspecao);
      if (insp.status === 'valid') valid++;
      if (insp.status === 'warning' || insp.status === 'expired') attention++;
    });
    return { valid, attention };
  }, [allFleet]);

  // Contadores por Tipo de Veículo para as Abas
  const typeCounts = useMemo(() => {
    const map = { TODOS: allFleet.length, CONJUNTO: 0, CAVALO: 0, CARRETA: 0 };
    allFleet.forEach((v) => {
      if (v.tipo === 'CONJUNTO') map.CONJUNTO++;
      else if (v.tipo === 'CAVALO') map.CAVALO++;
      else if (v.tipo === 'CARRETA') map.CARRETA++;
    });
    return map;
  }, [allFleet]);

  // Abrir Modal de Criação
  const handleOpenNew = () => {
    if (!canEdit) return;
    setEditingVehicle(null);
    setFormTipo('CONJUNTO');
    setFormPlaca('');
    setFormPlacaCarreta('');
    setFormMarca('Scania');
    setFormModelo('');
    setFormAno(new Date().getFullYear().toString());
    setFormCapacidade('42');
    setFormTipoCarreta('2 Pisos Convencional');
    setFormKm('');
    setFormInspecao('');
    setFormStatusUso('DISPONIVEL');
    setFormMotoristaId('');
    setFormAtivo(true);
    setModalError(null);
    setModalSuccess(null);
    setShowModal(true);
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (vehicle: CaminhaoResponse) => {
    if (!canEdit) return;
    setEditingVehicle(vehicle);
    setFormTipo((vehicle.tipo as TipoVeiculo) || 'CONJUNTO');
    setFormPlaca(vehicle.placa || '');
    setFormPlacaCarreta(vehicle.placaCarreta || '');
    setFormMarca(vehicle.marca || '');
    setFormModelo(vehicle.modelo || '');
    setFormAno(vehicle.anoFabricacao ? vehicle.anoFabricacao.toString() : '');
    setFormCapacidade(vehicle.capacidadeCabecas ? vehicle.capacidadeCabecas.toString() : '');
    setFormTipoCarreta(vehicle.tipoCarreta || '2 Pisos Convencional');
    setFormKm(vehicle.kmAcumulado ? vehicle.kmAcumulado.toString() : '');
    setFormInspecao(vehicle.dataVencimentoInspecao || '');
    setFormStatusUso(vehicle.statusUso || 'DISPONIVEL');
    setFormMotoristaId(vehicle.motoristaAtualId ? vehicle.motoristaAtualId.toString() : '');
    setFormAtivo(vehicle.ativo !== false);
    setModalError(null);
    setModalSuccess(null);
    setShowModal(true);
  };

  // Abrir Modal de Exclusão
  const handleOpenDelete = (vehicle: CaminhaoResponse) => {
    if (!canEdit) return;
    setDeleteCandidate(vehicle);
  };

  // Confirmar Exclusão
  const handleConfirmDelete = async () => {
    if (!canEdit || !deleteCandidate) return;

    try {
      if (empresaId) {
        await caminhaoService.excluir(deleteCandidate.id, deleteCandidate.tipo as TipoVeiculo);
      }
    } catch {
      // Fallback
    }

    const updated = allFleet.filter((v) => v.id !== deleteCandidate.id);
    persistFleet(updated);
    setDeleteCandidate(null);
  };

  // Alternar Status Operacional
  const handleToggleStatus = async (vehicle: CaminhaoResponse) => {
    if (!canEdit) return;
    let nextStatus = 'DISPONIVEL';
    let nextAtivo = true;

    if (vehicle.statusUso === 'DISPONIVEL') {
      nextStatus = 'MANUTENCAO';
      nextAtivo = false;
    } else if (vehicle.statusUso === 'MANUTENCAO') {
      nextStatus = 'DISPONIVEL';
      nextAtivo = true;
    } else if (vehicle.statusUso === 'EM_USO') {
      nextStatus = 'DISPONIVEL';
      nextAtivo = true;
    }

    const updated = allFleet.map((v) =>
      v.id === vehicle.id ? { ...v, statusUso: nextStatus, ativo: nextAtivo } : v
    );
    persistFleet(updated);

    if (empresaId) {
      try {
        await caminhaoService.atualizar(
          vehicle.id,
          {
            statusUso: nextStatus,
            ativo: nextAtivo,
          },
          vehicle.tipo as TipoVeiculo
        );
      } catch {
        // Fallback
      }
    }
  };

  // Salvar Veículo (Criar / Editar)
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPlaca = formPlaca.trim().toUpperCase();
    if (!cleanPlaca) {
      setModalError('A placa principal do veículo é obrigatória.');
      return;
    }

    const cleanCarreta = formTipo === 'CONJUNTO' ? formPlacaCarreta.trim().toUpperCase() : null;
    const selectedDriver = driversList.find((d) => d.id.toString() === formMotoristaId);

    setModalSubmitting(true);
    setModalError(null);

    const vehiclePayload: CaminhaoResponse = {
      id: editingVehicle ? editingVehicle.id : Date.now(),
      tipo: formTipo,
      placa: cleanPlaca,
      placaCarreta: cleanCarreta,
      empresaId: tenant.empresaId,
      marca: formMarca.trim() || null,
      modelo: formModelo.trim() || null,
      anoFabricacao: formAno ? parseInt(formAno, 10) : null,
      capacidadeCabecas: formTipo !== 'CAVALO' && formCapacidade ? parseInt(formCapacidade, 10) : null,
      tipoCarreta: formTipo !== 'CAVALO' ? formTipoCarreta : null,
      kmAcumulado: formKm ? parseInt(formKm, 10) : null,
      dataVencimentoInspecao: formInspecao || null,
      statusUso: formStatusUso as StatusUsoCaminhao,
      motoristaAtualId: selectedDriver ? selectedDriver.id : null,
      motoristaAtualNome: selectedDriver ? selectedDriver.nome : null,
      relatorioAtualId: editingVehicle ? editingVehicle.relatorioAtualId : null,
      ativo: formAtivo,
    };

    try {
      if (editingVehicle) {
        if (empresaId) {
          try {
            await caminhaoService.atualizar(
              editingVehicle.id,
              {
                tipo: formTipo,
                placa: cleanPlaca,
                placaCarreta: cleanCarreta,
                marca: formMarca.trim() || null,
                modelo: formModelo.trim() || null,
                anoFabricacao: formAno ? parseInt(formAno, 10) : null,
                capacidadeCabecas: formTipo !== 'CAVALO' && formCapacidade ? parseInt(formCapacidade, 10) : null,
                tipoCarreta: formTipo !== 'CAVALO' ? formTipoCarreta : null,
                kmAcumulado: formKm ? parseInt(formKm, 10) : null,
                dataVencimentoInspecao: formInspecao || null,
                statusUso: formStatusUso,
                motoristaAtualId: selectedDriver ? selectedDriver.id : null,
                motoristaAtualNome: selectedDriver ? selectedDriver.nome : null,
                ativo: formAtivo,
              },
              formTipo
            );
          } catch {
            // Persistência local garantida
          }
        }
        const updated = allFleet.map((v) => (v.id === editingVehicle.id ? vehiclePayload : v));
        persistFleet(updated);
        setModalSuccess('Veículo atualizado com sucesso!');
      } else {
        if (empresaId) {
          try {
            await caminhaoService.criar({
              tipo: formTipo,
              placa: cleanPlaca,
              placaCarreta: cleanCarreta,
              capacidadeCabecas: formTipo !== 'CAVALO' && formCapacidade ? parseInt(formCapacidade, 10) : null,
              marca: formMarca.trim() || null,
              modelo: formModelo.trim() || null,
              anoFabricacao: formAno ? parseInt(formAno, 10) : null,
              tipoCarreta: formTipo !== 'CAVALO' ? formTipoCarreta : null,
              kmAcumulado: formKm ? parseInt(formKm, 10) : null,
              dataVencimentoInspecao: formInspecao || null,
              empresaId: tenant.empresaId,
              ativo: formAtivo,
            });
          } catch {
            // Persistência local garantida
          }
        }
        const updated = [vehiclePayload, ...allFleet];
        persistFleet(updated);
        setModalSuccess('Veículo cadastrado com sucesso!');
      }

      setTimeout(() => {
        setShowModal(false);
        setModalSuccess(null);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar veículo.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout
      title="Frota de Caminhões"
      subtitle="Controle operacional de veículos, semirreboques boiadeiros e conformidade MAPA"
      searchPlaceholder="Buscar por placa, modelo, marca ou motorista..."
      searchValue={query}
      onSearchChange={setQuery}
      headerRight={
        canEdit ? (
          <button
            type="button"
            className="fleet-novo-btn"
            onClick={handleOpenNew}
          >
            <PlusIcon size={16} />
            <span>Cadastrar Veículo</span>
          </button>
        ) : (
          <div className="readonly-mode-badge" title="Usuário com permissão de visualização e filtros">
            <EyeIcon size={15} />
            <span>Visualização (Analista)</span>
          </div>
        )
      }
    >
      <div className="fleet-main-container">
        {isAnalista && (
          <div className="readonly-banner" role="status">
            <InfoIcon size={16} />
            <span>
              <strong>Perfil de Analista:</strong> Acesso em modo de consulta e filtragem da frota. O cadastro, alteração e desativação de caminhões e semirreboques são restritos ao Administrador.
            </span>
          </div>
        )}
        {/* CABEÇALHO */}
        <div className="fleet-heading">
          <div>
            <p className="dashboard-eyebrow">Gestão de Transporte Pecuário</p>
            <h2 id="fleet-title">Frota e Gaiolas Boiadeiras</h2>
            <p>Monitore disponibilidade, alocação de motoristas, capacidade de carga e inspeções técnicas.</p>
          </div>
          <button
            type="button"
            className="fleet-refresh"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? 'Atualizando…' : 'Atualizar dados'}
          </button>
        </div>

        {/* CARDS DE RESUMO (KPIS OPERACIONAIS) */}
        <section className="fleet-kpis" aria-label="Resumo operacional da frota">
          <article>
            <div className="fleet-kpi-header">
              <span>Total da Frota</span>
              <NavFrotaIcon size={18} className="fleet-kpi-icon" />
            </div>
            <strong>{totalVehicles}</strong>
            <small>{allFleet.filter((v) => v.ativo !== false).length} operacionais ativos</small>
          </article>

          <article>
            <div className="fleet-kpi-header">
              <span>Em Rota Ativa</span>
              <span className="fleet-kpi-pulse-dot" />
            </div>
            <strong className="kpi-in-use">{inUseCount}</strong>
            <small>Transportando boiadas agora</small>
          </article>

          <article>
            <div className="fleet-kpi-header">
              <span>Disponíveis no Pátio</span>
              <CheckIcon size={16} className="fleet-kpi-icon success" />
            </div>
            <strong className="kpi-available">{availableCount}</strong>
            <small>Prontos para escalação imediata</small>
          </article>

          <article>
            <div className="fleet-kpi-header">
              <span>Capacidade Total</span>
              <span className="fleet-kpi-badge-accent">Bovinos</span>
            </div>
            <strong className="kpi-capacity">{totalCapacity}</strong>
            <small>Cabeças transportáveis simultaneamente</small>
          </article>

          <article>
            <div className="fleet-kpi-header">
              <span>Inspeções MAPA</span>
              <CalendarioIcon size={16} className="fleet-kpi-icon" />
            </div>
            <strong className={inspectionMetrics.attention > 0 ? 'kpi-warning' : 'kpi-valid'}>
              {inspectionMetrics.valid}
            </strong>
            <small>
              {inspectionMetrics.attention > 0
                ? `${inspectionMetrics.attention} requer(em) atenção`
                : '100% dos laudos vigentes'}
            </small>
          </article>
        </section>

        {/* BARRA DE FILTROS POR ABA E STATUS */}
        <div className="fleet-filter-bar">
          <div className="fleet-type-filters" role="tablist" aria-label="Filtrar por tipo de veículo">
            <button
              type="button"
              role="tab"
              aria-selected={tipoFiltro === 'TODOS'}
              className={`fleet-type-tab ${tipoFiltro === 'TODOS' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('TODOS')}
            >
              <span>Todos</span>
              <span className="fleet-type-count">{typeCounts.TODOS}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tipoFiltro === 'CONJUNTO'}
              className={`fleet-type-tab ${tipoFiltro === 'CONJUNTO' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('CONJUNTO')}
            >
              <span>Conjuntos</span>
              <span className="fleet-type-count">{typeCounts.CONJUNTO}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tipoFiltro === 'CAVALO'}
              className={`fleet-type-tab ${tipoFiltro === 'CAVALO' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('CAVALO')}
            >
              <span>Cavalos Mecânicos</span>
              <span className="fleet-type-count">{typeCounts.CAVALO}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tipoFiltro === 'CARRETA'}
              className={`fleet-type-tab ${tipoFiltro === 'CARRETA' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('CARRETA')}
            >
              <span>Carretas Boiadeiras</span>
              <span className="fleet-type-count">{typeCounts.CARRETA}</span>
            </button>
          </div>

          <div className="fleet-status-filter-wrap">
            <label htmlFor="fleet-status-filter">Status:</label>
            <select
              id="fleet-status-filter"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as typeof statusFiltro)}
              className="fleet-status-select"
            >
              <option value="TODOS">Todos os status</option>
              <option value="DISPONIVEL">Disponíveis no Pátio</option>
              <option value="EM_USO">Em Rota Ativa</option>
              <option value="MANUTENCAO">Em Manutenção</option>
              <option value="INATIVOS">Inativos</option>
            </select>
          </div>
        </div>

        {/* FEEDBACK DE ESTADO VAZIO */}
        {filteredVehicles.length === 0 && (
          <section className="dashboard-state" role="status">
            <h3>Nenhum veículo encontrado</h3>
            <p>Não há veículos correspondentes aos filtros selecionados.</p>
            {canEdit && (
              <button
                type="button"
                className="fleet-novo-btn"
                style={{ marginTop: 12 }}
                onClick={handleOpenNew}
              >
                <PlusIcon size={16} />
                <span>Cadastrar Novo Veículo</span>
              </button>
            )}
          </section>
        )}

        {/* TABELA DE VEÍCULOS */}
        {filteredVehicles.length > 0 && (
          <div className="fleet-table-wrap">
            <table className="dashboard-table fleet-table">
              <caption>Relação de Veículos e Equipamentos da Frota</caption>
              <thead>
                <tr>
                  <th>Placa / Identificação</th>
                  <th>Configuração</th>
                  <th>Capacidade & Gaiola</th>
                  <th>Status Operacional</th>
                  <th>Motorista / Alocação</th>
                  <th>Inspeção MAPA / SIF</th>
                  <th>Odômetro</th>
                  <th style={{ textAlign: 'center' }}>{canEdit ? 'Ações' : 'Acesso'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => {
                  const insp = getInspectionStatus(vehicle.dataVencimentoInspecao);

                  return (
                    <tr key={vehicle.id}>
                      {/* PLACA E MODELO */}
                      <td>
                        <div className="fleet-vehicle-cell">
                          <div className="plates-row">
                            <span className="vehicle-plate-pill" title="Placa do cavalo / caminhão">
                              {vehicle.placa}
                            </span>
                            {vehicle.placaCarreta && (
                              <span className="trailer-plate-pill" title="Placa da carreta boiadeira">
                                Carreta: {vehicle.placaCarreta}
                              </span>
                            )}
                          </div>
                          <span className="vehicle-details">
                            {[vehicle.marca, vehicle.modelo, vehicle.anoFabricacao]
                              .filter(Boolean)
                              .join(' • ') || 'Configuração padrão'}
                          </span>
                        </div>
                      </td>

                      {/* TIPO DE VEÍCULO */}
                      <td>
                        <span className={`fleet-type-pill type-${vehicle.tipo.toLowerCase()}`}>
                          <NavFrotaIcon size={12} />
                          <span>
                            {vehicle.tipo === 'CONJUNTO'
                              ? 'Conjunto Completo'
                              : vehicle.tipo === 'CAVALO'
                              ? 'Cavalo Mecânico'
                              : 'Carreta Boiadeira'}
                          </span>
                        </span>
                      </td>

                      {/* CAPACIDADE & GAIOLA */}
                      <td>
                        {vehicle.capacidadeCabecas ? (
                          <div>
                            <strong className="fleet-capacity-text">
                              {vehicle.capacidadeCabecas} bovinos
                            </strong>
                            {vehicle.tipoCarreta && (
                              <span className="fleet-cage-badge">{vehicle.tipoCarreta}</span>
                            )}
                          </div>
                        ) : (
                          <span className="fleet-no-capacity">Apenas tração (Cavalo)</span>
                        )}
                      </td>

                      {/* STATUS OPERACIONAL */}
                      <td>
                        {vehicle.statusUso === 'EM_USO' ? (
                          <span className="fleet-status-pill status-in-use">
                            <span className="status-dot pulsing" />
                            <span>Em rota</span>
                          </span>
                        ) : vehicle.statusUso === 'MANUTENCAO' ? (
                          <span className="fleet-status-pill status-maintenance">
                            <WrenchIcon size={12} />
                            <span>Em manutenção</span>
                          </span>
                        ) : vehicle.ativo === false ? (
                          <span className="fleet-status-pill status-inactive">
                            <span>Inativo</span>
                          </span>
                        ) : (
                          <span className="fleet-status-pill status-available">
                            <CheckIcon size={12} />
                            <span>Disponível</span>
                          </span>
                        )}
                      </td>

                      {/* MOTORISTA / ALOCAÇÃO */}
                      <td>
                        {vehicle.motoristaAtualNome ? (
                          <div className="fleet-driver-cell">
                            <strong>{vehicle.motoristaAtualNome}</strong>
                            <small className="fleet-driver-assigned">Alocado ao veículo</small>
                          </div>
                        ) : (
                          <div className="fleet-driver-cell">
                            <span className="fleet-driver-unassigned">
                              <MapPinIcon size={11} /> Pátio Central
                            </span>
                            <small>Livre para escala</small>
                          </div>
                        )}
                      </td>

                      {/* INSPEÇÃO TÉCNICA MAPA */}
                      <td>
                        <span className={`inspection-pill ${insp.status}`}>
                          {insp.status === 'valid' && <CheckIcon size={11} />}
                          {(insp.status === 'warning' || insp.status === 'expired') && (
                            <AlertTriangleIcon size={11} />
                          )}
                          <span>{insp.label}</span>
                        </span>
                      </td>

                      {/* KM / ODÔMETRO */}
                      <td>
                        <span className="fleet-km-text">{formatKm(vehicle.kmAcumulado)}</span>
                      </td>

                      {/* AÇÕES DE CRUD OU BADGE DE LEITURA */}
                      <td style={{ textAlign: 'center' }}>
                        {canEdit ? (
                          <div className="fleet-actions-cell">
                            <button
                              type="button"
                              className="fleet-action-btn edit"
                              onClick={() => handleOpenEdit(vehicle)}
                              title="Editar especificações do veículo"
                            >
                              <EditIcon size={12} />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              className="fleet-action-btn toggle"
                              onClick={() => handleToggleStatus(vehicle)}
                              title={
                                vehicle.statusUso === 'MANUTENCAO'
                                  ? 'Liberar veículo para operação'
                                  : 'Enviar veículo para oficina/manutenção'
                              }
                            >
                              {vehicle.statusUso === 'MANUTENCAO' ? (
                                <>
                                  <CheckIcon size={12} />
                                  <span>Liberar</span>
                                </>
                              ) : (
                                <>
                                  <WrenchIcon size={12} />
                                  <span>Manutenção</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="fleet-action-btn delete"
                              onClick={() => handleOpenDelete(vehicle)}
                              title="Excluir veículo da frota"
                            >
                              <TrashIcon size={12} />
                              <span>Excluir</span>
                            </button>
                          </div>
                        ) : (
                          <span className="driver-readonly-tag" title="Perfil Analista: Somente Leitura">
                            <EyeIcon size={12} />
                            <span>Consulta</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL DE CADASTRO / EDIÇÃO */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => !modalSubmitting && setShowModal(false)}>
            <div className="modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>{editingVehicle ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}</h3>
                  <p>Configure as características técnicas, placas e capacidade de transporte.</p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowModal(false)}
                  disabled={modalSubmitting}
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              {modalError && (
                <div className="modal-alert modal-alert-error">
                  <AlertTriangleIcon size={18} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="modal-alert modal-alert-success">
                  <CheckIcon size={18} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveVehicle} className="modal-form">
                {/* TIPO DE CONFIGURAÇÃO VEICULAR */}
                <div className="form-group">
                  <label htmlFor="fleet-form-tipo">Configuração Veicular *</label>
                  <select
                    id="fleet-form-tipo"
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as TipoVeiculo)}
                  >
                    <option value="CONJUNTO">Conjunto Completo (Cavalo + Carreta Boiadeira)</option>
                    <option value="CAVALO">Cavalo Mecânico (Trator Rodoviário)</option>
                    <option value="CARRETA">Semirreboque / Carreta Boiadeira</option>
                  </select>
                </div>

                {/* PLACAS */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="fleet-form-placa">Placa do Veículo *</label>
                    <input
                      id="fleet-form-placa"
                      type="text"
                      required
                      placeholder="ABC1D23 ou ABC-1234"
                      value={formPlaca}
                      onChange={(e) => setFormPlaca(e.target.value.toUpperCase())}
                    />
                  </div>
                  {formTipo === 'CONJUNTO' && (
                    <div className="form-group flex-1">
                      <label htmlFor="fleet-form-placa-carreta">Placa da Carreta Boiadeira</label>
                      <input
                        id="fleet-form-placa-carreta"
                        type="text"
                        placeholder="XYZ9W88"
                        value={formPlacaCarreta}
                        onChange={(e) => setFormPlacaCarreta(e.target.value.toUpperCase())}
                      />
                    </div>
                  )}
                </div>

                {/* MARCA, MODELO E ANO */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="fleet-form-marca">Marca</label>
                    <input
                      id="fleet-form-marca"
                      type="text"
                      placeholder="Ex: Scania, Volvo, Randon"
                      value={formMarca}
                      onChange={(e) => setFormMarca(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="fleet-form-modelo">Modelo</label>
                    <input
                      id="fleet-form-modelo"
                      type="text"
                      placeholder="Ex: R450 6x2, FH 540"
                      value={formModelo}
                      onChange={(e) => setFormModelo(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="fleet-form-ano">Ano</label>
                    <input
                      id="fleet-form-ano"
                      type="number"
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      value={formAno}
                      onChange={(e) => setFormAno(e.target.value)}
                    />
                  </div>
                </div>

                {/* CAPACIDADE E TIPO DE GAIOLA (Apenas se CONJUNTO ou CARRETA) */}
                {formTipo !== 'CAVALO' && (
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label htmlFor="fleet-form-cap">Capacidade (Bovinos Adultos)</label>
                      <input
                        id="fleet-form-cap"
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Ex: 42"
                        value={formCapacidade}
                        onChange={(e) => setFormCapacidade(e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-2">
                      <label htmlFor="fleet-form-tipo-carreta">Tipo de Gaiola Boiadeira</label>
                      <select
                        id="fleet-form-tipo-carreta"
                        value={formTipoCarreta}
                        onChange={(e) => setFormTipoCarreta(e.target.value)}
                      >
                        <option value="2 Pisos Convencional">2 Pisos Convencional (Padrão)</option>
                        <option value="3 Pisos Tri-trem">3 Pisos Tri-trem (Alta Capacidade)</option>
                        <option value="Gaiola Rebaixada 2 Pisos">Gaiola Rebaixada 2 Pisos</option>
                        <option value="1 Piso Convencional">1 Piso Convencional</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* ODÔMETRO E INSPEÇÃO TÉCNICA */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="fleet-form-km">KM Odômetro</label>
                    <input
                      id="fleet-form-km"
                      type="number"
                      min="0"
                      placeholder="Ex: 148500"
                      value={formKm}
                      onChange={(e) => setFormKm(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="fleet-form-inspecao">Vencimento Laudo MAPA / SIF</label>
                    <input
                      id="fleet-form-inspecao"
                      type="date"
                      value={formInspecao}
                      onChange={(e) => setFormInspecao(e.target.value)}
                    />
                  </div>
                </div>

                {/* STATUS OPERACIONAL E MOTORISTA */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="fleet-form-status">Status Operacional</label>
                    <select
                      id="fleet-form-status"
                      value={formStatusUso}
                      onChange={(e) => setFormStatusUso(e.target.value)}
                    >
                      <option value="DISPONIVEL">Disponível no Pátio</option>
                      <option value="EM_USO">Em Rota Ativa</option>
                      <option value="MANUTENCAO">Em Manutenção / Oficina</option>
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="fleet-form-driver">Motorista Alocado</label>
                    <select
                      id="fleet-form-driver"
                      value={formMotoristaId}
                      onChange={(e) => setFormMotoristaId(e.target.value)}
                    >
                      <option value="">Nenhum motorista alocado</option>
                      {driversList.map((driver) => (
                        <option key={driver.id} value={driver.id.toString()}>
                          {driver.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CHECKBOX ATIVO */}
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="fleet-form-ativo"
                    checked={formAtivo}
                    onChange={(e) => setFormAtivo(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer', margin: 0 }}
                  />
                  <label htmlFor="fleet-form-ativo" style={{ cursor: 'pointer', margin: 0 }}>
                    Veículo ativo na frota operacional da empresa
                  </label>
                </div>

                {/* BOTÕES DO MODAL */}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setShowModal(false)}
                    disabled={modalSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="modal-btn-submit"
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting
                      ? 'Salvando...'
                      : editingVehicle
                      ? 'Atualizar Veículo'
                      : 'Cadastrar Veículo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {deleteCandidate && (
          <div className="modal-backdrop" onClick={() => setDeleteCandidate(null)}>
            <div className="modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Confirmar Exclusão</h3>
                  <p>Tem certeza de que deseja remover este veículo da frota?</p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setDeleteCandidate(null)}
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className="delete-confirm-box">
                <p className="delete-confirm-text">
                  Esta ação excluirá o registro operacional do veículo. Históricos de rotas anteriores serão preservados.
                </p>

                <div className="delete-confirm-details">
                  <strong>
                    Placa: {deleteCandidate.placa}{' '}
                    {deleteCandidate.placaCarreta ? `(Carreta: ${deleteCandidate.placaCarreta})` : ''}
                  </strong>
                  <span>
                    {[deleteCandidate.marca, deleteCandidate.modelo, deleteCandidate.tipo]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                  {deleteCandidate.capacidadeCabecas && (
                    <span>Capacidade: {deleteCandidate.capacidadeCabecas} bovinos</span>
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setDeleteCandidate(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="modal-btn-delete"
                    onClick={handleConfirmDelete}
                  >
                    Excluir Veículo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

export default Frota;
