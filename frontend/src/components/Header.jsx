import React, { useState } from "react";

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container">
        <div className="logo">
          <h1>Vilensis</h1>
          <p className="tagline">Your Smart Home Assistant</p>
        </div>

        <button
          className={`burger-menu ${isMenuOpen ? "active" : ""}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav ${isMenuOpen ? "nav-open" : ""}`}>
          <ul>
            <li>
              <a href="#features" onClick={closeMenu}>
                Features
              </a>
            </li>
            <li>
              <a href="#demo" onClick={closeMenu}>
                How it works
              </a>
            </li>
            <li>
              <a href="#stats" onClick={closeMenu}>
                Stats
              </a>
            </li>
            <li>
              <a
                href="https://t.me/vilensis_door_bell_bot"
                className="btn-primary"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
              >
                Try the Bot
              </a>
            </li>
          </ul>
        </nav>

        {isMenuOpen && <div className="nav-overlay" onClick={closeMenu}></div>}
      </div>
    </header>
  );
}

export default Header;
