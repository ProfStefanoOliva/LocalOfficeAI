# Troubleshooting Windows - LocalOfficeAI v0.16.0

Questa guida raccoglie i controlli piu' utili per un PC bersaglio pulito.

## Comandi rapidi da provare in PowerShell

```powershell
node --version
npm --version
ollama --version
ollama list
Test-NetConnection localhost -Port 11434
Test-NetConnection localhost -Port 3210
Test-NetConnection localhost -Port 3000
```

## Come capire se Node.js manca

Se `node --version` fallisce o mostra un errore tipo `node non riconosciuto`, Node.js LTS non e' installato oppure non e' nel PATH.

In questa alpha portable, Node.js e npm sono prerequisiti necessari.

## Come capire se Ollama manca

Se `ollama --version` fallisce, la CLI di Ollama non e' disponibile nel PATH.

Se `Test-NetConnection localhost -Port 11434` fallisce, Ollama non sta rispondendo sulla porta standard.

## Come capire se non ci sono modelli installati

Se `ollama list` restituisce una lista vuota oppure mostra un errore, manca almeno un modello locale.

Per questa alpha portable sono consigliati:

- `qwen2.5-coder:1.5b`
- `qwen2.5-coder:3b`

## Se il modello e' troppo grande

- prova un modello piu' leggero;
- chiudi altri programmi pesanti;
- verifica RAM e risorse GPU disponibili;
- riprova con `qwen2.5-coder:1.5b`.

## Se Word non vede il catalogo

- verifica di avere eseguito `02_Prepara_catalogo_Word.bat` oppure `powershell -ExecutionPolicy Bypass -File .\tools\Prepare-WordSideloadCatalog.ps1`;
- verifica che `manifest.xml` sia presente nella cartella catalogo;
- verifica il percorso condiviso configurato in Word;
- chiudi e riapri Word.

## Se la tray non parte

- esegui `01_Verifica_prerequisiti.bat`;
- verifica che `portable\localofficeai-desktop-tray-win32-x64\LocalOfficeAI Tray.exe` esista;
- prova a eseguire `03_Avvia_LocalOfficeAI.bat` oppure `Start-LocalOfficeAI.bat`;
- se necessario, apri la cartella log dalla tray quando disponibile.

## Errore: l'esecuzione di script e' disabilitata

Se Windows mostra un messaggio simile a `L'esecuzione di script e' disabilitata nel sistema in uso`, non lanciare direttamente un file `.ps1` con:

```powershell
.\tools\Test-LocalOfficeAI-Prerequisites.ps1
```

Usa invece uno dei wrapper `.bat` nella root del pacchetto, oppure lancia manualmente lo script cosi':

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Test-LocalOfficeAI-Prerequisites.ps1
```

Lo stesso approccio vale anche per `Prepare-WordSideloadCatalog.ps1` e gli altri script PowerShell inclusi nella release.

## Errore: pwsh non riconosciuto

Nella release `v0.16.0`, i launcher usano `powershell.exe` come fallback sicuro e non dipendono da `pwsh`.

Se vedi ancora un vecchio messaggio `pwsh non e' riconosciuto`, assicurati di usare i file aggiornati `03_Avvia_LocalOfficeAI.bat` o `Start-LocalOfficeAI.bat` presenti nella release `v0.16.0`.

## Manifest non trovato

Nella release portable, il file `manifest.xml` deve stare nella root del pacchetto estratto.

`Prepare-WordSideloadCatalog.ps1` in `v0.16.0` cerca il manifest in quest'ordine:

1. percorso esplicito passato con `-ManifestPath`;
2. `manifest.xml` nella root del pacchetto portable;
3. `addin-word\manifest.xml` nel repository di sviluppo;
4. `packages\addin-word\manifest.xml`, se presente.

Non e' necessario copiare manualmente cartelle come `addin-word` nella root della release portable.

## Se compare un errore JavaScript Electron

- verifica di stare usando il layout corretto del pacchetto estratto;
- verifica che nella root ci siano `manifest.xml`, `packages`, `portable`, `tools`;
- controlla i log di:
  - `local-bridge.log`
  - `addin-word.log`
- ripeti la prova dopo una nuova estrazione del pacchetto in una cartella pulita.

## Se la porta 3210 non si apre

- verifica `node --version` e `npm --version`;
- controlla se `local-bridge` e' stato avviato dalla tray;
- controlla il file `local-bridge.log`;
- verifica che la porta non sia gia' occupata.

## Se la porta 3000 non si apre

- verifica `node --version` e `npm --version`;
- controlla il file `addin-word.log`;
- verifica che la porta non sia gia' occupata.

## Limiti dichiarati

- non c'e' ancora un installer one-click definitivo;
- non c'e' autostart con Windows;
- non ci sono provider cloud attivi;
- non ci sono API key;
- il documento Word non viene modificato direttamente.
