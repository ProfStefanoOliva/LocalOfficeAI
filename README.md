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
