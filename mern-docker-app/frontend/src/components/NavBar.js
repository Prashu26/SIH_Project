import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function NavBar({ token, role, onLogout }) {
  const { t } = useLanguage();
  const baseLinks = [
    { to: '/', label: t('home'), end: true },
    { to: '/verify', label: t('verify') },
  ];

  const roleLinks = [];

  if (!token) {
    roleLinks.push({ to: '/login', label: t('login') }, { to: '/register', label: t('register') });
  }

  if (token && role === 'learner') {
    roleLinks.push({ to: '/learner', label: t('learner') });
  }

  if (token && (role === 'institute' || role === 'institution')) {
    roleLinks.push(
      { to: '/institution?tab=certificates', label: t('institute') },
      { to: '/institution?tab=issue', label: t('issueCertificate') }
    );
  }

  if (token && role === 'admin') {
    roleLinks.push({ to: '/admin', label: t('admin') });
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
          {t('logout')}
        </button>
      )}
    </nav>
  );
}
