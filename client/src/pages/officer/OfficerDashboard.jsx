import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { StatCard, LoadingSpinner } from '../../components/common';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/cases');
      setCases(res.data.cases);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const totalEvidence = cases.reduce((sum, c) => sum + (c.evidence_count || 0), 0);
  const openCases = cases.filter(c => c.status === 'OPEN').length;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome, {user?.name}</h1>
        <p className="text-dark-400 mt-1">Legal Officer Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon="📁" label="My Cases" value={cases.length} color="primary" />
        <StatCard icon="📂" label="Open Cases" value={openCases} color="blue" />
        <StatCard icon="📎" label="Evidence Files" value={totalEvidence} color="emerald" />
      </div>

      {/* Recent Cases */}
      <div className="card">
        <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Cases</h2>
          <button onClick={() => navigate('/officer/cases')} className="text-primary-400 hover:text-primary-300 text-sm font-medium">
            View All →
          </button>
        </div>
        <div className="divide-y divide-dark-700/30">
          {cases.slice(0, 5).map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/officer/cases/${c.id}`)}
              className="px-6 py-4 flex items-center justify-between hover:bg-dark-700/20 transition-colors cursor-pointer"
            >
              <div>
                <p className="text-white font-medium">{c.title}</p>
                <p className="text-dark-400 text-xs mt-1">{c.case_number} • {c.evidence_count} evidence files</p>
              </div>
              <span className="text-dark-500 text-sm">→</span>
            </div>
          ))}
          {cases.length === 0 && (
            <div className="px-6 py-8 text-center text-dark-400 text-sm">
              No cases yet. Create your first case to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
