import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, LoadingSpinner } from '../../components/common';

export default function EvidenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    loadEvidence();
  }, [id]);

  const loadEvidence = async () => {
    try {
      const res = await api.get(`/evidence/${id}`);
      setEvidence(res.data.evidence);
    } catch (err) {
      console.error('Failed to load evidence:', err);
      navigate('/officer/cases');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.post(`/evidence/${id}/verify`);
      setVerifyResult(res.data);
    } catch (err) {
      setVerifyResult({
        status: 'ERROR',
        error: err.response?.data?.error || 'Verification failed'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(`/evidence/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', evidence.original_filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to download evidence');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!evidence) return null;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to={`/officer/cases/${evidence.case_id}`} className="text-dark-400 hover:text-white text-sm flex items-center gap-2 mb-4">
          ← Back to Case
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{evidence.original_filename}</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-dark-400">Case:</span>
              <span className="font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">{evidence.case_number}</span>
              <span className="text-dark-500">•</span>
              <StatusBadge status={evidence.status} />
              <StatusBadge status={evidence.encryption_status} />
            </div>
          </div>
          
          <button 
            onClick={handleDownload}
            className="btn-secondary flex items-center gap-2"
          >
            ↓ Download Decrypted
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Integrity Verification Card */}
        <div className="card p-6 border-primary-500/30 shadow-primary-500/5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🛡️</span> Integrity Verification
          </h2>
          
          <div className="mb-6">
            <p className="text-dark-400 text-sm mb-1">Stored SHA-256 Hash</p>
            <div className="bg-dark-900 p-3 rounded-lg border border-dark-700 font-mono text-xs text-primary-300 break-all">
              {evidence.sha256_hash}
            </div>
          </div>

          {!verifyResult ? (
            <button 
              onClick={handleVerify} 
              disabled={verifying}
              className="btn-primary w-full pulse-glow"
            >
              {verifying ? 'Verifying Integrity...' : 'VERIFY INTEGRITY'}
            </button>
          ) : (
            <div className={`p-4 rounded-lg border ${
              verifyResult.status === 'VERIFIED' ? 'bg-emerald-500/10 border-emerald-500/30' : 
              verifyResult.status === 'TAMPER_DETECTED' ? 'bg-red-500/10 border-red-500/30' : 
              'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`text-2xl ${
                  verifyResult.status === 'VERIFIED' ? 'text-emerald-400' : 
                  verifyResult.status === 'TAMPER_DETECTED' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {verifyResult.status === 'VERIFIED' ? '✅' : verifyResult.status === 'TAMPER_DETECTED' ? '❌' : '⚠️'}
                </div>
                <div>
                  <h3 className={`font-bold ${
                    verifyResult.status === 'VERIFIED' ? 'text-emerald-400' : 
                    verifyResult.status === 'TAMPER_DETECTED' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {verifyResult.status === 'TAMPER_DETECTED' ? 'TAMPER DETECTED' : verifyResult.status}
                  </h3>
                  <p className="text-xs text-dark-300">
                    {verifyResult.verified_at ? new Date(verifyResult.verified_at).toLocaleString() : 'Verification failed'}
                  </p>
                </div>
              </div>
              
              {verifyResult.status === 'TAMPER_DETECTED' && verifyResult.computed_hash && (
                <div className="mt-3">
                  <p className="text-red-400 text-xs mb-1">Computed Hash Mismatch:</p>
                  <div className="bg-dark-950 p-2 rounded border border-red-500/30 font-mono text-[10px] text-red-300 break-all">
                    {verifyResult.computed_hash}
                  </div>
                </div>
              )}
              
              {verifyResult.error && (
                <p className="text-red-400 text-sm mt-2">{verifyResult.error}</p>
              )}

              <button 
                onClick={handleVerify} 
                disabled={verifying}
                className="mt-4 text-xs font-medium text-dark-300 hover:text-white underline w-full text-center"
              >
                Run Verification Again
              </button>
            </div>
          )}
        </div>

        {/* Metadata Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 border-b border-dark-700 pb-2">File Metadata</h2>
          
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-dark-400 mb-1">Original Filename</dt>
              <dd className="text-white font-medium break-all">{evidence.original_filename}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-dark-400 mb-1">File Size</dt>
                <dd className="text-dark-200">{(evidence.file_size / 1024).toFixed(2)} KB</dd>
              </div>
              <div>
                <dt className="text-dark-400 mb-1">MIME Type</dt>
                <dd className="text-dark-200">{evidence.mime_type}</dd>
              </div>
            </div>
            <div>
              <dt className="text-dark-400 mb-1">Upload Date</dt>
              <dd className="text-dark-200">{new Date(evidence.uploaded_at + 'Z').toLocaleString()}</dd>
            </div>
            <div className="pt-4 border-t border-dark-700">
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded border border-emerald-500/20">
                <span>🔒</span>
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wide">AES-256-GCM Encrypted</p>
                  <p className="text-[11px] opacity-80">File is encrypted at rest</p>
                </div>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
