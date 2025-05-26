import React, { useState } from "react";

function Demo() {
  const [activeDemo, setActiveDemo] = useState("doorbell");

  const demos = {
    doorbell: {
      command: "/last",
      response: `
*Last Ring*
Status: ✅ Accepted
Time: _10.05.2023, 14:32:15_
      `,
      description: "Check when someone last rang your doorbell",
    },
    stats: {
      command: "/stats",
      response: `
📊 *Statistics for last 7 days*

Total rings: 14
Accepted: 11
Blocked: 3

🔔 Most activity: 18:00-19:00 (4 rings)
🚫 Most missed: 23:00-00:00 (2 blocked)

*Hourly distribution:*
09:00 █ 1✅ 0🚫
14:00 ██ 2✅ 0🚫
18:00 ████ 4✅ 0🚫
20:00 ██ 2✅ 1🚫
23:00 ███ 1✅ 2🚫
      `,
      description: "Get detailed statistics about doorbell activity",
    },
    mode: {
      command: "/mode",
      response: `
*Night Mode Status*
Currently: 🌙 Enabled
Schedule: 22:00-09:00

[Toggle night mode]  [Reset to auto mode]
      `,
      description: "Check and control night mode settings",
    },
  };

  return (
    <section id="demo" className="demo">
      <div className="container">
        <h2 className="section-title">How It Works</h2>
        <p className="section-description">Vilensis is simple to use with intuitive commands. Here's a quick demo:</p>

        <div className="demo-container">
          <div className="demo-buttons">
            {Object.keys(demos).map((key) => (
              <button
                key={key}
                className={`demo-button ${activeDemo === key ? "active" : ""}`}
                onClick={() => setActiveDemo(key)}
              >
                {demos[key].command}
              </button>
            ))}
          </div>

          <div className="telegram-chat">
            <div className="telegram-header">
              <div className="telegram-title">Vilensis Bot</div>
            </div>
            <div className="telegram-messages">
              <div className="message user-message">
                <div className="message-content">{demos[activeDemo].command}</div>
              </div>
              <div className="message bot-message">
                <div className="message-content">
                  <pre>{demos[activeDemo].response}</pre>
                </div>
              </div>
            </div>
            <div className="telegram-description">
              <p>{demos[activeDemo].description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Demo;
