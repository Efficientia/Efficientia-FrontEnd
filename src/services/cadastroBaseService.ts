import { apiClient } from './api/client';
import type {
  AtualizarCarretaRequest,
  AtualizarCavaloRequest,
  CarretaDetalhadaResponse,
  CarretaResponse,
  CavaloDetalhadoResponse,
  CavaloResponse,
  CriarCarretaRequest,
  CriarCavaloRequest,
  CriarEnderecoRequest,
  CriarFazendaRequest,
  CriarUsuarioRequest,
  EnderecoResponse,
  FazendaResponse,
  UsuarioCadastroResponse,
} from '../types/base';

export const cadastroBaseService = {
  async cadastrarUsuario(request: CriarUsuarioRequest, signal?: AbortSignal): Promise<UsuarioCadastroResponse> {
    const { data } = await apiClient.post<UsuarioCadastroResponse>('/api/v1/usuarios', request, { signal });
    return data;
  },

  async cadastrarEndereco(request: CriarEnderecoRequest, signal?: AbortSignal): Promise<EnderecoResponse> {
    const { data } = await apiClient.post<EnderecoResponse>('/api/v1/enderecos', request, { signal });
    return data;
  },

  async cadastrarFazenda(request: CriarFazendaRequest, signal?: AbortSignal): Promise<FazendaResponse> {
    const { data } = await apiClient.post<FazendaResponse>('/api/v1/fazendas', request, { signal });
    return data;
  },

  async cadastrarCavalo(request: CriarCavaloRequest, signal?: AbortSignal): Promise<CavaloResponse> {
    const { data } = await apiClient.post<CavaloResponse>('/api/v1/veiculos/cavalos', request, { signal });
    return data;
  },

  async listarCavalos(signal?: AbortSignal): Promise<CavaloDetalhadoResponse[]> {
    const { data } = await apiClient.get<CavaloDetalhadoResponse[]>('/api/v1/veiculos/cavalos', { signal });
    return data;
  },

  async buscarCavalo(id: number, signal?: AbortSignal): Promise<CavaloDetalhadoResponse> {
    const { data } = await apiClient.get<CavaloDetalhadoResponse>(`/api/v1/veiculos/cavalos/${id}`, { signal });
    return data;
  },

  async atualizarCavalo(
    id: number,
    request: AtualizarCavaloRequest,
    signal?: AbortSignal
  ): Promise<CavaloDetalhadoResponse> {
    const { data } = await apiClient.put<CavaloDetalhadoResponse>(
      `/api/v1/veiculos/cavalos/${id}`,
      request,
      { signal }
    );
    return data;
  },

  async removerCavalo(id: number, signal?: AbortSignal): Promise<void> {
    await apiClient.delete(`/api/v1/veiculos/cavalos/${id}`, { signal });
  },

  async cadastrarCarreta(request: CriarCarretaRequest, signal?: AbortSignal): Promise<CarretaResponse> {
    const { data } = await apiClient.post<CarretaResponse>('/api/v1/veiculos/carretas', request, { signal });
    return data;
  },

  async listarCarretas(signal?: AbortSignal): Promise<CarretaDetalhadaResponse[]> {
    const { data } = await apiClient.get<CarretaDetalhadaResponse[]>('/api/v1/veiculos/carretas', { signal });
    return data;
  },

  async buscarCarreta(id: number, signal?: AbortSignal): Promise<CarretaDetalhadaResponse> {
    const { data } = await apiClient.get<CarretaDetalhadaResponse>(`/api/v1/veiculos/carretas/${id}`, { signal });
    return data;
  },

  async atualizarCarreta(
    id: number,
    request: AtualizarCarretaRequest,
    signal?: AbortSignal
  ): Promise<CarretaDetalhadaResponse> {
    const { data } = await apiClient.put<CarretaDetalhadaResponse>(
      `/api/v1/veiculos/carretas/${id}`,
      request,
      { signal }
    );
    return data;
  },

  async removerCarreta(id: number, signal?: AbortSignal): Promise<void> {
    await apiClient.delete(`/api/v1/veiculos/carretas/${id}`, { signal });
  },
};

export default cadastroBaseService;
