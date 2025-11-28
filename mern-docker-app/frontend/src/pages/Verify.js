import React, { useState } from "react";
import API_BASE from '../services/api';
import Spline from "@splinetool/react-spline";

export default function Verify() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSplineVerify, setShowSplineVerify] = useState(true);

  const submit = async (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Enter a credential ID to verify.');
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/verify/${encodeURIComponent(query.trim())}`);
      const data = await response.json();

      // Handle our new API structure
      if (!response.ok && response.status === 404) {
        setError('Certificate not found. Please check the ID and try again.');
        setIsLoading(false);
        return;
      }
      
      if (!response.ok && response.status === 202) {
        // Certificate exists but not anchored
        setResult({
          ...data,
          status: 'Not Anchored',
          message: 'Certificate is valid but not yet anchored on blockchain'
        });
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.message || 'Certificate could not be verified.');
        setIsLoading(false);
        return;
      }

      // Transform the result for our display
      const transformedResult = {
        ...data,
        status: data.success ? (data.status === 'Valid' ? 'Authentic' : data.status) : 'Invalid',
        certificate: {
          ...data.certificate,
          blockchainVerified: data.blockchain?.verified || false,
          merkleRoot: data.blockchain?.merkleRoot,
          batchId: data.blockchain?.batchId,
          blockchainTxHash: data.blockchain?.blockchainTxHash,
          localVerification: data.blockchain?.localVerification
        },
        blockchain: data.blockchain
      };

      setResult(transformedResult);
    } catch (err) {
      setError(err.message || 'Unexpected error while verifying.');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Please choose a file to verify.');
      return;
    }
    setIsLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/api/verify/upload`, { method: 'POST', body: form });
      const data = await res.json();
      
      if (!res.ok && res.status === 404) {
        setError('No certificate matches the uploaded file. The file may not be a valid certificate or might have been tampered with.');
      } else if (!res.ok) {
        setError(data.message || 'Verification failed');
      } else {
        // Transform the result for our display
        const transformedResult = {
          ...data,
          status: data.success ? (data.status === 'Valid' ? 'Authentic' : data.status) : 'Invalid',
          certificate: {
            ...data.certificate,
            blockchainVerified: data.blockchain?.verified || false,
            merkleRoot: data.blockchain?.merkleRoot,
            batchId: data.blockchain?.batchId,
            blockchainTxHash: data.blockchain?.blockchainTxHash,
            localVerification: data.blockchain?.localVerification,
            fileHash: data.fileHash
          },
          blockchain: data.blockchain
        };
        setResult(transformedResult);
      }
    } catch (err) {
      setError(err.message || 'Unexpected error while verifying file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden">
      {/* BACKGROUND SPLINE — sits behind everything */}
      <div aria-hidden className="fixed inset-0 -z-10">
        {showSplineVerify ? (
          <>
            <div className="absolute top-0 left-0 h-full w-1/2 overflow-hidden">
              <Spline
                scene="https://prod.spline.design/RlNwFBmFhhAB0rUR/scene.splinecode"
                className="absolute inset-0 w-full h-full pointer-events-auto"
                onError={() => setShowSplineVerify(false)}
              />
            </div>
            <div className="absolute top-0 right-0 h-full w-1/2 overflow-hidden">
              <div style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }}>
                <Spline
                  scene="https://prod.spline.design/RlNwFBmFhhAB0rUR/scene.splinecode"
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                  onError={() => setShowSplineVerify(false)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-700 to-blue-800" />
        )}
      </div>

      {/* Centered verify box (no large card, compact box for ID + upload) */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-left text-white">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl">
            <h1 className="text-2xl font-semibold mb-2">Verify</h1>
            <p className="mb-6 text-gray-300">Paste credential ID to verify</p>

            <form onSubmit={submit} className="mb-6">
              <label className="block text-sm text-gray-200 mb-2">Credential ID</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. CERT-8F92-AK3"
                className="w-full bg-transparent border border-gray-700 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-400 to-cyan-400 text-black font-medium rounded hover:brightness-95 disabled:opacity-60"
                >
                  {isLoading ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            </form>

            <hr className="border-gray-700 my-6" />

            <h2 className="text-xl font-medium mb-2">Upload</h2>
            <p className="mb-4 text-gray-300">Upload a PDF to verify</p>

            <form onSubmit={uploadFile} className="mb-2">
              <label className="block text-sm text-gray-200 mb-2">Document (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files && e.target.files[0])}
                className="w-full text-sm text-gray-200 mb-4"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-400 to-cyan-400 text-black font-medium rounded hover:brightness-95 disabled:opacity-60"
                >
                  {isLoading ? 'Verifying…' : 'Upload & Verify'}
                </button>
              </div>
            </form>

            {error && <p className="text-red-400 mt-4">{error}</p>}
            {result && (
              <pre className="text-left mt-4 bg-white/5 text-sm p-3 rounded overflow-auto max-h-60">{JSON.stringify(result, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
