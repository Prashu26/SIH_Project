// Verify.jsx
import React, { useState, useEffect, useRef } from "react";
import API_BASE from '../services/api';
import 'boxicons/css/boxicons.min.css';

/**
 * Verify component
 * - dynamic Spline background import (avoids dev chunk 404)
 * - credential ID form (verify by ID)
 * - drag & drop + clickable upload box (auto verifies on select/drop)
 * - JSON result viewer + friendly status badges
 *
 * Paste this file as Verify.jsx and ensure tailwind/css is available in your project.
 */

export default function Verify() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // dynamic Spline import (avoids dev chunk 404)
  const [SplineComp, setSplineComp] = useState(null);
  const [splineFailed, setSplineFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    import('@splinetool/react-spline')
      .then((mod) => { if (mounted && mod && mod.default) setSplineComp(() => mod.default); })
      .catch(() => { if (mounted) setSplineFailed(true); });
    return () => { mounted = false; };
  }, []);

  // file input ref to trigger click
  const fileInputRef = useRef(null);

  const features = [
    { icon: 'bx-shield-check', title: 'Blockchain Security', description: 'Immutable & tamper-proof credentials' },
    { icon: 'bx-time', title: 'Instant Verification', description: 'Real-time certificate validation' },
    { icon: 'bx-globe', title: 'Global Recognition', description: 'Credentials trusted worldwide' },
    { icon: 'bx-fingerprint', title: 'Digital Identity', description: 'Secure digital identity for learners' }
  ];

  const winterGradients = [
    'from-sky-400 to-indigo-400',
    'from-cyan-300 to-sky-400',
    'from-indigo-300 to-sky-300',
    'from-slate-300 to-indigo-300'
  ];

  const SCENE_URL = "https://prod.spline.design/S82vCD0u7Y-1ZAF0/scene.splinecode";

  // Submit credential ID
  const submit = async (e) => {
    e && e.preventDefault && e.preventDefault();
    if (!query.trim()) { setError('Enter a credential ID to verify.'); setResult(null); return; }
    setIsLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/verify/${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok && res.status === 404) { setError('Certificate not found.'); setIsLoading(false); return; }
      if (!res.ok) { setError(data.message || 'Certificate could not be verified.'); setIsLoading(false); return; }
      setResult(data);
    } catch (err) {
      setError(err.message || 'Unexpected error while verifying.');
    } finally { setIsLoading(false); }
  };

  // Upload file handler
  const uploadFile = async (incomingEvent) => {
    // allow calling from drop handler where we already set file
    if (incomingEvent && incomingEvent.preventDefault) incomingEvent.preventDefault();
    setError(''); setResult(null);
    const targetFile = file;
    if (!targetFile) { setError('Please choose a file to verify.'); return; }

    // Basic file type validation
    if (targetFile.type !== "application/pdf" && !targetFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }

    setIsLoading(true);
    try {
      const form = new FormData(); form.append('file', targetFile);
      const res = await fetch(`${API_BASE}/api/verify/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok && res.status === 404) setError('No certificate matches the uploaded file.');
      else if (!res.ok) setError(data.message || 'Verification failed');
      else setResult(data);
    } catch (err) {
      setError(err.message || 'Unexpected error while verifying file.');
    } finally { setIsLoading(false); }
  };

  // Drag & drop handlers
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setResult(null);
    const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) || null;
    if (f) {
      setFile(f);
      // immediate upload with the file
      setIsLoading(true);
      const form = new FormData();
      form.append('file', f);
      fetch(`${API_BASE}/api/verify/upload`, { method: 'POST', body: form })
        .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
        .then(({ ok, status, data }) => {
          if (!ok && status === 404) {
            setError('No certificate matches the uploaded file.');
            setResult(null);
          } else if (!ok) {
            setError(data.message || 'Verification failed');
            setResult(null);
          } else {
            setResult(data);
            setError('');
          }
        })
        .catch(err => {
          setError(err.message || 'Unexpected error while verifying file.');
          setResult(null);
        })
        .finally(() => setIsLoading(false));
    }
  };

  const onFileSelected = (e) => {
    setError('');
    setResult(null);
    const f = e.target.files && e.target.files[0];
    if (f) {
      setFile(f);
      // immediate upload with the file
      setIsLoading(true);
      const form = new FormData();
      form.append('file', f);
      fetch(`${API_BASE}/api/verify/upload`, { method: 'POST', body: form })
        .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
        .then(({ ok, status, data }) => {
          if (!ok && status === 404) {
            setError('No certificate matches the uploaded file.');
            setResult(null);
          } else if (!ok) {
            setError(data.message || 'Verification failed');
            setResult(null);
          } else {
            setResult(data);
            setError('');
          }
        })
        .catch(err => {
          setError(err.message || 'Unexpected error while verifying file.');
          setResult(null);
        })
        .finally(() => setIsLoading(false));
    }
  };

  // Clear result / error
  const clear = () => { setResult(null); setError(''); setFile(null); setQuery(''); };

  // small helper to render a status badge
  const StatusBadge = ({ status }) => {
    const base = "inline-block px-3 py-1 rounded-full text-sm font-semibold";
    if (!status) return null;
    if (status === 'Authentic' || status === 'Valid') return <span className={`${base} bg-emerald-600/90 text-white`}>{status}</span>;
    if (status === 'Not Anchored' || status === 'Pending') return <span className={`${base} bg-amber-500/90 text-black`}>{status}</span>;
    return <span className={`${base} bg-rose-500/90 text-white`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020214] via-[#04102a] to-[#071a2b] relative overflow-hidden text-slate-50">

      {/* Decorative background (Spline or iframe fallback) */}
      <div aria-hidden className="fixed inset-0 -z-10">
        {SplineComp && !splineFailed ? (
          <SplineComp
            scene={SCENE_URL}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-70"
            onError={() => setSplineFailed(true)}
          />
        ) : (
          <iframe
            src={SCENE_URL}
            title="spline-bg"
            className="absolute inset-0 w-full h-full pointer-events-none border-0 opacity-70"
            sandbox="allow-scripts allow-popups allow-same-origin"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-[#021426]/55 to-[#031827]/45 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-16 top-10 w-96 h-96 bg-[radial-gradient(white,transparent)] opacity-5 blur-2xl animate-[pulse_10s_linear_infinite]" />
          <div className="absolute right-8 bottom-16 w-72 h-72 bg-[radial-gradient(white,transparent)] opacity-4 blur-2xl animate-[pulse_12s_linear_infinite]" />
          <div className="absolute inset-0 opacity-20 mix-blend-screen" style={{
            backgroundImage: "radial-gradient(0.6px rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "8px 8px"
          }} />
        </div>
      </div>

      {/* Main container */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        {/* Heading */}
        <div className="text-center mb-16 relative">
          <h1 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-sky-200 to-indigo-200 bg-clip-text text-transparent">
              Verify Credentials
            </span>
          </h1>
          <p className="text-xl text-sky-200/80 max-w-3xl mx-auto leading-relaxed">
            Instantly verify digital certificates secured on blockchain. Enter the credential ID or upload your certificate PDF for authentication.
          </p>
        </div>

        {/* Card */}
        <div className="max-w-3xl mx-auto relative mb-16">
          <div className="absolute -inset-0.5 bg-[linear-gradient(90deg,rgba(148,163,184,0.06),rgba(99,102,241,0.04))] rounded-2xl blur-lg opacity-60 pointer-events-none" />
          <div className="relative bg-white/3 backdrop-blur-md border border-sky-200/8 rounded-2xl p-8 shadow-2xl">

            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-sky-300/40 to-indigo-300/40 shadow-[0_8px_30px_rgba(99,102,241,0.06)]">
                <i className="bx bx-snowflake text-2xl text-white/90"></i>
              </div>
              <h2 className="text-2xl font-semibold text-sky-100">Quick Verification</h2>
            </div>

            {/* Credential form */}
            <form onSubmit={submit} className="mb-6">
              <label className="block text-sm text-sky-200 mb-2">Credential ID</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. CERT-8F92-AK3"
                className="w-full bg-transparent border border-slate-700 rounded-lg px-4 py-2 text-sky-50 placeholder-sky-300 focus:ring-2 focus:ring-sky-400 outline-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-gradient-to-r from-sky-300 to-indigo-300 text-sky-900 font-semibold rounded-lg shadow-sm hover:scale-105 transition-transform"
                >
                  {isLoading ? "Verifying…" : "Verify"}
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="px-4 py-2 rounded-lg border border-white/10 text-sky-200 hover:bg-white/2"
                >
                  Clear
                </button>
              </div>
            </form>

            {/* Drag & Drop Upload Box */}
            <div className="mb-4">
              <label className="block text-sm text-sky-200 mb-2">Upload Certificate (PDF)</label>

              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={onDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="relative w-full max-w-md mx-auto cursor-pointer select-none border-2 border-dashed border-sky-400/50 rounded-xl p-12 bg-sky-900/20 hover:bg-sky-900/30 hover:border-sky-400 transition-all"
                title="Click to choose a file or drag & drop here"
              >
                {/* Upload Icon */}
                <div className="text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <div className="text-xl font-bold text-sky-100 mb-2">Upload PDF</div>
                  <div className="text-sm text-sky-200/70">Click to browse or drag and drop your certificate here</div>
                </div>

                {/* hidden file input */}
                <input
                  ref={fileInputRef}
                  id="fileUploadHidden"
                  type="file"
                  accept="application/pdf"
                  onChange={onFileSelected}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-sky-300/70 mt-3 text-center">Drop a PDF certificate here or click the box to choose a file. Verification runs automatically.</p>
            </div>

            {/* Errors + Result */}
            {error && <p className="text-rose-400 mt-4">{error}</p>}

            {result && (
              <div className="mt-8 flex items-center justify-center">
                <div className="bg-black/30 rounded-2xl p-12 border-4 text-center" style={{
                  borderColor: result.success ? '#10b981' : '#ef4444'
                }}>
                  <div className="text-6xl font-bold mb-4" style={{
                    color: result.success ? '#10b981' : '#ef4444'
                  }}>
                    {result.success ? '✓' : '✗'}
                  </div>
                  <div className="text-4xl font-extrabold tracking-wider" style={{
                    color: result.success ? '#10b981' : '#ef4444'
                  }}>
                    {result.status}
                  </div>
                  <div className="text-lg text-sky-200 mt-4">
                    {result.message}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Feature highlights */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-sky-100 mb-8">Why Blockchain Verification?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div key={i} className="relative rounded-2xl p-6 bg-white/3 border border-white/6 backdrop-blur-sm text-center">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 bg-gradient-to-r ${winterGradients[i % winterGradients.length]} shadow-[0_8px_30px_rgba(99,102,241,0.06)]`}>
                  <i className={`bx ${f.icon} text-2xl text-white`}></i>
                </div>
                <h3 className="text-xl font-semibold text-sky-100 mb-2">{f.title}</h3>
                <p className="text-sky-200/80">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
