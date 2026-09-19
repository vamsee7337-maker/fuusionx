import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, LoadingSpinner, EmptyState } from '../../components/common';
import { useAuth } from '../../context/AuthContext';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [caseData, setCaseData] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload state
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadCaseDetails();
  }, [id]);

  const loadCaseDetails = async () => {
    try {
      const res = await api.get(`/cases/${id}`);
      setCaseData(res.data.case);
      setEvidence(res.data.evidence);
      setEditForm({ title: res.data.case.title, description: res.data.case.description || '' });
    } catch (err) {
      console.error('Failed to load case:', err);
      navigate('/officer/cases');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = '';
    
    setUploadError('');
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', id);

    try {
      const res = await api.post('/evidence/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      setEvidence([res.data.evidence, ...evidence]);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateCase = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      await api.patch(`/cases/${id}`, editForm);
      setCaseData({ ...caseData, ...editForm });
      setIsEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update case');
    } finally {
      setEditSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this case as ${newStatus}?`)) return;
    try {
      await api.patch(`/cases/${id}/status`, { status: newStatus });
      setCaseData({ ...caseData, status: newStatus });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!caseData) return null;

  const isOwner = caseData.created_by === user?.id;
  const isFrozen = caseData.status === 'CLOSED' || caseData.status === 'ARCHIVED';

  return (
    <div className="animate-fade-in max-w-5xl mx-auto relative">
      
      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-600 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Edit Case Details</h2>
              {editError && <div className="text-red-400 text-sm mb-4 bg-red-500/10 p-3 rounded">{editError}</div>}
              <form onSubmit={handleUpdateCase}>
                <div className="mb-4">
                  <label className="block text-dark-300 text-sm font-medium mb-1">Case Title *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editForm.title}
                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-dark-300 text-sm font-medium mb-1">Description</label>
                  <textarea
                    className="input-field min-h-[100px]"
                    value={editForm.description}
                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-dark-300 hover:text-white transition-colors text-sm font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving} className="btn-primary">
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Link to="/officer/cases" className="text-dark-400 hover:text-white text-sm flex items-center gap-2 mb-4">
          ← Back to Cases
        </Link>
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{caseData.title}</h1>
              <StatusBadge status={caseData.status} />
            </div>
            <p className="font-mono text-primary-400 text-sm">{caseData.case_number}</p>
          </div>
          
          <div className="flex gap-3">
            {isOwner && !isFrozen && (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm font-medium transition-colors border border-dark-600">
                ✏️ Edit Case
              </button>
            )}

            {!isFrozen && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading}
                  className="btn-primary flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading {uploadProgress}%
                    </>
                  ) : (
                    <>📤 Upload Evidence</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6 border border-red-500/20">
          {uploadError}
        </div>
      )}
      
      {isFrozen && (
        <div className="bg-dark-500/10 text-dark-300 p-4 rounded-lg mb-6 border border-dark-600 flex items-center gap-3">
          <span className="text-xl">🔒</span>
          <p className="text-sm">This case is currently {caseData.status}. Evidence uploads and modifications are disabled.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Case Info */}
        <div className="card p-6 lg:col-span-1 h-fit">
          <div className="flex justify-between items-center mb-4 border-b border-dark-700 pb-2">
            <h3 className="text-white font-semibold">Case Details</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-dark-400 mb-1">Description</p>
              <p className="text-dark-200">{caseData.description || 'No description'}</p>
            </div>
            <div>
              <p className="text-dark-400 mb-1">Created By</p>
              <p className="text-white font-medium">{caseData.creator_name}</p>
            </div>
            <div>
              <p className="text-dark-400 mb-1">Date Created</p>
              <p className="text-dark-200">{new Date(caseData.created_at + 'Z').toLocaleString()}</p>
            </div>
            
            {/* Status Controls */}
            {isOwner && (
              <div className="pt-4 border-t border-dark-700 mt-4">
                <p className="text-dark-400 mb-2">Case Management</p>
                <div className="flex flex-wrap gap-2">
                  {caseData.status !== 'OPEN' && (
                    <button onClick={() => handleStatusChange('OPEN')} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded text-xs font-medium transition-colors">
                      Reopen Case
                    </button>
                  )}
                  {caseData.status !== 'CLOSED' && (
                    <button onClick={() => handleStatusChange('CLOSED')} className="px-3 py-1.5 bg-dark-600/50 text-dark-300 hover:bg-dark-600 hover:text-white border border-dark-600 rounded text-xs font-medium transition-colors">
                      Close Case
                    </button>
                  )}
                  {caseData.status !== 'ARCHIVED' && (
                    <button onClick={() => handleStatusChange('ARCHIVED')} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded text-xs font-medium transition-colors">
                      Archive Case
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Evidence List */}
        <div className="card lg:col-span-2 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-dark-700/50 bg-dark-800 flex justify-between items-center">
            <h3 className="text-white font-semibold">Digital Evidence ({evidence.length})</h3>
          </div>
          
          <div className="flex-1 overflow-auto bg-dark-900/50 min-h-[300px]">
            {evidence.length === 0 ? (
              <EmptyState 
                icon="📎" 
                title="No evidence attached" 
                description="Upload files to begin building this case." 
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="text-xs font-semibold text-dark-400 uppercase px-6 py-3 text-left">Filename</th>
                    <th className="text-xs font-semibold text-dark-400 uppercase px-6 py-3 text-left">Size</th>
                    <th className="text-xs font-semibold text-dark-400 uppercase px-6 py-3 text-left">Status</th>
                    <th className="text-xs font-semibold text-dark-400 uppercase px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/30">
                  {evidence.map(ev => (
                    <tr key={ev.id} className="hover:bg-dark-800 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl text-primary-400">📄</span>
                          <div>
                            <p className="text-sm font-medium text-white line-clamp-1">{ev.original_filename}</p>
                            <p className="text-xs text-dark-400 font-mono mt-1">SHA-256: {ev.sha256_hash.substring(0, 12)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-300">
                        {(ev.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={ev.encryption_status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => navigate(`/officer/evidence/${ev.id}`)}
                          className="text-primary-400 hover:text-primary-300 text-sm font-medium hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
