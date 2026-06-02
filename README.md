# LocalOfficeAI

LocalOfficeAI è un progetto open source indipendente pensato per affiancare il lavoro su documenti Word tramite un add-in locale, usando modelli LLM locali tramite Ollama.

Il progetto è pensato per funzionare in locale, senza inviare il contenuto dei documenti a servizi cloud.

## Nota sui marchi

Microsoft Word, Microsoft Office, Microsoft 365 e Windows sono marchi di Microsoft Corporation. LocalOfficeAI è un progetto indipendente e non è affiliato, sponsorizzato o approvato da Microsoft.

Il riferimento a Word è usato solo per descrivere l'ambiente di utilizzo dell'add-in.

Nella release `v0.15.0` LocalOfficeAI aggiunge una prima fondazione di packaging portable della tray app e una guida piu' chiara per il sideload di Word su Windows. L'endpoint AI locale resta configurabile, ma il `local-bridge` rimane su `http://localhost:3210`.

## Obiettivo iniziale

La prima fase prevede un add-in Word basato su Office.js e TypeScript, con task pane laterale capace di leggere il testo selezionato e mostrarlo all'utente.

## Struttura prevista

- addin-word/: add-in Word basato su Office.js e TypeScript
- local-bridge/: bridge locale Node.js/TypeScript verso Ollama
- shared/: tipi e logiche condivise
- docs/: documentazione tecnica
- examples/: documenti e scenari di test
- privacy/: note su privacy e sicurezza
- packaging/: script futuri di pacchettizzazione

## Stato

Repository iniziale in preparazione.

## Avvio rapido locale su Windows

Per ridurre l'avvio manuale in piu' finestre PowerShell, e' disponibile un launcher locale prudente:

- script PowerShell versionato: `tools/Start-LocalOfficeAI.ps1`
- wrapper di comodita': `Start-LocalOfficeAI.bat`

Uso consigliato su Windows:

1. verifica che Ollama sia installato e gia' avviato localmente;
2. dal repository, esegui `Start-LocalOfficeAI.bat`
   oppure `powershell -ExecutionPolicy Bypass -File .\tools\Start-LocalOfficeAI.ps1`;
3. il launcher controlla `node`, `npm` e la raggiungibilita' di Ollama;
4. se necessario, apre finestre PowerShell separate per:
   - `local-bridge`
   - dev-server di `addin-word`
5. poi l'utente continua in Word tramite sideload dell'add-in.

Note importanti:

- il launcher non e' un installer completo;
- il launcher non crea un servizio Windows;
- il launcher non modifica firewall, registry o impostazioni di sistema;
- se l'endpoint AI locale configurato nel bridge non e' raggiungibile, il launcher o la tray mostreranno lo stato non attivo;
- il flusso stabile resta invariato: anteprima locale -> copia negli appunti -> incolla manuale nel documento.

## Guida Windows e Word

Per la release `v0.15.0` sono disponibili guide dedicate:

- [Installazione Windows](docs/INSTALL_WINDOWS.md)
- [Configurazione Word con cartella condivisa](docs/WORD_SIDELOAD_WINDOWS.md)
- [First Run Checklist](docs/FIRST_RUN_CHECKLIST.md)
- [Desktop Tray](docs/desktop-tray.md)

## Packaging tray

Il packaging introdotto in `v0.15.0` e' prudente:

- produce una base portable della tray app;
- la cartella `release_candidates/LocalOfficeAI-v0.15.0` resta il modo piu' semplice per una prova locale completa;
- puo' generare artefatti ZIP per Windows;
- non crea ancora un installer definitivo one-click;
- non abilita autostart con Windows;
- non introduce servizi Windows.
