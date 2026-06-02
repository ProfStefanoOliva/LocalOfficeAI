# Configurazione Word con cartella condivisa su Windows

Questa guida spiega come caricare LocalOfficeAI in Word tramite catalogo di cartella condivisa. E' una soluzione di sideload/test per Windows, non una distribuzione enterprise finale.

## Nota sui marchi

Microsoft Word, Microsoft Office, Microsoft 365 e Windows sono marchi di Microsoft Corporation. LocalOfficeAI e' un progetto indipendente e non e' affiliato, sponsorizzato o approvato da Microsoft.

Il riferimento a Word e' usato solo per descrivere l'ambiente di utilizzo dell'add-in.

## 1. Prepara la cartella catalogo

Metodo consigliato:

1. Apri PowerShell nella root del progetto o della release candidate.
2. Esegui:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Prepare-WordSideloadCatalog.ps1
```

Lo script:

- crea una cartella utente simile a `Documenti\LocalOfficeAI\OfficeAddinCatalog`;
- copia il file `manifest.xml`;
- stampa il percorso da usare nei passaggi successivi;
- non modifica registry, firewall o condivisioni SMB.

## 2. Condividi la cartella in Windows

Se Word richiede un catalogo condiviso:

1. Apri Esplora file.
2. Vai alla cartella catalogo preparata.
3. Clic destro -> `Proprieta'`.
4. Apri la scheda `Condivisione`.
5. Usa `Condividi...` oppure `Condivisione avanzata`.
6. Condividi la cartella in modo leggibile dal tuo utente Windows.
7. Annota il percorso di rete UNC mostrato da Windows, per esempio:

```text
\\NOME-PC\OfficeAddinCatalog
```

Se non puoi condividere la cartella automaticamente, fermati qui e crea la condivisione manualmente.

## 3. Aggiungi il catalogo attendibile in Word

1. Apri Word.
2. Vai in `File`.
3. Apri `Opzioni`.
4. Apri `Centro protezione`.
5. Apri `Impostazioni Centro protezione`.
6. Apri `Cataloghi componenti aggiuntivi attendibili`.
7. Nel campo `Catalog Url`, inserisci il percorso condiviso della cartella.
8. Seleziona `Show in Menu` / `Mostra nel menu`.
9. Conferma l'aggiunta del catalogo.
10. Chiudi completamente Word.
11. Riapri Word.

## 4. Aggiungi LocalOfficeAI da cartella condivisa

1. In Word, vai in `Home`.
2. Apri `Add-ins` / `Componenti aggiuntivi`.
3. Apri `Advanced` / `Avanzate`.
4. Vai a `Shared Folder` / `Cartella condivisa`.
5. Seleziona `LocalOfficeAI`.
6. Aggiungi il componente aggiuntivo.
7. Apri il task pane.

## 5. Primo test rapido

1. Verifica che la tray app sia attiva.
2. Verifica che `local-bridge` e `addin-word dev-server` siano attivi.
3. Verifica che Ollama sia raggiungibile.
4. In Word, seleziona un testo breve.
5. Premi `Leggi selezione`.
6. Scegli un modello leggero.
7. Genera anteprima.
8. Copia negli appunti.
9. Incolla manualmente nel documento.

## Problemi comuni

### Word mostra errore sul componente aggiuntivo

- verifica che la tray sia attiva;
- verifica che la porta `3000` sia raggiungibile;
- riavvia il dev-server dalla tray;
- chiudi e riapri Word.

### La cartella condivisa non compare

- verifica di avere davvero condiviso la cartella;
- usa il percorso UNC, non il semplice percorso locale;
- chiudi e riapri Word dopo avere aggiunto il catalogo.

### Il manifest non e' visibile

- verifica che nella cartella catalogo esista `manifest.xml`;
- verifica che il file sia stato copiato dallo script;
- riesegui `Prepare-WordSideloadCatalog.ps1` se necessario.

### Ollama non e' raggiungibile

- avvia Ollama;
- controlla l'endpoint AI locale nelle impostazioni di LocalOfficeAI;
- usa `Aggiorna stato`.

### Modello troppo pesante o errore di memoria

- prova un modello piu' leggero;
- chiudi altri programmi pesanti;
- verifica le risorse RAM e GPU disponibili.

### Certificato HTTPS o dev-server

- in sviluppo locale, Word puo' richiedere fiducia verso il certificato del dev-server;
- usa i passaggi gia' previsti dal progetto per il dev certificate dell'add-in.

### Cache Office da svuotare

- chiudi Word;
- riprova dopo riapertura;
- se il task pane resta incoerente, pulisci la cache Office secondo le procedure di sviluppo gia' usate nel progetto.

### Porta 3000 o 3210 occupata

- controlla se un'altra istanza e' gia' attiva;
- usa `Arresta componenti` e poi `Riavvia componenti`;
- controlla i log dalla tray.

## Limiti dichiarati

- questa procedura e' una soluzione prudente di sideload su Windows;
- non e' ancora distribuzione centralizzata Microsoft 365;
- non e' ancora un installer definitivo one-click;
- i provider cloud restano disabilitati;
- non vengono usate API key;
- non vengono effettuate chiamate cloud.
