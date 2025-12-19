import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';
import aiService from '../services/aiService';

const Chat = ({ onAnswerUpdate, currentData }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hej! 👋 Jag är här för att hjälpa dig skapa en riktigt bra utbildningsdesign. Låt oss börja! Vem är den här utbildningen för?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const userInput = input.trim();
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Skicka till AI-tjänsten med aktuell data
      const { response, extractedData } = await aiService.sendMessage(userInput, currentData);
      
      console.log('Smart analys resultat:', extractedData);
      
      // Uppdatera dashboard baserat på smart analys
      if (extractedData) {
        // Ny struktur: extractedData innehåller categories, needsDeepening, suggestedFollowUp
        if (extractedData.categories && Array.isArray(extractedData.categories)) {
          extractedData.categories.forEach(item => {
            // Lägg till både concrete och vague - vi är experter och kan jobba med det!
            // Endast incomplete behöver mer info
            if (item.section && item.value && item.quality !== 'incomplete') {
              console.log(`✅ Uppdaterar ${item.section}: ${item.value} (${item.quality})`);
              onAnswerUpdate(item.section, item.value);
            } else if (item.section && item.value) {
              console.log(`⏳ För lite info än (${item.quality}): ${item.section}`);
            }
          });
        }
        // Backward compatibility: om det är gamla formatet (array direkt)
        else if (Array.isArray(extractedData)) {
          extractedData.forEach(item => {
            if (item.section && item.value) {
              console.log('Uppdaterar sektion:', item.section, 'med värde:', item.value);
              onAnswerUpdate(item.section, item.value);
            }
          });
        }
        // Backward compatibility: om det är gamla formatet (enkelt objekt)
        else if (extractedData.section && extractedData.value) {
          console.log('Uppdaterar sektion:', extractedData.section, 'med värde:', extractedData.value);
          onAnswerUpdate(extractedData.section, extractedData.value);
        }
      }

      // Visa AI:ns svar
      const aiResponse = {
        role: 'assistant',
        content: response
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Fel vid AI-kommunikation:', error);
      const errorResponse = {
        role: 'assistant',
        content: 'Oj, något gick fel! 😅 Kan du försöka igen?'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>🤖 Din AI-coach</h3>
        <p>Jag hjälper dig designa din utbildning</p>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Skriv ditt svar här..."
          rows="3"
        />
        <button onClick={handleSend} disabled={!input.trim() || isLoading}>
          Skicka
        </button>
      </div>
    </div>
  );
};

export default Chat;
