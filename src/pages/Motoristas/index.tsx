import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFetchData } from '../../hooks/useFetchData';
import { funcionarioService } from '../../services/funcionarioService';
import type {
  FuncionarioEmpresaResponse,
  CriarFuncionarioEmpresaRequest,
  AtualizarFuncionarioEmpresaRequest,
} from '../../types/funcionario';
import type { TipoUsuario } from '../../types/auth';
import { GenericUserAvatar } from '../../components/Feedback/GenericUserAvatar';
import { AuthenticatedLayout } from '../../components/Layout/AuthenticatedLayout';
import {
  PlusIcon,
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  KeyIcon,
  MobileIcon,
  MapPinIcon,
  LockIcon,
  InfoIcon,
  EyeIcon,
  EyeOffIcon,
  SearchIcon,
  NavMotoristasIcon,
} from '../../components/icons';
import { checkPasswordSecurity, generateSecurePassword } from '../../utils/passwordSecurity';
import './Motoristas.css';

const STORAGE_KEY = 'efficientia_colaboradores_v3';

export function Motoristas() {
  const { empresa, user, roles } = useAuth();

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

  const [query, setQuery] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<
    'todos' | 'administrador' | 'analista' | 'motorista' | 'curraleiro' | 'pecuarista' | 'manobrista'
  >('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const empresaId = empresa?.id;

  // Estados dos Modais
  const [showModal, setShowModal] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<FuncionarioEmpresaResponse | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<FuncionarioEmpresaResponse | null>(null);

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Campos do Formulário
  const [tipoColaborador, setTipoColaborador] = useState<TipoUsuario>('motorista');
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formLocalVinculado, setFormLocalVinculado] = useState('');

  // Campos específicos de motorista
  const [formCnh, setFormCnh] = useState('');
  const [formCatCnh, setFormCatCnh] = useState('E');
  const [formVencCnh, setFormVencCnh] = useState('');

  // Identifica se o perfil selecionado exige senha de login
  const hasPassword = useMemo(
    () => ['administrador', 'analista', 'motorista'].includes(tipoColaborador),
    [tipoColaborador]
  );

  // Inicialização de colaboradores de exemplo com todos os 6 papéis
  const initialCollaborators: FuncionarioEmpresaResponse[] = useMemo(() => {
    const currentUserName = user?.nome || empresa?.nomeFantasia || 'Administrador Principal';
    const currentUserEmail = user?.email || 'admin@efficientia.com';
    const currentUserCpf = ('cpf' in (user || {}) && (user as { cpf?: string }).cpf) || '012.345.678-99';
    const currentUserCargo = user?.cargo || 'Administrador Geral';
    const currentUserId = user?.id || 1;

    return [
      {
        id: currentUserId,
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
        tipo: 'administrador',
        nome: currentUserName,
        cpf: currentUserCpf,
        email: currentUserEmail,
        telefone: '(11) 98765-4321',
        cargo: currentUserCargo,
        ativo: true,
        criadoEm: '2026-01-10T10:00:00Z',
        isCurrentUser: true,
      },
      {
        id: 101,
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
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
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
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
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
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
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
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
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
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
        empresaId: empresaId || 1,
        codigoEmpresa: 'ANA-CARLA-01',
        tipo: 'analista',
        nome: 'Carla Mendes',
        cpf: '721.390.812-45',
        email: 'carla.mendes@empresa.com',
        telefone: '(65) 99341-8722',
        cargo: 'Analista de Bem-Estar Animal',
        localVinculado: 'JBS SIF 450 - Campo Grande (MS)',
        ativo: true,
        criadoEm: '2026-03-12T16:45:00Z',
      },
      {
        id: 112,
        empresaId: empresaId || 1,
        codigoEmpresa: 'ANA-EFF60720-01',
        tipo: 'analista',
        nome: 'Renata Bittencourt',
        cpf: '839.201.746-20',
        email: 'renata.analista@efficientia.com.br',
        telefone: '(17) 99712-4040',
        cargo: 'Analista de Qualidade e Bem-Estar',
        localVinculado: 'Marfrig SIF 112 - Várzea Grande (MT)',
        ativo: true,
        criadoEm: '2026-01-10T08:00:00Z',
      },
      {
        id: 105,
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
        tipo: 'curraleiro',
        nome: 'Tiago Ferreira',
        cpf: '552.129.831-77',
        email: 'tiago.ferreira@frigorifico.com',
        telefone: '(67) 99654-1289',
        cargo: 'Curraleiro de Desembarque',
        localVinculado: 'JBS SIF 450 - Campo Grande (MS)',
        ativo: true,
        criadoEm: '2026-04-02T08:15:00Z',
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
        localVinculado: 'Marfrig SIF 112 - Várzea Grande (MT)',
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
        localVinculado: 'Minerva SIF 880 - Barretos (SP)',
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
        localVinculado: 'Frigorífico Barra Mansa - Barra do Garças (MT)',
        ativo: true,
        criadoEm: '2026-01-10T08:00:00Z',
      },
      {
        id: 106,
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
        tipo: 'pecuarista',
        nome: 'Roberto Silveira',
        cpf: '198.452.901-22',
        email: 'roberto@fazendaboigordo.com.br',
        telefone: '(66) 99912-4450',
        cargo: 'Produtor Rural / Pecuarista',
        localVinculado: 'Fazenda Boi Gordo - Barra do Garças (MT)',
        ativo: true,
        criadoEm: '2026-04-10T13:30:00Z',
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
        localVinculado: 'Fazenda Santa Maria - Andradina (SP)',
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
        localVinculado: 'Fazenda Estrela do Sul - Dourados (MS)',
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
        localVinculado: 'Agropecuária Araguaia - Água Boa (MT)',
        ativo: true,
        criadoEm: '2026-01-10T08:00:00Z',
      },
      {
        id: 107,
        empresaId: empresaId || 1,
        codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
        tipo: 'manobrista',
        nome: 'André Luís Moreira',
        cpf: '632.781.990-14',
        email: 'andre.moreira@patio.com',
        telefone: '(65) 98841-7720',
        cargo: 'Manobrista de Pátio SIF',
        localVinculado: 'Marfrig SIF 112 - Várzea Grande (MT)',
        ativo: true,
        criadoEm: '2026-04-18T10:10:00Z',
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
        localVinculado: 'Minerva SIF 880 - Barretos (SP)',
        ativo: true,
        criadoEm: '2026-01-10T08:00:00Z',
      },
    ];
  }, [user, empresa, empresaId]);

  // Estado dos colaboradores com persistência em localStorage e sincronização inteligente
  const [collaborators, setCollaborators] = useState<FuncionarioEmpresaResponse[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = [...parsed];
          // Mescla itens padrão para garantir que nenhuma categoria fique vazia (ex: administradores ou motoristas)
          initialCollaborators.forEach((init) => {
            if (!list.some((item) => item.id === init.id || item.cpf === init.cpf)) {
              list.push(init);
            }
          });
          // Garante que o administrador logado esteja presente com isCurrentUser: true
          const hasCurrent = list.some((item) => item.isCurrentUser || item.id === (user?.id || 1));
          if (!hasCurrent && initialCollaborators.length > 0) {
            list.unshift(initialCollaborators[0]);
          }
          const mapped = list.map((item) =>
            item.id === (user?.id || 1) || item.email === (user?.email || 'admin@efficientia.com')
              ? { ...item, isCurrentUser: true, tipo: 'administrador' as TipoUsuario }
              : item
          );
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          } catch {
            // fallback
          }
          return mapped;
        }
      }
    } catch {
      // Ignora erro de parse
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCollaborators));
    } catch {
      // fallback
    }
    return initialCollaborators;
  });

  // Atualiza localStorage sempre que os colaboradores mudarem
  const persistCollaborators = useCallback((newList: FuncionarioEmpresaResponse[]) => {
    setCollaborators(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {
      // Ignora erro de quota
    }
  }, []);

  // Chamada de API para sincronizar com backend se houver dados remotos
  const fetchEmployees = useCallback(
    (signal: AbortSignal) =>
      empresaId ? funcionarioService.listarFuncionarios(empresaId, signal) : Promise.resolve([]),
    [empresaId]
  );
  const { data: remoteEmployees, isLoading, refetch } = useFetchData(fetchEmployees);

  // Sincroniza com dados remotos da API mantendo o administrador logado e cadastros locais
  const allCollaborators = useMemo(() => {
    const list = [...collaborators];
    if (Array.isArray(remoteEmployees) && remoteEmployees.length > 0) {
      remoteEmployees.forEach((remote) => {
        if (!list.some((local) => local.id === remote.id || local.cpf === remote.cpf)) {
          list.push(remote);
        }
      });
    }
    return list;
  }, [collaborators, remoteEmployees]);

  // Filtragem dos colaboradores
  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allCollaborators.filter((employee) => {
      // Filtro por tipo de cargo / perfil
      const matchesTipo = tipoFiltro === 'todos' || employee.tipo === tipoFiltro;
      if (!matchesTipo) return false;

      // Filtro por status
      const matchesStatus =
        statusFiltro === 'todos' ||
        (statusFiltro === 'ativos' && employee.ativo !== false) ||
        (statusFiltro === 'inativos' && employee.ativo === false);
      if (!matchesStatus) return false;

      // Busca textual
      if (!normalized) return true;
      return [
        employee.nome,
        employee.email,
        employee.cpf,
        employee.cargo,
        employee.telefone,
        employee.localVinculado,
        employee.cnhNumero,
      ].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [allCollaborators, tipoFiltro, statusFiltro, query]);

  // Contagens para os KPIs
  const totalCount = allCollaborators.length;
  const withPwdCount = allCollaborators.filter((c) =>
    ['administrador', 'analista', 'motorista'].includes(c.tipo)
  ).length;
  const withoutPwdCount = allCollaborators.filter((c) =>
    ['curraleiro', 'pecuarista', 'manobrista'].includes(c.tipo)
  ).length;
  const activeCount = allCollaborators.filter((c) => c.ativo !== false).length;

  // Contagens por perfil para as abas individuais
  const countPerType = useMemo(() => {
    const map: Record<string, number> = {
      todos: allCollaborators.length,
      administrador: 0,
      analista: 0,
      motorista: 0,
      curraleiro: 0,
      pecuarista: 0,
      manobrista: 0,
    };
    allCollaborators.forEach((c) => {
      if (map[c.tipo] !== undefined) {
        map[c.tipo]++;
      }
    });
    return map;
  }, [allCollaborators]);

  // Abrir modal de criação
  const handleOpenNew = () => {
    if (!canEdit) return;
    setEditingColaborador(null);
    setTipoColaborador('motorista');
    setFormNome('');
    setFormEmail('');
    setFormCpf('');
    setFormTelefone('');
    setFormCargo('');
    setFormSenha('');
    setShowPassword(false);
    setFormLocalVinculado('');
    setFormCnh('');
    setFormCatCnh('E');
    setFormVencCnh('');
    setModalError(null);
    setModalSuccess(null);
    setShowModal(true);
  };

  // Abrir modal de edição
  const handleOpenEdit = (colaborador: FuncionarioEmpresaResponse) => {
    if (!canEdit) return;
    setEditingColaborador(colaborador);
    setTipoColaborador(colaborador.tipo);
    setFormNome(colaborador.nome);
    setFormEmail(colaborador.email);
    setFormCpf(colaborador.cpf);
    setFormTelefone(colaborador.telefone || '');
    setFormCargo(colaborador.cargo || '');
    setFormSenha(''); // Senha vazia a menos que queira alterar
    setShowPassword(false);
    setFormLocalVinculado(colaborador.localVinculado || '');
    setFormCnh(colaborador.cnhNumero || '');
    setFormCatCnh(colaborador.categoriaCnh || 'E');
    setFormVencCnh(colaborador.dataVencimentoCnh || '');
    setModalError(null);
    setModalSuccess(null);
    setShowModal(true);
  };

  // Abrir modal de confirmação de exclusão
  const handleOpenDelete = (colaborador: FuncionarioEmpresaResponse) => {
    if (!canEdit) return;
    if (colaborador.isCurrentUser) {
      alert('Você não pode excluir a sua própria conta de administrador.');
      return;
    }
    setDeleteCandidate(colaborador);
  };

  // Confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!canEdit || !deleteCandidate || deleteCandidate.isCurrentUser) return;

    try {
      if (empresaId) {
        await funcionarioService.excluirFuncionario(empresaId, deleteCandidate.id);
      }
      const updated = collaborators.filter((c) => c.id !== deleteCandidate.id);
      persistCollaborators(updated);
      setDeleteCandidate(null);
    } catch {
      // Ignora erro
    }
  };

  // Alternar status ativo/inativo
  const handleToggleStatus = async (colaborador: FuncionarioEmpresaResponse) => {
    if (!canEdit) return;
    if (colaborador.isCurrentUser) {
      alert('A sua conta de administrador principal não pode ser desativada.');
      return;
    }

    const novoStatus = colaborador.ativo === false;
    const updated = collaborators.map((c) =>
      c.id === colaborador.id ? { ...c, ativo: novoStatus } : c
    );
    persistCollaborators(updated);

    if (empresaId) {
      await funcionarioService.alternarStatus(empresaId, colaborador.id, novoStatus);
    }
  };

  // Salvar formulário (Criar ou Editar)
  const handleSaveColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formCpf.trim()) {
      setModalError('Preencha os campos obrigatórios (Nome e CPF).');
      return;
    }

    // Validação de senha para perfis com acesso
    if (hasPassword && !editingColaborador) {
      if (!formSenha.trim()) {
        setModalError('Informe a senha de acesso provisória para este colaborador.');
        return;
      }
      const pwdSec = checkPasswordSecurity(formSenha);
      if (pwdSec.isCompromised) {
        setModalError(
          'A senha provisória é muito comum e vulnerável. Clique em "Gerar senha segura" para criar uma credencial protegida.'
        );
        return;
      }
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      if (editingColaborador) {
        // MODO EDIÇÃO
        const updatePayload: AtualizarFuncionarioEmpresaRequest = {
          nome: formNome.trim(),
          email: formEmail.trim().toLowerCase(),
          cpf: formCpf.replace(/\D/g, ''),
          telefone: formTelefone.replace(/\D/g, ''),
          cargo: formCargo.trim() || undefined,
          tipo: tipoColaborador,
          localVinculado: formLocalVinculado.trim() || null,
          cnhNumero: tipoColaborador === 'motorista' ? formCnh.trim() || null : null,
          categoriaCnh: tipoColaborador === 'motorista' ? formCatCnh : null,
          dataVencimentoCnh: tipoColaborador === 'motorista' ? formVencCnh || null : null,
        };

        const updatedList = collaborators.map((c) =>
          c.id === editingColaborador.id
            ? {
                ...c,
                ...updatePayload,
                tipo: tipoColaborador,
                cargo: formCargo.trim() || c.cargo,
              }
            : c
        );
        persistCollaborators(updatedList);

        if (empresaId) {
          await funcionarioService.atualizarFuncionario(empresaId, editingColaborador.id, updatePayload);
        }

        setModalSuccess('Colaborador atualizado com sucesso!');
      } else {
        // MODO CRIAÇÃO
        const newId = Date.now();
        const newColab: FuncionarioEmpresaResponse = {
          id: newId,
          empresaId: empresaId || 1,
          codigoEmpresa: empresa?.codigoEmpresa || 'EFF-001',
          tipo: tipoColaborador,
          nome: formNome.trim(),
          cpf: formCpf.replace(/\D/g, ''),
          email: formEmail.trim().toLowerCase() || `${formNome.trim().toLowerCase().replace(/\s+/g, '.')}@operacional.local`,
          telefone: formTelefone.replace(/\D/g, ''),
          cargo:
            formCargo.trim() ||
            (tipoColaborador === 'motorista'
              ? 'Motorista Carreteiro'
              : tipoColaborador === 'analista'
              ? 'Analista de Operações'
              : tipoColaborador === 'curraleiro'
              ? 'Curraleiro'
              : tipoColaborador === 'pecuarista'
              ? 'Pecuarista Parceiro'
              : tipoColaborador === 'manobrista'
              ? 'Manobrista de Pátio'
              : 'Administrador'),
          localVinculado: formLocalVinculado.trim() || null,
          cnhNumero: tipoColaborador === 'motorista' ? formCnh.trim() || null : null,
          categoriaCnh: tipoColaborador === 'motorista' ? formCatCnh : null,
          dataVencimentoCnh: tipoColaborador === 'motorista' ? formVencCnh || null : null,
          ativo: true,
          criadoEm: new Date().toISOString(),
        };

        const updatedList = [newColab, ...collaborators];
        persistCollaborators(updatedList);

        if (empresaId) {
          if (tipoColaborador === 'administrador') {
            await funcionarioService.cadastrarNovoAdmin(empresaId, {
              nome: formNome.trim(),
              email: formEmail.trim().toLowerCase(),
              cpf: formCpf.replace(/\D/g, ''),
              telefone: formTelefone.replace(/\D/g, '') || null,
              senha: formSenha,
              cargo: formCargo.trim() || 'Administrador',
            });
          } else {
            const createPayload: CriarFuncionarioEmpresaRequest = {
              tipo: tipoColaborador,
              nome: formNome.trim(),
              email: newColab.email,
              cpf: formCpf.replace(/\D/g, ''),
              telefone: formTelefone.replace(/\D/g, ''),
              senha: hasPassword ? formSenha : null,
              cargo: newColab.cargo,
              cnhNumero: newColab.cnhNumero,
              categoriaCnh: newColab.categoriaCnh,
              dataVencimentoCnh: newColab.dataVencimentoCnh,
              localVinculado: newColab.localVinculado,
            };
            await funcionarioService.preCadastrarFuncionario(empresaId, createPayload);
          }
        }

        setModalSuccess('Colaborador cadastrado com sucesso!');
      }

      setTimeout(() => {
        setShowModal(false);
        setModalSuccess(null);
      }, 1100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar solicitação.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout
      title="Colaboradores"
      subtitle="Quadro de colaboradores, acessos mobile, assinaturas e motoristas"
      searchPlaceholder="Buscar por nome, CPF, e-mail ou cargo..."
      searchValue={query}
      onSearchChange={setQuery}
      headerRight={
        canEdit ? (
          <button type="button" className="drivers-novo-btn" onClick={handleOpenNew}>
            <PlusIcon size={16} />
            <span>Cadastrar Colaborador</span>
          </button>
        ) : (
          <div className="readonly-mode-badge" title="Usuário com permissão de visualização e filtros">
            <EyeIcon size={15} />
            <span>Visualização (Analista)</span>
          </div>
        )
      }
    >
      <div className="drivers-main-container">
        {isAnalista && (
          <div className="readonly-banner" role="status">
            <InfoIcon size={16} />
            <span>
              <strong>Perfil de Analista:</strong> Acesso habilitado para consulta e filtragem da equipe. Ações de cadastro, alteração e exclusão são restritas ao Administrador.
            </span>
          </div>
        )}
        {/* CABEÇALHO DA PÁGINA */}
        <div className="drivers-heading">
          <div>
            <p className="dashboard-eyebrow">Equipe e Acessos</p>
            <h2 id="drivers-title">Quadro de Colaboradores</h2>
            <p>Gerencie motoristas do app, analistas, curraleiros, pecuaristas e novos administradores.</p>
          </div>

          <div className="drivers-actions-row">
            {/* SELETOR DE STATUS */}
            <select
              className="drivers-status-select"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as 'todos' | 'ativos' | 'inativos')}
              title="Filtrar por status"
            >
              <option value="todos">Todos os status</option>
              <option value="ativos">Apenas ativos</option>
              <option value="inativos">Apenas inativos</option>
            </select>

            <button
              type="button"
              className="drivers-refresh"
              onClick={() => {
                refetch();
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Atualizando…' : 'Atualizar dados'}
            </button>
          </div>
        </div>

        {/* 4 CARDS DE RESUMO / KPIS */}
        <section className="drivers-summary" aria-label="Resumo dos colaboradores">
          <article>
            <span>Total na Empresa</span>
            <strong>{totalCount}</strong>
          </article>
          <article>
            <span>Com Senha / Acesso</span>
            <strong style={{ color: '#0F51AE' }}>{withPwdCount}</strong>
          </article>
          <article>
            <span>Assinatura Mobile</span>
            <strong style={{ color: '#6366F1' }}>{withoutPwdCount}</strong>
          </article>
          <article>
            <span>Cadastros Ativos</span>
            <strong style={{ color: '#10B981' }}>{activeCount}</strong>
          </article>
        </section>

        {/* BARRA DE ABAS INDIVIDUAIS POR PAPEL (Opção solicitada pelo usuário) */}
        <div className="drivers-type-tabs-container">
          <div className="drivers-type-tabs" role="tablist">
            <button
              type="button"
              className={`type-tab ${tipoFiltro === 'todos' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('todos')}
            >
              <span>Todos</span>
              <span className="type-tab-count">{countPerType.todos}</span>
            </button>
            <button
              type="button"
              className={`type-tab ${tipoFiltro === 'administrador' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('administrador')}
            >
              <span>Administrador</span>
              <span className="type-tab-count">{countPerType.administrador}</span>
            </button>
            <button
              type="button"
              className={`type-tab ${tipoFiltro === 'analista' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('analista')}
            >
              <span>Analista</span>
              <span className="type-tab-count">{countPerType.analista}</span>
            </button>
            <button
              type="button"
              className={`type-tab ${tipoFiltro === 'motorista' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('motorista')}
            >
              <span>Motorista</span>
              <span className="type-tab-count">{countPerType.motorista}</span>
            </button>
            <button
              type="button"
              className={`type-tab ${tipoFiltro === 'curraleiro' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('curraleiro')}
            >
              <span>Curraleiro</span>
              <span className="type-tab-count">{countPerType.curraleiro}</span>
            </button>
            <button
              type="button"
              className={`type-tab ${tipoFiltro === 'pecuarista' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('pecuarista')}
            >
              <span>Pecuarista</span>
              <span className="type-tab-count">{countPerType.pecuarista}</span>
            </button>
            <button
              type="button"
              className={`type-tab ${tipoFiltro === 'manobrista' ? 'active' : ''}`}
              onClick={() => setTipoFiltro('manobrista')}
            >
              <span>Manobrista</span>
              <span className="type-tab-count">{countPerType.manobrista}</span>
            </button>
          </div>
        </div>

        {/* BARRA DE PESQUISA, FILTROS E AÇÃO */}
        <div className="drivers-toolbar">
          <div className="drivers-search-wrap">
            <SearchIcon size={16} />
            <input
              type="search"
              placeholder="Buscar colaborador por nome, CPF, e-mail ou cargo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="drivers-search-input"
            />
          </div>

          <div className="drivers-status-wrap">
            <label htmlFor="drivers-status-select">Status:</label>
            <select
              id="drivers-status-select"
              className="drivers-status-select"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as 'todos' | 'ativos' | 'inativos')}
              title="Filtrar por status"
            >
              <option value="todos">Todos os status</option>
              <option value="ativos">Apenas ativos</option>
              <option value="inativos">Apenas inativos</option>
            </select>
          </div>

          <button
            type="button"
            className="drivers-refresh"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? 'Atualizando…' : 'Atualizar dados'}
          </button>
        </div>

        {/* TABELA DE COLABORADORES */}
        {filteredEmployees.length === 0 ? (
          <div className="drivers-empty-state" role="status">
            <NavMotoristasIcon size={44} />
            <h3>Nenhum colaborador encontrado</h3>
            <p>Ajuste os filtros de cargo, status ou o termo de busca para visualizar os registros.</p>
            {canEdit && (
              <button
                type="button"
                className="drivers-novo-btn"
                onClick={handleOpenNew}
              >
                <PlusIcon size={16} />
                <span>Cadastrar Novo Colaborador</span>
              </button>
            )}
          </div>
        ) : (
          <div className="drivers-table-wrap">
            <table className="dashboard-table drivers-table">
              <caption>Colaboradores e equipe cadastrada</caption>
              <thead>
                <tr>
                  <th scope="col">Colaborador</th>
                  <th scope="col">Perfil / Papel</th>
                  <th scope="col">Acesso / Modo</th>
                  <th scope="col">CPF / Documento</th>
                  <th scope="col">Contato / Local</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'center' }}>
                    {canEdit ? 'Ações' : 'Acesso'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((colaborador) => {
                  const roleWithPwd = ['administrador', 'analista', 'motorista'].includes(colaborador.tipo);

                  return (
                    <tr key={colaborador.id}>
                      {/* COLABORADOR / NOME */}
                      <td>
                        <div className="driver-cell">
                          <GenericUserAvatar size={34} name={colaborador.nome} />
                          <div>
                            <div className="driver-name-row">
                              <strong>{colaborador.nome}</strong>
                              {colaborador.isCurrentUser && (
                                <span className="driver-current-user-tag" title="Esta é a sua conta de acesso atual">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="driver-subcode">
                              {colaborador.cargo || colaborador.tipo.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* BADGE DE PAPEL */}
                      <td>
                        <span className={`emp-badge emp-badge-${colaborador.tipo}`}>
                          {colaborador.tipo.toUpperCase()}
                        </span>
                      </td>

                      {/* MODO DE ACESSO (Com senha vs Apenas assinatura) */}
                      <td>
                        {roleWithPwd ? (
                          <span
                            className="access-badge with-pwd"
                            title="Colaborador com senha e login ativo no sistema/app"
                          >
                            <KeyIcon size={12} />
                            <span>Login & Senha</span>
                          </span>
                        ) : (
                          <span
                            className="access-badge no-pwd"
                            title="Assina relatórios e termos diretamente no celular do motorista"
                          >
                            <MobileIcon size={12} />
                            <span>Assinatura Mobile</span>
                          </span>
                        )}
                      </td>

                      {/* CPF / CNH */}
                      <td>
                        <div>{colaborador.cpf || 'Não informado'}</div>
                        {colaborador.cnhNumero && (
                          <span className="driver-cnh-pill">
                            CNH {colaborador.cnhNumero} ({colaborador.categoriaCnh || 'E'})
                          </span>
                        )}
                      </td>

                      {/* CONTATO / LOCAL */}
                      <td>
                        <span className="driver-email">{colaborador.email}</span>
                        {colaborador.telefone && (
                          <span className="driver-phone">{colaborador.telefone}</span>
                        )}
                        {colaborador.localVinculado && (
                          <span className="driver-local-badge" title="Polo ou local vinculado">
                            <MapPinIcon size={11} />
                            <span>{colaborador.localVinculado}</span>
                          </span>
                        )}
                      </td>

                      {/* STATUS ATIVO / INATIVO */}
                      <td>
                        <span
                          className={`dashboard-status ${
                            colaborador.ativo === false ? 'vg-status-inactive' : 'vg-status-available'
                          }`}
                        >
                          {colaborador.ativo === false ? 'Inativo' : 'Ativo'}
                        </span>
                      </td>

                      {/* AÇÕES DE CRUD OU BADGE DE LEITURA */}
                      <td style={{ textAlign: 'center' }}>
                        {canEdit ? (
                          <div className="driver-actions-cell" style={{ justifyContent: 'center' }}>
                            {/* BOTÃO EDITAR */}
                            <button
                              type="button"
                              className="driver-action-btn edit"
                              onClick={() => handleOpenEdit(colaborador)}
                              title="Editar dados deste colaborador"
                            >
                              Editar
                            </button>

                            {/* BOTÃO DESATIVAR / REATIVAR */}
                            {colaborador.isCurrentUser ? (
                              <span
                                className="driver-action-disabled"
                                title="Sua conta de administrador não pode ser desativada"
                              >
                                Fixado
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="driver-action-btn toggle"
                                onClick={() => handleToggleStatus(colaborador)}
                                title={
                                  colaborador.ativo === false
                                    ? 'Reativar este colaborador'
                                    : 'Desativar este colaborador'
                                }
                              >
                                {colaborador.ativo === false ? 'Reativar' : 'Desativar'}
                              </button>
                            )}

                            {/* BOTÃO EXCLUIR */}
                            {colaborador.isCurrentUser ? (
                              <span
                                className="driver-action-disabled"
                                title="Sua conta de administrador principal não pode ser excluída"
                              >
                                <LockIcon size={11} />
                                <span>Protegido</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="driver-action-btn delete"
                                onClick={() => handleOpenDelete(colaborador)}
                                title="Excluir este colaborador"
                              >
                                Excluir
                              </button>
                            )}
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
                  <h3>
                    {editingColaborador ? 'Editar Colaborador' : 'Cadastrar Novo Colaborador'}
                  </h3>
                  <p>
                    {hasPassword
                      ? 'Configure o acesso ao sistema web ou aplicativo mobile.'
                      : 'Cadastre os dados para assinatura e conferência no app do motorista.'}
                  </p>
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

              {/* BANNER INFORMATIVO PARA PAPÉIS SEM SENHA */}
              {!hasPassword && (
                <div className="modal-info-banner">
                  <span className="modal-info-banner-icon" aria-hidden="true">
                    <InfoIcon size={18} />
                  </span>
                  <div className="modal-info-banner-text">
                    <strong>Perfil sem senha de acesso</strong>
                    Curraleiros, pecuaristas e manobristas não possuem login nem senha no sistema.
                    Eles assinam os termos e relatórios diretamente na tela do celular do motorista.
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveColaborador} className="modal-form">
                {/* TIPO DE ACESSO / PERFIL */}
                <div className="form-group">
                  <label htmlFor="driver-tipo">Tipo de Função / Perfil *</label>
                  <select
                    id="driver-tipo"
                    value={tipoColaborador}
                    disabled={editingColaborador?.isCurrentUser}
                    onChange={(e) => setTipoColaborador(e.target.value as TipoUsuario)}
                  >
                    <option value="administrador">Administrador (Gestão Completa Web - Com Senha)</option>
                    <option value="analista">Analista (Auditoria & Relatórios Web - Com Senha)</option>
                    <option value="motorista">Motorista (App Mobile Diário de Rota - Com Senha)</option>
                    <option value="curraleiro">Curraleiro (Desembarque no Frigorífico - Sem Senha)</option>
                    <option value="pecuarista">Pecuarista (Produtor Rural / Fazenda - Sem Senha)</option>
                    <option value="manobrista">Manobrista (Pátio Frigorífico - Sem Senha)</option>
                  </select>
                </div>

                {/* NOME COMPLETO */}
                <div className="form-group">
                  <label htmlFor="driver-name">Nome Completo *</label>
                  <input
                    id="driver-name"
                    type="text"
                    required
                    placeholder="Ex: João da Silva Santos"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                  />
                </div>

                {/* E-MAIL E CPF */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="driver-email">
                      {hasPassword ? 'E-mail Corporativo *' : 'E-mail de Contato'}
                    </label>
                    <input
                      id="driver-email"
                      type="email"
                      required={hasPassword}
                      placeholder={hasPassword ? 'joao.silva@empresa.com' : 'opcional@email.com'}
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="driver-cpf">CPF *</label>
                    <input
                      id="driver-cpf"
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={formCpf}
                      onChange={(e) => setFormCpf(e.target.value)}
                    />
                  </div>
                </div>

                {/* TELEFONE E CARGO */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="driver-tel">Telefone / WhatsApp</label>
                    <input
                      id="driver-tel"
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formTelefone}
                      onChange={(e) => setFormTelefone(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="driver-cargo">Cargo na Empresa</label>
                    <input
                      id="driver-cargo"
                      type="text"
                      placeholder={
                        tipoColaborador === 'motorista'
                          ? 'Motorista Carreteiro'
                          : tipoColaborador === 'curraleiro'
                          ? 'Curraleiro de Pátio'
                          : tipoColaborador === 'pecuarista'
                          ? 'Produtor Rural'
                          : 'Função operacional'
                      }
                      value={formCargo}
                      onChange={(e) => setFormCargo(e.target.value)}
                    />
                  </div>
                </div>

                {/* CAMPO DE LOCAL VINCULADO (Fazenda ou Frigorífico) */}
                {!hasPassword && (
                  <div className="form-group">
                    <label htmlFor="driver-local">
                      {tipoColaborador === 'pecuarista'
                        ? 'Fazenda / Propriedade Rural Vinculada (Opcional)'
                        : 'Unidade Frigorífica / Pátio Vinculado (Opcional)'}
                    </label>
                    <input
                      id="driver-local"
                      type="text"
                      placeholder={
                        tipoColaborador === 'pecuarista'
                          ? 'Ex: Fazenda Boi Gordo - Barra do Garças (MT)'
                          : 'Ex: JBS SIF 450 - Campo Grande (MS)'
                      }
                      value={formLocalVinculado}
                      onChange={(e) => setFormLocalVinculado(e.target.value)}
                    />
                  </div>
                )}

                {/* CAMPOS ESPECÍFICOS DE MOTORISTA (CNH) */}
                {tipoColaborador === 'motorista' && (
                  <div className="driver-cnh-fields">
                    <div className="form-row">
                      <div className="form-group flex-2">
                        <label htmlFor="driver-cnh">Número da CNH</label>
                        <input
                          id="driver-cnh"
                          type="text"
                          placeholder="00000000000"
                          value={formCnh}
                          onChange={(e) => setFormCnh(e.target.value)}
                        />
                      </div>
                      <div className="form-group flex-1">
                        <label htmlFor="driver-cat">Categoria</label>
                        <select
                          id="driver-cat"
                          value={formCatCnh}
                          onChange={(e) => setFormCatCnh(e.target.value)}
                        >
                          <option value="E">Cat. E (Carreta)</option>
                          <option value="D">Cat. D (Caminhão/Ônibus)</option>
                          <option value="C">Cat. C (Caminhão)</option>
                        </select>
                      </div>
                      <div className="form-group flex-1">
                        <label htmlFor="driver-venc">Validade CNH</label>
                        <input
                          id="driver-venc"
                          type="date"
                          value={formVencCnh}
                          onChange={(e) => setFormVencCnh(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SENHA DE ACESSO (Apenas se o papel exigir senha) */}
                {hasPassword && (
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label htmlFor="driver-pwd" style={{ margin: 0 }}>
                        {editingColaborador
                          ? 'Nova Senha de Acesso (Deixe em branco para manter a atual)'
                          : 'Senha Provisória de Acesso *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pwd = generateSecurePassword();
                          setFormSenha(pwd);
                          setShowPassword(true);
                        }}
                        className="driver-pwd-gen-btn"
                        title="Gera uma credencial de alta entropia"
                      >
                        <ShieldCheckIcon size={12} />
                        <span>Gerar senha segura</span>
                      </button>
                    </div>
                    <div className="driver-password-wrapper">
                      <input
                        id="driver-pwd"
                        type={showPassword ? 'text' : 'password'}
                        required={!editingColaborador}
                        placeholder={editingColaborador ? '••••••••' : 'Mínimo 6 caracteres'}
                        autoComplete="new-password"
                        value={formSenha}
                        onChange={(e) => setFormSenha(e.target.value)}
                        className="driver-password-input"
                      />
                      <button
                        type="button"
                        className="driver-password-toggle-btn"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                        title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                        tabIndex={0}
                      >
                        {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                    </div>
                    <small style={{ fontSize: '0.74rem', color: '#7889a3' }}>
                      {tipoColaborador === 'motorista'
                        ? 'O motorista usará esta senha de acesso no aplicativo mobile através de seu fluxo próprio de login.'
                        : 'O colaborador usará esta credencial para acesso ao painel web.'}
                    </small>
                  </div>
                )}

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
                  <button type="submit" className="modal-btn-submit" disabled={modalSubmitting}>
                    {modalSubmitting
                      ? 'Salvando...'
                      : editingColaborador
                      ? 'Salvar Alterações'
                      : 'Cadastrar Colaborador'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {deleteCandidate && (
          <div className="modal-backdrop" onClick={() => setDeleteCandidate(null)}>
            <div className="modal-window" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 style={{ color: '#DC2626' }}>Excluir Colaborador</h3>
                  <p>Confirme a remoção definitiva deste cadastro.</p>
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
                  Tem certeza que deseja remover este colaborador da empresa? Esta ação não poderá ser desfeita.
                </p>

                <div className="delete-confirm-details">
                  <strong>{deleteCandidate.nome}</strong>
                  <span>
                    {deleteCandidate.cargo || deleteCandidate.tipo.toUpperCase()} • CPF {deleteCandidate.cpf}
                  </span>
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
                    Sim, excluir colaborador
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

export default Motoristas;
