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
  // credential ID lookup removed - verification uses drag & drop PDF only
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

  // credential ID submit removed - using drag & drop uploads only

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
      else setResult({
        ...data,
        status: data.success ? (data.status === 'Valid' ? 'Authentic' : data.status) : 'Invalid',
        certificate: { ...data.certificate, blockchainVerified: data.blockchain?.verified || false, fileHash: data.fileHash },
        blockchain: data.blockchain
      });
    } catch (err) {
      setError(err.message || 'Unexpected error while verifying file.');
    } finally { setIsLoading(false); }
  };

  // Drag & drop handlers
  const onDrop = (e) => {
    e.preventDefault();
    setError('');
    const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) || null;
    if (f) {
      setFile(f);
      // slight delay to ensure state updated, then call upload
      setTimeout(() => {
        uploadFile();
      }, 120);
    }
  };

  const onFileSelected = (e) => {
    setError('');
    const f = e.target.files && e.target.files[0];
    if (f) {
      setFile(f);
      // auto upload
      setTimeout(() => uploadFile(), 120);
    }
  };

  // Clear result / error
  const clear = () => { setResult(null); setError(''); setFile(null); };

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

            {/* Note: credential ID lookup removed - Drag & Drop only (auto verifies) */}

            {/* Drag & Drop Upload Box */}
            <div className="mb-4">
              <label className="block text-sm text-sky-200 mb-2">Upload Certificate (PDF)</label>

              <div
                onDragOver={(e) => { e.preventDefault(); }}
                onDragEnter={(e) => { e.preventDefault(); }}
                onDrop={onDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="relative w-72 h-72 mx-auto cursor-pointer select-none"
                title="Click to choose a file or drag & drop here"
              >
                {/* animated cube + particles */}
                <style>{`
                  .vp-perspective { perspective: 900px; }
                  .vp-cube {
                    width: 160px; height: 160px; transform-style: preserve-3d;
                    transform-origin: center; animation: vp-rotate 8s linear infinite;
                    transition: transform .3s ease;
                  }
                  .vp-cube:hover { animation-play-state: paused; transform: translateY(-6px) rotateX(6deg) rotateY(-6deg); }
                  .vp-face {
                    position: absolute; inset: 0; border-radius: 12px;
                    display:flex; align-items:center; justify-content:center;
                    font-weight:700; color: #fff; text-shadow: 0 6px 20px rgba(0,0,0,0.45);
                  }
                  .vp-face.front { background: linear-gradient(135deg,#ef3b6d,#c21a75); transform: translateZ(80px); }
                  .vp-face.right { background: linear-gradient(135deg,#c21a75,#8b2b6c); transform: rotateY(90deg) translateZ(80px); }
                  .vp-face.top { background: linear-gradient(135deg,#ff7aa3,#c21a75); transform: rotateX(90deg) translateZ(80px); }
                  @keyframes vp-rotate { 0%{ transform: rotateX(10deg) rotateY(0deg); } 50%{ transform: rotateX(-10deg) rotateY(180deg); } 100%{ transform: rotateX(10deg) rotateY(360deg); } }
                  .vp-glow { position:absolute; inset: -18px; border-radius: 16px; filter: blur(18px); opacity: 0.9; mix-blend-mode: screen; pointer-events:none; }
                  .vp-spark { width:4px; height:4px; background:white; border-radius:999px; position:absolute; opacity:.85; box-shadow:0 0 8px white; animation: vp-spark 3s linear infinite; }
                  @keyframes vp-spark {
                    0%{ transform: translateY(0) scale(.8); opacity:.9 } 50%{ transform: translateY(-18px) scale(1.1); opacity:.6 } 100%{ transform: translateY(0) scale(.8); opacity:.9 }
                  }
                `}</style>

                <div className="absolute inset-0 flex items-center justify-center vp-perspective">
                  <div className="vp-cube" aria-hidden>
                    <div className="vp-face front flex-col">
                      <div className="text-3xl">DRAG</div>
                      <div className="text-5xl font-extrabold my-1"> & </div>
                      <div className="text-3xl">DROP</div>
                    </div>
                    <div className="vp-face right"></div>
                    <div className="vp-face top"></div>
                  </div>
                </div>

                {/* glow behind cube */}
                <div className="vp-glow" style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.18), transparent 40%)' }} />

                {/* decorative small sparks */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="vp-spark" style={{ left: '14%', top: '20%', animationDelay: '0s' }} />
                  <div className="vp-spark" style={{ left: '78%', top: '30%', animationDelay: '0.6s' }} />
                  <div className="vp-spark" style={{ left: '50%', top: '72%', animationDelay: '1.2s' }} />
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
                {/* instruction removed per request (drag/drop instruction not repeated) */}
             </div>

            {/* Errors + Result */}
            {error && <p className="text-rose-400 mt-4">{error}</p>}

            {result && (
              <div className="mt-6">
                {/* Simplified result: only show valid/invalid message in template colors */}
                <div className={`rounded-lg p-6 text-center font-semibold text-lg ${result.success ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white'}`}>
                  {result.success ? 'Valid Certificate — This PDF is authentic' : 'Invalid Certificate — This PDF is NOT authentic'}
                </div>
                {result.message && <p className="mt-3 text-sm text-sky-200/80 text-center">{result.message}</p>}
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
