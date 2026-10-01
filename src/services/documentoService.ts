import { apiClient, getBaseUrl } from './api/client';
import type {
  DocumentoResponse,
  PaginaDocumentosResponse,
  DocumentoFiltroRequest,
  SolicitarExportacaoRequest,
  ExportacaoResponse,
} from '../types/documento';

/**
 * Utilitário para gerar UUID v4 para cabeçalho de Idempotência.
 */
function gerarUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Serviço responsável pela gestão e download de documentos do mobile e exportações assíncronas.
 * Atende às especificações da tarefa EFFICIENTI-326 e ao fluxo do Analista no Web.
 */
export const documentoService = {
  /**
   * Consulta a lista de documentos com filtros opcionais e paginação.
   * Rota: GET /api/v1/documentos
   */
  async listarDocumentos(filtros?: DocumentoFiltroRequest): Promise<PaginaDocumentosResponse> {
    const { data } = await apiClient.get<PaginaDocumentosResponse>('/api/v1/documentos', {
      params: filtros,
    });
    return data;
  },

  /**
   * Consulta os metadados de um documento específico pelo seu UUID.
   * Rota: GET /api/v1/documentos/{id}
   */
  async buscarPorId(id: string): Promise<DocumentoResponse> {
    const { data } = await apiClient.get<DocumentoResponse>(`/api/v1/documentos/${id}`);
    return data;
  },

  /**
   * Retorna a URL direta para visualização ou download do arquivo físico.
   * Rota: GET /api/v1/documentos/{id}/conteudo
   */
  obterUrlConteudo(id: string, inline = true): string {
    return `${getBaseUrl()}/api/v1/documentos/${id}/conteudo?inline=${inline}`;
  },

  /**
   * Realiza o download do arquivo binário (Blob) do documento.
   * Rota: GET /api/v1/documentos/{id}/conteudo
   */
  async baixarConteudo(id: string, inline = false): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/v1/documentos/${id}/conteudo`, {
      params: { inline },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Solicita o empacotamento assíncrono em arquivo .ZIP de múltiplos documentos.
   * Rota: POST /api/v1/exportacoes
   */
  async solicitarExportacaoZip(
    documentoIds: string[],
    idempotencyKey?: string
  ): Promise<ExportacaoResponse> {
    const key = idempotencyKey || gerarUUID();
    const payload: SolicitarExportacaoRequest = { documentoIds };

    const { data } = await apiClient.post<ExportacaoResponse>(
      '/api/v1/exportacoes',
      payload,
      {
        headers: {
          'Idempotency-Key': key,
        },
      }
    );
    return data;
  },

  /**
   * Consulta o status de processamento da exportação ZIP (PENDENTE -> CONCLUIDO).
   * Rota: GET /api/v1/exportacoes/{id}
   */
  async consultarStatusExportacao(id: string): Promise<ExportacaoResponse> {
    const { data } = await apiClient.get<ExportacaoResponse>(`/api/v1/exportacoes/${id}`);
    return data;
  },

  /**
   * Retorna a URL direta para download do pacote compactado ZIP.
   * Rota: GET /api/v1/exportacoes/{id}/conteudo
   */
  obterUrlConteudoExportacao(id: string): string {
    return `${getBaseUrl()}/api/v1/exportacoes/${id}/conteudo`;
  },

  /**
   * Realiza o download do pacote ZIP final.
   * Rota: GET /api/v1/exportacoes/{id}/conteudo
   */
  async baixarExportacaoZip(id: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/v1/exportacoes/${id}/conteudo`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default documentoService;
