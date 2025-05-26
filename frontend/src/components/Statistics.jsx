import React from "react";

function Statistics() {
  const stats = [
    { number: "1,500+", label: "Active Users" },
    { number: "25,000+", label: "Doorbell Rings" },
    { number: "99.9%", label: "Uptime" },
    { number: "4.8/5", label: "User Rating" },
  ];

  return (
    <section id="stats" className="statistics">
      <div className="container">
        <h2 className="section-title">Trusted by Many</h2>
        <div className="stats-container">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="testimonial">
          <blockquote>
            "Vilensis has completely transformed my home. The night mode feature is a game changer!"
          </blockquote>
          <cite>— Vilen Solovey, student of NULP</cite>
        </div>
      </div>
    </section>
  );
}

export default Statistics;
