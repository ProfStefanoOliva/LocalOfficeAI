# local-bridge

Base tecnica minimale del servizio locale `LocalOfficeAI` per la release `v0.3.0`.

In questa fase il bridge:

- espone un server HTTP locale su `http://localhost:3210`;
- offre l'endpoint `GET /health` per controllare lo stato del servizio;
- offre l'endpoint `POST /echo` per verificare lo scambio JSON locale;
- offre endpoint locali dedicati a Ollama;
- non comunica ancora con Word o LM Studio;
- non usa servizi cloud.

## Prerequisito Ollama

Per usare gli endpoint `/ollama/*`, Ollama deve essere installato e avviato in locale su:

```bash
http://localhost:11434
```

La scelta del modello segue questa priorita':

1. se `POST /ollama/generate` riceve un campo `model` valido, viene usato quello;
2. altrimenti, se e' impostata la variabile ambiente `LOCALOFFICEAI_OLLAMA_MODEL`, viene usato quel valore;
3. altrimenti il bridge usa il fallback locale leggero `qwen2.5-coder:1.5b`.

La variabile ambiente puo' essere impostata cosi':

```bash
LOCALOFFICEAI_OLLAMA_MODEL=qwen2.5-coder:1.5b
```

Se il modello scelto non e' disponibile in Ollama, il bridge restituisce un errore JSON chiaro e suggerisce di verificare `GET /ollama/models`.

Puoi anche cambiare l'endpoint locale di Ollama con:

```bash
LOCALOFFICEAI_OLLAMA_URL=http://localhost:11434
```

## Installazione

```bash
npm install
```

## Verifica tipi

```bash
npm run typecheck
```

## Build

```bash
npm run build
```

La build genera l'output compilato in `dist/`.

## Avvio

```bash
npm start
```

Il servizio ascolta sulla porta `3210`.

## Verifica che Ollama sia attivo

Con il bridge avviato:

```bash
curl http://localhost:3210/ollama/health
```

Se Ollama non e' in esecuzione, il bridge restituisce un errore JSON chiaro con HTTP `503`.

## Test manuale

Controllo stato:

```bash
curl http://localhost:3210/health
```

Echo JSON:

```bash
curl -X POST http://localhost:3210/echo ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Ciao LocalOfficeAI\"}"
```

Elenco modelli Ollama:

```bash
curl http://localhost:3210/ollama/models
```

Generazione testuale minima con il modello predefinito:

```bash
curl -X POST http://localhost:3210/ollama/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Scrivi una frase breve di test.\"}"
```

Generazione con modello esplicito:

```bash
curl -X POST http://localhost:3210/ollama/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Scrivi una frase breve di test.\",\"model\":\"qwen2.5-coder:1.5b\"}"
```

## Risposte attese

- `GET /health` restituisce uno stato `ok`, il nome servizio e la versione;
- `POST /echo` restituisce il testo ricevuto nel campo `text`;
- `GET /ollama/health` verifica se Ollama risponde localmente;
- `GET /ollama/models` restituisce l'elenco dei modelli disponibili;
- `POST /ollama/generate` restituisce una risposta JSON pulita con `model` e `response`;
- in caso di JSON mancante o non valido, il servizio restituisce errori JSON chiari con codice HTTP coerente.

## Struttura

- `src/server.ts`: server HTTP locale minimale;
- `src/ollamaClient.ts`: client Ollama locale e configurazione base;
- `scripts/build.mjs`: build TypeScript;
- `scripts/clean.mjs`: pulizia output compilato.
