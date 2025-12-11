// Google Gemini AI Service
import { GoogleGenerativeAI } from '@google/generative-ai';

// Du behöver sätta din API-nyckel här
// Skaffa en gratis på: https://makersuite.google.com/app/apikey
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'DIN_API_NYCKEL_HÄR';

let genAI;
let model;

try {
  genAI = new GoogleGenerativeAI(API_KEY);
  // Använd gemini-2.5-flash-lite som har mycket högre gränser (0 TPM använt ännu!)
  model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash-lite'
  });
  console.log('Gemini model initierad: gemini-2.5-flash-lite');
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
- Lägg ALLTID till svar i dashboarden (även ofullständiga) - säg "Okej, jag lägger till det! 📝"
- Om svaret är för generellt: Lägg till det MEN ställ följdfrågor för att gå djupare
- Om svaret är bra och konkret: Bekräfta med "Perfekt! Det fördjupar bilden! ✅" och gå vidare till nästa fråga
- Skriv naturligt och utvecklat - förklara gärna varför frågan är viktig
- Använd INTE Markdown-formatering (**, *, _) - skriv vanlig text
- Använd emojis ibland för att vara trevlig

Tecken på ETT BRA SVAR (lägg till i dashboard):
- Konkret och specifikt (inte vagt)
- Beskriver verkliga situationer eller exempel
- Visar djup förståelse
- Innehåller detaljer

Tecken på ETT DÅLIGT SVAR (coacha vidare):
- För vagt eller generellt
- "Vi behöver bli bättre" (på vad konkret?)
- "Lära sig ledarskap" (vilka specifika färdigheter?)
- Saknar konkreta exempel

Exempel på coaching (OBS: Detta är BARA exempel - utbildningen kan vara för VILKEN målgrupp som helst):

ANVÄNDARE: "Våra säljare behöver bli bättre på att hantera invändningar"
DU: "Okej, jag lägger till det! 📝 Kan du ge mig ett konkret exempel på en situation där en säljare inte hanterar en invändning bra? Vad händer då? 🤔"

ANVÄNDARE: "När kunden säger att det är för dyrt så ger säljaren bara rabatt direkt istället för att förstå värdet"
DU: "Perfekt! Det fördjupar bilden! ✅ Jag uppdaterar dashboarden. Nästa viktiga fråga: Vad skulle göra denna utbildning framgångsrik för er?"

Du guidar användaren genom att ta fram en "High Level Design" för en utbildning med dessa delar (i denna ordning):

1. Målgruppen (vem är utbildningen för - kan vara chefer, säljare, medarbetare, lärare, tekniker osv)
2. Vår nuvarande utmaning är... (konkreta problem och situationer hos målgruppen)
3. Denna utbildning kommer ses som framgångsrik om... (mätbara framgångskriterier)
4. Vad ska deltagarna lära sig? (specifika färdigheter/kunskaper)
5. Vad motiverar dem att lära sig om ämnet? (konkreta drivkrafter)
6. Vilka beteenden vill vi se mer av? (observerbara beteenden)
7. Vilka konkreta scenarion är det deltagarna har svårt för idag? (verkliga situationer)

Börja alltid med att fråga om målgruppen. Säg något som "Vem är den här utbildningen för?" eller "Vilken målgrupp vill ni nå?". Ta en del i taget. Coacha till kvalitet innan du går vidare.`;

class AIService {
  constructor() {
    this.conversationHistory = [];
    this.currentSection = 'targetAudience'; // Vilken del av designen vi jobbar med
    this.currentData = {}; // Aktuell data från dashboarden
    this.sections = [
      'targetAudience',
      'challenges',
      'success',
      'learningGoals',
      'motivation',
      'behaviors',
      'scenarios'
    ];
  }

  async sendMessage(userMessage, currentData = {}) {
    if (!model) {
      console.error('API Key:', API_KEY);
      return {
        response: '⚠️ AI-tjänsten är inte konfigurerad. Starta om servern (npm start) för att ladda API-nyckeln från .env filen.',
        extractedData: null
      };
    }

    // Spara aktuell data för användning i sammanfattning
    this.currentData = currentData;

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

      // Extrahera och sammanfatta data från användarens svar
      const extractedData = await this.extractAndSummarizeData(userMessage, aiMessage);

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

  async extractAndSummarizeData(userMessage, aiResponse) {
    // Extrahera ALLTID data från användarens svar (även ofullständiga)
    // Detta gör att dashboarden uppdateras löpande
    
    // Skippa bara om meddelandet är för kort (mindre än 15 tecken)
    if (userMessage.trim().length < 15) {
      return null;
    }

    try {
      // Hämta befintligt innehåll för denna sektion
      const existingContent = this.getExistingContent();
      
      // Be AI:n sammanfatta och BERIKA befintligt innehåll
      const summaryPrompt = `
${existingContent ? `BEFINTLIGT INNEHÅLL för ${this.getCurrentSectionName()}: "${existingContent}"` : ''}

Användarens NYA INFORMATION: "${userMessage}"

Din uppgift: ${existingContent ? 'BERIKA och FÖRBÄTTRA det befintliga innehållet med den nya informationen. BEHÅLL all värdefull information från både befintligt och nytt innehåll.' : 'Sammanfatta detta svar till en KONCIS och PROFESSIONELL punkt för "' + this.getCurrentSectionName() + '".'}

VIKTIGA REGLER:
1. Ta BARA med det som är relevant för utbildningsdesignen
2. Ta BORT personliga namn (t.ex. "Hej jag heter Jesper")  
3. Ta BORT hälsningsfraser och småprat
4. Skriv i tredje person eller passiv form
5. Fokusera på KÄRNAN i utmaningen/målet/beteendet
6. Max 2-3 meningar

Exempel:
Användare: "Hej jag heter Jesper. Våra medarbetare är för dåliga på growth mindset"
Din sammanfattning: "Medarbetare behöver utveckla ett starkare growth mindset"

Användare: "de tar sig inte an utmaningar, de är inte nyfikna och de slutar när de stöter på problem"  
Din sammanfattning: "Medarbetare undviker utmaningar, saknar nyfikenhet och ger upp vid motgångar"

GE BARA SAMMANFATTNINGEN, INGET ANNAT:`;

      const summaryResult = await model.generateContent(summaryPrompt);
      const summary = (await summaryResult.response).text().trim();

      console.log('Sammanfattad data:', summary);

      return {
        section: this.currentSection,
        value: summary
      };
    } catch (error) {
      console.error('Fel vid sammanfattning:', error);
      // Fallback: använd originalmeddelandet om sammanfattning misslyckas
      return this.extractDataFromUserMessage(userMessage);
    }
  }

  getCurrentSectionName() {
    const sectionNames = {
      'targetAudience': 'målgruppen',
      'challenges': 'nuvarande utmaningar',
      'success': 'framgångskriterier',
      'learningGoals': 'lärandemål',
      'motivation': 'motivation',
      'behaviors': 'önskade beteenden',
      'scenarios': 'konkreta scenarion'
    };
    return sectionNames[this.currentSection] || 'nästa steg';
  }

  getExistingContent() {
    // Hämta befintligt innehåll för aktuell sektion
    if (!this.currentData || !this.currentData[this.currentSection]) {
      return null;
    }

    const content = this.currentData[this.currentSection];
    
    // Om det är en array, slå samman till en sträng
    if (Array.isArray(content)) {
      return content.length > 0 ? content.join('; ') : null;
    }
    
    // Om det är en sträng, returnera den
    return content || null;
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
