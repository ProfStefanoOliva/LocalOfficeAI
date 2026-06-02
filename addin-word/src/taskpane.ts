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

const bridgeGenerateUrl = "http://localhost:3210/ollama/generate";
const statusMessage = getRequiredElement("status-message", HTMLParagraphElement);
const selectionOutput = getRequiredElement("selection-output", HTMLPreElement);
const readSelectionButton = getRequiredElement("read-selection-button", HTMLButtonElement);
const userPromptInput = getRequiredElement("user-prompt", HTMLTextAreaElement);
const generatePreviewButton = getRequiredElement("generate-preview-button", HTMLButtonElement);
const previewStatusMessage = getRequiredElement("preview-status-message", HTMLParagraphElement);
const previewOutput = getRequiredElement("preview-output", HTMLPreElement);

let cachedSelectionText = "";

function showMessage(message: string): void {
  statusMessage.textContent = message;
  selectionOutput.hidden = true;
  selectionOutput.textContent = "";
}

function showSelection(text: string): void {
  statusMessage.textContent = "Testo selezionato letto correttamente.";
  selectionOutput.textContent = text;
  selectionOutput.hidden = false;
  cachedSelectionText = text;
}

function showPreviewMessage(message: string): void {
  previewStatusMessage.textContent = message;
  previewOutput.hidden = true;
  previewOutput.textContent = "";
}

function showPreviewResult(text: string): void {
  previewStatusMessage.textContent = "Anteprima generata correttamente.";
  previewOutput.textContent = text;
  previewOutput.hidden = false;
}

async function getCurrentSelectionText(): Promise<string> {
  return Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load("text");

    await context.sync();

    return selection.text.trim();
  });
}

async function readCurrentSelection(): Promise<void> {
  showMessage("Lettura della selezione in corso...");

  try {
    const text = await getCurrentSelectionText();

    if (text.length === 0) {
      showMessage("Nessun testo selezionato. Seleziona del testo in Word e riprova.");
      return;
    }

    showSelection(text);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore sconosciuto durante la lettura della selezione.";
    showMessage(`Impossibile leggere la selezione: ${message}`);
  }
}

function getUserFacingBridgeError(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("failed to fetch")) {
    return "Impossibile contattare il local-bridge su http://localhost:3210. Verifica che il servizio sia avviato.";
  }

  if (normalizedMessage.includes("ollama")) {
    return message;
  }

  return "La richiesta locale non e' andata a buon fine. Verifica che il local-bridge e Ollama siano avviati.";
}

async function generatePreview(): Promise<void> {
  const userPrompt = userPromptInput.value.trim();

  if (userPrompt.length === 0) {
    showPreviewMessage("Inserisci una richiesta prima di generare l'anteprima.");
    return;
  }

  showPreviewMessage("Preparazione dell'anteprima locale in corso...");

  let selectedText = "";

  try {
    selectedText = await getCurrentSelectionText();
  } catch {
    selectedText = "";
  }

  const sourceText = selectedText || cachedSelectionText;

  if (sourceText.length === 0) {
    showPreviewMessage(
      "Manca il testo selezionato. Seleziona del testo in Word oppure leggilo prima dal pannello."
    );
    return;
  }

  if (selectedText.length > 0) {
    showSelection(selectedText);
  }

  const bridgePrompt = [
    "Istruzione dell'utente:",
    userPrompt,
    "",
    "Testo selezionato:",
    sourceText
  ].join("\n");

  try {
    const response = await fetch(bridgeGenerateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: bridgePrompt
      })
    });

    const data = (await response.json()) as {
      error?: unknown;
      model?: unknown;
      response?: unknown;
    };

    if (!response.ok) {
      const message =
        typeof data.error === "string"
          ? data.error
          : "Errore locale durante la generazione dell'anteprima.";
      showPreviewMessage(getUserFacingBridgeError(message));
      return;
    }

    if (typeof data.response !== "string") {
      showPreviewMessage("Il local-bridge ha risposto senza un contenuto di anteprima valido.");
      return;
    }

    showPreviewResult(data.response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto.";
    showPreviewMessage(getUserFacingBridgeError(message));
  }
}

Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    showMessage("Questo add-in è disponibile solo in Microsoft Word.");
    readSelectionButton.disabled = true;
    generatePreviewButton.disabled = true;
    return;
  }

  readSelectionButton.addEventListener("click", () => {
    void readCurrentSelection();
  });

  generatePreviewButton.addEventListener("click", () => {
    void generatePreview();
  });
});
