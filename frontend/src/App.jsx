import React from "react";
import "./App.css";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Demo from "./components/Demo";
import Statistics from "./components/Statistics";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="landing-page">
      <Header />
      <Hero />
      <Features />
      <Demo />
      <Statistics />
      <Footer />
    </div>
  );
}

export default App;
