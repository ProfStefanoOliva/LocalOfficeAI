# addin-word

Base tecnica minimale dell'add-in Word di LocalOfficeAI per la release `v0.7.0`, resa avviabile in locale per lo sviluppo, capace di mostrare un'anteprima generata tramite local-bridge e Ollama, con profili di scrittura controllati, stato locale del bridge/Ollama, scelta del modello e copia negli appunti per l'inserimento manuale nel documento.

## Contenuto

- task pane laterale con titolo `LocalOfficeAI`;
- pulsante `Leggi selezione`;
- lettura del testo selezionato nel documento Word;
- visualizzazione del testo selezionato nel pannello;
- sezione `Stato locale` con verifica di local-bridge e Ollama;
- pulsante `Aggiorna stato`;
- selezione del `Profilo di scrittura`;
- selezione del `Modello Ollama`;
- area prompt per una richiesta personalizzata;
- pulsante `Genera anteprima`;
- anteprima generata localmente tramite `http://localhost:3210/ollama/generate`;
- pulsante `Copia anteprima`;
- copia dell'anteprima negli appunti solo dopo clic esplicito dell'utente;
- incolla manuale del risultato nel documento nel punto desiderato;
- nessuna modifica automatica o distruttiva del documento;
- messaggio chiaro quando non esiste una selezione testuale o manca il prompt.

## Profili di scrittura

- `Neutro`: mantiene un comportamento vicino all'attuale, ma con istruzioni piu' ordinate e controllate.
- `Didattico`: privilegia chiarezza, ordine e comprensibilita' per studenti.
- `Formale`: usa un tono professionale e istituzionale.
- `Tecnico`: mantiene precisione, terminologia specialistica e riduzione delle ambiguita'.
- `Accademico`: privilegia rigore, coesione e struttura argomentativa.
- `Sintetico`: riduce ridondanze e conserva solo le informazioni essenziali.
- `Narrativo`: rende il testo piu' fluido, naturale e coinvolgente.

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

## Prerequisiti per provare la v0.7.0

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
10. premi `Aggiorna stato` e verifica che `Local-bridge` e `Ollama` risultino attivi;
11. controlla che il menu `Modello Ollama` venga popolato;
12. seleziona testo nel documento e premi `Leggi selezione`;
13. scegli un `Profilo di scrittura`;
14. scegli un `Modello Ollama`, se disponibile;
15. inserisci una richiesta nell'area prompt, per esempio `riassumi il testo in modo chiaro`;
16. premi `Genera anteprima` e controlla l'area `Anteprima risultato`;
17. verifica che il pulsante `Copia anteprima` si abiliti solo dopo una generazione valida;
18. premi `Copia anteprima`;
19. verifica il messaggio di conferma della copia;
20. incolla manualmente il testo nel documento Word nel punto desiderato.

La v0.7.0 mantiene il flusso non distruttivo introdotto in v0.5.0: dopo avere generato l'anteprima, l'utente la copia negli appunti dal task pane e la incolla manualmente dove preferisce.

Se `local-bridge` non e' raggiungibile oppure Ollama non e' attivo, il task pane mostra uno stato chiaro e blocca la generazione dell'anteprima finche' il problema non viene risolto.

La modifica diretta del documento e' rimandata a una fase successiva, perché nei test reali il task pane non ha dato un comportamento di inserimento sufficientemente affidabile.

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
- il task pane interroga `GET /health`, `GET /ollama/health` e `GET /ollama/models` per mostrare lo stato locale;
- il profilo di scrittura viene tradotto in istruzioni di prompt lato task pane prima della chiamata al bridge;
- il modello selezionato viene inviato a `POST /ollama/generate` quando disponibile;
- la copia negli appunti avviene solo dopo clic esplicito su `Copia anteprima`;
- l'utente incolla manualmente il risultato nel documento Word;
- la sostituzione della selezione non e' ancora implementata;
- il sideload può variare leggermente in base alla versione di Word o al canale Microsoft 365 in uso;
- per il test locale HTTPS è necessario un certificato di sviluppo attendibile.
- per la compatibilita' con la validazione del manifest e con il catalogo condiviso Word, le icone del manifest sono in formato PNG.
