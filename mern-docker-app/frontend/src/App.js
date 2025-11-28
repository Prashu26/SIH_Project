import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import Header from './components/header';
import NavBar from './components/NavBar';
import Hero from './components/Hero';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import LearnerDashboard from './pages/LearnerDashboard';
import InstitutionDashboard from './pages/InstitutionDashboard';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/AdminDashboard';

function RequireAuth({ token, role, allowedRoles, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Layout({ token, role, onLogout }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1 className="brand">Skill Credentialing</h1>
        <NavBar token={token} role={role} onLogout={onLogout} />
      </header>
      <main className="page">
        <Outlet />
      </main>
      <footer className="footer">
        <small>© {currentYear} Skill Credentialing. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <main>
      <img className="absolute top-0 right-0 opacity-60 -z-1" src="/gradient.png" alt="Gradient-img" /> 

       <div className= "h-0 w-[40rem] absolute top-[20%] right-[-5%] shadow-[0_0_20px_#e99b63] -rotate-[30deg]"></div>

       <Header />
       <Hero />
     </main>

     
  )
}