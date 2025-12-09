import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="card form-card">
      <h3>{t('pageNotFound')}</h3>
      <p className="empty-state">{t('pageNotFoundDesc')}</p>
      <Link className="cta" to="/">
        {t('returnHome')}
      </Link>
    </div>
  );
}
