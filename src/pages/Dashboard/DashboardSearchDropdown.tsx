import React, { useMemo } from 'react';
import {
  NavDiariosIcon,
  NavFrotaIcon,
  NavMotoristasIcon,
  ArrowRightIcon,
  SearchIcon,
} from '../../components/icons';
import './DashboardSearchDropdown.css';

export interface QuickSearchReportItem {
  readonly id: number;
  readonly code: string;
  readonly gta: string;
  readonly driver: string;
  readonly plate?: string;
  readonly route: string;
  readonly status: string;
  readonly bovinos?: number;
}

export interface QuickSearchVehicleItem {
  readonly id: number | string;
  readonly placa: string;
  readonly modelo: string;
  readonly marca?: string;
  readonly motorista?: string;
  readonly status?: string;
}

export interface QuickSearchDriverItem {
  readonly id: number | string;
  readonly nome: string;
  readonly cargo: string;
  readonly cnhStatus?: string;
  readonly rotaAtual?: string;
}

export interface DashboardSearchDropdownProps {
  readonly query: string;
  readonly reports: readonly QuickSearchReportItem[];
  readonly vehicles: readonly QuickSearchVehicleItem[];
  readonly drivers: readonly QuickSearchDriverItem[];
  readonly onSelectReport: (id: number, item: QuickSearchReportItem) => void;
  readonly onSelectVehicle: (vehicle: QuickSearchVehicleItem) => void;
  readonly onSelectDriver: (driver: QuickSearchDriverItem) => void;
  readonly onClose: () => void;
}

export const DashboardSearchDropdown: React.FC<DashboardSearchDropdownProps> = ({
  query,
  reports,
  vehicles,
  drivers,
  onSelectReport,
  onSelectVehicle,
  onSelectDriver,
  onClose,
}) => {
  const q = query.trim().toLowerCase();

  const filteredReports = useMemo(() => {
    if (!q) return [];
    return reports.filter(
      (r) =>
        r.gta.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.driver.toLowerCase().includes(q) ||
        (r.plate && r.plate.toLowerCase().includes(q)) ||
        r.route.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [reports, q]);

  const filteredVehicles = useMemo(() => {
    if (!q) return [];
    return vehicles.filter(
      (v) =>
        v.placa.toLowerCase().includes(q) ||
        v.modelo.toLowerCase().includes(q) ||
        (v.marca && v.marca.toLowerCase().includes(q)) ||
        (v.motorista && v.motorista.toLowerCase().includes(q))
    );
  }, [vehicles, q]);

  const filteredDrivers = useMemo(() => {
    if (!q) return [];
    return drivers.filter(
      (d) =>
        d.nome.toLowerCase().includes(q) ||
        d.cargo.toLowerCase().includes(q) ||
        (d.rotaAtual && d.rotaAtual.toLowerCase().includes(q))
    );
  }, [drivers, q]);

  const totalResults =
    filteredReports.length + filteredVehicles.length + filteredDrivers.length;

  const getStatusBadgeClass = (status: string): string => {
    const s = status.toLowerCase();
    if (s.includes('aprovado')) return 'badge-approved';
    if (s.includes('reprovado')) return 'badge-rejected';
    if (s.includes('análise') || s.includes('analise')) return 'badge-analyzing';
    return 'badge-pending';
  };

  return (
    <div className="dash-search-container" role="dialog" aria-label="Resultados da pesquisa rápida">
      <div className="dash-search-header">
        <span className="dash-search-header-title">
          <SearchIcon size={14} className="dash-search-header-icon" />
          <span>Resultados para &ldquo;{query}&rdquo;</span>
        </span>
        <span className="dash-search-counter">
          {totalResults} {totalResults === 1 ? 'encontrado' : 'encontrados'}
        </span>
      </div>

      <div className="dash-search-body">
        {totalResults === 0 ? (
          <div className="dash-search-empty">
            <span className="dash-search-empty-icon">
              <SearchIcon size={24} />
            </span>
            <strong className="dash-search-empty-title">Nenhum registro localizado</strong>
            <p className="dash-search-empty-text">
              Não encontramos GTA, placa de caminhão ou motorista compatível com &ldquo;{query}&rdquo;.
            </p>
          </div>
        ) : (
          <>
            {/* SEÇÃO 1: DIÁRIOS & GTAs */}
            {filteredReports.length > 0 && (
              <div className="dash-search-group">
                <div className="dash-search-group-title">
                  <span>Diários de Rota &amp; GTAs</span>
                  <span className="dash-search-group-badge">{filteredReports.length}</span>
                </div>
                <div className="dash-search-list">
                  {filteredReports.map((r) => (
                    <button
                      key={`report-${r.id}`}
                      type="button"
                      className="dash-search-item"
                      onClick={() => {
                        onSelectReport(r.id, r);
                        onClose();
                      }}
                    >
                      <span className="dash-search-item-icon report">
                        <NavDiariosIcon size={16} />
                      </span>
                      <div className="dash-search-item-info">
                        <div className="dash-search-item-line1">
                          <strong className="dash-search-item-primary">{r.code} • {r.gta}</strong>
                          <span className={`dash-search-status-pill ${getStatusBadgeClass(r.status)}`}>
                            {r.status}
                          </span>
                        </div>
                        <div className="dash-search-item-line2">
                          <span>{r.driver}</span>
                          {r.plate && <span>• Placa {r.plate}</span>}
                          <span>• {r.route}</span>
                        </div>
                      </div>
                      <span className="dash-search-item-arrow" title="Abrir auditoria">
                        <ArrowRightIcon size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÃO 2: FROTA & PLACAS */}
            {filteredVehicles.length > 0 && (
              <div className="dash-search-group">
                <div className="dash-search-group-title">
                  <span>Frota &amp; Placas</span>
                  <span className="dash-search-group-badge">{filteredVehicles.length}</span>
                </div>
                <div className="dash-search-list">
                  {filteredVehicles.map((v) => (
                    <button
                      key={`vehicle-${v.id}-${v.placa}`}
                      type="button"
                      className="dash-search-item"
                      onClick={() => {
                        onSelectVehicle(v);
                        onClose();
                      }}
                    >
                      <span className="dash-search-item-icon vehicle">
                        <NavFrotaIcon size={16} />
                      </span>
                      <div className="dash-search-item-info">
                        <div className="dash-search-item-line1">
                          <strong className="dash-search-item-primary">Placa {v.placa}</strong>
                          {v.status && (
                            <span className="dash-search-tag">{v.status}</span>
                          )}
                        </div>
                        <div className="dash-search-item-line2">
                          <span>{v.modelo}</span>
                          {v.marca && <span>• {v.marca}</span>}
                          {v.motorista && <span>• Condutor: {v.motorista}</span>}
                        </div>
                      </div>
                      <span className="dash-search-item-arrow" title="Ver detalhes da frota">
                        <ArrowRightIcon size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÃO 3: MOTORISTAS & COLABORADORES */}
            {filteredDrivers.length > 0 && (
              <div className="dash-search-group">
                <div className="dash-search-group-title">
                  <span>Motoristas &amp; Operação</span>
                  <span className="dash-search-group-badge">{filteredDrivers.length}</span>
                </div>
                <div className="dash-search-list">
                  {filteredDrivers.map((d) => (
                    <button
                      key={`driver-${d.id}-${d.nome}`}
                      type="button"
                      className="dash-search-item"
                      onClick={() => {
                        onSelectDriver(d);
                        onClose();
                      }}
                    >
                      <span className="dash-search-item-icon driver">
                        <NavMotoristasIcon size={16} />
                      </span>
                      <div className="dash-search-item-info">
                        <div className="dash-search-item-line1">
                          <strong className="dash-search-item-primary">{d.nome}</strong>
                          {d.cnhStatus && (
                            <span className={`dash-search-tag ${d.cnhStatus.toLowerCase().includes('venc') ? 'tag-warn' : 'tag-ok'}`}>
                              {d.cnhStatus}
                            </span>
                          )}
                        </div>
                        <div className="dash-search-item-line2">
                          <span>{d.cargo}</span>
                          {d.rotaAtual && <span>• Rota atual: {d.rotaAtual}</span>}
                        </div>
                      </div>
                      <span className="dash-search-item-arrow" title="Ver cadastro do colaborador">
                        <ArrowRightIcon size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="dash-search-footer">
        <span>Clique no item para abrir auditoria ou visualizar dados</span>
      </div>
    </div>
  );
};
