import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, LoadingSpinner, EmptyState } from '../../components/common';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload state
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadCaseDetails();
  }, [id]);

  const loadCaseDetails = async () => {
    try {
      const res = await api.get(`/cases/${id}`);
      setCaseData(res.data.case);
      setEvidence(res.data.evidence);
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

    // Reset input
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
      
      // Add new evidence to top of list
      setEvidence([res.data.evidence, ...evidence]);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!caseData) return null;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="mb-6">
        <Link to="/officer/cases" className="text-dark-400 hover:text-white text-sm flex items-center gap-2 mb-4">
          ← Back to Cases
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{caseData.title}</h1>
              <StatusBadge status={caseData.status} />
            </div>
            <p className="font-mono text-primary-400 text-sm">{caseData.case_number}</p>
          </div>
          
          {/* Upload Button */}
          <div>
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
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6 border border-red-500/20">
          {uploadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Case Info */}
        <div className="card p-6 lg:col-span-1 h-fit">
          <h3 className="text-white font-semibold mb-4 border-b border-dark-700 pb-2">Case Details</h3>
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
          </div>
        </div>

        {/* Evidence List */}
        <div className="card lg:col-span-2 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-dark-700/50 bg-dark-800 flex justify-between items-center">
            <h3 className="text-white font-semibold">Digital Evidence ({evidence.length})</h3>
          </div>
          
          <div className="flex-1 overflow-auto bg-dark-900/50">
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
