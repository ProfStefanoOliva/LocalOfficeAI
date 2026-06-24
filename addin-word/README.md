# addin-word

Add-in Word di LocalOfficeAI per la release `v0.16.0`, avviabile in locale per lo sviluppo, capace di mostrare un'anteprima generata tramite local-bridge e Ollama e di avviare una prima `Sessione assistita` sperimentale legata allo snapshot del testo selezionato. Restano presenti profili di scrittura controllati, prompt rapidi, stato locale del bridge/Ollama nelle impostazioni, scelta del provider AI, endpoint AI locale configurabile, scelta del modello, impostazioni locali, vista informazioni, copia negli appunti per l'inserimento manuale nel documento e test automatici sulla logica consolidata.

## Nota sui marchi

Microsoft Word, Microsoft Office, Microsoft 365 e Windows sono marchi di Microsoft Corporation. LocalOfficeAI e' un progetto indipendente e non e' affiliato, sponsorizzato o approvato da Microsoft.

Il riferimento a Word e' usato solo per descrivere l'ambiente di utilizzo dell'add-in.

## Contenuto

- task pane laterale con titolo `LocalOfficeAI`;
- pulsante `Leggi selezione`;
- lettura del testo selezionato nel documento Word;
- visualizzazione del testo selezionato nel pannello;
- pulsante `Cancella selezione` per rimuovere solo il testo memorizzato nel pannello;
- selezione del `Profilo di scrittura`;
- riepilogo compatto di `Provider AI`, modello corrente ed endpoint AI attivo nella vista principale;
- sezione `Prompt rapidi` con richieste precompilate modificabili dall'utente;
- pulsante `⚙️` per aprire la vista `Impostazioni`;
- pulsante `❓` per aprire la vista `Informazioni`;
- area prompt per una richiesta personalizzata;
- pulsante `Genera anteprima`;
- anteprima generata localmente tramite `http://localhost:3210/ollama/generate`;
- pulsante `Copia anteprima`;
- sezione `Sessione assistita` distinta dall'anteprima singola;
- pulsante `Avvia sessione assistita` per fissare in memoria lo snapshot del testo selezionato;
- pulsante `Nuova sessione dalla selezione corrente` per aggiornare esplicitamente il testo base;
- cronologia in memoria con messaggi utente e risposte assistente;
- pulsante `Copia risposta` su ogni risposta assistente;
- pulsante `Cancella sessione`;
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

## Prompt rapidi

- `Riscrivi`
- `Sintetizza`
- `Espandi`
- `Correggi`
- `Spiega`
- `Rendi piu' formale`
- `Rendi piu' didattico`

I prompt rapidi compilano il campo della richiesta con un testo iniziale coerente con l'azione scelta. Il testo resta sempre modificabile manualmente prima di premere `Genera anteprima`.

LocalOfficeAI genera anteprime singole orientate al risultato e non e' ancora una chat multi-turno: i prompt sono quindi costruiti per chiedere direttamente un output finale, evitando domande di chiarimento quando il testo disponibile consente una migliore ipotesi prudente.

## Sessione assistita

La `Sessione assistita` di `v0.16.0` e' una modalita' dialogica sperimentale/alpha distinta da `Genera anteprima`.

Funziona cosi':

1. l'utente seleziona testo in Word;
2. preme `Leggi selezione`;
3. preme `Avvia sessione assistita`;
4. il task pane salva solo in memoria uno snapshot del testo letto;
5. ogni richiesta inviata nella sessione viene interpretata rispetto a quello snapshot;
6. la risposta resta nel task pane e puo' essere copiata con `Copia risposta`.

Se l'utente cambia selezione o modifica il documento, la sessione attiva non cambia automaticamente. Per aggiornare il testo base bisogna leggere la nuova selezione e premere `Nuova sessione dalla selezione corrente`.

La cronologia della sessione resta solo in memoria nel task pane: non viene salvata in `localStorage`, `sessionStorage`, IndexedDB, file o storage del bridge. Se il task pane viene ricaricato, la sessione puo' andare persa.

La sessione assistita usa lo stesso endpoint locale `POST /ollama/generate` gia' usato dall'anteprima. Non introduce nuovi endpoint, persistenza lato server, API key o chiamate cloud.

Quando la richiesta chiede correzione, revisione, riscrittura, miglioramento, sintesi o analisi, il prompt della sessione considera il testo base come fonte primaria e chiede un risultato concreto prima di tutto. La sessione puo' restare dialogica, ma non deve chiedere all'utente di fornire il testo quando lo snapshot e' gia' disponibile.

`Genera anteprima` resta la modalita' rapida, singola e orientata al risultato: il relativo prompt continua a chiedere di non fare domande inutili. Nella `Sessione assistita`, invece, una domanda di chiarimento e' accettabile solo quando e' davvero necessaria per evitare una risposta fuorviante.

## Impostazioni e informazioni

- `⚙️ Impostazioni`: apre una vista interna al task pane che contiene:
  - `Stato locale` di `local-bridge` e `Ollama`;
  - pulsante `Aggiorna stato`;
  - selezione del `Motore AI / Provider AI`;
  - selezione del `Modello Ollama`;
  - selezione del `Profilo predefinito`;
  - scelta del tema (`Sistema`, `Scuro`, `Chiaro`);
  - note privacy essenziali.
- `❓ Informazioni`: apre una vista interna al task pane con credits, versione corrente, privacy, componenti principali e riepilogo degli ultimi aggiornamenti.
- Le preferenze vengono salvate in locale nel browser/WebView del task pane e comprendono tema, provider AI, profilo di scrittura e ultimo modello Ollama selezionato quando disponibile.

## Provider AI

La base provider multipli resta prudente:

- `Ollama locale`: unico provider attivo e realmente operativo;
- `OpenAI-compatible`: placeholder futuro, disabilitato;
- `Claude`: placeholder futuro, disabilitato;
- `DeepSeek e compatibili`: placeholder futuro, disabilitato.

In questa release:

- non vengono introdotte chiamate cloud;
- non vengono richieste o salvate API key;
- il testo continua a essere inviato solo al bridge locale e a Ollama su `localhost`.

## Endpoint AI locale configurabile

L'endpoint AI locale usato dal `local-bridge` si configura in `⚙️ Impostazioni`.

Valore predefinito:

```bash
http://localhost:11434
```

Esempi supportati:

- `http://localhost:11434`
- `http://127.0.0.1:11434`
- `http://192.168.1.50:11434`
- `http://nome-server-lan:11434`

L'endpoint viene salvato dal `local-bridge`, non come API key e non come configurazione cloud. Se usi un endpoint non `localhost` / `127.0.0.1`, il task pane mostra un avviso privacy chiaro: il testo potra' essere inviato a un altro dispositivo della rete locale.

## Installazione dipendenze

```bash
npm install
```

## Build

```bash
npm run build
```

La build genera i file statici in `dist/`.

## Test automatici

E' disponibile una base prudente di test automatici per la logica pura del task pane:

- builder dei prompt;
- prompt della sessione assistita;
- stato puro della sessione assistita;
- prompt rapidi;
- normalizzazione preferenze locali;
- selezione logica della vista attiva.

Esegui i test con:

```bash
npm run test
```

I test usano un runner Node minimale basato su `node:assert/strict` su moduli TypeScript gia' compilati, così restano leggeri, rapidi e indipendenti dal rendering reale di Word.

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

## Prerequisiti per provare la v0.16.0

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
10. apri `⚙️`, premi `Aggiorna stato` e verifica che `Local-bridge` e `Ollama` risultino attivi;
11. nella vista `Impostazioni`, controlla che `Motore AI` resti su `Ollama locale`;
12. se necessario, modifica `Endpoint AI locale / Ollama`, poi usa `Salva endpoint` oppure `Ripristina predefinito`;
13. verifica l'eventuale avviso privacy se l'endpoint non e' `localhost` o `127.0.0.1`;
14. controlla che il menu `Modello Ollama` venga popolato in base all'endpoint configurato;
15. se vuoi, nella stessa vista scegli anche tema e profilo predefinito;
16. se vuoi, apri `❓` per consultare credits e informazioni del progetto;
17. seleziona testo nel documento e premi `Leggi selezione`;
18. scegli un `Profilo di scrittura`;
19. scegli un `Modello Ollama`, se disponibile;
20. inserisci una richiesta nell'area prompt, per esempio `riassumi il testo in modo chiaro`;
21. se vuoi, usa un pulsante della sezione `Prompt rapidi` per precompilare la richiesta e poi rifiniscila manualmente;
22. premi `Genera anteprima` e controlla l'area `Anteprima risultato`;
23. verifica che il pulsante `Copia anteprima` si abiliti solo dopo una generazione valida;
24. premi `Copia anteprima`;
25. verifica il messaggio di conferma della copia;
26. incolla manualmente il testo nel documento Word nel punto desiderato;
27. per provare la sessione assistita, mantieni o rileggi una selezione e premi `Avvia sessione assistita`;
28. scrivi una richiesta nella sezione `Sessione assistita` e premi `Invia nella sessione assistita`;
29. verifica che la cronologia mostri messaggio utente e risposta assistente;
30. usa `Copia risposta` per copiare manualmente una risposta;
31. cambia selezione in Word e verifica che la sessione non cambi finche' non premi `Nuova sessione dalla selezione corrente`;
32. usa `Cancella sessione` per rimuovere la cronologia in memoria.

La v0.16.0 mantiene il flusso non distruttivo introdotto in v0.5.0: dopo avere generato l'anteprima o una risposta assistita, l'utente la copia negli appunti dal task pane e la incolla manualmente dove preferisce.

LocalOfficeAI puo' lavorare in due modalita':

1. su testo selezionato, leggendo il contenuto da Word e combinandolo con profilo, modello e richiesta utente;
2. come richiesta libera senza testo selezionato, usando comunque profilo, modello e impostazioni correnti.

I prompt rapidi funzionano in entrambe le modalita': sia con testo selezionato sia come richiesta libera senza testo selezionato.

`Cancella selezione` rimuove solo il testo memorizzato nel pannello e non modifica in alcun modo il documento Word.

`Cancella sessione` rimuove solo la cronologia e lo snapshot della sessione assistita in memoria.

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
- il task pane interroga `GET /health`, `GET /ollama/health` e `GET /ollama/models` dalla vista `Impostazioni` per mostrare lo stato locale;
- il task pane usa anche `GET /settings/local-ai`, `POST /settings/local-ai` e `POST /settings/local-ai/reset` per leggere e salvare l'endpoint AI locale tramite il bridge;
- il profilo di scrittura viene tradotto in istruzioni di prompt lato task pane prima della chiamata al bridge;
- la sessione assistita costruisce un prompt lato task pane con testo base, profilo, richiesta corrente e breve cronologia precedente;
- il modello selezionato viene inviato a `POST /ollama/generate` quando disponibile;
- tema, provider, profilo e modello selezionato vengono salvati come preferenze locali del task pane;
- l'endpoint AI locale non viene salvato nel task pane: la persistenza e' gestita dal `local-bridge`;
- la cronologia della sessione assistita non viene salvata nel task pane, nel bridge o su disco;
- i provider cloud futuri sono mostrati solo come placeholder disabilitati;
- la copia negli appunti avviene solo dopo clic esplicito su `Copia anteprima`;
- la copia delle risposte assistite avviene solo dopo clic esplicito su `Copia risposta`;
- l'utente incolla manualmente il risultato nel documento Word;
- la sostituzione della selezione non e' ancora implementata;
- il sideload può variare leggermente in base alla versione di Word o al canale Microsoft 365 in uso;
- per il test locale HTTPS è necessario un certificato di sviluppo attendibile.
- per la compatibilita' con la validazione del manifest e con il catalogo condiviso Word, le icone del manifest sono in formato PNG.
