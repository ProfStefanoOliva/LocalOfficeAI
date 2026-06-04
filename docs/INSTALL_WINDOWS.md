# Installazione Windows di LocalOfficeAI v0.15.3

Questa release irrobustisce la distribuzione alpha portable della tray app, i launcher e la procedura guidata per Word su Windows.

## Nota sui marchi

Microsoft Word, Microsoft Office, Microsoft 365 e Windows sono marchi di Microsoft Corporation. LocalOfficeAI e' un progetto indipendente e non e' affiliato, sponsorizzato o approvato da Microsoft.

Il riferimento a Word e' usato solo per descrivere l'ambiente di utilizzo dell'add-in.

## Cosa include v0.15.3

- tray app Electron per LocalOfficeAI;
- packaging portable in formato cartella/ZIP, non ancora installer definitivo;
- script di supporto per preparare il catalogo sideload di Word;
- documentazione passo passo per utenti Windows non tecnici.

Per questa release, il percorso piu' semplice da provare e' la cartella `release_candidates/LocalOfficeAI-v0.15.3`, che mette insieme:

- tray packaged in `portable`;
- `local-bridge` e `addin-word` in `packages`;
- documentazione;
- script di supporto.

## Prerequisiti

Prima di iniziare verifica di avere:

1. Windows con Microsoft Word desktop installato.
2. [Node.js](https://nodejs.org/) installato.
3. Ollama installato.
4. Almeno un modello Ollama disponibile.
5. Accesso al repository o alla cartella release candidate locale preparata.

Comandi PowerShell utili per un PC bersaglio:

```powershell
node --version
npm --version
ollama --version
ollama list
Test-NetConnection localhost -Port 11434
Test-NetConnection localhost -Port 3210
Test-NetConnection localhost -Port 3000
```

## Flusso consigliato su PC bersaglio

Se hai una release candidate locale preparata:

1. Estrai completamente lo ZIP.
2. Non avviare file direttamente dentro lo ZIP.
3. Apri la cartella estratta.
4. Esegui `01_Verifica_prerequisiti.bat`.
5. Se i prerequisiti sono OK, esegui `02_Prepara_catalogo_Word.bat`.
6. Segui le istruzioni per Word.
7. Esegui `03_Avvia_LocalOfficeAI.bat` oppure `Start-LocalOfficeAI.bat`.
8. Controlla che compaia l'icona LocalOfficeAI nell'area di notifica di Windows.

Nota prudenziale:

- il file ZIP generato da Electron Forge e' la base portable della sola tray app;
- per un test locale completo di v0.15.3 e' preferibile usare la release candidate locale preparata, che include anche i componenti Node necessari.

Se stai lavorando dal repository:

1. Apri `desktop-tray`.
2. Esegui `npm run build`.
3. Esegui `npm run make` per creare il pacchetto ZIP portable.
4. In alternativa, per sviluppo, esegui `npm run start`.

Prima del primo avvio su PC bersaglio e' consigliato usare il wrapper:

```powershell
01_Verifica_prerequisiti.bat
```

Se vuoi eseguire manualmente lo script PowerShell, usa sempre:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Test-LocalOfficeAI-Prerequisites.ps1
```

## Cosa deve comparire

Quando la tray parte:

- l'icona deve comparire nell'area di notifica;
- il menu deve mostrare `Stato LocalOfficeAI`;
- la tray prova automaticamente ad avviare:
  - `local-bridge`;
  - `addin-word` dev-server.

## Come verificare che la tray sia attiva

Apri il menu con clic destro sull'icona e controlla:

- `Ollama`: raggiungibile o non raggiungibile;
- `local-bridge`: attivo o non attivo;
- `addin-word dev-server`: attivo o non attivo.

## Se Ollama non e' attivo

La tray non blocca l'avvio degli altri componenti. Devi:

1. avviare Ollama;
2. attendere qualche secondo;
3. usare `Aggiorna stato` dal menu tray.

## Se local-bridge o addin-word dev-server non sono attivi

1. Apri il menu tray.
2. Usa `Avvia componenti`.
3. Se ancora non partono, usa `Apri cartella log`.
4. Controlla i log di:
   - `local-bridge.log`
   - `addin-word.log`
5. Se serve, consulta anche:
   - `docs/TROUBLESHOOTING_WINDOWS.md`

## Importante

- Questa release non crea un installer definitivo.
- Questa release non configura l'avvio automatico con Windows.
- Questa release non crea un servizio Windows.
- LocalOfficeAI non modifica registry o firewall.
- Il flusso stabile resta: anteprima -> copia negli appunti -> incolla manuale.
