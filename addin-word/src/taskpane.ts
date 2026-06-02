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
const copyPreviewButton = getRequiredElement("copy-preview-button", HTMLButtonElement);

let cachedSelectionText = "";
let cachedPreviewText = "";

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

function clearPreviewState(): void {
  previewOutput.hidden = true;
  previewOutput.textContent = "";
  cachedPreviewText = "";
  updateCopyPreviewButtonState();
}

function showPreviewMessage(message: string, clearPreview = true): void {
  previewStatusMessage.textContent = message;

  if (clearPreview) {
    clearPreviewState();
  }
}

function showPreviewResult(text: string): void {
  previewStatusMessage.textContent = "Anteprima generata correttamente.";
  previewOutput.textContent = text;
  previewOutput.hidden = false;
  cachedPreviewText = text;
  updateCopyPreviewButtonState();
}

function updateCopyPreviewButtonState(): void {
  copyPreviewButton.disabled = cachedPreviewText.trim().length === 0;
}

async function readCurrentSelectionText(): Promise<string> {
  const selectionText = await Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.load("text");

    await context.sync();

    const currentSelection = selection.text.trim();

    if (currentSelection.length === 0) {
      throw new Error("NO_SELECTION");
    }
    return currentSelection;
  });

  return selectionText;
}

async function copyPreviewWithClipboardApi(previewText: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("CLIPBOARD_API_UNAVAILABLE");
  }

  await navigator.clipboard.writeText(previewText);
}

function copyPreviewWithExecCommand(previewText: string): void {
  const temporaryTextarea = document.createElement("textarea");
  temporaryTextarea.value = previewText;
  temporaryTextarea.setAttribute("readonly", "true");
  temporaryTextarea.style.position = "fixed";
  temporaryTextarea.style.top = "-9999px";
  temporaryTextarea.style.left = "-9999px";
  document.body.appendChild(temporaryTextarea);
  temporaryTextarea.focus();
  temporaryTextarea.select();

  try {
    const copySucceeded = document.execCommand("copy");

    if (!copySucceeded) {
      throw new Error("EXEC_COMMAND_COPY_FAILED");
    }
  } finally {
    document.body.removeChild(temporaryTextarea);
  }
}

async function copyGeneratedPreview(): Promise<void> {
  if (cachedPreviewText.trim().length === 0) {
    showPreviewMessage("Genera prima un'anteprima.", false);
    return;
  }

  try {
    await copyPreviewWithClipboardApi(cachedPreviewText);
    previewStatusMessage.textContent = "Anteprima copiata negli appunti. Incollala nel documento nel punto desiderato.";
  } catch (clipboardError) {
    console.warn("Copia tramite navigator.clipboard non riuscita, provo il fallback execCommand.", clipboardError);

    try {
      copyPreviewWithExecCommand(cachedPreviewText);
      previewStatusMessage.textContent = "Anteprima copiata negli appunti. Incollala nel documento nel punto desiderato.";
    } catch (fallbackError) {
      console.error("Copia dell'anteprima non riuscita.", fallbackError);
      showPreviewMessage("Impossibile copiare l'anteprima. Seleziona manualmente il testo dell'anteprima e copialo.", false);
    }
  }
}

async function readCurrentSelection(): Promise<void> {
  showMessage("Lettura della selezione in corso...");

  try {
    const text = await readCurrentSelectionText();
    showSelection(text);
    clearPreviewState();
    previewStatusMessage.textContent = "Genera un'anteprima usando il testo letto e una richiesta personalizzata.";
  } catch (error) {
    if (error instanceof Error && error.message === "NO_SELECTION") {
      showMessage("Seleziona un testo nel documento e premi Leggi selezione.");
      return;
    }

    showMessage("Impossibile leggere la selezione corrente nel documento.");
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

  if (cachedSelectionText.trim().length === 0) {
    showPreviewMessage("Seleziona un testo nel documento e premi Leggi selezione.");
    return;
  }

  if (userPrompt.length === 0) {
    showPreviewMessage("Scrivi una richiesta per generare l'anteprima.");
    return;
  }

  showPreviewMessage("Preparazione dell'anteprima locale in corso...");

  const bridgePrompt = [
    "Istruzione dell'utente:",
    userPrompt,
    "",
    "Testo selezionato:",
    cachedSelectionText
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
    copyPreviewButton.disabled = true;
    return;
  }

  readSelectionButton.addEventListener("click", () => {
    void readCurrentSelection();
  });

  generatePreviewButton.addEventListener("click", () => {
    void generatePreview();
  });

  copyPreviewButton.addEventListener("click", () => {
    void copyGeneratedPreview();
  });

  updateCopyPreviewButtonState();
});
