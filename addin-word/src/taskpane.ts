function getRequiredElement<T extends HTMLElement>(
  elementId: string,
  elementType: { new (): T }
): T {
  const element = document.getElementById(elementId);

  if (!(element instanceof elementType)) {
    throw new Error(`Elemento richiesto non trovato: ${elementId}`);
  }

  return element;
}

const statusMessage = getRequiredElement("status-message", HTMLParagraphElement);
const selectionOutput = getRequiredElement("selection-output", HTMLPreElement);
const readSelectionButton = getRequiredElement("read-selection-button", HTMLButtonElement);

function showMessage(message: string): void {
  statusMessage.textContent = message;
  selectionOutput.hidden = true;
  selectionOutput.textContent = "";
}

function showSelection(text: string): void {
  statusMessage.textContent = "Testo selezionato letto correttamente.";
  selectionOutput.textContent = text;
  selectionOutput.hidden = false;
}

async function readCurrentSelection(): Promise<void> {
  showMessage("Lettura della selezione in corso...");

  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");

      await context.sync();

      const text = selection.text.trim();

      if (text.length === 0) {
        showMessage("Nessun testo selezionato. Seleziona del testo in Word e riprova.");
        return;
      }

      showSelection(text);
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore sconosciuto durante la lettura della selezione.";
    showMessage(`Impossibile leggere la selezione: ${message}`);
  }
}

Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    showMessage("Questo add-in è disponibile solo in Microsoft Word.");
    readSelectionButton.disabled = true;
    return;
  }

  readSelectionButton.addEventListener("click", () => {
    void readCurrentSelection();
  });
});
