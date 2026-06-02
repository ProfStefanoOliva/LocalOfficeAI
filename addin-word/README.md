# addin-word

Base tecnica minimale dell'add-in Word di LocalOfficeAI per la release `v0.4.0`, resa avviabile in locale per lo sviluppo e capace di mostrare un'anteprima generata tramite local-bridge e Ollama.

## Contenuto

- task pane laterale con titolo `LocalOfficeAI`;
- pulsante `Leggi selezione`;
- lettura del testo selezionato nel documento Word;
- visualizzazione del testo selezionato nel pannello;
- area prompt per una richiesta personalizzata;
- pulsante `Genera anteprima`;
- anteprima generata localmente tramite `http://localhost:3210/ollama/generate`;
- messaggio chiaro quando non esiste una selezione testuale o manca il prompt.

## Installazione dipendenze

```bash
npm install
```

## Build

```bash
npm run build
```

La build genera i file statici in `dist/`.

## Avvio server locale

Prima installa o rinnova il certificato di sviluppo per `https://localhost`:

```bash
npm run dev-cert
```

Poi avvia il server locale sulla porta `3000`:

```bash
npm run dev-server
```

Il server serve i file generati in `dist/` e usa HTTPS, in coerenza con `manifest.xml`.

Se `dist/` non esiste ancora, esegui prima `npm run build`.

## Prerequisiti per provare la v0.4.0

Per la prova completa servono tutti questi elementi locali:

1. il server HTTPS dell'add-in Word su `https://localhost:3000`;
2. il `local-bridge` avviato su `http://localhost:3210`;
3. Ollama attivo in locale su `http://localhost:11434`;
4. almeno un modello disponibile in Ollama, ad esempio `qwen2.5-coder:1.5b`.

## Avvio del local-bridge

Nel repository, dalla cartella `local-bridge/`:

```bash
npm run build
npm start
```

Puoi verificare rapidamente il bridge con:

```bash
curl http://localhost:3210/health
curl http://localhost:3210/ollama/health
```

## Sideload generale in Microsoft Word

Procedura generale consigliata per test locali:

1. esegui `npm install`;
2. esegui `npm run build`;
3. esegui `npm run dev-cert` e accetta l'installazione del certificato di sviluppo quando richiesta;
4. esegui `npm run dev-server`;
5. avvia il `local-bridge` e verifica che Ollama sia attivo;
6. apri Microsoft Word;
7. vai in `Inserisci` > `Componenti aggiuntivi` > `I miei componenti aggiuntivi` > `Carica componente aggiuntivo personale`;
8. seleziona il file `addin-word/manifest.xml`;
9. apri il task pane di `LocalOfficeAI` dalla ribbon;
10. seleziona testo nel documento e premi `Leggi selezione`;
11. inserisci una richiesta nell'area prompt, per esempio `riassumi il testo in modo chiaro`;
12. premi `Genera anteprima` e controlla l'area `Anteprima risultato`.

Se Word segnala problemi di sicurezza del contenuto locale, verifica che il certificato di sviluppo sia stato installato e considerato attendibile dal sistema.

## Struttura

- `manifest.xml`: manifest Office Add-in per Word;
- `src/`: HTML, CSS e TypeScript del task pane;
- `assets/`: icone locali minime referenziate dal manifest;
- `assets/`: icone locali PNG referenziate dal manifest;
- `scripts/`: script Node minimi per build, pulizia e server HTTPS locale.

## Limiti noti della fase

- il server locale serve solo file statici da `dist/` e non include hot reload;
- l'add-in invia il testo solo al `local-bridge` locale su `http://localhost:3210`;
- l'anteprima usa Ollama solo tramite il bridge locale;
- l'add-in non modifica il documento Word: questa fase mostra solo un'anteprima;
- il sideload può variare leggermente in base alla versione di Word o al canale Microsoft 365 in uso;
- per il test locale HTTPS è necessario un certificato di sviluppo attendibile.
- per la compatibilita' con la validazione del manifest e con il catalogo condiviso Word, le icone del manifest sono in formato PNG.
