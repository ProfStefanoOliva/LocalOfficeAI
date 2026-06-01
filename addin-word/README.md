# addin-word

Base tecnica minimale dell'add-in Word di LocalOfficeAI per la release `v0.1.0`, resa avviabile in locale per lo sviluppo.

## Contenuto

- task pane laterale con titolo `LocalOfficeAI`;
- pulsante `Leggi selezione`;
- lettura del testo selezionato nel documento Word;
- visualizzazione del testo selezionato nel pannello;
- messaggio chiaro quando non esiste una selezione testuale.

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

## Sideload generale in Microsoft Word

Procedura generale consigliata per test locali:

1. esegui `npm install`;
2. esegui `npm run build`;
3. esegui `npm run dev-cert` e accetta l'installazione del certificato di sviluppo quando richiesta;
4. esegui `npm run dev-server`;
5. apri Microsoft Word;
6. vai in `Inserisci` > `Componenti aggiuntivi` > `I miei componenti aggiuntivi` > `Carica componente aggiuntivo personale`;
7. seleziona il file `addin-word/manifest.xml`;
8. apri il task pane di `LocalOfficeAI` dalla ribbon;
9. seleziona testo nel documento e premi `Leggi selezione`.

Se Word segnala problemi di sicurezza del contenuto locale, verifica che il certificato di sviluppo sia stato installato e considerato attendibile dal sistema.

## Struttura

- `manifest.xml`: manifest Office Add-in per Word;
- `src/`: HTML, CSS e TypeScript del task pane;
- `assets/`: icone locali minime referenziate dal manifest;
- `scripts/`: script Node minimi per build, pulizia e server HTTPS locale.

## Limiti noti della fase

- il server locale serve solo file statici da `dist/` e non include hot reload;
- non è presente alcuna integrazione con Ollama, LM Studio o backend locali;
- l'add-in non modifica il documento Word e legge soltanto la selezione corrente;
- il sideload può variare leggermente in base alla versione di Word o al canale Microsoft 365 in uso;
- per il test locale HTTPS è necessario un certificato di sviluppo attendibile.
