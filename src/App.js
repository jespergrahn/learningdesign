// src/App.js

import app from "./firebase";
import "./App.css";

// Logga Firebase-appen så vi ser att den är initierad
console.log("Firebase init:", app);

function App() {
  return (
    <div className="App">
      {/* Header/Navigation */}
      <header className="header">
        <nav className="nav">
          <a href="/" className="logo">LearningDesigner</a>
          <ul className="nav-links">
            <li><a href="#om">Om oss</a></li>
            <li><a href="#funktioner">Funktioner</a></li>
            <li><a href="#kontakt">Kontakt</a></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>LearningDesigner</h1>
          <p>
            Hjälper dig att ta reda på hur vi ska bygga en riktigt bra utbildning.
          </p>
          <button className="cta-button">Kom igång</button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Alltid hos LearningDesigner</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Pedagogisk design</h3>
            <p>Skapa engagerande och effektiva utbildningar baserat på beprövade metoder och modern pedagogik.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>Strukturerad planering</h3>
            <p>Få stöd i hela processen från idé till färdig utbildning med tydliga verktyg och mallar.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>Kvalitetssäkring</h3>
            <p>Säkerställ att din utbildning håller högsta kvalitet och når de mål du satt upp.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <h3>LearningDesigner</h3>
          <p>© 2025 LearningDesigner. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
