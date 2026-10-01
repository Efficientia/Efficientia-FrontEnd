import { apiClient } from './api/client';
import type {
  CriarEnderecoRequest,
  EnderecoResponse,
  CriarFazendaRequest,
  FazendaResponse,
  CriarCavaloRequest,
  CavaloResponse,
  CriarCarretaRequest,
  CarretaResponse,
} from '../types/base';

/**
 * Serviço de Cadastros Base do domínio de transportes e logística.
 * Atende aos requisitos da tarefa EFFICIENTI-387.
 */
export const cadastroBaseService = {
  /**
   * Cadastra novo endereço no sistema.
   * Rota: POST /api/v1/enderecos
   */
  async cadastrarEndereco(dados: CriarEnderecoRequest): Promise<EnderecoResponse> {
    const { data } = await apiClient.post<EnderecoResponse>('/api/v1/enderecos', dados);
    return data;
  },

  /**
   * Cadastra nova fazenda vinculada ao pecuarista e endereço.
   * Rota: POST /api/v1/fazendas
   */
  async cadastrarFazenda(dados: CriarFazendaRequest): Promise<FazendaResponse> {
    const { data } = await apiClient.post<FazendaResponse>('/api/v1/fazendas', dados);
    return data;
  },

  /**
   * Cadastra novo cavalo mecânico (caminhão trator).
   * Rota: POST /api/v1/veiculos/cavalos
   */
  async cadastrarCavalo(dados: CriarCavaloRequest): Promise<CavaloResponse> {
    const { data } = await apiClient.post<CavaloResponse>('/api/v1/veiculos/cavalos', dados);
    return data;
  },

  /**
   * Cadastra nova carreta (semirreboque boiadeiro).
   * Rota: POST /api/v1/veiculos/carretas
   */
  async cadastrarCarreta(dados: CriarCarretaRequest): Promise<CarretaResponse> {
    const { data } = await apiClient.post<CarretaResponse>('/api/v1/veiculos/carretas', dados);
    return data;
  },
};

export default cadastroBaseService;
