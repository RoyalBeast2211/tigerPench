import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  FileText, 
  Printer, 
  Check, 
  HardDrive, 
  ShieldCheck, 
  Trees 
} from 'lucide-react';
import { fetchIntelligenceReport } from '../services/api';

export default function ExportReportModal({ isOpen, onClose }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchIntelligenceReport()
        .then(data => setReportData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pench_Wildlife_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleDownloadCSV = () => {
    if (!reportData || !reportData.individual_tigers) return;
    const headers = ['Tiger ID', 'Name', 'Gender', 'Lineage', 'Status', 'Known Territory (sq km)', 'Last Station Sighted', 'Last Sighting Date'];
    const rows = reportData.individual_tigers.map(t => [
      t.tiger_id,
      `"${t.name}"`,
      t.gender,
      `"${t.lineage || 'Pench Resident'}"`,
      t.status,
      t.known_territory_km2 || 0,
      t.last_station_id || 'N/A',
      t.last_seen_date || 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pench_Tiger_Territory_Census_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 760, padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-emerald)'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>
                Wildlife Management Intelligence Brief
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Official Pench Tiger Reserve Field Division Report
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Compiling intelligence dataset...
          </div>
        ) : (
          <div>
            {/* Report Overview Box */}
            <div style={{
              background: 'rgba(11, 16, 21, 0.85)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f8fafc' }}>
                  Monitoring Summary
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Generated: {new Date(reportData?.report_generated_at).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Monitored Tigers</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-tiger)' }}>
                    {reportData?.monitoring_summary?.total_active_tigers}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Camera Stations</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                    {reportData?.monitoring_summary?.camera_trap_stations}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Alerts</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185' }}>
                    {reportData?.monitoring_summary?.active_movement_alerts}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cycles Processed</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {reportData?.monitoring_summary?.recent_batches_processed}
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Tiger Table Preview */}
            <div style={{
              background: 'rgba(15, 23, 33, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: 20
            }}>
              <div style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)' }}>
                Individual Tiger Territory Census Summary
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>ID</th>
                      <th style={{ padding: '8px 12px' }}>Name</th>
                      <th style={{ padding: '8px 12px' }}>Sex</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Territory Area</th>
                      <th style={{ padding: '8px 12px' }}>Last Station</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.individual_tigers?.map(t => (
                      <tr key={t.tiger_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--accent-tiger)' }}>{t.tiger_id}</td>
                        <td style={{ padding: '8px 12px' }}>{t.name}</td>
                        <td style={{ padding: '8px 12px' }}>{t.gender}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className={`badge ${t.status === 'DISPERSING' ? 'badge-buffer' : 'badge-core'}`} style={{ fontSize: '0.65rem' }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{t.known_territory_km2 || 0} km²</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{t.last_station_id || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
              <button onClick={handleDownloadCSV} className="btn btn-secondary">
                <Download size={15} />
                <span>Export CSV</span>
              </button>
              <button onClick={handleDownloadJSON} className="btn btn-primary">
                <Download size={15} />
                <span>Export Full GeoJSON/JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
