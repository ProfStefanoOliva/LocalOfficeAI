# addin-word

Base tecnica minimale dell'add-in Word di LocalOfficeAI per la release `v0.1.0`.

## Contenuto

- task pane laterale con titolo `LocalOfficeAI`;
- pulsante `Leggi selezione`;
- lettura del testo selezionato nel documento Word;
- visualizzazione del testo selezionato nel pannello;
- messaggio chiaro quando non esiste una selezione testuale.

## Comandi

```bash
npm install
npm run build
```

La build genera i file statici in `dist/`.

## Struttura

- `manifest.xml`: manifest Office Add-in per Word;
- `src/`: HTML, CSS e TypeScript del task pane;
- `assets/`: icone locali minime referenziate dal manifest;
- `scripts/`: script Node minimi per build e pulizia.

## Nota attuale

Il manifest punta a `https://localhost:3000`, quindi per eseguire davvero l'add-in in Word serviranno in una fase successiva un piccolo server HTTPS locale e la procedura di sideload. In questa v0.1.0 è stata preparata solo la base tecnica e verificata la compilazione del frontend.
