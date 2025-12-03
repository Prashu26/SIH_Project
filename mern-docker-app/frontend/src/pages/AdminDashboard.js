import React, { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

export default function AdminDashboard({ token }) {
  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [instituteDirectory, setInstituteDirectory] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "" });

  useEffect(() => {
    // allow token to be supplied by prop or fall back to localStorage
    const effectiveToken = token || localStorage.getItem("token");
    if (!effectiveToken) {
      setOverview(null);
      setCourses([]);
      setUsers([]);
      setInstitutes([]);
      return;
    }

    let ignore = false;
    setStatus({ loading: true, error: "" });

    Promise.all([
      apiFetch("/api/admin/overview", { token: effectiveToken }),
      apiFetch("/api/admin/courses", { token: effectiveToken }),
      apiFetch("/api/admin/users?role=learner", { token: effectiveToken }),
      apiFetch("/api/admin/pending-institutes", { token: effectiveToken }),
      apiFetch("/api/admin/users?role=institute", { token: effectiveToken }),
    ])
      .then(([overviewRes, coursesRes, usersRes, pendingRes, instituteRes]) => {
        if (ignore) return;

        if (!overviewRes.ok) {
          setStatus({
            loading: false,
            error:
              overviewRes.data?.message || "Unable to load admin overview.",
          });
        } else {
          setOverview(overviewRes.data);
          setStatus((prev) => ({ ...prev, loading: false }));
        }

        if (coursesRes.ok) setCourses(coursesRes.data.courses || []);
        if (usersRes.ok) setUsers(usersRes.data.users || []);
        if (pendingRes.ok) setInstitutes(pendingRes.data.pending || []);
        if (instituteRes.ok)
          setInstituteDirectory(instituteRes.data.users || []);
      })
      .catch((error) => {
        if (ignore) return;
        setStatus({
          loading: false,
          error: error.message || "Unexpected admin fetch error.",
        });
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  const effectiveToken = token || localStorage.getItem("token");
  if (!effectiveToken) {
    return (
      <div className="card form-card">
        <h3>Admin console</h3>
        <p className="empty-state">
          Sign in as an administrator to view system metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h3 className="section-title">Platform control center</h3>
      {status.error && <p className="form-feedback error">{status.error}</p>}

      <div className="card">
        <h4 className="section-title">Key metrics</h4>
        {status.loading && !overview && (
          <p className="empty-state">Loading metrics…</p>
        )}
        {overview && (
          <ul className="stat-grid">
            <li>
              <span className="stat-value">{overview.stats?.users ?? "—"}</span>
              <span className="stat-label">Users</span>
            </li>
            <li>
              <span className="stat-value">
                {overview.stats?.courses ?? "—"}
              </span>
              <span className="stat-label">Courses</span>
            </li>
            <li>
              <span className="stat-value">
                {overview.stats?.proofs ?? "—"}
              </span>
              <span className="stat-label">Proofs</span>
            </li>
            <li>
              <span className="stat-value">
                {overview.stats?.certificates ?? "—"}
              </span>
              <span className="stat-label">Certificates</span>
            </li>
          </ul>
        )}
      </div>

      {/* Recent proofs and Active courses removed per request */}

      {/* <section className="card">
        <h4 className="section-title">Learner directory</h4>
        {users.length === 0 && (
          <p className="empty-state">No learners found.</p>
        )}
        {users.length > 0 && (
          <div className="cert-list">
            {users.map((user) => (
              <article key={user._id} className="cert">
                <strong>{user.name}</strong>
                <div className="badge">
                  {user.learnerProfile?.learnerId || "Unassigned ID"}
                </div>
                <small>{user.email}</small>
              </article>
            ))}
          </div>
        )}
      </section> */}

      <section className="card">
        <h4 className="section-title">Pending institute registrations</h4>
        {institutes.length === 0 && (
          <p className="empty-state">No pending institutes.</p>
        )}
        {institutes.length > 0 && (
          <div className="cert-list">
            {institutes.map((inst) => (
              <article
                key={inst._id}
                className="cert flex items-center justify-between"
              >
                <div>
                  <strong>{inst.name}</strong>
                  <div className="text-sm">{inst.email}</div>
                  <div className="text-xs text-gray-500">
                    Reg ID: {inst.instituteProfile?.registrationId}
                  </div>
                </div>
                <div>
                  <button
                    className="bg-green-600 text-white px-3 py-2 rounded"
                    onClick={async () => {
                      setStatus((s) => ({ ...s, loading: true }));
                      try {
                        const res = await apiFetch(
                          `/api/admin/users/${inst._id}/approve`,
                          { token: effectiveToken, method: "POST" }
                        );
                        if (!res.ok)
                          throw new Error(
                            res.data?.message || "Approve failed"
                          );
                        setInstitutes((list) =>
                          list.filter((i) => i._id !== inst._id)
                        );
                        // refresh institute directory as well
                        setInstituteDirectory((dir) =>
                          dir.filter((d) => d._id !== inst._id)
                        );
                      } catch (e) {
                        setStatus((s) => ({ ...s, error: e.message }));
                      } finally {
                        setStatus((s) => ({ ...s, loading: false }));
                      }
                    }}
                  >
                    Approve
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h4 className="section-title">Learner and Institute Directory</h4>
        <div className="grid-two">
          <div>
            <h5 className="section-sub">Institutes</h5>
            {instituteDirectory.length === 0 && (
              <p className="empty-state">No institutes found.</p>
            )}
            {instituteDirectory.length > 0 && (
              <div className="cert-list">
                {instituteDirectory.map((inst) => (
                  <article key={inst._id} className="cert">
                    <strong>{inst.name}</strong>
                    <div className="text-sm">{inst.email}</div>
                    <div className="text-xs text-gray-500">
                      Reg ID: {inst.instituteProfile?.registrationId}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div>
            <h5 className="section-sub">Learners</h5>
            {users.length === 0 && (
              <p className="empty-state">No learners found.</p>
            )}
            {users.length > 0 && (
              <div className="cert-list">
                {users.map((user) => (
                  <article key={user._id} className="cert">
                    <strong>{user.name}</strong>
                    <div className="badge">
                      {user.learnerProfile?.learnerId || "Unassigned ID"}
                    </div>
                    <small>{user.email}</small>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
