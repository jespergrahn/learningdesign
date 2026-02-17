const BASE_URL = process.env.REACT_APP_AI_BASE_URL;
const API_KEY = process.env.REACT_APP_AI_API_KEY;
const DEPLOYMENT = process.env.REACT_APP_AI_DEPLOYMENT;
const API_VERSION = process.env.REACT_APP_AI_API_VERSION;
const PATH_TEMPLATE = process.env.REACT_APP_AI_PATH;
const AUTH_HEADER = process.env.REACT_APP_AI_AUTH_HEADER || 'api-key';

const SYSTEM_PROMPT = `Du är en erfaren learning designer och pedagogisk expert. Du hjälper beställare att designa bra utbildningar genom ett stödjande samtal. Du arbetar enligt Action Mapping (Cathy Moore) och evidensbaserad pedagogisk design.

## DITT MÅL
Gennom ett naturligt samtal, hjälp användaren fylla i ALLA sektioner i dashboarden till vänster. Hjälp dem tänka klarare — men var stödjande, inte krävande.

Dashboarden har dessa sektioner:
- **Målgrupp** — Vilka är deltagarna? Roller, erfarenhet, förkunskaper.
- **Nuvarande utmaningar** — Vilka problem ska utbildningen lösa?
- **Framgångskriterier** — Hur vet vi att utbildningen lyckats?
- **Lärandemål** — Vad ska deltagarna kunna göra efter utbildningen?
- **Motivation** — Vad driver målgruppen? Vad hindrar dem?
- **Önskade beteenden** — Vilka konkreta beteendeförändringar vill vi se?
- **Konkreta scenarion** — Situationer där kunskapen ska användas.

## DIN SAMTALSSTIL
1. **Ställ EN fråga i taget.** Vänta på svar innan du går vidare.
2. **Var stödjande.** Bekräfta det användaren säger. Bygg vidare på deras svar.
3. **Hjälp vid behov.** Om svaret är vagt, ställ en följdfråga för att hjälpa dem konkretisera. T.ex: "Kan du ge ett exempel på hur det ser ut i praktiken?"
4. **Max TVÅ följdfrågor per område.** Du får ställa upp till två följdfrågor för att hjälpa användaren tänka djupare. Efter det, acceptera svaret och gå vidare.
5. **Bekräfta snabbt.** När du får ett rimligt svar, bekräfta och gå vidare till nästa område.
6. **Håll koll på helheten.** Styr samtalet naturligt mot det som saknas i dashboarden.

## NÄR ÄR ETT SVAR TILLRÄCKLIGT?
Ett svar är redo för dashboarden när det:
- Ger en rimlig bild av området
- Går att använda som utgångspunkt för utbildningsdesign
- Användaren verkar nöjd med sitt svar

Du behöver INTE perfekta svar. Bra nog är bra nog — dashboarden kan alltid redigeras i efterhand.

## SPARA TILL DASHBOARDEN
När du är nöjd med ett svar och vill att det ska sparas till dashboarden, skriv en rad i ditt svar med EXAKT detta format:

✅ [sektion]: sammanfattad text

Där [sektion] är EN av: målgrupp, utmaningar, framgång, lärandemål, motivation, beteenden, scenarion

Exempel:
✅ målgrupp: Nyanställda säljare med 0–2 års erfarenhet, ca 20 personer per omgång
✅ utmaningar: Säljarna följer inte upp offerter inom 48 timmar
✅ beteenden: Genomföra strukturerade uppföljningssamtal med kund inom 48h efter offert

Du kan spara flera saker i samma svar om samtalet täckt flera områden. Lägg alltid markörraden EFTER din bekräftelse/kommentar, inte istället för den.

## TONALITET OCH LÄNGD
- Varm, nyfiken och uppmuntrande
- Använd enkelt språk
- **KORT!** Max 1–2 meningar + EN fråga. Totalt max 3 meningar per svar.
- Ge ett kort exempel när användaren kör fast
- ALDRIG punktlistor eller långa utläggningar

## REGLER
- Lista ALDRIG alla frågor i förväg
- Följdfråga max TVÅ gånger per område — sedan acceptera och spara
- Ge ALDRIG färdiga lösningar innan ni pratat klart
- Om användaren verkar fast — ge ett kort exempel som inspiration`;


const ANALYSIS_SYSTEM_PROMPT = `Du är expert på att analysera pedagogisk information från samtal. Din uppgift är att extrahera användbar data från användarens meddelanden och kategorisera den.

Regler:
- Extrahera BARA information som användaren faktiskt har sagt
- Var generös med "concrete" — om svaret ger en rimlig bild och går att arbeta med, markera det som concrete
- Markera bara som "vague" om svaret är så generellt att det inte går att använda alls
- Svara ENDAST med valid JSON, ingen annan text`;

const buildUrl = () => {
  if (!BASE_URL || !PATH_TEMPLATE || !API_VERSION) return '';
  const base = BASE_URL.replace(/\/+$/, '');
  const path = PATH_TEMPLATE.replace('{deployment}', DEPLOYMENT).replace(/^\/+/, '');
  return `${base}/${path}?api-version=${API_VERSION}`;
};

class AIService {
  constructor() {
    this.currentData = {};
    this.conversationHistory = [];
  }

  resetConversation() {
    this.conversationHistory = [];
  }

  async sendMessage(userMessage, currentData = {}) {
    this.currentData = currentData;
    if (!BASE_URL || !API_KEY || !DEPLOYMENT || !API_VERSION || !PATH_TEMPLATE) {
      return {
        response: 'Konfiguration saknas. Kontrollera .env.'
      };
    }

    const url = buildUrl();
    if (!url) {
      return {
        response: 'Ogiltig URL. Kontrollera base url, path och api-version.'
      };
    }

    // Lägg till användarens meddelande i historiken
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Bygg kontextmeddelande med dashboard-data
    const dashboardContext = this.buildDashboardContext(currentData);
    const systemWithContext = SYSTEM_PROMPT + dashboardContext;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTH_HEADER]: API_KEY
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemWithContext },
            ...this.conversationHistory
          ],
          max_completion_tokens: 400
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Ta bort det misslyckade meddelandet från historiken
        this.conversationHistory.pop();
        return { response: `API error ${response.status}: ${errorText}` };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || 'Inget svar.';

      // Lägg till AI:ns svar i historiken
      this.conversationHistory.push({ role: 'assistant', content });

      // Begränsa historiken till de senaste 30 meddelandena för att undvika token-gränser
      if (this.conversationHistory.length > 30) {
        this.conversationHistory = this.conversationHistory.slice(-30);
      }

      // Kör analysen EFTER chatsvaret så den kan se AI:ns bekräftelse/godkännande
      // Parsa dashboard-markörer direkt från AI-svaret (✅ sektion: text)
      const dashboardEntries = this.parseDashboardMarkers(content);

      // Markörer har prioritet. Kör bara analysen som fallback om inga markörer hittades.
      let finalData;
      if (dashboardEntries.length > 0) {
        finalData = { categories: dashboardEntries };
      } else {
        const extractedData = await this.extractAndSummarizeData(userMessage, content);
        finalData = extractedData;
      }

      return { response: content, extractedData: finalData };
    } catch (error) {
      // Ta bort det misslyckade meddelandet från historiken
      this.conversationHistory.pop();
      return { response: `Tekniskt fel: ${error.message}` };
    }
  }

  parseDashboardMarkers(aiResponse) {
    if (!aiResponse) return [];

    const sectionMap = {
      'målgrupp': 'targetAudience',
      'malgrupp': 'targetAudience',
      'utmaningar': 'challenges',
      'utmaning': 'challenges',
      'framgång': 'success',
      'framgang': 'success',
      'framgångskriterier': 'success',
      'lärandemål': 'learningGoals',
      'larandemal': 'learningGoals',
      'motivation': 'motivation',
      'beteenden': 'behaviors',
      'beteende': 'behaviors',
      'scenarion': 'scenarios',
      'scenario': 'scenarios'
    };

    const entries = [];
    const lines = aiResponse.split('\n');

    for (const line of lines) {
      // Matcha: ✅ sektion: text
      const match = line.match(/✅\s*([^:]+):\s*(.+)/);
      if (match) {
        const sectionLabel = match[1].trim().toLowerCase();
        const value = match[2].trim();
        const section = sectionMap[sectionLabel];
        if (section && value) {
          entries.push({ section, value, quality: 'concrete' });
        }
      }
    }

    return entries;
  }

  buildDashboardContext(data) {
    if (!data) return '';
    const filled = [];
    const empty = [];
    const labels = {
      targetAudience: 'Målgrupp',
      challenges: 'Utmaningar',
      success: 'Framgångskriterier',
      learningGoals: 'Lärandemål',
      motivation: 'Motivation',
      behaviors: 'Önskade beteenden',
      scenarios: 'Konkreta scenarion'
    };

    Object.entries(labels).forEach(([key, label]) => {
      const value = data[key];
      if (value && (Array.isArray(value) ? value.length > 0 : value.trim())) {
        const display = Array.isArray(value) ? value.join('; ') : value;
        filled.push(`- ${label}: ${display}`);
      } else {
        empty.push(label);
      }
    });

    let context = '\n\n## NUVARANDE STATUS I DASHBOARDEN';
    if (filled.length > 0) {
      context += '\nIfyllt:\n' + filled.join('\n');
    }
    if (empty.length > 0) {
      context += '\nSaknas fortfarande:\n- ' + empty.join('\n- ');
    }
    context += '\n\nDitt jobb är att fylla ALLA sektioner. Styr samtalet mot de tomma områdena. Men byt inte ämne förrän du fått ett tillräckligt konkret svar på det du frågar om just nu.';
    return context;
  }

  async extractAndSummarizeData(userMessage, aiResponse) {
    if (!userMessage || userMessage.trim().length < 3) return null;

    const allData = this.currentData || {};

    // Bygg konversationskontext från de senaste meddelandena
    const recentMessages = this.conversationHistory.slice(-10).map(m => 
      `${m.role === 'user' ? 'ANVÄNDAREN' : 'AI-COACHEN'}: ${m.content}`
    ).join('\n');

    const analysisPrompt = `
SENASTE KONVERSATIONEN:
${recentMessages}

AI-COACHENS SENASTE SVAR: "${aiResponse}"

BEFINTLIG DATA I DASHBOARDEN:
${Object.keys(allData).map(key => {
  const value = allData[key];
  if (!value) return '';
  const displayValue = Array.isArray(value) ? value.join('; ') : value;
  return displayValue ? `${key}: ${displayValue}` : '';
}).filter(Boolean).join('\n') || 'Ingen data ännu'}

DIN UPPGIFT:
Analysera om AI-coachen i sitt senaste svar GODKÄNNER användarens information. Tecken på godkännande är:
- Bekräftande ord som "bra", "perfekt", "där har vi det", "det köper jag", "konkret", "vi kör på det"
- Att AI:n går vidare till en NY fråga/nytt område (då är den nöjd med föregående)
- Att AI:n sammanfattar vad de landat i

Om AI-coachen FORTFARANDE utmanar eller ber om förtydligande — då ska INGENTING sparas till dashboarden.

Svara ENDAST med valid JSON:
{
  "isRelevant": true/false,
  "reason": "Kort förklaring",
  "categories": [
    {
      "section": "targetAudience|challenges|success|learningGoals|motivation|behaviors|scenarios",
      "value": "sammanfattad text",
      "quality": "concrete|vague|incomplete"
    }
  ],
  "needsDeepening": true/false,
  "suggestedFollowUp": "Följdfråga om needsDeepening är true"
}`;

    const url = buildUrl();
    if (!url) return null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTH_HEADER]: API_KEY
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: analysisPrompt }
          ],
          max_completion_tokens: 400
        })
      });

      if (!response.ok) return null;

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;

      const parsed = JSON.parse(match[0]);
      if (!parsed.isRelevant) return null;

      return {
        categories: parsed.categories || [],
        needsDeepening: parsed.needsDeepening || false,
        suggestedFollowUp: parsed.suggestedFollowUp || null,
        reason: parsed.reason
      };
    } catch (error) {
      return null;
    }
  }

  async generateElearningSpec(dashboardData) {
    if (!BASE_URL || !API_KEY || !DEPLOYMENT || !API_VERSION || !PATH_TEMPLATE) {
      return { error: 'Konfiguration saknas. Kontrollera .env.' };
    }

    const url = buildUrl();
    if (!url) {
      return { error: 'Ogiltig URL.' };
    }

    // Inkludera konversationshistorik för rikare kontext
    const conversationContext = this.conversationHistory.length > 0
      ? '\n\nHela samtalet med beställaren (använd detta för att fånga nyanser och detaljer som inte ryms i dashboard-sammanfattningen):\n' +
        this.conversationHistory.map(m =>
          `${m.role === 'user' ? 'BESTÄLLAREN' : 'LEARNING DESIGNER'}: ${m.content}`
        ).join('\n')
      : '';

    const dataContext = Object.entries({
      'Målgrupp': dashboardData.targetAudience,
      'Nuvarande utmaningar': dashboardData.challenges,
      'Framgångskriterier': dashboardData.success,
      'Lärandemål': dashboardData.learningGoals,
      'Motivation': dashboardData.motivation,
      'Önskade beteenden': dashboardData.behaviors,
      'Konkreta scenarion': dashboardData.scenarios
    }).map(([key, value]) => {
      if (!value) return `${key}: (ej ifyllt)`;
      const display = Array.isArray(value) ? value.join('; ') : value;
      return `${key}: ${display}`;
    }).join('\n');

    const specSystemPrompt = `Du är en senior learning designer och e-learning-expert med 15+ års erfarenhet. Din uppgift är att generera ett KOMPLETT specifikationsdokument baserat på data du får.

KRITISKA REGLER:
- Skriv HELA dokumentet i ETT svar. Dela ALDRIG upp det.
- Ställ INGA frågor. Fråga ALDRIG användaren om de vill ha A eller B eller något annat.
- Skriv ALDRIG "Vill du att jag..." eller "Ska jag...". Bara producera dokumentet.
- Var INTE generisk. Allt ska vara specifikt kopplat till den data du fått.
- Dra smarta slutsatser, blomma ut, föreslå konkret innehåll.
- Tänk som att du lämnar över detta till en e-learning-producent som aldrig träffat beställaren — de ska kunna bygga utbildningen enbart utifrån detta dokument.
- Skriv på svenska. Använd ## för huvudrubriker och ### för underrubriker.`;

    const specPrompt = `Här är resultatet från behovsanalysen:
${dataContext}
${conversationContext}

---

Producera nu HELA dokumentet nedan utan att ställa några frågor. Skriv allt i ett enda svar:

## 1. Sammanfattning
3–4 meningar som fångar kärnan: vad är problemet, vem berörs, och vad ska utbildningen åstadkomma?

## 2. Målgrupp — djupdykning
- Vilka är de? (roll, erfarenhet, antal)
- Hur ofta stöter de på ämnet i vardagen?
- Vad kan de redan? Vad saknar de?
- Vad motiverar dem? Vad gör dem skeptiska till utbildning?
- Hur och när kommer de troligen göra utbildningen? (vid datorn, mobil, i lugn och ro, mellan möten?)

## 3. Önskade beteendeförändringar
Lista 3–5 konkreta, observerbara beteenden som deltagaren ska göra annorlunda efter utbildningen. Formulera som: "Istället för att [gammalt beteende], ska deltagaren [nytt beteende]."

## 4. Vanligaste misstagen idag
Lista 2–4 typiska misstag/felbeteenden som händer idag. För varje misstag:
- **Vad händer:** Beskriv beteendet
- **Varför det händer:** Rotorsaken (tidsbrist? okunskap? dålig vana? otydliga riktlinjer?)
- **Konsekvensen:** Vad blir resultatet av misstaget?

## 5. Scenariobank — 5 detaljerade case
Skapa 5 realistiska scenarion som representerar deltagarnas vardag. Dessa ska kunna användas direkt som case/övningar i e-learningen. För varje scenario:

### Scenario [nummer]: [kort titel]
- **Kontexten:** Beskriv situationen i 2–3 meningar. Var är personen? Vad har just hänt? Vem är inblandad?
- **Vad gör det svårt:** Vilka faktorer komplicerar beslutet? (tidspress, motstridiga intressen, otydlig info, social press etc.)
- **Gråzonen:** Finns det en aspekt där "rätt svar" inte är uppenbart? Beskriv den.
- **Vanligaste felvalet:** Vad gör de flesta idag? Varför känns det logiskt i stunden?
- **Bästa valet:** Vad borde de göra istället?
- **Feedbackpoäng:** 1–2 meningar som förklarar VARFÖR det bästa valet är bättre (denna text kan användas som feedback i utbildningen).
- **Svårighetsgrad:** Lätt / Medel / Svår

## 6. Övningsförslag
Föreslå 3–4 konkreta interaktiva övningar som passar för e-learning. För varje övning:
- **Typ:** (scenariobaserad fråga / drag-and-drop / reflektionsfråga / prioriteringsövning / rollspel / flervalsfråga etc.)
- **Beskrivning:** Vad ska deltagaren göra?
- **Koppling:** Vilket beteendemål tränar denna övning?
- **Exempelfråga eller uppgift:** Skriv ut ett konkret exempel på hur övningen kan se ut

## 7. Struktur och upplägg
- **Rekommenderat format:** (ren e-learning / blended / micro-learning / etc.)
- **Antal moduler:** Med kort rubrik och innehåll för varje
- **Tidsåtgång:** Per modul och totalt
- **Förslag på flöde:** I vilken ordning bör innehållet presenteras? Varför?
- **Ton och stil:** Hur ska utbildningen kännas? (seriös, lättsam, case-driven, berättande etc.)

## 8. Bedömning och uppföljning
- Hur kan vi mäta om deltagarna lärt sig? (quiz, scenario-test, etc.)
- Förslag på 2–3 frågor/uppgifter som kan användas som kunskapstest
- Hur kan vi följa upp efter utbildningen? (påminnelser, checklista, chefsstöd?)

## 9. Innehållsnoteringar till producent
Praktiska tips till den som ska bygga utbildningen:
- Vilka bilder/illustrationer/ikoner behövs?
- Behövs det expertcitat, policydokument eller annat referensmaterial?
- Vilka vanliga invändningar kan deltagare ha — och hur bemöter utbildningen dem?
- Fallgropar att undvika i produktionen`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTH_HEADER]: API_KEY
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: specSystemPrompt },
            { role: 'user', content: specPrompt }
          ],
          max_completion_tokens: 10000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `API error ${response.status}: ${errorText}` };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      return { spec: content };
    } catch (error) {
      return { error: `Tekniskt fel: ${error.message}` };
    }
  }
}

const aiService = new AIService();

export default aiService;
