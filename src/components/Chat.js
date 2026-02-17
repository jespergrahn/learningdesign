import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';
import aiService from '../services/aiService';

const Chat = ({ onAnswerUpdate, currentData }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hej! Jag är din learning design-partner. 🎯\n\nJag hjälper dig att tänka igenom och designa en riktigt bra utbildning. Under vårt samtal fyller vi tillsammans i dashboarden till vänster.\n\nBörja gärna med att berätta: Vad är det för utbildning du vill skapa, och varför behövs den?'
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
      const { response, extractedData } = await aiService.sendMessage(userInput, currentData);

      if (extractedData?.categories && Array.isArray(extractedData.categories)) {
        extractedData.categories.forEach(item => {
          if (item.section && item.value && item.quality === 'concrete') {
            onAnswerUpdate(item.section, item.value);
          }
        });
      }

      // Ta bort ✅-markörer från det som visas i chatten
      const cleanResponse = response
        .split('\n')
        .filter(line => !line.match(/^\s*✅\s*[^:]+:\s*.+/))
        .join('\n')
        .trim();

      setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Oj, nagot gick fel. Forsok igen.' }]);
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
        <h3>🤖 Chatt</h3>
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
          placeholder="Skriv ditt svar har..."
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
