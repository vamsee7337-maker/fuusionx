import { useState, useEffect } from 'react';
import api from '../../api/client';
import { StatusBadge, LoadingSpinner, EmptyState } from '../../components/common';

export default function OfficerManagement() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadOfficers();
  }, []);

  const loadOfficers = async () => {
    try {
      const res = await api.get('/officers');
      setOfficers(res.data.officers);
    } catch (err) {
      console.error('Failed to load officers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/officers/${id}/approve`);
      await loadOfficers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Reject this officer? They will not be able to access the system.')) return;
    setActionLoading(id);
    try {
      await api.patch(`/officers/${id}/reject`);
      await loadOfficers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Officer Management</h1>
        <p className="text-dark-400 mt-1">Review and manage Legal Officer registrations</p>
      </div>

      {officers.length === 0 ? (
        <EmptyState icon="👤" title="No officers registered" description="No Legal Officers have registered yet." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="table-header px-6 py-4 text-left">Name</th>
                <th className="table-header px-6 py-4 text-left">Email</th>
                <th className="table-header px-6 py-4 text-left">Status</th>
                <th className="table-header px-6 py-4 text-left">Registered</th>
                <th className="table-header px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/30">
              {officers.map((officer) => (
                <tr key={officer.id} className="hover:bg-dark-700/20 transition-colors">
                  <td className="table-cell font-medium text-white">{officer.name}</td>
                  <td className="table-cell text-dark-300">{officer.email}</td>
                  <td className="table-cell">
                    <StatusBadge status={officer.status} />
                  </td>
                  <td className="table-cell text-dark-400 text-xs">
                    {new Date(officer.created_at + 'Z').toLocaleDateString()}
                  </td>
                  <td className="table-cell text-right">
                    {officer.status === 'PENDING' && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(officer.id)}
                          disabled={actionLoading === officer.id}
                          className="btn-success text-xs py-1.5 px-3"
                        >
                          {actionLoading === officer.id ? '...' : 'APPROVE'}
                        </button>
                        <button
                          onClick={() => handleReject(officer.id)}
                          disabled={actionLoading === officer.id}
                          className="btn-danger text-xs py-1.5 px-3"
                        >
                          REJECT
                        </button>
                      </div>
                    )}
                    {officer.status === 'APPROVED' && (
                      <span className="text-emerald-400 text-xs">Active</span>
                    )}
                    {officer.status === 'REJECTED' && (
                      <span className="text-red-400 text-xs">Denied</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
