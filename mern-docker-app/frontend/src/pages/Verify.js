import React, { useState } from 'react';
import API_BASE from '../services/api';

export default function Verify() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="card form-card">
      <h3>Instant verification</h3>
      <p className="lead">Paste a credential ID to confirm its authenticity in real time.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Credential ID
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. CERT-8F92-AK3"
            required
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Verifying…' : 'Verify credential'}
        </button>
      </form>
      <hr />
      <h4 className="section-title">Upload a document (PDF) to verify</h4>
      <form className="form" onSubmit={uploadFile}>
        <label>
          Document PDF
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files && e.target.files[0])} />
        </label>
        <button type="submit" disabled={isLoading}>{isLoading ? 'Verifying…' : 'Upload & Verify'}</button>
      </form>
      {error && <p className="form-feedback error">{error}</p>}
      {result && (
        <div className="verify-result-card">
          <h4 className={`verify-status ${result.status === 'Authentic' ? 'authentic' : result.status === 'Not Anchored' ? 'warning' : 'error'}`}>
            {result.status === 'Authentic' ? '✓ Verified Authentic' : 
             result.status === 'Not Anchored' ? '⚠ Valid but Not Anchored' :
             '✗ ' + result.status}
          </h4>
          {result.message && <p className="verify-message">{result.message}</p>}
          
          {/* Blockchain Status Section */}
          {result.blockchain && (
            <div className="blockchain-status">
              <h5>Blockchain Verification Status</h5>
              <dl>
                <dt>Blockchain Verified:</dt>
                <dd className={result.blockchain.verified ? 'text-success' : 'text-warning'}>
                  {result.blockchain.verified ? '✅ Yes' : '❌ No'}
                  {result.blockchain.reason && ` (${result.blockchain.reason})`}
                </dd>
                
                {result.blockchain.localVerification !== undefined && (
                  <>
                    <dt>Cryptographic Proof:</dt>
                    <dd className={result.blockchain.localVerification ? 'text-success' : 'text-error'}>
                      {result.blockchain.localVerification ? '✅ Valid' : '❌ Invalid'}
                    </dd>
                  </>
                )}
                
                {result.blockchain.merkleRoot && (
                  <>
                    <dt>Merkle Root:</dt>
                    <dd className="hash">{result.blockchain.merkleRoot}</dd>
                  </>
                )}
                
                {result.blockchain.batchId && (
                  <>
                    <dt>Batch ID:</dt>
                    <dd>#{result.blockchain.batchId}</dd>
                  </>
                )}
                
                {result.blockchain.blockchainTxHash && (
                  <>
                    <dt>Blockchain Transaction:</dt>
                    <dd className="hash">{result.blockchain.blockchainTxHash}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
          
          {result.certificate && (
            <div className="cert-details">
              <h5>Certificate Details</h5>
              <dl>
                <dt>Certificate ID:</dt>
                <dd>{result.certificate.certificateId}</dd>
                
                <dt>Status:</dt>
                <dd><span className={`badge ${result.certificate.status?.toLowerCase()}`}>{result.certificate.status}</span></dd>
                
                <dt>Issue Date:</dt>
                <dd>{new Date(result.certificate.issueDate).toLocaleDateString()}</dd>
                
                {result.certificate.validUntil && (
                  <>
                    <dt>Valid Until:</dt>
                    <dd>{new Date(result.certificate.validUntil).toLocaleDateString()}</dd>
                  </>
                )}
                
                {result.certificate.learner && (
                  <>
                    <dt>Learner:</dt>
                    <dd>{result.certificate.learner.name} ({result.certificate.learner.email})</dd>
                    {result.certificate.learner.learnerId && (
                      <>
                        <dt>Learner ID:</dt>
                        <dd>{result.certificate.learner.learnerId}</dd>
                      </>
                    )}
                  </>
                )}
                
                {result.certificate.institute && (
                  <>
                    <dt>Issued By:</dt>
                    <dd>{result.certificate.institute.name}</dd>
                    {result.certificate.institute.registrationId && (
                      <>
                        <dt>Registration ID:</dt>
                        <dd>{result.certificate.institute.registrationId}</dd>
                      </>
                    )}
                  </>
                )}
                
                {result.certificate.course && (
                  <>
                    <dt>Course:</dt>
                    <dd>{result.certificate.course.title}</dd>
                    {result.certificate.course.platform && (
                      <>
                        <dt>Platform:</dt>
                        <dd>{result.certificate.course.platform}</dd>
                      </>
                    )}
                  </>
                )}
                
                {/* NCVQ Information */}
                {(result.certificate.ncvqLevel || result.certificate.ncvqQualificationTitle) && (
                  <>
                    {result.certificate.ncvqLevel && (
                      <>
                        <dt>NCVQ Level:</dt>
                        <dd>{result.certificate.ncvqLevel}</dd>
                      </>
                    )}
                    {result.certificate.ncvqQualificationTitle && (
                      <>
                        <dt>Qualification:</dt>
                        <dd>{result.certificate.ncvqQualificationTitle}</dd>
                      </>
                    )}
                  </>
                )}
                
                {/* File Hash for uploaded files */}
                {result.certificate.fileHash && (
                  <>
                    <dt>File Hash:</dt>
                    <dd className="hash">{result.certificate.fileHash}</dd>
                  </>
                )}
              </dl>
              
              <h5>Blockchain Verification</h5>
              <dl>
                {result.certificate.artifactHash && (
                  <>
                    <dt>Artifact Hash:</dt>
                    <dd className="hash">{result.certificate.artifactHash}</dd>
                  </>
                )}
                
                {result.certificate.ipfsCid && (
                  <>
                    <dt>IPFS CID:</dt>
                    <dd className="hash">{result.certificate.ipfsCid}</dd>
                  </>
                )}
                
                {result.certificate.blockchainTxHash && (
                  <>
                    <dt>Blockchain TX:</dt>
                    <dd className="hash">{result.certificate.blockchainTxHash}</dd>
                  </>
                )}
                
                {result.certificate.merkleRoot && (
                  <>
                    <dt>Merkle Root:</dt>
                    <dd className="hash">{result.certificate.merkleRoot}</dd>
                  </>
                )}
                
                {result.certificate.batchId && (
                  <>
                    <dt>Batch ID:</dt>
                    <dd>#{result.certificate.batchId}</dd>
                  </>
                )}
              </dl>
              
              {result.certificate.modulesAwarded && result.certificate.modulesAwarded.length > 0 && (
                <>
                  <h5>Modules Awarded</h5>
                  <ul className="module-list">
                    {result.certificate.modulesAwarded.map((module, idx) => (
                      <li key={idx}>{module}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          
          {result.blockchain && (
            <details className="blockchain-details">
              <summary>Raw Blockchain Data</summary>
              <pre>{JSON.stringify(result.blockchain, null, 2)}</pre>
            </details>
          )}
          
          {!result.certificate && !result.blockchain && (
            <details className="raw-response">
              <summary>Raw Response</summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
