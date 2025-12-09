import React, { useState } from 'react';
import './Dashboard.css';
import { exportToPDF } from '../utils/pdfExport';

const Dashboard = ({ data, onUpdate }) => {
  const handleSave = (section, field, value) => {
    onUpdate(section, field, value);
  };

  const handleExportPDF = () => {
    exportToPDF(data);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>High Level Design</h2>
          <p>Din utbildningsdesign</p>
        </div>
        <button className="export-btn" onClick={handleExportPDF}>
          📄 Exportera PDF
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Nuvarande utmaning */}
          <section className="dashboard-section">
            <h3>🎯 Nuvarande utmaning</h3>
            <div className="section-content">
              {data.challenges?.length > 0 ? (
                <ul>
                  {data.challenges.map((challenge, idx) => (
                    <li key={idx}>
                      <EditableField
                        value={challenge}
                        onSave={(value) => handleSave('challenges', idx, value)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="placeholder">Inga utmaningar tillagda ännu 💭</p>
              )}
            </div>
          </section>

          {/* Framgångskriterier */}
          <section className="dashboard-section">
            <h3>✨ Framgångskriterier</h3>
            <div className="section-content">
              {data.success?.length > 0 ? (
                <ul>
                  {data.success.map((item, idx) => (
                    <li key={idx}>
                      <EditableField
                        value={item}
                        onSave={(value) => handleSave('success', idx, value)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="placeholder">Beskriv framgång 🎉</p>
              )}
            </div>
          </section>

          {/* Målgrupp */}
          <section className="dashboard-section">
            <h3>👥 Målgrupp</h3>
            <div className="section-content">
              {data.targetAudience ? (
                <EditableField
                  value={data.targetAudience}
                  onSave={(value) => handleSave('targetAudience', null, value)}
                />
              ) : (
                <p className="placeholder">Vem är detta för? 🤔</p>
              )}
            </div>
          </section>

          {/* Lärandemål */}
          <section className="dashboard-section">
            <h3>📚 Lärandemål</h3>
            <div className="section-content">
              {data.learningGoals?.length > 0 ? (
                <ul>
                  {data.learningGoals.map((goal, idx) => (
                    <li key={idx}>
                      <EditableField
                        value={goal}
                        onSave={(value) => handleSave('learningGoals', idx, value)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="placeholder">Vad ska de lära sig? 📖</p>
              )}
            </div>
          </section>

          {/* Motivation */}
          <section className="dashboard-section">
            <h3>💡 Motivation</h3>
            <div className="section-content">
              {data.motivation?.length > 0 ? (
                <ul>
                  {data.motivation.map((item, idx) => (
                    <li key={idx}>
                      <EditableField
                        value={item}
                        onSave={(value) => handleSave('motivation', idx, value)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="placeholder">Vad driver dem? 🚀</p>
              )}
            </div>
          </section>

          {/* Beteenden */}
          <section className="dashboard-section">
            <h3>🎬 Önskade beteenden</h3>
            <div className="section-content">
              {data.behaviors?.length > 0 ? (
                <ul>
                  {data.behaviors.map((behavior, idx) => (
                    <li key={idx}>
                      <EditableField
                        value={behavior}
                        onSave={(value) => handleSave('behaviors', idx, value)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="placeholder">Vilka beteenden? 👀</p>
              )}
            </div>
          </section>

          {/* Scenarion */}
          <section className="dashboard-section">
            <h3>🎭 Konkreta scenarion</h3>
            <div className="section-content">
              {data.scenarios?.length > 0 ? (
                <ul>
                  {data.scenarios.map((scenario, idx) => (
                    <li key={idx}>
                      <EditableField
                        value={scenario}
                        onSave={(value) => handleSave('scenarios', idx, value)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="placeholder">Vilka situationer? 🤷</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const EditableField = ({ value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  if (isEditing) {
    return (
      <div className="editable-field editing">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoFocus
        />
        <div className="edit-buttons">
          <button onClick={() => {
            onSave(editValue);
            setIsEditing(false);
          }}>✓</button>
          <button onClick={() => {
            setEditValue(value);
            setIsEditing(false);
          }}>✗</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editable-field" onClick={() => setIsEditing(true)}>
      <span>{value}</span>
      <button className="edit-icon">✏️</button>
    </div>
  );
};

export default Dashboard;
