import React, { useState } from 'react';
import 'boxicons/css/boxicons.min.css';

const CertificateVerification = () => {
  const [verificationMethod, setVerificationMethod] = useState('id');
  const [certificateId, setCertificateId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Please select a PDF or image file');
      setSelectedFile(null);
    }
  };

  const verifyByCertificateId = async () => {
    if (!certificateId.trim()) {
      setError('Please enter a certificate ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(certificateId.trim())}`);
      const result = await response.json();

      setVerificationResult({
        ...result,
        method: 'Certificate ID',
        input: certificateId.trim()
      });
    } catch (err) {
      setError('Failed to verify certificate. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyByFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to verify');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/verify/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      setVerificationResult({
        ...result,
        method: 'File Upload',
        input: selectedFile.name,
        fileHash: result.fileHash
      });
    } catch (err) {
      setError('Failed to verify certificate file. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    if (verificationMethod === 'id') {
      verifyByCertificateId();
    } else {
      verifyByFileUpload();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Valid':
        return <i className="bx bx-check-circle text-green-500 text-2xl"></i>;
      case 'Not Anchored':
        return <i className="bx bx-info-circle text-yellow-500 text-2xl"></i>;
      case 'Invalid':
      case 'Not Found':
        return <i className="bx bx-x-circle text-red-500 text-2xl"></i>;
      default:
        return <i className="bx bx-question-mark text-gray-500 text-2xl"></i>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Valid':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'Not Anchored':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'Invalid':
      case 'Not Found':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Certificate Verification
        </h1>
        <p className="text-gray-600">
          Verify the authenticity of certificates using blockchain technology
        </p>
      </div>

      {/* Verification Method Selection */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              verificationMethod === 'id'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setVerificationMethod('id')}
          >
            <i className="bx bx-id-card mr-2"></i>
            Certificate ID
          </button>
          <button
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              verificationMethod === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setVerificationMethod('file')}
          >
            <i className="bx bx-upload mr-2"></i>
            File Upload
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-6">
        {verificationMethod === 'id' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate ID
            </label>
            <input
              type="text"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              placeholder="Enter certificate ID (e.g., CERT-1234567890-123)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Certificate File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,image/*"
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <i className="bx bx-cloud-upload text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-600">
                  {selectedFile ? selectedFile.name : 'Click to select PDF or image file'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: PDF, JPG, PNG
                </p>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <i className="bx bx-error-circle mr-2"></i>
          {error}
        </div>
      )}

      {/* Verify Button */}
      <div className="mb-8">
        <button
          onClick={handleVerify}
          disabled={loading || (verificationMethod === 'id' && !certificateId.trim()) || (verificationMethod === 'file' && !selectedFile)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <i className="bx bx-loader-alt animate-spin mr-2"></i>
              Verifying...
            </>
          ) : (
            <>
              <i className="bx bx-shield-check mr-2"></i>
              Verify Certificate
            </>
          )}
        </button>
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div className={`border rounded-lg p-6 ${getStatusColor(verificationResult.status)}`}>
          <div className="flex items-center mb-4">
            {getStatusIcon(verificationResult.status)}
            <div className="ml-3">
              <h3 className="text-lg font-semibold">Verification Result</h3>
              <p className="text-sm opacity-75">Method: {verificationResult.method}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium mb-2">Status</h4>
              <p className="font-bold text-lg">{verificationResult.status}</p>
              <p className="text-sm mt-1">{verificationResult.message}</p>
            </div>

            {verificationResult.certificate && (
              <div>
                <h4 className="font-medium mb-2">Certificate Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>ID:</strong> {verificationResult.certificate.certificateId}</p>
                  {verificationResult.certificate.learner && (
                    <p><strong>Name:</strong> {verificationResult.certificate.learner.name}</p>
                  )}
                  {verificationResult.certificate.fatherName && (
                    <p><strong>Father's Name:</strong> {verificationResult.certificate.fatherName}</p>
                  )}
                  {verificationResult.certificate.motherName && (
                    <p><strong>Mother's Name:</strong> {verificationResult.certificate.motherName}</p>
                  )}
                  {verificationResult.certificate.dob && (
                    <p><strong>DOB:</strong> {verificationResult.certificate.dob}</p>
                  )}
                  {verificationResult.certificate.course && (
                    <p><strong>Course:</strong> {verificationResult.certificate.course.title}</p>
                  )}
                  {verificationResult.certificate.trade && (
                    <p><strong>Trade:</strong> {verificationResult.certificate.trade}</p>
                  )}
                  {verificationResult.certificate.institute && (
                    <p><strong>Institute:</strong> {verificationResult.certificate.institute.name}</p>
                  )}
                  {verificationResult.certificate.address && (
                    <p><strong>Address:</strong> {verificationResult.certificate.address}, {verificationResult.certificate.district}, {verificationResult.certificate.state}</p>
                  )}
                  {verificationResult.certificate.nsqfLevel && (
                    <p><strong>NSQF Level:</strong> {verificationResult.certificate.nsqfLevel}</p>
                  )}
                  {verificationResult.certificate.duration && (
                    <p><strong>Duration:</strong> {verificationResult.certificate.duration}</p>
                  )}
                  {verificationResult.certificate.session && (
                    <p><strong>Session:</strong> {verificationResult.certificate.session}</p>
                  )}
                  {verificationResult.certificate.testMonth && verificationResult.certificate.testYear && (
                    <p><strong>Test Period:</strong> {verificationResult.certificate.testMonth} {verificationResult.certificate.testYear}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Blockchain Information */}
          {verificationResult.blockchain && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Blockchain Verification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Blockchain Verified:</strong> {verificationResult.blockchain.verified ? 'Yes' : 'No'}</p>
                  {verificationResult.blockchain.localVerification !== undefined && (
                    <p><strong>Local Proof Valid:</strong> {verificationResult.blockchain.localVerification ? 'Yes' : 'No'}</p>
                  )}
                  {verificationResult.blockchain.reason && (
                    <p><strong>Reason:</strong> {verificationResult.blockchain.reason}</p>
                  )}
                </div>
                <div>
                  {verificationResult.blockchain.merkleRoot && (
                    <p><strong>Merkle Root:</strong> 
                      <span className="font-mono text-xs break-all">
                        {verificationResult.blockchain.merkleRoot}
                      </span>
                    </p>
                  )}
                  {verificationResult.blockchain.batchId && (
                    <p><strong>Batch ID:</strong> {verificationResult.blockchain.batchId}</p>
                  )}
                  {verificationResult.blockchain.blockchainTxHash && (
                    <p><strong>Transaction:</strong> 
                      <span className="font-mono text-xs break-all">
                        {verificationResult.blockchain.blockchainTxHash}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* File Hash Information */}
          {verificationResult.fileHash && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">File Information</h4>
              <p className="text-sm">
                <strong>File Hash:</strong> 
                <span className="font-mono text-xs break-all ml-2">
                  {verificationResult.fileHash}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Information Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
          <i className="bx bx-info-circle mr-2"></i>
          How Certificate Verification Works
        </h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Valid:</strong> Certificate is authentic and verified on the blockchain</p>
          <p>• <strong>Not Anchored:</strong> Certificate exists but hasn't been anchored to the blockchain yet</p>
          <p>• <strong>Invalid/Not Found:</strong> Certificate doesn't exist or has been tampered with</p>
          <p>• Our system uses Merkle tree proofs to ensure certificate authenticity and prevent forgery</p>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerification;