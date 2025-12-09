import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../services/api';
import 'boxicons/css/boxicons.min.css';
import { useLanguage } from '../contexts/LanguageContext';

import AuthContext from '../contexts/AuthContext';

export default function Login() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      const { ok, data } = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      setIsSubmitting(false);

      if (!ok) {
        setMessage(data.message || 'Login failed');
        return;
      }

      // Response may be { token, role, user } or a flattened user object
      const role = ((data.role || data.user?.role) || '').toLowerCase();

      // Use the login function from context with the actual user object
      const userObj = data.user || data;
      login(userObj, data.token);

      const destination = role === 'learner'
        ? '/learner'
        : (role === 'institution' || role === 'institute')
        ? '/institution?tab=issue'
        : role === 'admin'
        ? '/admin'
        : '/';
      navigate(destination);
    } catch (error) {
      setIsSubmitting(false);
      setMessage('Network error. Please try again.');
      console.error('Login error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // dynamically compute top offset so overlays never cover the site's header/navbar
  useEffect(() => {
    try {
      const header = document.querySelector('header') || document.querySelector('.site-header') || document.querySelector('nav');
      const height = header ? Math.ceil(header.getBoundingClientRect().height) : 72;
      // unified auth offset for both login/register
      window.__AUTH_TOP_OFFSET = `${height}px`;
      document.documentElement.style.setProperty('--auth-top-offset', `${height}px`);
    } catch (e) {
      // ignore if DOM not available
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
        {/* Institution Login */}
        <div className="form-container institution-container">
          <form className="form-custom" onSubmit={submit}>
            <div className="icon">🏛️</div>
            <h1 className="font-bold text-3xl mb-2">{t('instituteLogin')}</h1>
            <div className="user-type">{t('instituteLogin')}</div>
            
            {message && <div className="text-red-500 text-sm mb-4">{message}</div>}
            
            <input 
              type="email" 
              name="email"
              placeholder={t('emailPlaceholder')}
              className="input-custom"
              value={form.email}
              onChange={handleInputChange}
              required
            />
            <input 
              type="password" 
              name="password"
              placeholder={t('passwordPlaceholder')}
              className="input-custom"
              value={form.password}
              onChange={handleInputChange}
              required
            />
            
            <a href="#" className="text-sm no-underline my-4">{t('forgotPassword')}</a>
            <button className="btn-custom" disabled={isSubmitting}>
              {isSubmitting ? t('signingIn') : t('signIn')}
            </button>
          </form>
        </div>

        {/* Student Login */}
        <div className="form-container student-container">
          <form className="form-custom" onSubmit={submit}>
            <div className="icon">🎓</div>
            <h1 className="font-bold text-3xl mb-2">{t('learnerLogin')}</h1>
            <div className="user-type">{t('learnerLogin')}</div>
            
            {message && <div className="text-red-500 text-sm mb-4">{message}</div>}
            
            <input 
              type="email" 
              name="email"
              placeholder={t('emailPlaceholder')}
              className="input-custom"
              value={form.email}
              onChange={handleInputChange}
              required
            />
            <input 
              type="password" 
              name="password"
              placeholder={t('passwordPlaceholder')}
              className="input-custom"
              value={form.password}
              onChange={handleInputChange}
              required
            />
            
            <a href="#" className="text-sm no-underline my-4">{t('forgotPassword')}</a>
            <button className="btn-custom" disabled={isSubmitting}>
              {isSubmitting ? t('signingIn') : t('signIn')}
            </button>
            <span className="text-[#b3b3b3] text-sm mt-4">
              {t('dontHaveAccount')} <a href="/register" className="text-[#1DB954] font-bold no-underline hover:text-[#1ed760]">{t('signUp')}</a>
            </span>
          </form>
        </div>

        {/* Overlay Panel */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <div className="icon" style={{color: 'white'}}>🎓</div>
              <h1 className="text-white text-3xl font-bold mb-4">{t('welcomeBack')}</h1>
              <p className="text-white text-sm font-medium leading-relaxed mb-8">{t('loginToContinue')}</p>
              <button className="btn-custom btn-ghost" onClick={() => setIsRightPanelActive(false)}>{t('learnerLogin')}</button>
            </div>
            <div className="overlay-panel overlay-right">
              <div className="icon" style={{color: 'white'}}>🏛️</div>
              <h1 className="text-white text-3xl font-bold mb-4">{t('instituteLogin')}</h1>
              <p className="text-white text-sm font-medium leading-relaxed mb-8">{t('loginToContinue')}</p>
              <button className="btn-custom btn-ghost" onClick={() => setIsRightPanelActive(true)}>{t('instituteLogin')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
