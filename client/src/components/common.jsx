export function StatusBadge({ status }) {
  const styles = {
    PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    VERIFIED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    TAMPER_DETECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    OPEN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    CLOSED: 'bg-dark-500/20 text-dark-400 border-dark-500/30',
    ARCHIVED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    ENCRYPTED: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
    ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${styles[status] || 'bg-dark-700 text-dark-300 border-dark-600'}`}>
      {status === 'TAMPER_DETECTED' ? 'TAMPER DETECTED' : status}
    </span>
  );
}

export function StatCard({ icon, label, value, color = 'primary' }) {
  const colorMap = {
    primary: 'from-primary-500/20 to-primary-600/5 border-primary-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
  };

  const iconColorMap = {
    primary: 'text-primary-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  };

  return (
    <div className={`stat-card bg-gradient-to-br ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-dark-400 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`text-2xl ${iconColorMap[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl text-dark-500 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-dark-300">{title}</h3>
      {description && <p className="text-dark-400 mt-1 text-sm">{description}</p>}
    </div>
  );
}
