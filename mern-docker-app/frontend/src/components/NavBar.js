import React from 'react';
import { NavLink } from 'react-router-dom';

export default function NavBar({ token, role, onLogout }) {
  const baseLinks = [
    { to: '/', label: 'Home', end: true },
    { to: '/verify', label: 'Verify' },
  ];

  const roleLinks = [];

  if (!token) {
    roleLinks.push({ to: '/login', label: 'Login' }, { to: '/register', label: 'Register' });
  }

  if (token && role === 'learner') {
    roleLinks.push({ to: '/learner', label: 'Learner' });
  }

  if (token && role === 'institute') {
    roleLinks.push({ to: '/institution', label: 'Institution' });
  }

  if (token && role === 'admin') {
    roleLinks.push({ to: '/admin', label: 'Admin' });
  }

  const links = [...baseLinks, ...roleLinks];

  return (
    <nav className="nav">
      <div className="nav-links">
        {links.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {label}
          </NavLink>
        ))}
      </div>
      {token && (
        <button type="button" className="nav-button" onClick={onLogout}>
          Logout
        </button>
      )}
    </nav>
  );
}
