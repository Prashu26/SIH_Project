import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import 'boxicons/css/boxicons.min.css';
import { useLanguage } from '../contexts/LanguageContext';

const learnerDefaults = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  learnerId: '',
};

const institutionDefaults = {
  name: '',
  email: '',
  password: '',
  registrationId: '',
};

export default function Register() {
  const { t } = useLanguage();
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);
  const [role, setRole] = useState('learner');
  const [form, setForm] = useState(learnerDefaults);
  const [feedback, setFeedback] = useState({ tone: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleToggleRole = (targetRole) => {
    setRole(targetRole);
    setForm(targetRole === 'learner' ? learnerDefaults : institutionDefaults);
    setIsRightPanelActive(targetRole === 'institute');
    setFeedback({ tone: '', text: '' });
  };

  const submit = async (event) => {
    event.preventDefault();
    setFeedback({ tone: '', text: '' });
    setIsSubmitting(true);

    try {
      const payload = { role };

      if (role === 'learner') {
        const name = `${form.firstName} ${form.lastName}`.trim();
        if (!name) {
          setFeedback({ tone: 'error', text: t('firstNameRequired') });
          setIsSubmitting(false);
          return;
        }
        payload.name = name;
        payload.email = form.email.trim().toLowerCase();
        payload.password = form.password;
        payload.learnerId = form.learnerId;
      } else if (role === 'institute') {
        payload.name = form.name;
        payload.email = form.email.trim().toLowerCase();
        payload.password = form.password;
        if (form.registrationId) payload.registrationId = form.registrationId;
      }

      const { ok, data } = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsSubmitting(false);

      if (!ok) {
        setFeedback({ tone: 'error', text: data.message || t('registrationFailed') });
        return;
      }

      setFeedback({ tone: 'success', text: t('registrationSuccessful') });
      setTimeout(() => navigate('/login'), 1400);
    } catch (error) {
      setIsSubmitting(false);
      setFeedback({ tone: 'error', text: t('networkError') });
      console.error('Registration error:', error);
    }
  };

  const onChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // dynamically compute top offset so overlays never cover the site's header/navbar
  useEffect(() => {
    try {
      const header = document.querySelector('header') || document.querySelector('.site-header') || document.querySelector('nav');
      const height = header ? Math.ceil(header.getBoundingClientRect().height) : 72;
      // unify with login
      window.__AUTH_TOP_OFFSET = `${height}px`;
      document.documentElement.style.setProperty('--auth-top-offset', `${height}px`);
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] p-5 font-sans">
      <style>{`
        .container-custom {
          background: #181818;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
          width: 900px;
          max-width: 100%;
          min-height: 580px;
          color: #ffffff;
          /* Keep the whole container below the navbar so overlays don't cover it */
          margin-top: 72px;
        }

        .form-container { position: absolute; top: 0; height: 100%; transition: all 0.6s ease-in-out; }
        .student-container { left: 0; width: 50%; z-index: 2; }
        .institution-container { left: 0; width: 50%; opacity: 0; z-index: 1; }
        .container-custom.right-panel-active .student-container { transform: translateX(100%); }
        .container-custom.right-panel-active .institution-container { transform: translateX(100%); opacity: 1; z-index: 5; }

        .form-custom { background: #181818; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 0 40px; height: 100%; text-align: center; }
        .user-type { font-size: 14px; color: #1DB954; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
        .icon { font-size: 48px; margin-bottom: 15px; color: #1DB954; }

        .input-custom { background: #282828; border: 1px solid transparent; padding: 15px; margin: 8px 0; width: 100%; border-radius: 30px; font-size: 14px; outline: none; transition: all 0.3s ease; color: #ffffff; }
        .input-custom:focus { background: #333333; border-color: #1DB954; transform: translateY(-2px); }
        .input-custom::placeholder { color: #b3b3b3; }

        .btn-custom { border-radius: 30px; border: none; background: #1DB954; color: #000000; font-size: 14px; font-weight: 700; padding: 14px 50px; letter-spacing: 1px; text-transform: uppercase; transition: all 0.3s ease; cursor: pointer; margin-top: 15px; }
        .btn-custom:hover { background: #1ed760; transform: scale(1.05); box-shadow: 0 10px 20px rgba(29, 185, 84, 0.3); }
        .btn-ghost { background: transparent; border: 2px solid #ffffff; color: #ffffff; margin-top: 0; }
        .btn-ghost:hover { background: #ffffff; color: #000000; }

        .overlay-container { position: absolute; top: 0; left: 50%; width: 50%; height: 100%; overflow: hidden; transition: transform 0.6s ease-in-out; z-index: 20; }
        .container-custom.right-panel-active .overlay-container { transform: translateX(-100%); }

        .overlay { background: linear-gradient(to bottom, #1DB954, #000000); color: white; position: relative; left: -100%; height: 100%; width: 200%; transform: translateX(0); transition: transform 0.6s ease-in-out; }
        .container-custom.right-panel-active .overlay { transform: translateX(50%); }

        .overlay-panel { position: absolute; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 0 40px; text-align: center; top: 0; height: 100%; width: 50%; transform: translateX(0); transition: transform 0.6s ease-in-out; }
        .overlay-left { transform: translateX(-20%); }
        .container-custom.right-panel-active .overlay-left { transform: translateX(0); }
        .overlay-right { right: 0; transform: translateX(0); }
        .container-custom.right-panel-active .overlay-right { transform: translateX(20%); }

        .select-wrapper { width: 100%; position: relative; margin: 8px 0; }
        .select-custom { background: #282828; border: none; padding: 15px; width: 100%; border-radius: 30px; font-size: 14px; outline: none; cursor: pointer; appearance: none; color: #ffffff; }

        h1 { color: #ffffff !important; }
        a { color: #b3b3b3; transition: color 0.3s ease; }
        a:hover { color: #ffffff; }

        @media (max-width: 768px) {
          .container-custom { width: 100%; min-height: 640px; margin-top: 20px; }
          .form-custom { padding: 0 30px; }
          .overlay-panel { padding: 0 20px; }
        }
      `}</style>

      <div
        className={`container-custom ${isRightPanelActive ? 'right-panel-active' : ''}`}
        id="container"
        style={{ marginTop: typeof window !== 'undefined' ? window.__AUTH_TOP_OFFSET || '72px' : '72px' }}
      >
        {/* Institution Register */}
        <div className="form-container institution-container">
          <form className="form-custom" onSubmit={submit}>
            <div className="icon">🏛️</div>
            <h1 className="font-bold text-3xl mb-2">{t('registerAsInstitute')}</h1>
            <div className="user-type">{t('registerAsInstitute')}</div>

            {feedback.text && <div className={`text-sm mb-4 ${feedback.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{feedback.text}</div>}

            <input type="text" name="name" placeholder={t('instituteName')} className="input-custom" value={form.name || ''} onChange={onChange('name')} required />
            <input type="email" name="email" placeholder={t('emailPlaceholder')} className="input-custom" value={form.email || ''} onChange={onChange('email')} required />
            <input type="password" name="password" placeholder={t('passwordPlaceholder')} className="input-custom" value={form.password || ''} onChange={onChange('password')} required />
            <input type="text" name="registrationId" placeholder={t('registrationId')} className="input-custom" value={form.registrationId || ''} onChange={onChange('registrationId')} />

            <button className="btn-custom" disabled={isSubmitting}>{isSubmitting ? t('signingIn') : t('createAccount')}</button>
          </form>
        </div>

        {/* Student Register */}
        <div className="form-container student-container">
          <form className="form-custom" onSubmit={submit}>
            <div className="icon">🎓</div>
            <h1 className="font-bold text-3xl mb-2">{t('registerAsLearner')}</h1>
            <div className="user-type">{t('registerAsLearner')}</div>

            {feedback.text && <div className={`text-sm mb-4 ${feedback.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{feedback.text}</div>}

            <div style={{width: '100%'}} className="grid grid-cols-2 gap-4">
              <input placeholder={t('firstName')} className="input-custom" value={form.firstName || ''} onChange={onChange('firstName')} required />
              <input placeholder={t('lastName')} className="input-custom" value={form.lastName || ''} onChange={onChange('lastName')} required />
            </div>
            <input type="email" placeholder={t('emailPlaceholder')} className="input-custom" value={form.email || ''} onChange={onChange('email')} required />
            <input type="password" placeholder={t('passwordPlaceholder')} className="input-custom" value={form.password || ''} onChange={onChange('password')} required />
            <input placeholder={t('learnerId')} className="input-custom" value={form.learnerId || ''} onChange={onChange('learnerId')} />

            <button className="btn-custom" disabled={isSubmitting}>{isSubmitting ? t('signingIn') : t('createAccount')}</button>

            <span className="text-[#b3b3b3] text-sm mt-4">{t('alreadyHaveAccount')} <a href="/login" className="text-[#1DB954] font-bold no-underline hover:text-[#1ed760]">{t('signIn')}</a></span>
          </form>
        </div>

        {/* Overlay Panel */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <div className="icon" style={{color: 'white'}}>🎓</div>
              <h1 className="text-white text-3xl font-bold mb-4">{t('registerAsLearner')}</h1>
              <p className="text-white text-sm font-medium leading-relaxed mb-8">{t('registerDesc')}</p>
              <button className="btn-custom btn-ghost" onClick={() => handleToggleRole('learner')}>{t('registerAsLearner')}</button>
            </div>
            <div className="overlay-panel overlay-right">
              <div className="icon" style={{color: 'white'}}>🏛️</div>
              <h1 className="text-white text-3xl font-bold mb-4">{t('registerAsInstitute')}</h1>
              <p className="text-white text-sm font-medium leading-relaxed mb-8">{t('registerDesc')}</p>
              <button className="btn-custom btn-ghost" onClick={() => handleToggleRole('institute')}>{t('registerAsInstitute')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
