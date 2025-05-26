import React from "react";

function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <h1>Meet Vilensis</h1>
          <h2>Your Smart Home Guardian in Telegram</h2>
          <p>
            Vilensis is your personal smart home assistant that helps you monitor your doorbell, manage access, and keep
            your home safe - all through Telegram.
          </p>
          <div className="cta-buttons">
            <a
              href="https://t.me/vilensis_door_bell_bot"
              className="btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Add to Telegram
            </a>
            <a href="#features" className="btn-secondary">
              Learn More
            </a>
          </div>
        </div>
        <div className="hero-image">
          <img src="/src/assets/heroImg.png" alt="Vilensis Telegram Bot in action" />
        </div>
      </div>
    </section>
  );
}

export default Hero;
