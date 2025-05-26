import React from "react";

function Features() {
  const features = [
    {
      icon: "🔔",
      title: "Smart Doorbell",
      description: "Get instant notifications when someone rings your doorbell.",
    },
    {
      icon: "🌙",
      title: "Night Mode",
      description: "Automatically block calls during night hours to avoid disturbances.",
    },
    {
      icon: "📊",
      title: "Analytics",
      description: "Get detailed statistics on doorbell usage patterns and missed calls.",
    },
    {
      icon: "🔒",
      title: "Security",
      description: "Control access to your home directly from Telegram.",
    },
    {
      icon: "⚙️",
      title: "Easy Setup",
      description: "Simple installation with ESP8266 compatibility.",
    },
    {
      icon: "📱",
      title: "Mobile Access",
      description: "Control everything from your phone, anywhere, anytime.",
    },
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <h2 className="section-title">Features</h2>
        <p className="section-description">
          Vilensis brings your doorbell to the digital age with these powerful features
        </p>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
