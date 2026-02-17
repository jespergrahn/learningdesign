import React, { useState } from "react";
import app from "./firebase";
import "./App.css";
import Chat from "./components/Chat";
import Dashboard from "./components/Dashboard";
import { exportSpecToPDF } from "./utils/pdfExport";
import aiService from "./services/aiService";

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
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false);

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
    setDesignData(prev => {
      if (section === 'targetAudience') {
        return { ...prev, [section]: value };
      }

      if (Array.isArray(prev[section])) {
        const newArray = [...prev[section], value];
        return { ...prev, [section]: newArray };
      }

      return { ...prev, [section]: value };
    });
  };

  const handleGenerateSpec = async () => {
    setIsGeneratingSpec(true);
    try {
      const result = await aiService.generateElearningSpec(designData);
      if (result.error) {
        alert('Fel: ' + result.error);
      } else if (result.spec) {
        exportSpecToPDF(result.spec, designData);
      }
    } catch (error) {
      alert('Något gick fel: ' + error.message);
    } finally {
      setIsGeneratingSpec(false);
    }
  };

  return (
    <div className="App">
      {/* Header/Navigation */}
      <header className="header">
        <nav className="nav">
          <a href="/" className="logo">LearningDesigner</a>
          <p className="tagline">Hjälper dig att ta reda på hur vi ska bygga en riktigt bra utbildning</p>
          <div className="header-buttons">
            <button className="export-btn-header" onClick={() => {
              handleGenerateSpec();
            }} disabled={isGeneratingSpec}>
              <span>📄</span> {isGeneratingSpec ? 'Genererar...' : 'Exportera'}
            </button>
          </div>
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
