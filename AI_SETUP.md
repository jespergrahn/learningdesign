# Så här får du AI:n att fungera

## Steg 1: Skaffa Google Gemini API-nyckel (GRATIS)

1. Gå till: https://makersuite.google.com/app/apikey
2. Logga in med ditt Google-konto
3. Klicka på "Create API Key"
4. Kopiera nyckeln

## Steg 2: Lägg till nyckeln i projektet

1. Skapa en fil som heter `.env` i rotmappen (samma nivå som package.json)
2. Lägg till följande rad:
   ```
   REACT_APP_GEMINI_API_KEY=din_kopierade_nyckel_här
   ```
3. Spara filen

## Steg 3: Starta om utvecklingsservern

```bash
npm start
```

Nu fungerar AI:n! 🎉

## Hur det fungerar

- AI:n guidar användaren genom alla frågor från High Level Design
- Svar fylls automatiskt i dashboarden
- Du kan fortfarande redigera manuellt
- Exportera till PDF när du är klar
