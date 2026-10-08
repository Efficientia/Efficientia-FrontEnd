import { useCallback, useState } from 'react';
import { useFetchData } from '../../hooks/useFetchData';
import { relatorioService } from '../../services/relatorioService';
import type { RelatorioViagemResponse } from '../../types/relatorio';
import './Dashboard.css';

const PAGE_SIZE = 20;

function renderValue(value: string | number | null): string {
  return value === null || value === '' ? '—' : String(value);
}

function ReportRow({ report }: { report: RelatorioViagemResponse }) {
  return (
    <tr>
      <td>{renderValue(report.numeroGta)}</td>
      <td>{renderValue(report.numeroNotaFiscal)}</td>
      <td>{renderValue(report.dataEmbarque)}</td>
      <td><span className="dashboard-status">{report.status}</span></td>
      <td>{renderValue(report.motoristaId)}</td>
      <td>{renderValue(report.fazendaId)}</td>
    </tr>
  );
}

export function Dashboard() {
  const [pagina, setPagina] = useState(0);
  const fetchPage = useCallback(
    (signal: AbortSignal) => relatorioService.listar(pagina, PAGE_SIZE, signal),
    [pagina]
  );
  const { data, error, isError, isLoading, isSuccess, refetch } = useFetchData(fetchPage);

  const canGoBack = pagina > 0;
  const canGoForward = data !== null && pagina + 1 < data.totalPaginas;

  return (
    <main id="main-content" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Painel web</p>
          <h1>Relatórios de viagem</h1>
          <p>Consulta paginada dos relatórios disponíveis para sua conta.</p>
        </div>
        <button type="button" onClick={refetch} disabled={isLoading}>
          {isLoading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>

      {data && !isLoading && (
        <p className="dashboard-total" role="status" aria-live="polite">
          {data.total} {data.total === 1 ? 'relatório encontrado' : 'relatórios encontrados'}.
        </p>
      )}

      {isLoading && <p role="status" aria-live="polite">Carregando relatórios…</p>}

      {isError && error && (
        <div className="dashboard-error" role="alert">
          <p>Não foi possível carregar os relatórios: {error.message}</p>
          <button type="button" onClick={refetch}>Tentar novamente</button>
        </div>
      )}

      {isSuccess && data && data.itens.length === 0 && (
        <p className="dashboard-empty" role="status">Nenhum relatório foi encontrado.</p>
      )}

      {isSuccess && data && data.itens.length > 0 && (
        <div className="dashboard-table-wrap">
          <table>
            <caption>Relatórios de viagem da página {data.pagina + 1}</caption>
            <thead>
              <tr>
                <th scope="col">GTA</th>
                <th scope="col">Nota fiscal</th>
                <th scope="col">Data de embarque</th>
                <th scope="col">Status</th>
                <th scope="col">ID do motorista</th>
                <th scope="col">ID da fazenda</th>
              </tr>
            </thead>
            <tbody>
              {data.itens.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPaginas > 0 && (
        <nav className="dashboard-pagination" aria-label="Paginação de relatórios">
          <button
            type="button"
            onClick={() => setPagina((current) => Math.max(0, current - 1))}
            disabled={!canGoBack || isLoading}
          >
            Anterior
          </button>
          <span aria-live="polite">Página {data.pagina + 1} de {data.totalPaginas}</span>
          <button
            type="button"
            onClick={() => setPagina((current) => current + 1)}
            disabled={!canGoForward || isLoading}
          >
            Próxima
          </button>
        </nav>
      )}
    </main>
  );
}
