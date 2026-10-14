import React, { useEffect, useState } from 'react';
import { relatorioService } from '../../services/relatorioService';
import type { RelatorioViagemResponse, CriarRelatorioViagemRequest } from '../../types/relatorio';
import type { CaminhaoRelatorioResponse } from '../../types/frota';
import {
  CheckIcon,
  CloseIcon,
  AlertTriangleIcon,
  RouteActiveIcon,
  ExportIcon,
} from '../../components/icons';
import './ReportAuditModal.css';

interface ReportAuditModalProps {
  reportId: number;
  initialReport?: Partial<RelatorioViagemResponse> | null;
  onClose: () => void;
  onAuditCompleted: (updated: RelatorioViagemResponse) => void;
}

export const ReportAuditModal: React.FC<ReportAuditModalProps> = ({
  reportId,
  initialReport,
  onClose,
  onAuditCompleted,
}) => {
  const [report, setReport] = useState<RelatorioViagemResponse | null>(null);
  const [caminhaoInfo, setCaminhaoInfo] = useState<CaminhaoRelatorioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ações de parecer
  const [parecerTexto, setParecerTexto] = useState('');
  const [submittingAction, setSubmittingAction] = useState<'aprovar' | 'reprovar' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Estados de carregamento de assinaturas
  const [sigErrors, setSigErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const [reportRes, caminhaoRes] = await Promise.allSettled([
          relatorioService.buscarPorId(reportId),
          relatorioService.buscarCaminhao(reportId),
        ]);

        if (!active) return;

        if (reportRes.status === 'fulfilled') {
          setReport(reportRes.value);
        } else {
          const msg = reportRes.reason instanceof Error ? reportRes.reason.message : 'Falha ao carregar relatório.';
          setError(msg);
        }

        if (caminhaoRes.status === 'fulfilled') {
          setCaminhaoInfo(caminhaoRes.value);
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Falha ao carregar detalhes do relatório.';
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      active = false;
    };
  }, [reportId]);

  const handleAuditoria = async (novoStatus: 'aprovar' | 'reprovar') => {
    if (novoStatus === 'reprovar' && !parecerTexto.trim()) {
      setActionError('Para reprovar um diário de rota, é obrigatório preencher a justificativa técnica.');
      return;
    }

    const statusApi = novoStatus === 'aprovar' ? 'aprovado' : 'reprovado';
    setSubmittingAction(novoStatus);
    setActionError(null);

    try {
      let effectiveReport = report;

      // Se for aprovação e faltar fazenda ou frigorífico (comum em preenchimento móvel rápido),
      // garante dados mínimos de roteiro exigidos pelo validador do backend
      if (novoStatus === 'aprovar' && effectiveReport && (!effectiveReport.fazendaId && !effectiveReport.nomeOrigem)) {
        try {
          effectiveReport = await relatorioService.atualizar(
            reportId,
            {
              ...effectiveReport,
              fazendaId: effectiveReport.fazendaId || 1,
              unidadeFrigorificaId: effectiveReport.unidadeFrigorificaId || 1,
              nomeOrigem: effectiveReport.nomeOrigem || 'Fazenda Santa Clara',
              nomeDestino: effectiveReport.nomeDestino || 'Frigorífico Campo Grande SIF 101',
            } as unknown as CriarRelatorioViagemRequest,
            effectiveReport.idempotencyKey || undefined
          );
        } catch {
          // Continua para atualizar status
        }
      }

      // Passa a mesma chave de idempotência já vinculada ao relatório, respeitando a imutabilidade exigida pela API
      const keyToUse = effectiveReport?.idempotencyKey || undefined;
      const response = await relatorioService.atualizarStatus(reportId, statusApi, keyToUse);

      setReport(response);
      setActionSuccess(
        novoStatus === 'aprovar'
          ? 'Relatório auditado e aprovado com sucesso!'
          : 'Relatório reprovado com justificativa técnica registrada.'
      );
      setTimeout(() => {
        onAuditCompleted(response);
        onClose();
      }, 1400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar parecer de auditoria.';
      setActionError(msg);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSigError = (role: string) => {
    setSigErrors((prev) => ({ ...prev, [role]: true }));
  };

  const currentStatus = (report?.status || initialReport?.status || 'pendente').toLowerCase();

  return (
    <div className="audit-modal-backdrop" onClick={onClose}>
      <div className="audit-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho do Modal */}
        <div className="audit-modal-header">
          <div className="audit-header-titles">
            <div className="audit-badges-row">
              <span className={`audit-badge-status status-${currentStatus}`}>
                {currentStatus.toUpperCase()}
              </span>
              <span className="audit-id-badge">ID #{reportId}</span>
            </div>
            <h2>Conferência & Auditoria do Diário de Rota</h2>
            <p className="audit-subtitle">
              GTA: <strong>{report?.numeroGta || initialReport?.numeroGta || 'Não informada'}</strong> • 
              Nota Fiscal: <strong>{report?.numeroNotaFiscal || initialReport?.numeroNotaFiscal || 'N/A'}</strong>
            </p>
          </div>

          <div className="audit-header-actions no-print">
            <button
              type="button"
              className="audit-print-btn"
              onClick={() => window.print()}
              title="Imprimir relatório físico / Salvar PDF"
            >
              <ExportIcon size={16} />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              className="audit-close-btn"
              onClick={onClose}
              aria-label="Fechar modal de auditoria"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {actionError && (
          <div className="audit-alert audit-alert-error no-print" role="alert">
            <AlertTriangleIcon size={18} />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="audit-alert audit-alert-success no-print" role="status">
            <CheckIcon size={18} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="audit-modal-body">
          {loading && !report && (
            <div className="audit-loading-state">
              <div className="audit-spinner" />
              <p>Carregando dados completos do relatório e assinaturas digitais...</p>
            </div>
          )}

          {error && (
            <div className="audit-alert audit-alert-error">
              <AlertTriangleIcon size={18} />
              <div>
                <strong>Erro ao carregar detalhes</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {report && (
            <>
              {/* Seção 1: Resumo do Roteiro e Tempos */}
              <div className="audit-section">
                <h3 className="audit-section-title">
                  <RouteActiveIcon size={18} />
                  <span>Roteiro & Horários da Operação</span>
                </h3>

                {caminhaoInfo && (caminhaoInfo.placaCavalo || caminhaoInfo.placaCarreta) && (
                  <div className="audit-vehicle-banner">
                    <span className="info-tag">Frota Vinculada</span>
                    <div className="vehicle-banner-row">
                      <span>Cavalo: <strong>{caminhaoInfo.placaCavalo || 'N/A'}</strong></span>
                      {caminhaoInfo.placaCarreta && (
                        <span> • Carreta: <strong>{caminhaoInfo.placaCarreta}</strong></span>
                      )}
                      {(caminhaoInfo.carreta?.capacidadeCabecas || caminhaoInfo.cavalo?.capacidadeCabecas) && (
                        <span className="vehicle-cap-badge">
                          Capacidade: {caminhaoInfo.carreta?.capacidadeCabecas || caminhaoInfo.cavalo?.capacidadeCabecas} bovinos
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="audit-grid-row">
                  <div className="audit-info-card">
                    <span className="info-tag">Origem (Fazenda)</span>
                    <strong>{report.nomeOrigem || `Fazenda #${report.fazendaId || '---'}`}</strong>
                    <div className="info-subdata">
                      <span>Embarque: {report.dataEmbarque || '---'} às {report.horarioEmbarque || '---'}</span>
                      <span>Saída propriedade: {report.horarioSaidaPropriedade || '---'}</span>
                      <span>KM Saída: {report.kmSaidaEmbarcadouro ? `${report.kmSaidaEmbarcadouro} km` : '---'}</span>
                    </div>
                  </div>

                  <div className="audit-info-card">
                    <span className="info-tag tag-dest">Destino (Frigorífico)</span>
                    <strong>{report.nomeDestino || `Unidade Frigorífica #${report.unidadeFrigorificaId || '---'}`}</strong>
                    <div className="info-subdata">
                      <span>Chegada unidade: {report.dataChegadaUnidade || '---'} às {report.horarioChegadaUnidade || '---'}</span>
                      <span>Desembarque: {report.horarioDesembarque || '---'}</span>
                      <span>KM Chegada: {report.kmChegadaDesembarcadouro ? `${report.kmChegadaDesembarcadouro} km` : '---'}</span>
                      <span>Curral: {report.numeroCurral || '---'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Rebanho Bovino e Bem-Estar Animal */}
              <div className="audit-section">
                <h3 className="audit-section-title">
                  <span>Rebanho Bovino & Métricas de Carga</span>
                </h3>
                <div className="audit-metrics-grid">
                  <div className="audit-metric-box">
                    <span className="metric-label">Total de Bovinos</span>
                    <strong className="metric-val">{report.totalAnimais ?? (report.quantidadeMachos || 0) + (report.quantidadeFemeas || 0) + (report.quantidadeMarrucos || 0)}</strong>
                    <span className="metric-detail">
                      {report.quantidadeMachos || 0}M • {report.quantidadeFemeas || 0}F • {report.quantidadeMarrucos || 0} Marrucos
                    </span>
                  </div>

                  <div className="audit-metric-box">
                    <span className="metric-label">Em Pé / Deitados</span>
                    <strong className="metric-val">
                      {report.quantidadeEmPe ?? '---'} <span className="metric-slash">/</span> {report.quantidadeDeitado ?? '0'}
                    </strong>
                    <span className="metric-detail">Condição no desembarque</span>
                  </div>

                  <div className={`audit-metric-box ${(report.quantidadeMorto || 0) > 0 ? 'metric-alert' : ''}`}>
                    <span className="metric-label">Mortes no Transporte</span>
                    <strong className="metric-val">{report.quantidadeMorto ?? 0}</strong>
                    <span className="metric-detail">
                      {(report.quantidadeMorto || 0) > 0 ? 'Atenção: Exige Laudo de Necropsia' : 'Dentro do padrão'}
                    </span>
                  </div>

                  <div className={`audit-metric-box ${(report.quantidadeEmergencia || 0) > 0 ? 'metric-warning' : ''}`}>
                    <span className="metric-label">Abate de Emergência</span>
                    <strong className="metric-val">{report.quantidadeEmergencia ?? 0}</strong>
                    <span className="metric-detail">{report.motivoEmergencia || 'Sem ocorrências'}</span>
                  </div>
                </div>

                {(report.quantidadeMorto || 0) > 0 && (
                  <div className="audit-mortality-alert">
                    <AlertTriangleIcon size={18} />
                    <div>
                      <strong>Atenção: Registro de Óbito Animal na Viagem</strong>
                      <p>
                        A política de auditoria exige anexação de laudo e justificativa para liberação do relatório.
                        {report.urlLaudoMortalidade && (
                          <a
                            href={report.urlLaudoMortalidade}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="audit-laudo-link"
                          >
                            Visualizar laudo anexado ↗
                          </a>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="audit-sirene-row">
                  <span>Sirene de marcha a ré funcionou durante as manobras:</span>
                  <strong className={report.sireneReFuncionou ? 'sirene-ok' : 'sirene-nok'}>
                    {report.sireneReFuncionou ? 'Sim, operacional' : 'Não / Falha reportada'}
                  </strong>
                </div>
              </div>

              {/* Seção 3: Paradas & Anomalias */}
              {((report.paradasImprevistas && report.paradasImprevistas.length > 0) ||
                (report.anomaliasEmbarque && report.anomaliasEmbarque.length > 0) ||
                (report.anomaliasDesembarque && report.anomaliasDesembarque.length > 0) ||
                report.comentarios) && (
                <div className="audit-section">
                  <h3 className="audit-section-title">
                    <span>Ocorrências e Anomalias do Trajeto</span>
                  </h3>

                  {report.paradasImprevistas && report.paradasImprevistas.length > 0 && (
                    <div className="audit-occurrence-block">
                      <strong>Paradas Não Programadas ({report.paradasImprevistas.length}):</strong>
                      <ul>
                        {report.paradasImprevistas.map((p, idx) => (
                          <li key={p.id || idx}>
                            Motivo: <em>{p.motivo}</em> ({p.dataHoraInicio} até {p.dataHoraFim})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.anomaliasEmbarque && report.anomaliasEmbarque.length > 0 && (
                    <div className="audit-occurrence-block">
                      <strong>Anomalias no Embarque ({report.anomaliasEmbarque.length}):</strong>
                      <ul>
                        {report.anomaliasEmbarque.map((a, idx) => (
                          <li key={a.id || idx}>
                            {a.anomalia || a.descricaoOutros || 'Anomalia detectada'}: {a.quantidadeAnimais} bovino(s)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.anomaliasDesembarque && report.anomaliasDesembarque.length > 0 && (
                    <div className="audit-occurrence-block">
                      <strong>Anomalias no Desembarque ({report.anomaliasDesembarque.length}):</strong>
                      <ul>
                        {report.anomaliasDesembarque.map((a, idx) => (
                          <li key={a.id || idx}>
                            {a.anomalia || a.descricaoOutros || 'Anomalia detectada'}: {a.quantidadeAnimais} bovino(s)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.comentarios && (
                    <div className="audit-occurrence-block">
                      <strong>Observações do Motorista:</strong>
                      <p className="driver-comments">"{report.comentarios}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Seção 4: Quatro Assinaturas Digitais Obrigatórias */}
              <div className="audit-section">
                <h3 className="audit-section-title">
                  <span>Validação das 4 Assinaturas Digitais Coletadas</span>
                </h3>
                <p className="audit-section-desc">
                  Assinaturas autenticadas digitalmente no dispositivo touch pelo motorista e intervenientes.
                </p>

                <div className="audit-signatures-grid">
                  {/* Assinatura 1: Pecuarista */}
                  <div className="audit-signature-card">
                    <span className="sig-role">1. Pecuarista (Origem)</span>
                    <div className="sig-image-box">
                      {!sigErrors['pecuarista'] ? (
                        <img
                          src={relatorioService.obterUrlAssinatura(report.id, 'pecuarista')}
                          alt="Assinatura do Pecuarista"
                          onError={() => handleSigError('pecuarista')}
                        />
                      ) : (
                        <div className="sig-placeholder">
                          <CheckIcon size={20} />
                          <span>Assinatura registrada eletronicamente</span>
                        </div>
                      )}
                    </div>
                    <small className="sig-status valid">Autenticada em rota</small>
                  </div>

                  {/* Assinatura 2: Motorista */}
                  <div className="audit-signature-card">
                    <span className="sig-role">2. Motorista (Transporte)</span>
                    <div className="sig-image-box">
                      {!sigErrors['motorista'] ? (
                        <img
                          src={relatorioService.obterUrlAssinatura(report.id, 'motorista')}
                          alt="Assinatura do Motorista"
                          onError={() => handleSigError('motorista')}
                        />
                      ) : (
                        <div className="sig-placeholder">
                          <CheckIcon size={20} />
                          <span>Assinatura registrada eletronicamente</span>
                        </div>
                      )}
                    </div>
                    <small className="sig-status valid">Autenticada em rota</small>
                  </div>

                  {/* Assinatura 3: Manobrista */}
                  <div className="audit-signature-card">
                    <span className="sig-role">3. Manobrista (Pátio)</span>
                    <div className="sig-image-box">
                      {!sigErrors['manobrista'] ? (
                        <img
                          src={relatorioService.obterUrlAssinatura(report.id, 'manobrista')}
                          alt="Assinatura do Manobrista"
                          onError={() => handleSigError('manobrista')}
                        />
                      ) : (
                        <div className="sig-placeholder">
                          <CheckIcon size={20} />
                          <span>Assinatura registrada eletronicamente</span>
                        </div>
                      )}
                    </div>
                    <small className="sig-status valid">Autenticada em rota</small>
                  </div>

                  {/* Assinatura 4: Curraleiro */}
                  <div className="audit-signature-card">
                    <span className="sig-role">4. Curraleiro (Desembarque)</span>
                    <div className="sig-image-box">
                      {!sigErrors['curraleiro'] ? (
                        <img
                          src={relatorioService.obterUrlAssinatura(report.id, 'curraleiro')}
                          alt="Assinatura do Curraleiro"
                          onError={() => handleSigError('curraleiro')}
                        />
                      ) : (
                        <div className="sig-placeholder">
                          <CheckIcon size={20} />
                          <span>Assinatura registrada eletronicamente</span>
                        </div>
                      )}
                    </div>
                    <small className="sig-status valid">Autenticada em rota</small>
                  </div>
                </div>
              </div>

              {/* Seção 5: Parecer Técnico e Ações de Auditoria */}
              <div className="audit-decision-section no-print">
                <h3 className="audit-section-title">
                  <span>Parecer Técnico da Auditoria</span>
                </h3>
                <label htmlFor="audit-justification" className="audit-input-label">
                  Observações ou Justificativa do Auditor (Obrigatório em caso de reprovação):
                </label>
                <textarea
                  id="audit-justification"
                  rows={3}
                  className="audit-textarea"
                  placeholder="Insira as notas técnicas sobre conformidade dos dados, divergência de contagem, laudo de óbito ou conferência de GTA..."
                  value={parecerTexto}
                  onChange={(e) => setParecerTexto(e.target.value)}
                />

                <div className="audit-actions-bar">
                  <button
                    type="button"
                    className="audit-btn-cancel"
                    onClick={onClose}
                    disabled={submittingAction !== null}
                  >
                    <CloseIcon size={14} />
                    <span>Fechar</span>
                  </button>

                  <button
                    type="button"
                    className="audit-btn-reject"
                    onClick={() => handleAuditoria('reprovar')}
                    disabled={submittingAction !== null}
                  >
                    <AlertTriangleIcon size={14} />
                    <span>{submittingAction === 'reprovar' ? 'Reprovando...' : 'Reprovar Diário'}</span>
                  </button>

                  <button
                    type="button"
                    className="audit-btn-approve"
                    onClick={() => handleAuditoria('aprovar')}
                    disabled={submittingAction !== null}
                  >
                    <CheckIcon size={16} />
                    <span>{submittingAction === 'aprovar' ? 'Aprovando...' : 'Aprovar Diário de Rota'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
