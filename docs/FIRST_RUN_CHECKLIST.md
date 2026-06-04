# First Run Checklist - LocalOfficeAI v0.15.3

Usa questa checklist per il primo avvio su Windows.

## Prima di aprire Word

- [ ] Ho letto `LEGGIMI_PRIMA.txt`.
- [ ] Ho eseguito `01_Verifica_prerequisiti.bat`.
- [ ] Ollama e' installato.
- [ ] Almeno un modello Ollama e' disponibile.
- [ ] Ho estratto completamente lo ZIP e non sto eseguendo file al suo interno.
- [ ] La tray app LocalOfficeAI e' stata avviata con `03_Avvia_LocalOfficeAI.bat` oppure `Start-LocalOfficeAI.bat`.
- [ ] L'icona tray compare nell'area di notifica.
- [ ] `local-bridge` risulta attivo.
- [ ] `addin-word dev-server` risulta attivo.
- [ ] L'endpoint AI locale e' corretto.

## Preparazione Word

- [ ] La cartella catalogo Word e' stata preparata con `02_Prepara_catalogo_Word.bat`.
- [ ] La cartella catalogo e' stata condivisa, se necessario.
- [ ] Il catalogo attendibile e' stato aggiunto in Word.
- [ ] Word e' stato chiuso e riaperto dopo l'aggiunta del catalogo.
- [ ] L'add-in `LocalOfficeAI` compare nella cartella condivisa.
- [ ] Il task pane si apre correttamente.

## Primo test funzionale

- [ ] Apri un documento Word di prova.
- [ ] Seleziona un breve testo.
- [ ] Premi `Leggi selezione`.
- [ ] Verifica che il testo compaia nel task pane.
- [ ] Scegli un modello leggero.
- [ ] Scegli il profilo desiderato.
- [ ] Genera anteprima.
- [ ] Verifica che l'anteprima compaia.
- [ ] Copia l'anteprima negli appunti.
- [ ] Incolla manualmente nel documento.

## Se qualcosa non funziona

- [ ] Controlla i log dalla tray app.
- [ ] Verifica che Ollama sia raggiungibile.
- [ ] Verifica che la porta `3210` sia attiva.
- [ ] Verifica che la porta `3000` sia attiva.
- [ ] Riavvia i componenti dalla tray.
- [ ] Se necessario, chiudi e riapri Word.
- [ ] Consulta `docs\TROUBLESHOOTING_WINDOWS.md`.

## Limiti attuali

- [ ] Nessun inserimento diretto nel documento Word.
- [ ] Nessuna chiamata cloud.
- [ ] Provider cloud non attivi.
- [ ] Nessun installer definitivo one-click.
