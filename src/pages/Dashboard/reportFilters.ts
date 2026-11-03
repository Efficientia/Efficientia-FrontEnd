import type { RelatorioViagemResponse } from '../../types/relatorio';

export interface ReportFilters {
  query: string;
  status: string;
}

export type ReportFilterAction =
  | { type: 'queryChanged'; value: string }
  | { type: 'statusChanged'; value: string }
  | { type: 'reset' };

export const INITIAL_REPORT_FILTERS: ReportFilters = { query: '', status: '' };

export function reportFiltersReducer(
  state: ReportFilters,
  action: ReportFilterAction
): ReportFilters {
  switch (action.type) {
    case 'queryChanged':
      return { ...state, query: action.value };
    case 'statusChanged':
      return { ...state, status: action.value };
    case 'reset':
      return INITIAL_REPORT_FILTERS;
  }
}

export function filterReports(
  reports: RelatorioViagemResponse[],
  filters: ReportFilters
): RelatorioViagemResponse[] {
  const query = filters.query.trim().toLocaleLowerCase();
  if (!query && !filters.status) return reports;

  return reports.filter((report) => {
    if (filters.status && report.status !== filters.status) return false;
    if (!query) return true;

    return [
      report.numeroGta,
      report.numeroNotaFiscal,
      report.dataEmbarque,
      report.status,
      report.motoristaId?.toString() ?? '',
      report.fazendaId?.toString() ?? '',
    ].some((value) => value?.toLocaleLowerCase().includes(query));
  });
}
