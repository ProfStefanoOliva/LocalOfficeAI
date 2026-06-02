# LocalOfficeAI

LocalOfficeAI è un progetto open source per la creazione di un add-in locale per Microsoft Office, inizialmente per Word, capace di usare modelli LLM locali tramite Ollama.

Il progetto è pensato per funzionare in locale, senza inviare il contenuto dei documenti a servizi cloud.

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
- se Ollama non e' raggiungibile su `http://localhost:11434`, il launcher si ferma e chiede di avviare Ollama;
- il flusso stabile resta invariato: anteprima locale -> copia negli appunti -> incolla manuale nel documento.
