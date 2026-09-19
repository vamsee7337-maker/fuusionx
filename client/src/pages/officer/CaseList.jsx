import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, LoadingSpinner, EmptyState } from '../../components/common';

export default function CaseList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const [newCase, setNewCase] = useState({ title: '', description: '' });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      const res = await api.post('/cases', newCase);
      setCases([res.data.case, ...cases]);
      setIsCreating(false);
      setNewCase({ title: '', description: '' });
      navigate(`/officer/cases/${res.data.case.id}`);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create case');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Cases</h1>
          <p className="text-dark-400 mt-1">Manage your active investigations</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="btn-primary">
          + New Case
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-lg animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Case</h2>
            
            {createError && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded mb-4 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-dark-300 text-sm mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newCase.title}
                  onChange={e => setNewCase({...newCase, title: e.target.value})}
                  className="input-field"
                  placeholder="e.g., Unauthorized Access Investigation"
                />
              </div>
              <div>
                <label className="block text-dark-300 text-sm mb-1">Description (Optional)</label>
                <textarea
                  rows="4"
                  value={newCase.description}
                  onChange={e => setNewCase({...newCase, description: e.target.value})}
                  className="input-field resize-none"
                  placeholder="Provide details about the incident..."
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsCreating(false)} className="btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading} className="btn-primary">
                  {createLoading ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cases.length === 0 ? (
        <EmptyState icon="📁" title="No cases yet" description="Click 'New Case' to start your first investigation." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => (
            <div 
              key={c.id} 
              onClick={() => navigate(`/officer/cases/${c.id}`)}
              className="card p-6 cursor-pointer hover:border-primary-500/50 hover:shadow-primary-500/10 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="font-mono text-xs text-primary-400 bg-primary-500/10 px-2 py-1 rounded">
                  {c.case_number}
                </span>
                <StatusBadge status={c.status} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                {c.title}
              </h3>
              <p className="text-dark-400 text-sm line-clamp-2 mb-4">
                {c.description || 'No description provided.'}
              </p>
              <div className="flex items-center justify-between text-xs text-dark-500 border-t border-dark-700/50 pt-4">
                <span>{new Date(c.created_at + 'Z').toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                  📎 {c.evidence_count} evidence
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
