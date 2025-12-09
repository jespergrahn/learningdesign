// Google Gemini AI Service
import { GoogleGenerativeAI } from '@google/generative-ai';

// Du behöver sätta din API-nyckel här
// Skaffa en gratis på: https://makersuite.google.com/app/apikey
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'DIN_API_NYCKEL_HÄR';

let genAI;
let model;

try {
  genAI = new GoogleGenerativeAI(API_KEY);
  // Använd latest-alias som alltid pekar på senaste fungerande versionen
  model = genAI.getGenerativeModel({ 
    model: 'gemini-flash-latest'
  });
  console.log('Gemini model initierad: gemini-flash-latest');
} catch (error) {
  console.error('Fel vid initiering av Gemini:', error);
}

// System prompt som definierar AI:ns beteende
const SYSTEM_PROMPT = `Du är en erfaren pedagogisk designexpert och coach som hjälper användare att skapa RIKTIGT BRA utbildningar. Du har höga krav och coachar användaren till djupare insikter.

Din personlighet:
- Vänlig men krävande - du vill ha kvalitet
- Nyfiken och utforskande - gräv djupare
- Använd emojis ibland för att göra samtalet trevligt (men inte i varje mening)
- Ställ följdfrågor när svaret är för ytligt
- Utmana användaren att tänka mer konkret och specifikt

VIKTIGT - Regler för coaching:
- Ställ ENDAST EN fråga åt gången
- Acceptera INTE för ytliga eller vaga svar
- Om svaret är för generellt: Ställ följdfrågor för att gå djupare
- Om svaret är bra och konkret: Bekräfta och säg "Perfekt! Jag lägger till det i din design! ✅"
- Var kortfattad (max 2-3 meningar + EN fråga)
- Använd INTE Markdown-formatering (**, *, _) - skriv vanlig text
- Använd emojis istället för fetstil

Tecken på ETT BRA SVAR (lägg till i dashboard):
- Konkret och specifikt (inte vagt)
- Beskriver verkliga situationer eller exempel
- Visar djup förståelse
- Innehåller detaljer

Tecken på ETT DÅLIGT SVAR (coacha vidare):
-För vagt eller generellt
- "Vi behöver bli bättre" (på vad konkret?)
- "Lära sig ledarskap" (vilka specifika färdigheter?)
- Saknar konkreta exempel

Exempel på coaching:

ANVÄNDARE: "Våra chefer behöver bli bättre på ledarskap"
DU: "Okej, jag förstår. Kan du ge mig ett konkret exempel på en situation där du ser att ledarskapet brister? Vad händer då? 🤔"

ANVÄNDARE: "De instruerar istället för att coacha när medarbetare kommer med problem"
DU: "Perfekt! Det är ett konkret exempel. Jag lägger till det i din design! ✅ Nästa: Vad skulle göra denna utbildning framgångsrik för er?"

Du guidar användaren genom att ta fram en "High Level Design" för en utbildning med dessa delar (i denna ordning):

1. Vår nuvarande utmaning är... (konkreta problem och situationer)
2. Denna utbildning kommer ses som framgångsrik om... (mätbara framgångskriterier)
3. Målgruppen (vem är utbildningen för)
4. Vad ska deltagarna lära sig? (specifika färdigheter/kunskaper)
5. Vad motiverar dem att lära sig om ämnet? (konkreta drivkrafter)
6. Vilka beteenden vill vi se mer av? (observerbara beteenden)
7. Vilka konkreta scenarion är det deltagarna har svårt för idag? (verkliga situationer)

Börja alltid med att fråga om deras nuvarande utmaningar. Ta en del i taget. Coacha till kvalitet innan du går vidare.`;

class AIService {
  constructor() {
    this.conversationHistory = [];
    this.currentSection = 'challenges'; // Vilken del av designen vi jobbar med
    this.sections = [
      'challenges',
      'success',
      'targetAudience',
      'learningGoals',
      'motivation',
      'behaviors',
      'scenarios'
    ];
  }

  async sendMessage(userMessage) {
    if (!model) {
      console.error('API Key:', API_KEY);
      return {
        response: '⚠️ AI-tjänsten är inte konfigurerad. Starta om servern (npm start) för att ladda API-nyckeln från .env filen.',
        extractedData: null
      };
    }

    try {
      // Bygg konversationskontext
      const context = this.buildContext(userMessage);
      
      console.log('Skickar till Gemini...');
      
      // Skicka till Gemini med retry-logik
      let result;
      try {
        result = await model.generateContent(context);
      } catch (error) {
        // Om vi får 503 (overloaded) eller 429 (rate limit), vänta och försök igen
        if (error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('overloaded')) {
          console.log('Modellen överbelastad, väntar 2 sekunder och försöker igen...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await model.generateContent(context);
        } else {
          throw error;
        }
      }
      
      const response = await result.response;
      const aiMessage = response.text();

      console.log('Svar från Gemini:', aiMessage);

      // Spara i historik
      this.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiMessage }
      );

      // Extrahera data från användarens svar för att fylla i dashboarden
      const extractedData = this.extractDataFromUserMessage(userMessage);

      return {
        response: aiMessage,
        extractedData: extractedData
      };
    } catch (error) {
      console.error('Detaljerat fel vid kommunikation med AI:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Ge användarvänligt felmeddelande
      let errorMsg = '😅 Något gick fel med AI:n.';
      if (error.message?.includes('403')) {
        errorMsg = '⚠️ API-nyckeln har nått sin dagsgräns. Du kan fortsätta manuellt eller vänta till imorgon.';
      } else if (error.message?.includes('503') || error.message?.includes('overloaded')) {
        errorMsg = '⏳ AI:n är lite överbelastad just nu. Vänta några sekunder och försök igen.';
      } else if (error.message?.includes('429')) {
        errorMsg = '⏸️ För många förfrågningar. Vänta en minut och försök igen.';
      }
      
      return {
        response: errorMsg,
        extractedData: null
      };
    }
  }

  buildContext(userMessage) {
    // Bygg en prompt med systemkontext och historik
    let context = SYSTEM_PROMPT + '\n\n';
    context += 'Konversationshistorik:\n';
    
    this.conversationHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'Användare' : 'Du';
      context += `${role}: ${msg.content}\n`;
    });
    
    context += `Användare: ${userMessage}\n`;
    context += 'Du:';
    
    return context;
  }

  extractDataFromUserMessage(message) {
    // Extrahera bara om svaret är tillräckligt bra (minst 20 tecken för att vara konkret)
    if (message.trim().length < 20) return null;
    
    // Returnera data för aktuell sektion
    return {
      section: this.currentSection,
      value: message.trim()
    };
  }

  getCurrentSectionName() {
    const sectionNames = {
      'challenges': 'nuvarande utmaningar',
      'success': 'framgångskriterier',
      'targetAudience': 'målgruppen',
      'learningGoals': 'lärandemål',
      'motivation': 'motivation',
      'behaviors': 'önskade beteenden',
      'scenarios': 'konkreta scenarion'
    };
    return sectionNames[this.currentSection] || 'nästa steg';
  }

  moveToNextSection() {
    const currentIndex = this.sections.indexOf(this.currentSection);
    if (currentIndex < this.sections.length - 1) {
      this.currentSection = this.sections[currentIndex + 1];
    }
  }

  reset() {
    this.conversationHistory = [];
    this.currentSection = 'challenges';
  }
}

export default new AIService();
