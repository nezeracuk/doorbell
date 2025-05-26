import React from "react";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <h2>Vilensis</h2>
            <p>Your Smart Home Assistant</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h3>Product</h3>
              <ul>
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#demo">Demo</a>
                </li>
                <li>
                  <a href="#stats">Statistics</a>
                </li>
                <li>
                  <a href="#">Documentation</a>
                </li>
              </ul>
            </div>
            <div className="footer-column">
              <h3>Contact Us</h3>
              <ul>
                <li>
                  <a href="mailto:info@vilensis.com">info@vilensis.com</a>
                </li>
                <li>
                  <a href="https://t.me/nezerino">Telegram Support</a>
                </li>
                <li>
                  <a href="https://github.com/vilensis">GitHub</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Vilensis. All rights are not reserved. (yet)</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
