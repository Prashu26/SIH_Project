import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <h2 className="page-title">Digital credentials without the enterprise headache.</h2>
          <p className="lead">
            Issue, manage, and verify skills in a single workspace designed for institutions and learners.
            Build trust with employers through instant verification.
          </p>
          <div className="cta-row">
            <Link className="cta primary" to="/register">
              Create an account
            </Link>
            <Link className="cta" to="/verify">
              Verify a credential
            </Link>
          </div>
        </div>
        <ul className="stat-grid">
          <li>
            <span className="stat-value">&lt;5 min</span>
            <span className="stat-label">to issue a credential</span>
          </li>
          <li>
            <span className="stat-value">100%</span>
            <span className="stat-label">audit-ready verification trail</span>
          </li>
          <li>
            <span className="stat-value">Zero</span>
            <span className="stat-label">extra integrations required</span>
          </li>
        </ul>
      </section>

      <section className="card-grid">
        <article className="card">
          <h3>For learners</h3>
          <p>Access your profile, track issued certificates, and share proof of skills in seconds.</p>
        </article>
        <article className="card">
          <h3>For institutions</h3>
          <p>Upload achievements, attach competencies, and deliver tamper-resistant credentials instantly.</p>
        </article>
        <article className="card">
          <h3>For employers</h3>
          <p>Validate applicant credentials through a single link and eliminate manual verification emails.</p>
        </article>
      </section>
    </div>
  );
}
