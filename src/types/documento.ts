export type TipoDocumento =
  | 'RELATORIO_VIAGEM'
  | 'BOLETIM_EMBARQUE'
  | 'BOLETIM_DESEMBARQUE'
  | 'ASSINATURA';

export type ModalidadeAssinatura = 'FOTO' | 'DESENHO' | 'TEXTO';
export type PapelAssinante = 'MOTORISTA' | 'MANOBRISTA' | 'CURRALEIRO' | 'FUNCIONARIO_FRIBOI';
export type OrigemDocumento = 'UPLOAD' | 'CAMERA' | 'DESENHO' | 'TEXTO' | 'GERADO_SISTEMA';

export interface DocumentoResponse {
  id: string;
  viagemId: number;
  tipoDocumento: TipoDocumento;
  origem: OrigemDocumento;
  assinanteId: number | null;
  papelAssinante: PapelAssinante | null;
  modalidadeAssinatura: ModalidadeAssinatura | null;
  textoAssinatura: string | null;
  descricao: string | null;
  nomeOriginal: string | null;
  mimeType: string | null;
  tamanhoBytes: number;
  sha256: string | null;
  criadoPor: number | null;
  criadoEm: string;
  atualizadoEm: string | null;
  versao: number;
  conteudoUrl: string | null;
}

export interface PaginaDocumentosResponse {
  itens: DocumentoResponse[];
  page: number | null;
  size: number;
  totalElementos: number;
  totalPaginas: number;
  proximoCursor: string | null;
  temMais: boolean;
}

export interface DocumentoFiltroRequest {
  viagemId?: number;
  assinanteId?: number;
  tipoDocumento?: TipoDocumento;
  origem?: OrigemDocumento;
  modalidadeAssinatura?: ModalidadeAssinatura;
  criadoDe?: string;
  criadoAte?: string;
  page?: number;
  size?: number;
  cursor?: string;
  sort?: string;
}

export interface DocumentoMetadataRequest {
  viagemId: number;
  tipoDocumento: TipoDocumento;
  origem: OrigemDocumento;
  assinanteId?: number | null;
  papelAssinante?: PapelAssinante | null;
  modalidadeAssinatura?: ModalidadeAssinatura | null;
  descricao?: string | null;
}

export interface AssinaturaTextoRequest {
  viagemId: number;
  tipoDocumento: TipoDocumento;
  origem: OrigemDocumento;
  assinanteId: number;
  papelAssinante: PapelAssinante;
  modalidadeAssinatura: ModalidadeAssinatura;
  textoAssinatura: string;
  descricao?: string | null;
}

export interface AtualizarDocumentoRequest {
  versao: number;
  descricao?: string | null;
}

export type EstadoExportacao = 'NA_FILA' | 'PROCESSANDO' | 'CONCLUIDA' | 'FALHA' | 'EXPIRADA';

export interface SolicitarExportacaoRequest {
  documentoIds: string[];
}

export interface ExportacaoResponse {
  id: string;
  estado: EstadoExportacao;
  quantidadeDocumentos: number;
  tamanhoOrigemBytes: number;
  tamanhoZipBytes: number | null;
  criadoEm: string;
  atualizadoEm: string | null;
  concluidoEm: string | null;
  expiraEm: string | null;
  conteudoUrl: string | null;
}
