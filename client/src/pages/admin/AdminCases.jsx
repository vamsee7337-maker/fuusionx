import { useState, useEffect } from 'react';
import api from '../../api/client';
import { StatusBadge, LoadingSpinner, EmptyState } from '../../components/common';

export default function AdminCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const res = await api.get('/cases');
      setCases(res.data.cases);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">All Cases</h1>
        <p className="text-dark-400 mt-1">Read-only view of all cases in the system</p>
      </div>

      {cases.length === 0 ? (
        <EmptyState icon="📁" title="No cases yet" description="No cases have been created." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="table-header px-6 py-4 text-left">Case Number</th>
                <th className="table-header px-6 py-4 text-left">Title</th>
                <th className="table-header px-6 py-4 text-left">Created By</th>
                <th className="table-header px-6 py-4 text-left">Status</th>
                <th className="table-header px-6 py-4 text-left">Evidence</th>
                <th className="table-header px-6 py-4 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/30">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-dark-700/20 transition-colors">
                  <td className="table-cell font-mono text-primary-400 text-xs">{c.case_number}</td>
                  <td className="table-cell font-medium text-white">{c.title}</td>
                  <td className="table-cell text-dark-300">{c.creator_name}</td>
                  <td className="table-cell"><StatusBadge status={c.status} /></td>
                  <td className="table-cell">
                    <span className="bg-dark-700 text-dark-200 px-2 py-1 rounded text-xs">{c.evidence_count} files</span>
                  </td>
                  <td className="table-cell text-dark-400 text-xs">{new Date(c.created_at + 'Z').toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
