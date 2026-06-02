# First Run Checklist - LocalOfficeAI v0.15.0

Usa questa checklist per il primo avvio su Windows.

## Prima di aprire Word

- [ ] Ollama e' installato.
- [ ] Almeno un modello Ollama e' disponibile.
- [ ] La tray app LocalOfficeAI e' stata avviata.
- [ ] L'icona tray compare nell'area di notifica.
- [ ] `local-bridge` risulta attivo.
- [ ] `addin-word dev-server` risulta attivo.
- [ ] L'endpoint AI locale e' corretto.

## Preparazione Word

- [ ] La cartella catalogo Word e' stata preparata con `Prepare-WordSideloadCatalog.ps1`.
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

## Limiti attuali

- [ ] Nessun inserimento diretto nel documento Word.
- [ ] Nessuna chiamata cloud.
- [ ] Provider cloud non attivi.
- [ ] Nessun installer definitivo one-click.
