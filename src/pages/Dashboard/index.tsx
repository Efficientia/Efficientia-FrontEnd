import { useCallback, useMemo, useReducer, useState } from 'react';
import { useFetchData } from '../../hooks/useFetchData';
import { relatorioService } from '../../services/relatorioService';
import type { RelatorioViagemResponse } from '../../types/relatorio';
import { filterReports, INITIAL_REPORT_FILTERS, reportFiltersReducer } from './reportFilters';
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

  const [filters, dispatchFilters] = useReducer(reportFiltersReducer, INITIAL_REPORT_FILTERS);
  const filteredReports = useMemo(
    () => filterReports(data?.itens ?? [], filters),
    [data?.itens, filters]
  );
  const statusOptions = useMemo(
    () => [...new Set(data?.itens.map((report) => report.status) ?? [])].sort(),
    [data?.itens]
  );
  const hasActiveFilters = filters.query.trim().length > 0 || filters.status.length > 0;

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

      {isSuccess && data && data.itens.length > 0 && (
        <section className="dashboard-filters" aria-labelledby="dashboard-filter-title">
          <h2 id="dashboard-filter-title">Filtrar relatórios desta página</h2>
          <div className="dashboard-filter-fields">
            <label htmlFor="report-search">
              Buscar GTA, nota, status ou ID
              <input
                id="report-search"
                type="search"
                value={filters.query}
                onChange={(event) => dispatchFilters({ type: 'queryChanged', value: event.target.value })}
              />
            </label>
            <label htmlFor="report-status">
              Status
              <select
                id="report-status"
                value={filters.status}
                onChange={(event) => dispatchFilters({ type: 'statusChanged', value: event.target.value })}
              >
                <option value="">Todos os status</option>
                {filters.status && !statusOptions.includes(filters.status) && (
                  <option value={filters.status}>{filters.status}</option>
                )}
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => dispatchFilters({ type: 'reset' })}
              disabled={!hasActiveFilters}
            >
              Limpar filtros
            </button>
          </div>
          <p>Os filtros são locais e consideram somente os relatórios desta página; a API oferece paginação, sem parâmetros de busca ou status.</p>
          <p className="dashboard-filter-count" role="status" aria-live="polite">
            Exibindo {filteredReports.length} de {data.itens.length} relatórios nesta página.
          </p>
        </section>
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

      {isSuccess && data && data.itens.length > 0 && filteredReports.length === 0 && (
        <p className="dashboard-empty" role="status">
          Nenhum relatório desta página corresponde aos filtros.
        </p>
      )}

      {isSuccess && data && filteredReports.length > 0 && (
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
              {filteredReports.map((report) => (
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
