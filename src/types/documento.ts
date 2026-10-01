export type TipoDocumento =
  | 'RELATORIO_VIAGEM'
  | 'BOLETIM_EMBARQUE'
  | 'BOLETIM_DESEMBARQUE'
  | 'ASSINATURA';

export type ModalidadeAssinatura = 'TEXTUAL' | 'DESENHADA' | 'CERTIFICADA';

export type PapelAssinante =
  | 'MOTORISTA'
  | 'CURRALEIRO'
  | 'ANALISTA'
  | 'GERENTE'
  | 'FISCAL';

export type OrigemDocumento = 'MOBILE' | 'WEB' | 'SISTEMA';

export interface DocumentoResponse {
  id: string; // UUID
  viagemId: number;
  tipoDocumento: TipoDocumento;
  origem: OrigemDocumento;
  assinanteId?: number | null;
  papelAssinante?: PapelAssinante | null;
  modalidadeAssinatura?: ModalidadeAssinatura | null;
  textoAssinatura?: string | null;
  descricao?: string;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  sha256?: string;
  criadoPor?: number;
  criadoEm: string;
  atualizadoEm?: string;
  versao?: number;
  conteudoUrl?: string;
}

export interface PaginaDocumentosResponse {
  itens: DocumentoResponse[];
  page?: number;
  size: number;
  totalElementos?: number;
  totalPaginas?: number;
  proximoCursor?: string;
  temMais: boolean;
}

export interface DocumentoFiltroRequest {
  viagemId?: number;
  tipoDocumento?: TipoDocumento;
  criadoDe?: string;
  criadoAte?: string;
  page?: number;
  size?: number;
  cursor?: string;
}

export type EstadoExportacao =
  | 'PENDENTE'
  | 'EM_PROCESSAMENTO'
  | 'CONCLUIDO'
  | 'FALHA'
  | 'EXPIRADO';

export interface SolicitarExportacaoRequest {
  documentoIds: string[]; // UUIDs
}

export interface ExportacaoResponse {
  id: string; // UUID
  estado: EstadoExportacao;
  quantidadeDocumentos: number;
  tamanhoOrigemBytes: number;
  tamanhoZipBytes?: number | null;
  criadoEm: string;
  atualizadoEm?: string;
  concluidoEm?: string | null;
  expiraEm?: string | null;
  conteudoUrl?: string;
}
