# LocalOfficeAI

LocalOfficeAI è un progetto open source indipendente pensato per affiancare il lavoro su documenti Word tramite un add-in locale, usando modelli LLM locali tramite Ollama.

Il progetto è pensato per funzionare in locale, senza inviare il contenuto dei documenti a servizi cloud.

## Nota sui marchi

Microsoft Word, Microsoft Office, Microsoft 365 e Windows sono marchi di Microsoft Corporation. LocalOfficeAI è un progetto indipendente e non è affiliato, sponsorizzato o approvato da Microsoft.

Il riferimento a Word è usato solo per descrivere l'ambiente di utilizzo dell'add-in.

Nella release `v0.16.0` LocalOfficeAI introduce una prima `Sessione assistita` sperimentale legata al testo selezionato. Il flusso stabile `Anteprima singola` resta invariato: risultato locale, copia negli appunti e incolla manuale nel documento. L'endpoint AI locale resta configurabile, ma il `local-bridge` rimane su `http://localhost:3210`.

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

Uso consigliato per sviluppatori dal repository:

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

## Anteprima singola e Sessione assistita

LocalOfficeAI offre due modalita' locali distinte:

- `Anteprima singola`: modalita' rapida e orientata al risultato. Usa il testo letto o una richiesta libera, genera una sola risposta tramite `local-bridge` e lascia all'utente la copia manuale.
- `Sessione assistita`: modalita' sperimentale/alpha centrata sul testo selezionato. Dopo `Leggi selezione`, l'utente avvia esplicitamente una sessione; il task pane salva solo in memoria uno snapshot del testo selezionato e interpreta le richieste successive rispetto a quello snapshot.

Nella sessione assistita lo snapshot e' il riferimento operativo principale. Se l'utente chiede correzioni, riscritture, miglioramenti, riassunti o analisi, LocalOfficeAI deve usare il testo base gia' presente e produrre direttamente il testo elaborato, senza chiedere all'utente di fornire esempi o ripetere il testo.

Se il testo nel documento cambia, la sessione non cambia automaticamente. Per aggiornare il testo base bisogna premere `Leggi selezione` sulla nuova selezione e poi `Nuova sessione dalla selezione corrente`.

La cronologia della sessione contiene messaggi utente e risposte assistente, ma resta solo in memoria nel task pane: non viene salvata in file, `localStorage`, IndexedDB o altri storage persistenti, e puo' andare persa ricaricando il pannello.

Nessuna modalita' inserisce testo automaticamente nel documento Word. Le risposte restano copiabili manualmente dall'utente.

## Flusso consigliato per utente finale

Nella release portable `v0.16.0`, il flusso consigliato per un utente Windows non tecnico resta:

1. estrarre completamente lo ZIP;
2. non avviare file direttamente dentro lo ZIP;
3. aprire la cartella estratta;
4. eseguire `01_Verifica_prerequisiti.bat`;
5. se i prerequisiti sono OK, eseguire `02_Prepara_catalogo_Word.bat`;
6. seguire le istruzioni per Word;
7. eseguire `03_Avvia_LocalOfficeAI.bat` oppure `Start-LocalOfficeAI.bat`;
8. verificare che l'icona tray compaia;
9. aprire Word e caricare l'add-in.

Se vuoi lanciare manualmente gli script PowerShell, usa sempre il formato con bypass esplicito, ad esempio:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Test-LocalOfficeAI-Prerequisites.ps1
```

Evita invece l'avvio diretto di:

```powershell
.\tools\Test-LocalOfficeAI-Prerequisites.ps1
```

## Guida Windows e Word

Per la release `v0.16.0` sono disponibili guide dedicate:

- [Installazione Windows](docs/INSTALL_WINDOWS.md)
- [Configurazione Word con cartella condivisa](docs/WORD_SIDELOAD_WINDOWS.md)
- [First Run Checklist](docs/FIRST_RUN_CHECKLIST.md)
- [Troubleshooting Windows](docs/TROUBLESHOOTING_WINDOWS.md)
- [Desktop Tray](docs/desktop-tray.md)

## Packaging tray

Il packaging ereditato da `v0.15.3` resta prudente:

- produce una base portable della tray app;
- la cartella `release_candidates/LocalOfficeAI-v0.15.3` resta il riferimento gia' preparato per la prova portable precedente;
- puo' generare artefatti ZIP per Windows;
- non crea ancora un installer definitivo one-click;
- non abilita autostart con Windows;
- non introduce servizi Windows.
