import React, { useCallback, useEffect, useState } from "react";
import API_BASE, { apiFetch } from "../services/api";
import { useNavigate } from "react-router-dom";
import "boxicons/css/boxicons.min.css";

const CHAIN_LABELS = {
  "0x1": "Ethereum Mainnet",
  "0x5": "Goerli Testnet",
  "0xaa36a7": "Sepolia Testnet",
  "0x89": "Polygon Mainnet",
  "0x13881": "Polygon Mumbai Testnet",
};

function useAuth() {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  try {
    return {
      token,
      user: token && userData ? JSON.parse(userData) : null,
    };
  } catch (error) {
    console.error("Error parsing user data:", error);
    return { token: null, user: null };
  }
}

export default function IssuerDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statistics, setStatistics] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Form states
  const [singleCertForm, setSingleCertForm] = useState({
    learnerEmail: "",
    learnerId: "",
    courseId: "",
    courseName: "",
    skillsAcquired: "",
    validUntil: "",
    nsqfLevel: "",
    ncvqQualificationCode: "",
    // New Fields
    fatherName: "",
    motherName: "",
    dob: "",
    address: "",
    district: "",
    state: "",
    trade: "",
    duration: "",
    session: "",
    testMonth: "",
    testYear: "",
  });

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    modules: "",
    duration: "",
    ncvqLevel: "",
  });

  const [batchFile, setBatchFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [metamaskAccount, setMetamaskAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [hashToAnchor, setHashToAnchor] = useState("");
  const [contractAddress, setContractAddress] = useState(
    () => process.env.REACT_APP_CONTRACT_ADDRESS || ""
  );
  const [anchorStatus, setAnchorStatus] = useState({ type: "", message: "" });
  const [isAnchoring, setIsAnchoring] = useState(false);

  const displayChainName = chainId
    ? `${CHAIN_LABELS[chainId] || "Unknown Network"} (${chainId})`
    : "Not connected";
  const displayAccount = metamaskAccount
    ? `${metamaskAccount.slice(0, 6)}...${metamaskAccount.slice(-4)}`
    : "Not connected";

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await apiFetch("/api/institute/dashboard", { token });

      if (response.ok) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load certificates
  const loadCertificates = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await apiFetch("/api/institute/certificates", { token });

      if (response.ok) {
        setCertificates(response.data.certificates || []);
      }
    } catch (error) {
      console.error("Certificates load error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load courses
  const loadCourses = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiFetch("/api/institute/courses", { token });

      if (response.ok) {
        setCourses(response.data.courses || []);
      }
    } catch (error) {
      console.error("Courses load error:", error);
    }
  }, [token]);

  // Load proofs
  const loadProofs = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiFetch("/api/institute/proofs?status=Pending", {
        token,
      });

      if (response.ok) {
        setProofs(response.data.proofs || []);
      }
    } catch (error) {
      console.error("Proofs load error:", error);
    }
  }, [token]);

  // Load batches
  const loadBatches = useCallback(async () => {
    if (!token) return;

    try {
      const response = await apiFetch("/api/institute/batches", { token });

      if (response.ok) {
        setBatches(response.data.batches || []);
      }
    } catch (error) {
      console.error("Batches load error:", error);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadDashboard();
    loadCourses();
  }, [token, navigate, loadDashboard, loadCourses]);

  // Load data based on active tab
  useEffect(() => {
    if (!token) return;

    if (activeTab === "certificates") {
      loadCertificates();
    } else if (activeTab === "proofs") {
      loadProofs();
    } else if (activeTab === "batches") {
      loadBatches();
    }
  }, [activeTab, token, loadCertificates, loadProofs, loadBatches]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      return;
    }

    const ethereum = window.ethereum;

    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts && accounts.length > 0) {
          setMetamaskAccount(accounts[0]);
        }
      })
      .catch(() => {});

    ethereum
      .request({ method: "eth_chainId" })
      .then((id) => setChainId(id))
      .catch(() => {});

    const handleAccountsChanged = (accounts) => {
      setMetamaskAccount(accounts && accounts.length > 0 ? accounts[0] : null);
    };

    const handleChainChanged = (id) => {
      setChainId(id);
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // Handle single certificate submission
  const handleSingleCertSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.keys(singleCertForm).forEach((key) => {
        if (singleCertForm[key]) {
          formData.append(key, singleCertForm[key]);
        }
      });

      if (certFile) {
        formData.append("certificateFile", certFile);
      }

      const response = await apiFetch("/api/institute/certificates", {
        method: "POST",
        body: formData,
        token,
      });

      if (response.ok) {
        const newLearner = response.data?.newLearner;
        let successMessage = "Certificate issued successfully!";

        if (newLearner?.temporaryPassword) {
          successMessage += ` Temporary account created for ${newLearner.email}. Temporary password: ${newLearner.temporaryPassword}`;
        }

        setFeedback({ type: "success", message: successMessage });
        setSingleCertForm({
          learnerEmail: "",
          learnerId: "",
          courseId: "",
          courseName: "",
          skillsAcquired: "",
          validUntil: "",
          nsqfLevel: "",
          ncvqQualificationCode: "",
          fatherName: "",
          motherName: "",
          dob: "",
          address: "",
          district: "",
          state: "",
          trade: "",
          duration: "",
          session: "",
          testMonth: "",
          testYear: "",
        });
        setCertFile(null);
        loadDashboard();
        loadCertificates();
      } else {
        setFeedback({
          type: "error",
          message: response.data?.message || "Failed to issue certificate",
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle batch upload
  const handleBatchSubmit = async (e) => {
    e.preventDefault();

    if (!batchFile) {
      setFeedback({ type: "error", message: "Please select a file" });
      return;
    }

    setFeedback({ type: "", message: "" });
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", batchFile);

      const response = await apiFetch("/api/institute/certificates/batch", {
        method: "POST",
        body: formData,
        token,
      });

      if (response.ok) {
        const issuedCount = response.data.results?.length || 0;
        const newLearners = Array.isArray(response.data?.newLearners)
          ? response.data.newLearners
          : [];

        let message = `Batch processed: ${issuedCount} certificates issued`;
        if (newLearners.length > 0) {
          const summary = newLearners
            .map(
              (learner) =>
                `${learner.email} (temp password: ${learner.temporaryPassword})`
            )
            .join("; ");
          message += `. New learner accounts: ${summary}`;
        }

        setFeedback({ type: "success", message });
        // Save batch results so UI can display per-row details
        setBatchResults(response.data || null);
        setBatchFile(null);
        loadDashboard();
        loadCertificates();
      } else {
        const errorDetail = response.data?.errors?.[0]?.reason;
        const errorMessage = response.data?.message || "Batch upload failed";
        setFeedback({
          type: "error",
          message: errorDetail
            ? `${errorMessage}: ${errorDetail}`
            : errorMessage,
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const connectMetamask = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setAnchorStatus({
        type: "error",
        message: "Wallet not detected. Install Rabby or MetaMask and try again.",
      });
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts && accounts.length > 0 ? accounts[0] : null;
      setMetamaskAccount(account);

      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      setChainId(currentChainId);
      setAnchorStatus({
        type: "success",
        message: "Wallet connected successfully.",
      });
    } catch (error) {
      console.error("Wallet connect error:", error);
      setAnchorStatus({
        type: "error",
        message: error?.message || "Failed to connect Wallet.",
      });
    }
  }, []);

  const handleAnchorSubmit = async (e) => {
    e.preventDefault();

    const trimmedHash = hashToAnchor.trim();
    if (!trimmedHash) {
      setAnchorStatus({
        type: "error",
        message: "Enter a certificate or Merkle hash to anchor.",
      });
      return;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      setAnchorStatus({
        type: "error",
        message: "Wallet not detected. Install Rabby or MetaMask and try again.",
      });
      return;
    }

    let account = metamaskAccount;
    try {
      if (!account) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        account = accounts && accounts.length > 0 ? accounts[0] : null;
        setMetamaskAccount(account);
      }
    } catch (error) {
      console.error("Wallet account request error:", error);
      setAnchorStatus({
        type: "error",
        message: error?.message || "Wallet account access denied.",
      });
      return;
    }

    if (!account) {
      setAnchorStatus({
        type: "error",
        message: "No Wallet account available. Please connect your Wallet.",
      });
      return;
    }

    let normalizedHash = trimmedHash.startsWith("0x")
      ? trimmedHash
      : `0x${trimmedHash}`;
    if (!/^0x[0-9a-fA-F]+$/.test(normalizedHash)) {
      setAnchorStatus({
        type: "error",
        message: "Hash must be hexadecimal (0-9, a-f).",
      });
      return;
    }

    if ((normalizedHash.length - 2) % 2 !== 0) {
      normalizedHash = `0x0${normalizedHash.slice(2)}`;
    }

    const targetInput = contractAddress.trim();
    const targetAddress = targetInput || account;
    if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      setAnchorStatus({
        type: "error",
        message: "Target address must be a valid 0x-prefixed Ethereum address.",
      });
      return;
    }

    // Construct transaction data for setMerkleRoot(bytes32)
    // Selector: 0x7cb64759
    const functionSelector = "0x7cb64759";
    const hashData = normalizedHash.slice(2);
    const paddedHash = hashData.padStart(64, '0');
    const txData = functionSelector + paddedHash;

    const txParams = {
      from: account,
      to: targetAddress,
      value: "0x0",
      data: txData,
    };

    setIsAnchoring(true);
    setAnchorStatus({ type: "", message: "" });

    try {
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [txParams],
      });

      setAnchorStatus({
        type: "success",
        message: `Transaction submitted successfully: ${txHash}`,
      });
      setHashToAnchor("");
    } catch (error) {
      console.error("Anchor submission error:", error);
      setAnchorStatus({
        type: "error",
        message: error?.message || "Failed to submit transaction.",
      });
    } finally {
      setIsAnchoring(false);
    }
  };

  // Handle course creation
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });
    setIsSubmitting(true);

    try {
      const courseData = {
        ...courseForm,
        modules: courseForm.modules
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      };

      const response = await apiFetch("/api/institute/courses", {
        method: "POST",
        body: JSON.stringify(courseData),
        token,
      });

      if (response.ok) {
        setFeedback({
          type: "success",
          message: "Course created successfully!",
        });
        setCourseForm({
          title: "",
          description: "",
          modules: "",
          duration: "",
          ncvqLevel: "",
        });
        loadCourses();
      } else {
        setFeedback({
          type: "error",
          message: response.data?.message || "Failed to create course",
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle proof status update
  const updateProofStatus = async (proofId, status) => {
    try {
      const response = await apiFetch(`/api/institute/proofs/${proofId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        token,
      });

      if (response.ok) {
        setFeedback({
          type: "success",
          message: `Proof ${status.toLowerCase()} successfully`,
        });
        loadProofs();
      } else {
        setFeedback({
          type: "error",
          message: response.data?.message || "Failed to update proof",
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Network error. Please try again.",
      });
    }
  };

  // Handle certificate revocation
  const revokeCertificate = async (certId) => {
    if (!window.confirm("Are you sure you want to revoke this certificate?")) {
      return;
    }

    try {
      const reason = prompt("Enter revocation reason:");
      if (!reason) return;

      const response = await apiFetch(
        `/api/institute/certificates/${certId}/revoke`,
        {
          method: "PUT",
          body: JSON.stringify({ reason }),
          token,
        }
      );

      if (response.ok) {
        setFeedback({
          type: "success",
          message: "Certificate revoked successfully",
        });
        loadCertificates();
        loadDashboard();
      } else {
        setFeedback({
          type: "error",
          message: response.data?.message || "Failed to revoke certificate",
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Network error. Please try again.",
      });
    }
  };

  // Download proof
  const downloadFromEndpoint = async (endpoint, filename, legacyPath) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const primaryUrl = API_BASE ? `${API_BASE}${endpoint}` : endpoint;
      const response = await fetch(primaryUrl, { headers });

      if (!response.ok) {
        throw new Error("Primary download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (primaryError) {
      if (legacyPath) {
        try {
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const fallbackUrl = API_BASE
            ? `${API_BASE}${legacyPath}`
            : legacyPath;
          const fallbackResponse = await fetch(fallbackUrl, { headers });
          if (!fallbackResponse.ok) {
            throw new Error("Fallback download failed");
          }

          const blob = await fallbackResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = filename;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.URL.revokeObjectURL(url);
          return;
        } catch (fallbackError) {
          console.error("Artifact fallback failed:", fallbackError);
        }
      }

      console.error("Artifact download failed:", primaryError);
      setFeedback({
        type: "error",
        message: "Unable to download artifact. Please try again later.",
      });
    }
  };

  const downloadPdf = (cert) => {
    const legacyPath = cert.pdfPath
      ? `/${cert.pdfPath.replace(/^\//, "")}`
      : null;
    downloadFromEndpoint(
      `/api/certificates/${cert.certificateId}/download`,
      `${cert.certificateId}.pdf`,
      legacyPath
    );
  };

  const downloadMetadata = (cert) => {
    downloadFromEndpoint(
      `/api/certificates/${cert.certificateId}/artifacts/metadata`,
      `${cert.certificateId}-metadata.json`
    );
  };

  const downloadProof = (cert) => {
    const legacyPath = cert.proofPath
      ? `/${cert.proofPath.replace(/^\//, "")}`
      : null;
    downloadFromEndpoint(
      `/api/certificates/${cert.certificateId}/artifacts/proof`,
      `${cert.certificateId}-proof.json`,
      legacyPath
    );
  };

  const downloadCanonical = (cert) => {
    downloadFromEndpoint(
      `/api/certificates/${cert.certificateId}/canonical`,
      `${cert.certificateId}-canonical.json`
    );
  };

  if (!token || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-xl">
                <i className="bx bx-buildings text-white text-3xl"></i>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">
                  Issuer Dashboard
                </h1>
                <p className="text-gray-300 mt-1">
                  Welcome back, {user?.name || "Institute"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <i className="bx bx-log-out"></i>
              Logout
            </button>
          </div>

          {/* Feedback Message */}
          {feedback.message && (
            <div
              className={`rounded-lg p-4 mb-6 ${
                feedback.type === "error"
                  ? "bg-red-600/20 border border-red-500/30 text-red-300"
                  : "bg-green-600/20 border border-green-500/30 text-green-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <i
                  className={`bx ${
                    feedback.type === "error"
                      ? "bx-error-circle"
                      : "bx-check-circle"
                  } text-xl`}
                ></i>
                <span>{feedback.message}</span>
                <button
                  onClick={() => setFeedback({ type: "", message: "" })}
                  className="ml-auto"
                >
                  <i className="bx bx-x text-xl"></i>
                </button>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-lg">
                    <i className="bx bx-certificate text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {statistics.totalCertificates}
                    </div>
                    <p className="text-gray-400">Total Certificates</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-600 p-3 rounded-lg">
                    <i className="bx bx-check-circle text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {statistics.issuedCertificates}
                    </div>
                    <p className="text-gray-400">Issued</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-600 p-3 rounded-lg">
                    <i className="bx bx-time-five text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {statistics.pendingProofs}
                    </div>
                    <p className="text-gray-400">Pending Reviews</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600 p-3 rounded-lg">
                    <i className="bx bx-book text-white text-2xl"></i>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {statistics.totalCourses}
                    </div>
                    <p className="text-gray-400">Courses</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-700">
            {[
              { id: "dashboard", label: "Dashboard", icon: "bx-home" },
              {
                id: "issue",
                label: "Issue Certificate",
                icon: "bx-certificate",
              },
              { id: "batch", label: "Batch Upload", icon: "bx-upload" },
              { id: "certificates", label: "Certificates", icon: "bx-list-ul" },
              {
                id: "proofs",
                label: "Pending Proofs",
                icon: "bx-time-five",
                badge: proofs.length,
              },
              { id: "courses", label: "Courses", icon: "bx-book" },
              {
                id: "blockchain",
                label: "Blockchain Anchor",
                icon: "bx-link-alt",
              },
              { id: "batches", label: "Batches", icon: "bx-layer" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <i className={`bx ${tab.icon}`}></i>
                {tab.label}
                {tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-b-xl rounded-tr-xl p-8">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Dashboard Overview
              </h2>
              <div className="grid gap-6">
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab("issue")}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <i className="bx bx-plus-circle text-2xl"></i>
                      <span>Issue Certificate</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("batch")}
                      className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <i className="bx bx-upload text-2xl"></i>
                      <span>Batch Upload</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("courses")}
                      className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <i className="bx bx-book text-2xl"></i>
                      <span>Manage Courses</span>
                    </button>
                  </div>
                </div>

                {statistics?.recentCertificates &&
                  statistics.recentCertificates.length > 0 && (
                    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-white mb-4">
                        Recent Certificates
                      </h3>
                      <div className="space-y-3">
                        {statistics.recentCertificates
                          .slice(0, 5)
                          .map((cert) => (
                            <div
                              key={cert._id}
                              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                            >
                              <div>
                                <p className="text-white font-medium">
                                  {cert.learner?.name || "N/A"}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {cert.course?.title || "N/A"}
                                </p>
                              </div>
                              <span className="text-gray-400 text-sm">
                                {new Date(cert.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Issue Certificate Tab */}
          {activeTab === "issue" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Issue Single Certificate
              </h2>
              <form onSubmit={handleSingleCertSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Learner Email *
                    </label>
                    <input
                      type="email"
                      value={singleCertForm.learnerEmail}
                      onChange={(e) =>
                        setSingleCertForm({
                          ...singleCertForm,
                          learnerEmail: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">
                      Learner ID
                    </label>
                    <input
                      type="text"
                      value={singleCertForm.learnerId}
                      onChange={(e) =>
                        setSingleCertForm({
                          ...singleCertForm,
                          learnerId: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>

                  {/* Personal Details */}
                  <div>
                    <label className="block text-gray-300 mb-2">Father's Name</label>
                    <input
                      type="text"
                      value={singleCertForm.fatherName}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, fatherName: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Mother's Name</label>
                    <input
                      type="text"
                      value={singleCertForm.motherName}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, motherName: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={singleCertForm.dob}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, dob: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Address</label>
                    <input
                      type="text"
                      value={singleCertForm.address}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, address: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">District</label>
                    <input
                      type="text"
                      value={singleCertForm.district}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, district: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">State</label>
                    <input
                      type="text"
                      value={singleCertForm.state}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, state: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>

                  {/* Course Details */}
                  <div>
                    <label className="block text-gray-300 mb-2">Trade</label>
                    <input
                      type="text"
                      value={singleCertForm.trade}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, trade: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Duration</label>
                    <input
                      type="text"
                      value={singleCertForm.duration}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, duration: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Session</label>
                    <input
                      type="text"
                      value={singleCertForm.session}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, session: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Test Month</label>
                    <input
                      type="text"
                      value={singleCertForm.testMonth}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, testMonth: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Test Year</label>
                    <input
                      type="text"
                      value={singleCertForm.testYear}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, testYear: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">
                      Select Course
                    </label>
                    <select
                      value={singleCertForm.courseId}
                      onChange={(e) =>
                        setSingleCertForm({
                          ...singleCertForm,
                          courseId: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    >
                      <option value="">Select a course...</option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">
                      Or Enter Course Name
                    </label>
                    <input
                      type="text"
                      value={singleCertForm.courseName}
                      onChange={(e) =>
                        setSingleCertForm({
                          ...singleCertForm,
                          courseName: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={singleCertForm.validUntil}
                      onChange={(e) =>
                        setSingleCertForm({
                          ...singleCertForm,
                          validUntil: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">
                      NSQF Level
                    </label>
                    <input
                      type="text"
                      value={singleCertForm.nsqfLevel}
                      onChange={(e) =>
                        setSingleCertForm({
                          ...singleCertForm,
                          nsqfLevel: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                      placeholder="e.g., Level 4"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Skills Acquired (comma-separated)
                  </label>
                  <textarea
                    value={singleCertForm.skillsAcquired}
                    onChange={(e) =>
                      setSingleCertForm({
                        ...singleCertForm,
                        skillsAcquired: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    placeholder="React, Node.js, MongoDB, Express"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Certificate PDF (optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setCertFile(e.target.files[0])}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin"></i>
                      Issuing...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-certificate"></i>
                      Issue Certificate
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Batch Upload Tab */}
          {activeTab === "batch" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Batch Certificate Upload
              </h2>

              <div className="mb-6 bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-blue-300 font-semibold mb-2">
                  CSV/JSON Format
                </h3>
                <p className="text-blue-100 text-sm mb-2">Required columns:</p>
                <ul className="list-disc list-inside text-blue-100 text-sm space-y-1">
                  <li>
                    <code>learnerEmail</code> - Email address of learner
                  </li>
                  <li>
                    <code>studentUniqueCode</code> - Unique student identifier
                  </li>
                  <li>
                    <code>courseName</code> - Name of the course
                  </li>
                  <li>
                    <code>courseCode</code> - Optional short code (e.g. C1001)
                    if you prefer over the course name
                  </li>
                  <li>
                    <code>skills</code> - Comma-separated skills (optional)
                  </li>
                  <li>
                    <code>validUntil</code> - Expiry date in YYYY-MM-DD format
                    (optional)
                  </li>
                </ul>
                <a
                  href="/certificate-batch-template.csv"
                  className="inline-flex items-center gap-2 mt-4 text-sm text-blue-200 hover:text-white"
                  download
                >
                  <i className="bx bx-download"></i>
                  Download sample CSV
                </a>
              </div>

              <form onSubmit={handleBatchSubmit} className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2">
                    Upload CSV or JSON File *
                  </label>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => setBatchFile(e.target.files[0])}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !batchFile}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin"></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-upload"></i>
                      Process Batch
                    </>
                  )}
                </button>
              </form>
              {/* Batch results panel */}
              {batchResults && (
                <div className="mt-6 bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Batch Results
                  </h4>
                  <p className="text-gray-300 text-sm mb-3">
                    {batchResults.message ||
                      `Processed: ${batchResults.results?.length || 0}`}
                  </p>

                  {Array.isArray(batchResults.newLearners) &&
                    batchResults.newLearners.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-white font-medium">
                          New Learner Accounts
                        </h5>
                        <ul className="text-gray-300 text-sm list-disc list-inside mt-2">
                          {batchResults.newLearners.map((nl) => (
                            <li key={nl.email}>
                              <span className="font-mono">{nl.email}</span> —
                              learnerId:{" "}
                              <span className="font-mono">{nl.learnerId}</span>
                              {nl.temporaryPassword && (
                                <span>
                                  {" "}
                                  — temp password:{" "}
                                  <span className="font-mono">
                                    {nl.temporaryPassword}
                                  </span>
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {Array.isArray(batchResults.results) &&
                    batchResults.results.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-white font-medium">
                          Certificates Issued
                        </h5>
                        <ul className="text-gray-300 text-sm list-disc list-inside mt-2">
                          {batchResults.results.map((r) => (
                            <li key={r.certificateId}>
                              <span className="font-mono">
                                {r.certificateId}
                              </span>{" "}
                              — artifactHash:{" "}
                              <span className="font-mono">
                                {r.artifactHash}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {Array.isArray(batchResults.errors) &&
                    batchResults.errors.length > 0 && (
                      <div>
                        <h5 className="text-red-400 font-medium">Errors</h5>
                        <ul className="text-red-300 text-sm list-disc list-inside mt-2">
                          {batchResults.errors.map((e, idx) => (
                            <li key={idx}>
                              {e.studentUniqueCode || e.learnerEmail || "row"} —{" "}
                              {e.reason || e.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === "certificates" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Issued Certificates
              </h2>

              {loading ? (
                <div className="text-center py-12">
                  <i className="bx bx-loader-alt animate-spin text-4xl text-gray-400"></i>
                </div>
              ) : certificates.length === 0 ? (
                <div className="text-center py-12">
                  <i className="bx bx-certificate text-6xl text-gray-600 mb-4"></i>
                  <p className="text-gray-400">No certificates issued yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {certificates.map((cert) => {
                    const statusLabel = cert.status || "Pending";
                    const statusKey = statusLabel.toLowerCase();

                    return (
                      <div
                        key={cert._id}
                        className="bg-gray-700/50 border border-gray-600 rounded-lg p-6"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-2">
                              {cert.course?.title || "N/A"}
                            </h3>
                            <p className="text-gray-300">
                              <span className="text-gray-400">Learner:</span>{" "}
                              {cert.learner?.name || "N/A"} (
                              {cert.learner?.email || "N/A"})
                            </p>
                            <p className="text-gray-300 text-sm">
                              <span className="text-gray-400">
                                Certificate ID:
                              </span>{" "}
                              {cert.certificateId}
                            </p>
                            <p className="text-gray-300 text-sm">
                              <span className="text-gray-400">Issued:</span>{" "}
                              {new Date(
                                cert.issueDate || cert.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`self-start px-3 py-1 rounded-full text-sm font-medium ${
                              statusKey === "issued"
                                ? "bg-green-600/20 text-green-300"
                                : statusKey === "revoked"
                                ? "bg-red-600/20 text-red-300"
                                : "bg-yellow-600/20 text-yellow-300"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-300 mb-4">
                          {(cert.studentUniqueCode || cert.uniqueId) && (
                            <p>
                              <span className="text-gray-400">Learner ID:</span>{" "}
                              {cert.studentUniqueCode || cert.uniqueId}
                            </p>
                          )}
                          {Array.isArray(cert.modulesAwarded) &&
                            cert.modulesAwarded.length > 0 && (
                              <p>
                                <span className="text-gray-400">Modules:</span>{" "}
                                {cert.modulesAwarded.join(", ")}
                              </p>
                            )}
                          {cert.metadataHash && (
                            <p className="font-mono text-xs break-all">
                              <span className="text-gray-400 normal-case font-sans">
                                Metadata Hash:
                              </span>{" "}
                              {cert.metadataHash}
                            </p>
                          )}
                          {cert.artifactHash && (
                            <p className="font-mono text-xs break-all">
                              <span className="text-gray-400 normal-case font-sans">
                                PDF Hash:
                              </span>{" "}
                              {cert.artifactHash}
                            </p>
                          )}
                          {cert.storage?.canonical?.hash && (
                            <p className="font-mono text-xs break-all">
                              <span className="text-gray-400 normal-case font-sans">
                                Canonical Hash:
                              </span>{" "}
                              {cert.storage.canonical.hash}
                            </p>
                          )}
                          {cert.merkleRoot && (
                            <p className="font-mono text-xs break-all">
                              <span className="text-gray-400 normal-case font-sans">
                                Merkle Root:
                              </span>{" "}
                              {cert.merkleRoot}
                            </p>
                          )}
                          {cert.batchId && (
                            <p>
                              <span className="text-gray-400">Batch ID:</span>{" "}
                              {cert.batchId}
                            </p>
                          )}
                          {cert.blockchainTxHash && (
                            <p className="font-mono text-xs break-all">
                              <span className="text-gray-400 normal-case font-sans">
                                Tx Hash:
                              </span>{" "}
                              {cert.blockchainTxHash}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 mb-3">
                          <button
                            onClick={() => downloadPdf(cert)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                          >
                            <i className="bx bx-file"></i>
                            Certificate PDF
                          </button>
                          <button
                            onClick={() => downloadMetadata(cert)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                          >
                            <i className="bx bx-data"></i>
                            Metadata JSON
                          </button>
                          <button
                            onClick={() => downloadProof(cert)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                          >
                            <i className="bx bx-shield-alt-2"></i>
                            Proof Package
                          </button>
                          <button
                            onClick={() => downloadCanonical(cert)}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                          >
                            <i className="bx bx-code-curly"></i>
                            Canonical Payload
                          </button>
                          {cert.blockchainTxHash && (
                            <a
                              href={`https://polygonscan.com/tx/${cert.blockchainTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                            >
                              <i className="bx bx-link-external"></i>
                              View Transaction
                            </a>
                          )}
                        </div>

                        {statusKey !== "revoked" && (
                          <button
                            onClick={() => revokeCertificate(cert._id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                          >
                            <i className="bx bx-x-circle"></i>
                            Revoke Certificate
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Proofs Tab */}
          {activeTab === "proofs" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Pending Proof Reviews
              </h2>

              {proofs.length === 0 ? (
                <div className="text-center py-12">
                  <i className="bx bx-check-circle text-6xl text-gray-600 mb-4"></i>
                  <p className="text-gray-400">No pending proofs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proofs.map((proof) => (
                    <div
                      key={proof._id}
                      className="bg-gray-700/50 border border-gray-600 rounded-lg p-6"
                    >
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {proof.learner?.name || "Anonymous"}
                        </h3>
                        <p className="text-gray-400">
                          Module: {proof.moduleTitle || "N/A"}
                        </p>
                        <p className="text-gray-400">
                          Course: {proof.course?.title || "N/A"}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            updateProofStatus(proof._id, "Approved")
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                        >
                          <i className="bx bx-check"></i>
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            updateProofStatus(proof._id, "Rejected")
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                        >
                          <i className="bx bx-x"></i>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === "courses" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Manage Courses
              </h2>

              <form
                onSubmit={handleCourseSubmit}
                className="mb-8 space-y-6 bg-gray-700/50 border border-gray-600 rounded-lg p-6"
              >
                <h3 className="text-xl font-bold text-white">
                  Create New Course
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(e) =>
                        setCourseForm({ ...courseForm, title: e.target.value })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={courseForm.duration}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          duration: e.target.value,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Modules (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={courseForm.modules}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, modules: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    placeholder="Module 1, Module 2, Module 3"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt animate-spin"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-plus"></i>
                      Create Course
                    </>
                  )}
                </button>
              </form>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">
                  Existing Courses
                </h3>
                {courses.length === 0 ? (
                  <p className="text-gray-400">No courses yet</p>
                ) : (
                  courses.map((course) => (
                    <div
                      key={course._id}
                      className="bg-gray-700/50 border border-gray-600 rounded-lg p-6"
                    >
                      <h4 className="text-lg font-bold text-white mb-2">
                        {course.title}
                      </h4>
                      <p className="text-gray-400 mb-2">{course.description}</p>
                      {course.modules && course.modules.length > 0 && (
                        <p className="text-gray-400 text-sm">
                          Modules: {course.modules.join(", ")}
                        </p>
                      )}
                      <p className="text-gray-400 text-sm mt-2">
                        Certificates issued: {course.certificateCount || 0}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Blockchain Anchor Tab */}
          {activeTab === "blockchain" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Anchor Certificate Hash
              </h2>

              <div className="grid gap-6 mb-8 md:grid-cols-2">
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Wallet Status
                  </h3>
                  <p className="text-gray-300 mb-2">
                    <span className="text-gray-400">Account:</span>{" "}
                    {displayAccount}
                  </p>
                  <p className="text-gray-300 mb-4">
                    <span className="text-gray-400">Network:</span>{" "}
                    {displayChainName}
                  </p>
                  <button
                    type="button"
                    onClick={connectMetamask}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                  >
                    <i className="bx bx-wallet text-lg"></i>
                    {metamaskAccount
                      ? "Reconnect Wallet"
                      : "Connect Wallet"}
                  </button>
                </div>

                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    How Anchoring Works
                  </h3>
                  <p className="text-gray-300 mb-2">
                    1. Copy the hash you wish to anchor (individual certificate
                    hash or Merkle root).
                  </p>
                  <p className="text-gray-300 mb-2">
                    2. Optionally provide a contract address that stores
                    transaction metadata, otherwise the transaction sends data
                    to your wallet.
                  </p>
                  <p className="text-gray-300">
                    3. Submit the transaction and wait for confirmation. Track
                    the resulting transaction hash on your explorer.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleAnchorSubmit}
                className="space-y-6 bg-gray-700/50 border border-gray-600 rounded-lg p-6 max-w-3xl"
              >
                <div>
                  <label className="block text-gray-300 mb-2">
                    Certificate or Merkle Hash *
                  </label>
                  <input
                    type="text"
                    value={hashToAnchor}
                    onChange={(e) => setHashToAnchor(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    placeholder="0x..."
                    required
                  />
                  <p className="text-gray-500 text-sm mt-2">
                    The value is sent as the transaction data field. Ensure the
                    hash is hex-encoded.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">
                    Target Contract Address (optional)
                  </label>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                    placeholder="Defaults to your connected wallet"
                  />
                  <p className="text-gray-500 text-sm mt-2">
                    Gas fees apply. Leave empty to anchor directly to your
                    wallet address.
                  </p>
                </div>

                {anchorStatus.message && (
                  <div
                    className={`rounded-lg p-4 ${
                      anchorStatus.type === "error"
                        ? "bg-red-600/20 border border-red-500/30 text-red-300"
                        : "bg-green-600/20 border border-green-500/30 text-green-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i
                        className={`bx ${
                          anchorStatus.type === "error"
                            ? "bx-error-circle"
                            : "bx-check-circle"
                        } text-xl`}
                      ></i>
                      <span>{anchorStatus.message}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAnchorStatus({ type: "", message: "" })
                        }
                        className="ml-auto"
                      >
                        <i className="bx bx-x text-xl"></i>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isAnchoring}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isAnchoring ? (
                      <>
                        <i className="bx bx-loader-alt animate-spin"></i>
                        Anchoring...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-link-alt"></i>
                        Anchor Hash
                      </>
                    )}
                  </button>
                  <p className="text-gray-500 text-sm">
                    MetaMask prompts will appear in your browser to authorize
                    the transaction.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* Batches Tab */}
          {activeTab === "batches" && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Certificate Batches
              </h2>

              {batches.length === 0 ? (
                <div className="text-center py-12">
                  <i className="bx bx-layer text-6xl text-gray-600 mb-4"></i>
                  <p className="text-gray-400">No batches yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {batches.map((batch) => (
                    <div
                      key={batch._id}
                      className="bg-gray-700/50 border border-gray-600 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">
                            Batch #{batch.batchId}
                          </h3>
                          <p className="text-gray-400">
                            Created:{" "}
                            {new Date(batch.createdAt).toLocaleString()}
                          </p>
                          <p className="text-gray-400">
                            Certificates: {batch.certificateCount || 0}
                          </p>
                          {batch.merkleRoot && (
                            <p className="text-gray-400 text-sm font-mono">
                              Merkle Root: {batch.merkleRoot.slice(0, 20)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
