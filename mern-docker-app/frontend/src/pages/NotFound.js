import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card form-card">
      <h3>Page not found</h3>
      <p className="empty-state">We could not find the page you requested.</p>
      <Link className="cta" to="/">
        Return home
      </Link>
    </div>
  );
}
