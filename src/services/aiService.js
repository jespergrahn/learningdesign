// Azure AI Foundry Projects Service
const ENDPOINT = process.env.REACT_APP_AZURE_OPENAI_ENDPOINT;
const API_KEY = process.env.REACT_APP_AZURE_OPENAI_KEY;
const MODEL = process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT || 'gpt-4';

console.log('🔧 Azure OpenAI konfiguration:', { ENDPOINT, MODEL });

// System prompt
const SYSTEM_PROMPT = `Du är en ERFAREN pedagogisk designexpert som hjälper användare skapa bra utbildningar. Du är PRAGMATISK - inte perfektionist.

VIKTIGT - Skriv KORT:
- Max 2-3 korta meningar
- Ställ ENDAST EN fråga åt gången
- Använd emoji för att bekräfta
- INGEN Markdown (**, *, _)

DIN EXPERTROLL:
- Du är EXPERT - gör egna rimliga bedömningar!
- Om användaren säger "säljare": Tillräckligt bra! Du vet vad säljare behöver.
- Om de säger "growth mindset": Du vet vad det innebär och kan bygga vidare.
- Fyll själv i rimliga detaljer baserat på din expertis
- Fråga BARA om något är HELT otydligt eller motsägelsefullt

NÄR ÄR INFO TILLRÄCKLIGT BRA?
- "Säljare på B2B-företag" = Perfekt! Vet vad de behöver.
- "Lära sig CRM" = Bra nog! Du kan designa det.
- "Growth mindset" = OK! Du vet vad det betyder.
- "Hantera kundsamtal" = Tillräckligt! Du förstår kontexten.

STÄLL BARA FÖLJDFRÅGOR OM:
- Något är helt vagt ("bli bättre")
- Motsägelsefull info
- Verkligen behövs för att designa utbildningen

Kategorier att fylla:
1. Målgrupp - Vem?
2. Utmaningar - Vad kämpar de med?
3. Framgångskriterier - Hur mäter vi?
4. Lärandemål - Vad ska de kunna?
5. Motivation - Varför bryr de sig?
6. Beteenden - Vilka nya beteenden?
7. Scenarion - Konkreta användningsfall?

VAR GENERÖS: Acceptera "tillräckligt bra" och gå vidare. Du är expert nog att fylla i resten!`;

class AIService {
  constructor() {
    this.conversationHistory = [];
    this.currentSection = 'targetAudience';
    this.currentData = {};
  }

  async sendMessage(userMessage, currentData = {}) {
    this.currentData = currentData;

    // Lägg till användarens meddelande i historiken
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Extrahera data parallellt
    const extractionPromise = this.extractAndSummarizeData(userMessage);

    try {
      // Vänta på analysen först
      const analysis = await extractionPromise;
      
      // Bygg kontextinformation om befintlig data OCH analys
      const dataContext = Object.keys(currentData)
        .filter(key => currentData[key])
        .map(key => {
          const value = currentData[key];
          const displayValue = Array.isArray(value) ? value.join('; ') : value;
          return `${key}: ${displayValue}`;
        })
        .join('\n');

      // Kolla hur många kategorier som är fyllda
      const filledCategories = Object.keys(currentData).filter(key => {
        const value = currentData[key];
        if (Array.isArray(value)) return value.length > 0;
        return value && value.trim().length > 0;
      }).length;
      
      const totalCategories = 7;
      const isComplete = filledCategories >= totalCategories;

      // Lägg till analys-information i kontext om tillgänglig
      let analysisContext = '';
      if (analysis && analysis.needsDeepening && analysis.suggestedFollowUp) {
        analysisContext = `\n\nANALYS: Användaren gav vag information. Förslag på följdfråga: "${analysis.suggestedFollowUp}"`;
      }

      // Om allt är klart, lägg till avslutningsinstruktion
      let completionContext = '';
      if (isComplete) {
        completionContext = `\n\n🎉 VIKTIGT: Alla ${totalCategories} kategorier är nu fyllda! Din uppgift:
1. Sammanfatta kort att utbildningsdesignen är klar (1-2 meningar)
2. Fråga: "Vill du lägga till eller ändra något?"
3. Om användaren är nöjd: Instruera dem att:
   - Ladda ner PDF:en genom att klicka på "Exportera PDF"-knappen
   - Mejla PDF:en till learning@tre.se
   
Exempel: "Perfekt! 🎉 Din utbildningsdesign är klar. Vill du ändra något? Om allt ser bra ut kan du ladda ner PDF:en och mejla den till learning@tre.se."`;
      }

      const contextPrompt = dataContext 
        ? `\n\nBEFINTLIG DATA I DASHBOARDEN (${filledCategories}/${totalCategories} kategorier fyllda):\n${dataContext}\n\nNuvarande fokus: ${this.getCurrentSectionName()}${analysisContext}${completionContext}`
        : `\n\nNuvarande fokus: ${this.getCurrentSectionName()}${analysisContext}${completionContext}`;

      // Bygg meddelanden för API:et
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT + contextPrompt },
        ...this.conversationHistory
      ];

      console.log('📤 Skickar meddelande till Azure OpenAI...');

      // Använd korrekt Azure OpenAI endpoint-format
      const url = `${ENDPOINT}/openai/deployments/${MODEL}/chat/completions?api-version=2025-01-01-preview`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          messages: messages,
          max_completion_tokens: 500
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Svar från Azure OpenAI:', data);

      const aiMessage = data.choices[0].message.content;

      // Lägg till AI:ns svar i historiken
      this.conversationHistory.push({
        role: 'assistant',
        content: aiMessage
      });

      // Returnera med analysen vi redan hämtat
      return {
        response: aiMessage,
        extractedData: analysis
      };

    } catch (error) {
      console.error('❌ Fel vid kommunikation med Azure OpenAI:', error);

      let errorMsg = '😅 Något gick fel med AI:n.';
      if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMsg = '⚠️ API-nyckeln är ogiltig. Kontrollera Azure-credentials.';
      } else if (error.message?.includes('404')) {
        errorMsg = '⚠️ Kunde inte hitta endpoint. Kontrollera URL i .env';
      } else if (error.message?.includes('429')) {
        errorMsg = '⏸️ För många förfrågningar. Vänta en minut och försök igen.';
      }

      return {
        response: errorMsg + '\n\nFel: ' + error.message,
        extractedData: null
      };
    }
  }

  async extractAndSummarizeData(userMessage) {
    // Skippa om meddelandet är för kort
    if (userMessage.trim().length < 3) {
      return null;
    }

    try {
      // Hämta all befintlig data för kontextmedvetenhet
      const allData = this.currentData;
      
      const analysisPrompt = `
ANVÄNDARENS MEDDELANDE: "${userMessage}"

BEFINTLIG DATA:
${Object.keys(allData).map(key => {
  const value = allData[key];
  if (!value) return '';
  const displayValue = Array.isArray(value) ? value.join('; ') : value;
  return displayValue ? `${key}: ${displayValue}` : '';
}).filter(Boolean).join('\n') || 'Ingen data än'}

NUVARANDE FOKUS: ${this.getCurrentSectionName()}

Din uppgift - GÖR EN SMART ANALYS I 3 STEG:

STEG 1 - RELEVANS:
Är detta meddelande relevant för utbildningsdesign?
- JA: Information om målgrupp, mål, utmaningar, beteenden etc
- NEJ: Hälsningar ("hej", "tack"), personliga namn ("jag heter X"), småprat

STEG 2 - KATEGORISERING (om relevant):
Vilken/vilka av dessa kategorier passar informationen?
- targetAudience: Vilka personerna är (roller, bakgrund, NOT personliga namn)
- challenges: Problem och svårigheter målgruppen har
- success: Hur vi mäter framgång, önskade resultat
- learningGoals: Konkreta kunskaper/färdigheter att lära sig
- motivation: Varför målgruppen bryr sig, drivkrafter
- behaviors: Nya arbetssätt eller beteenden att implementera
- scenarios: Konkreta situationer där de använder kunskapen

STEG 3 - KVALITETSBEDÖMNING (om relevant):
Är informationen TILLRÄCKLIGT BRA för att bygga en utbildning?

CONCRETE = Bra nog att använda:
- Roller ("säljare", "kundtjänst", "chefer")
- Ämnen ("CRM", "kundsamtal", "growth mindset")
- Aktiviteter ("logga samtal", "hantera feedback")
- Kontext ("B2B", "telefonsupport", "nya medarbetare")
- Allt som en learning designer kan jobba vidare med

VAGUE = Kan användas med rimliga antaganden:
- "Bli bättre på försäljning" (okej, vi förstår kontexten)
- "Lära sig systemet" (vi kan fylla i vad det innebär)
- "Hantera svåra situationer" (vi kan göra antaganden)
Markera som VAGUE men det är fortfarande OK att lägga till!

INCOMPLETE = För lite för att använda:
- Bara nyckelord utan kontext ("lärandemål")
- Helt otydligt vad de menar
- Motsägelsefull information

VIKTIGT: Var GENERÖS i bedömningen!
- Både "concrete" och "vague" är BRA NOG att lägga ut
- Som learning design expert kan vi fylla i rimliga detaljer
- ENDAST "incomplete" behöver mer info

VIKTIGA REGLER:
- FILTRERA BORT småprat, namn, hälsningar
- OM information är relevant: Sammanfatta KONCISET (max 2 meningar per kategori)
- Skriv i tredje person/passiv form
- Berika vaga påståenden med vad det troligen betyder
- Om flera kategorier passar: inkludera alla

Svara i EXAKT detta JSON-format (och INGET annat):
{
  "isRelevant": true/false,
  "reason": "Kort förklaring varför relevant/irrelevant",
  "categories": [
    {
      "section": "kategorinamn",
      "value": "sammanfattad text",
      "quality": "concrete/vague/incomplete"
    }
  ],
  "needsDeepening": true/false,
  "suggestedFollowUp": "Förslag på följdfråga om needsDeepening är true"
}

Om meddelandet är irrelevant (t.ex. bara "hej"), sätt isRelevant: false och categories: []`;

      const url = `${ENDPOINT}/openai/deployments/${MODEL}/chat/completions?api-version=2025-01-01-preview`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Du är en expert på att analysera, filtrera och kategorisera pedagogisk information. Svara ENDAST med valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          max_completion_tokens: 400
        })
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const data = await response.json();
      let analysis = data.choices[0].message.content.trim();
      
      // Extrahera JSON från svaret
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = jsonMatch[0];
      }
      
      console.log('🧠 Smart analys:', analysis);

      try {
        const parsed = JSON.parse(analysis);
        
        // Om inte relevant, returnera null
        if (!parsed.isRelevant) {
          console.log('ℹ️ Meddelandet är inte relevant för utbildningen');
          return null;
        }
        
        // Returnera strukturerad analys
        return {
          categories: parsed.categories || [],
          needsDeepening: parsed.needsDeepening || false,
          suggestedFollowUp: parsed.suggestedFollowUp || null,
          reason: parsed.reason
        };
      } catch (parseError) {
        console.warn('⚠️ Kunde inte parsa JSON, använder fallback');
        return null;
      }
    } catch (error) {
      console.error('⚠️ Fel vid analys:', error);
      return null;
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
    const section = this.currentSection;
    
    if (section === 'targetAudience') {
      return this.currentData.targetAudience || '';
    }
    
    const sectionData = this.currentData[section];
    if (!sectionData) return '';
    
    if (Array.isArray(sectionData)) {
      return sectionData.join('. ');
    }
    
    return sectionData;
  }

  setCurrentSection(section) {
    this.currentSection = section;
  }

  reset() {
    this.conversationHistory = [];
    this.currentSection = 'targetAudience';
    this.currentData = {};
  }
}

export default new AIService();
