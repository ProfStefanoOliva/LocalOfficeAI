LocalOfficeAI - README rapido per pacchetto portable
====================================================

1. Apri prima:
   LEGGIMI_PRIMA.txt

2. Verifica i prerequisiti:
   01_Verifica_prerequisiti.bat

3. Prepara il catalogo Word:
   02_Prepara_catalogo_Word.bat

4. Avvia LocalOfficeAI:
   03_Avvia_LocalOfficeAI.bat
   oppure Start-LocalOfficeAI.bat

5. Segui la guida completa:
   docs\WORD_SIDELOAD_WINDOWS.md

6. Primo test suggerito:
   - avvia Ollama
   - avvia la tray
   - apri Word
   - leggi una selezione breve
   - genera anteprima
   - copia negli appunti
   - incolla manualmente

Se vedi errori:
- docs\TROUBLESHOOTING_WINDOWS.md
- docs\INSTALL_WINDOWS.md
- docs\FIRST_RUN_CHECKLIST.md

Se vuoi usare PowerShell manualmente, usa sempre:
powershell -ExecutionPolicy Bypass -File .\tools\Test-LocalOfficeAI-Prerequisites.ps1
