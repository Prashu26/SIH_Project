import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import 'boxicons/css/boxicons.min.css';



const Header = () => {
  const [open, setOpen] = useState(false);

  const toggleMobileMenu = () => {
    setOpen(!open);
  };

  return (
    <header className="flex justify-between items-center py-4 px-4 lg:px-20">
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-light m-0">Skill Credentialing</h1>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-12">
        <a href="/pages/Home">Home</a>
        <a href="/">LearnerDashboard</a>
        <a href="#">verify</a>
        <a href="#">Ramp</a>
      </nav>

      <button className="hidden md:block bg-[#a7a7a7] text-black py-3 px-8 rounded-full">
        Sign in
      </button>

      {/* Mobile toggle button */}
      <button onClick={toggleMobileMenu} className="md:hidden text-3xl p-2 z-50">
        <i className={open ? 'bx bx-x' : 'bx bx-menu'}></i>
      </button>

      {/* Mobile Menu */}
      {open && (
        <div className="fixed top-16 bottom-0 right-0 left-0 p-5 md:hidden z-40 bg-black bg-opacity-70 backdrop-blur-md">
          <nav className="flex flex-col gap-6 items-center text-lg">
            <a href="/">Home</a>
            <a href="/">LearnerDashboard</a>
            <a href="#">Verify</a>
            <a href="#">Ramp</a>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
