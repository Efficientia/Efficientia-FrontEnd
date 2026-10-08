import { apiClient } from './api/client';
import { createIdempotencyKey } from './api/idempotency';
import type {
  AssinaturaTextoRequest,
  AtualizarDocumentoRequest,
  DocumentoFiltroRequest,
  DocumentoMetadataRequest,
  DocumentoResponse,
  ExportacaoResponse,
  PaginaDocumentosResponse,
  SolicitarExportacaoRequest,
} from '../types/documento';

export const documentoService = {
  async listarDocumentos(
    filtros: DocumentoFiltroRequest = {},
    signal?: AbortSignal
  ): Promise<PaginaDocumentosResponse> {
    const { data } = await apiClient.get<PaginaDocumentosResponse>('/api/v1/documentos', {
      params: filtros,
      signal,
    });
    return data;
  },

  async buscarPorId(id: string, signal?: AbortSignal): Promise<DocumentoResponse> {
    const { data } = await apiClient.get<DocumentoResponse>(`/api/v1/documentos/${id}`, { signal });
    return data;
  },

  async enviarArquivo(
    metadados: DocumentoMetadataRequest,
    arquivo: File,
    idempotencyKey = createIdempotencyKey(),
    signal?: AbortSignal
  ): Promise<DocumentoResponse> {
    const form = new FormData();
    form.append('metadados', new Blob([JSON.stringify(metadados)], { type: 'application/json' }));
    form.append('arquivo', arquivo);
    const { data } = await apiClient.post<DocumentoResponse>('/api/v1/documentos', form, {
      headers: { 'Idempotency-Key': idempotencyKey },
      signal,
    });
    return data;
  },

  async registrarAssinaturaTexto(
    request: AssinaturaTextoRequest,
    idempotencyKey = createIdempotencyKey(),
    signal?: AbortSignal
  ): Promise<DocumentoResponse> {
    const { data } = await apiClient.post<DocumentoResponse>('/api/v1/documentos', request, {
      headers: { 'Idempotency-Key': idempotencyKey },
      signal,
    });
    return data;
  },

  async baixarConteudo(id: string, inline = false, signal?: AbortSignal): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/v1/documentos/${id}/conteudo`, {
      params: { inline },
      responseType: 'blob',
      signal,
    });
    return response.data;
  },

  async atualizar(
    id: string,
    request: AtualizarDocumentoRequest,
    signal?: AbortSignal
  ): Promise<DocumentoResponse> {
    const { data } = await apiClient.patch<DocumentoResponse>(`/api/v1/documentos/${id}`, request, { signal });
    return data;
  },

  async excluir(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete(`/api/v1/documentos/${id}`, { signal });
  },

  async solicitarExportacaoZip(
    documentoIds: string[],
    idempotencyKey = createIdempotencyKey(),
    signal?: AbortSignal
  ): Promise<ExportacaoResponse> {
    const payload: SolicitarExportacaoRequest = { documentoIds };
    const { data } = await apiClient.post<ExportacaoResponse>('/api/v1/exportacoes', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
      signal,
    });
    return data;
  },

  async consultarStatusExportacao(id: string, signal?: AbortSignal): Promise<ExportacaoResponse> {
    const { data } = await apiClient.get<ExportacaoResponse>(`/api/v1/exportacoes/${id}`, { signal });
    return data;
  },

  async baixarExportacaoZip(id: string, signal?: AbortSignal): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/v1/exportacoes/${id}/conteudo`, {
      responseType: 'blob',
      signal,
    });
    return response.data;
  },
};

export default documentoService;
