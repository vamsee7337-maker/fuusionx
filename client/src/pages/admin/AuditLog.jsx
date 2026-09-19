import { useState, useEffect } from 'react';
import api from '../../api/client';
import { LoadingSpinner, EmptyState } from '../../components/common';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit?page=${page}&limit=25`);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const actionColors = {
    LOGIN: 'text-blue-400',
    LOGOUT: 'text-dark-400',
    OFFICER_REGISTERED: 'text-amber-400',
    OFFICER_APPROVED: 'text-emerald-400',
    OFFICER_REJECTED: 'text-red-400',
    CASE_CREATED: 'text-blue-400',
    EVIDENCE_UPLOADED: 'text-primary-400',
    EVIDENCE_ACCESSED: 'text-dark-300',
    EVIDENCE_VERIFIED: 'text-emerald-400',
    UNAUTHORIZED_ACCESS: 'text-red-400',
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-dark-400 mt-1">Complete activity trail across the system</p>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon="📋" title="No audit logs" description="No activity has been recorded yet." />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="table-header px-6 py-4 text-left">Timestamp</th>
                  <th className="table-header px-6 py-4 text-left">Action</th>
                  <th className="table-header px-6 py-4 text-left">User</th>
                  <th className="table-header px-6 py-4 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/30">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-700/20 transition-colors">
                    <td className="table-cell text-dark-400 text-xs font-mono whitespace-nowrap">
                      {new Date(log.timestamp + 'Z').toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs font-semibold ${actionColors[log.action] || 'text-dark-300'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="table-cell text-dark-300 text-sm">
                      {log.user_name || log.user_email || '—'}
                    </td>
                    <td className="table-cell text-dark-200 text-sm max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-dark-400 text-sm">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-outline text-sm py-1.5 px-3 disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="btn-outline text-sm py-1.5 px-3 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
