// src/App.js

import React, { useState } from "react";
import app from "./firebase";
import "./App.css";
import Chat from "./components/Chat";
import Dashboard from "./components/Dashboard";

// Logga Firebase-appen så vi ser att den är initierad
console.log("Firebase init:", app);

function App() {
  const [designData, setDesignData] = useState({
    targetAudience: '',
    challenges: [],
    success: [],
    learningGoals: [],
    motivation: [],
    behaviors: [],
    scenarios: []
  });

  const handleUpdateData = (section, field, value) => {
    setDesignData(prev => {
      if (field === null) {
        // Single value update
        return { ...prev, [section]: value };
      } else {
        // Array update
        const newArray = [...prev[section]];
        newArray[field] = value;
        return { ...prev, [section]: newArray };
      }
    });
  };

  const handleAnswerUpdate = (section, value) => {
    console.log('handleAnswerUpdate anropad:', section, value);
    setDesignData(prev => {
      // För targetAudience (string): ersätt direkt med berikad version
      if (section === 'targetAudience') {
        return { ...prev, [section]: value };
      }
      
      // För arrays: ersätt sista elementet om det finns, annars lägg till
      if (Array.isArray(prev[section])) {
        const newArray = prev[section].length > 0 
          ? [...prev[section].slice(0, -1), value]  // Ersätt sista med berikad version
          : [value];  // Lägg till första
        return { ...prev, [section]: newArray };
      }
      
      const updated = { ...prev, [section]: value };
      console.log('Uppdaterad designData:', updated);
      return updated;
    });
  };

  return (
    <div className="App">
      {/* Header/Navigation */}
      <header className="header">
        <nav className="nav">
          <a href="/" className="logo">LearningDesigner</a>
          <p className="tagline">Hjälper dig att ta reda på hur vi ska bygga en riktigt bra utbildning</p>
        </nav>
      </header>

      {/* Main Workspace */}
      <main className="workspace">
        <div className="workspace-grid">
          <div className="dashboard-panel">
            <Dashboard data={designData} onUpdate={handleUpdateData} />
          </div>
          <div className="chat-panel">
            <Chat onAnswerUpdate={handleAnswerUpdate} currentData={designData} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
