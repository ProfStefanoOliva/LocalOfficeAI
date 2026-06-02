# Desktop Tray

La release `v0.12.0` introduce una prima fondazione prudente di tray app Windows per `LocalOfficeAI`.

## Obiettivo

Ridurre la necessita' di usare due finestre PowerShell visibili per:

- `local-bridge`
- dev-server di `addin-word`

La tray app non e' ancora un installer e non abilita l'avvio automatico con Windows.

## Requisiti

- Windows
- Node.js e npm disponibili
- Ollama installato e gia' avviato in locale su `http://localhost:11434`
- sideload dell'add-in Word ancora necessario tramite `addin-word/manifest.xml`

## Cartella del progetto

Il progetto della tray app si trova in:

- `desktop-tray/`

## Avvio in sviluppo

Dalla cartella `desktop-tray/`:

```bash
npm install
npm run build
npm run start
```

## Comportamento attuale

All'avvio:

- prova a ottenere il single instance lock;
- non apre una finestra principale;
- crea una icona tray;
- prova automaticamente ad avviare `local-bridge` e `addin-word` se non risultano gia' attivi;
- mostra un menu contestuale con:
  - stato locale;
  - avvio componenti;
  - arresto componenti;
  - riavvio componenti;
  - apertura cartella log;
  - apertura istruzioni;
  - uscita.

## Log

I log vengono salvati nella cartella `logs` di `app.getPath("userData")` di Electron.

La tray app mantiene file separati per:

- `local-bridge.log`
- `addin-word.log`

## Limiti attuali

- non e' presente un installer;
- non e' configurato l'autostart con Windows;
- non viene creato alcun servizio Windows;
- l'avvio automatico riguarda solo i componenti quando la tray app viene aperta manualmente, non l'avvio della tray con Windows;
- il controllo del dev-server dell'add-in resta prudente e basato sulla porta `3000`;
- l'icona tray riusa temporaneamente un asset PNG esistente del progetto e non un `.ico` dedicato.

## Flusso invariato

La tray app non modifica il flusso stabile dell'add-in:

Word -> selezione testo o richiesta libera -> profilo -> modello -> local-bridge -> Ollama -> anteprima -> copia negli appunti -> incolla manuale.
