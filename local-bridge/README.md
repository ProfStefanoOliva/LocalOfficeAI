# local-bridge

Base tecnica minimale del servizio locale `LocalOfficeAI` per la release `v0.2.0`.

In questa fase il bridge:

- espone un server HTTP locale su `http://localhost:3210`;
- offre l'endpoint `GET /health` per controllare lo stato del servizio;
- offre l'endpoint `POST /echo` per verificare lo scambio JSON locale;
- non comunica ancora con Word, Ollama, LM Studio o servizi cloud.

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

## Risposte attese

- `GET /health` restituisce uno stato `ok`, il nome servizio e la versione;
- `POST /echo` restituisce il testo ricevuto nel campo `text`;
- in caso di JSON mancante o non valido, il servizio restituisce errori JSON chiari con codice HTTP coerente.

## Struttura

- `src/server.ts`: server HTTP locale minimale;
- `scripts/build.mjs`: build TypeScript;
- `scripts/clean.mjs`: pulizia output compilato.
