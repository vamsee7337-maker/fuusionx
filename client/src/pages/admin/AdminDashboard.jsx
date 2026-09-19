import { useState, useEffect } from 'react';
import api from '../../api/client';
import { StatCard, LoadingSpinner } from '../../components/common';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data.stats);
      setRecentActivity(res.data.recentActivity);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-dark-400 mt-1">System overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard icon="👤" label="Total Officers" value={stats?.totalOfficers || 0} color="primary" />
        <StatCard icon="⏳" label="Pending Approval" value={stats?.pendingOfficers || 0} color="amber" />
        <StatCard icon="✅" label="Approved Officers" value={stats?.approvedOfficers || 0} color="emerald" />
        <StatCard icon="📁" label="Total Cases" value={stats?.totalCases || 0} color="blue" />
        <StatCard icon="📎" label="Total Evidence" value={stats?.totalEvidence || 0} color="primary" />
        <StatCard icon="🚫" label="Rejected Officers" value={stats?.rejectedOfficers || 0} color="red" />
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-6 py-4 border-b border-dark-700/50">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-dark-700/30">
          {recentActivity.map((log) => (
            <div key={log.id} className="px-6 py-3 flex items-center justify-between hover:bg-dark-700/20 transition-colors">
              <div className="flex items-center gap-3">
                <ActionIcon action={log.action} />
                <div>
                  <p className="text-sm text-dark-200">{log.details}</p>
                  <p className="text-xs text-dark-500">{log.user_name || 'System'}</p>
                </div>
              </div>
              <span className="text-xs text-dark-500">{formatTimestamp(log.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionIcon({ action }) {
  const icons = {
    LOGIN: '🔑',
    LOGOUT: '🚪',
    OFFICER_REGISTERED: '📝',
    OFFICER_APPROVED: '✅',
    OFFICER_REJECTED: '❌',
    CASE_CREATED: '📁',
    EVIDENCE_UPLOADED: '📤',
    EVIDENCE_ACCESSED: '👁',
    EVIDENCE_VERIFIED: '🔍',
    UNAUTHORIZED_ACCESS: '🚫',
  };
  return <span className="text-lg">{icons[action] || '📌'}</span>;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  return new Date(ts + 'Z').toLocaleString();
}
