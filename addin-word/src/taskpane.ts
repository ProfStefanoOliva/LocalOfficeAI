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

type WritingProfileId =
  | "neutro"
  | "didattico"
  | "formale"
  | "tecnico"
  | "accademico"
  | "sintetico"
  | "narrativo";

type WritingProfile = {
  label: string;
  instructions: string[];
};

const bridgeGenerateUrl = "http://localhost:3210/ollama/generate";
const bridgeHealthUrl = "http://localhost:3210/health";
const ollamaHealthUrl = "http://localhost:3210/ollama/health";
const ollamaModelsUrl = "http://localhost:3210/ollama/models";
const writingProfiles: Record<WritingProfileId, WritingProfile> = {
  neutro: {
    label: "Neutro",
    instructions: [
      "Rispondi alla richiesta dell'utente lavorando sul testo fornito.",
      "Mantieni il significato originale.",
      "Non aggiungere informazioni non presenti, salvo richiesta esplicita.",
      "Restituisci solo il testo finale, senza spiegazioni introduttive."
    ]
  },
  didattico: {
    label: "Didattico",
    instructions: [
      "Rendi il testo chiaro, ordinato e comprensibile a studenti.",
      "Usa un tono da docente.",
      "Evita frasi troppo lunghe.",
      "Mantieni accuratezza e semplicita'.",
      "Restituisci solo il testo finale."
    ]
  },
  formale: {
    label: "Formale",
    instructions: [
      "Usa un tono professionale e istituzionale.",
      "Migliora precisione, fluidita' e registro.",
      "Evita espressioni colloquiali.",
      "Mantieni il contenuto originale.",
      "Restituisci solo il testo finale."
    ]
  },
  tecnico: {
    label: "Tecnico",
    instructions: [
      "Usa un tono tecnico, preciso e asciutto.",
      "Mantieni termini specialistici.",
      "Riduci ambiguita'.",
      "Non semplificare eccessivamente se il testo e' destinato a utenti tecnici.",
      "Restituisci solo il testo finale."
    ]
  },
  accademico: {
    label: "Accademico",
    instructions: [
      "Usa un registro accademico.",
      "Migliora coesione, rigore e struttura argomentativa.",
      "Evita affermazioni non supportate dal testo.",
      "Non inventare fonti, dati o riferimenti.",
      "Restituisci solo il testo finale."
    ]
  },
  sintetico: {
    label: "Sintetico",
    instructions: [
      "Riduci il testo mantenendo le informazioni essenziali.",
      "Elimina ridondanze.",
      "Mantieni chiarezza e significato.",
      "Non aggiungere nuovi contenuti.",
      "Restituisci solo il testo finale."
    ]
  },
  narrativo: {
    label: "Narrativo",
    instructions: [
      "Migliora ritmo, fluidita' e resa espressiva.",
      "Mantieni il significato originale.",
      "Non trasformare il testo in modo eccessivo salvo richiesta esplicita.",
      "Usa uno stile piu' naturale e coinvolgente.",
      "Restituisci solo il testo finale."
    ]
  }
};

type BridgeHealthResponse = {
  status?: unknown;
  service?: unknown;
  version?: unknown;
};

type OllamaHealthResponse = {
  status?: unknown;
  service?: unknown;
  baseUrl?: unknown;
  error?: unknown;
};

type OllamaModelsResponse = {
  baseUrl?: unknown;
  models?: unknown;
  error?: unknown;
};

const statusMessage = getRequiredElement("status-message", HTMLParagraphElement);
const selectionOutput = getRequiredElement("selection-output", HTMLPreElement);
const bridgeStatusValue = getRequiredElement("bridge-status-value", HTMLSpanElement);
const ollamaStatusValue = getRequiredElement("ollama-status-value", HTMLSpanElement);
const modelStatusMessage = getRequiredElement("model-status-message", HTMLParagraphElement);
const refreshStatusButton = getRequiredElement("refresh-status-button", HTMLButtonElement);
const readSelectionButton = getRequiredElement("read-selection-button", HTMLButtonElement);
const writingProfileSelect = getRequiredElement("writing-profile", HTMLSelectElement);
const ollamaModelSelect = getRequiredElement("ollama-model", HTMLSelectElement);
const userPromptInput = getRequiredElement("user-prompt", HTMLTextAreaElement);
const generatePreviewButton = getRequiredElement("generate-preview-button", HTMLButtonElement);
const previewStatusMessage = getRequiredElement("preview-status-message", HTMLParagraphElement);
const previewOutput = getRequiredElement("preview-output", HTMLPreElement);
const copyPreviewButton = getRequiredElement("copy-preview-button", HTMLButtonElement);

let cachedSelectionText = "";
let cachedPreviewText = "";
let isBridgeReachable = false;
let isOllamaReachable = false;
let availableOllamaModels: string[] = [];
let selectedOllamaModel = "";

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

function setStatusChip(element: HTMLSpanElement, label: string, isActive: boolean): void {
  element.textContent = label;
  element.dataset.state = isActive ? "active" : "inactive";
}

function updateModelSelect(models: string[]): void {
  const previousSelection = selectedOllamaModel;
  ollamaModelSelect.innerHTML = "";

  if (models.length === 0) {
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "Nessun modello disponibile";
    ollamaModelSelect.appendChild(placeholderOption);
    ollamaModelSelect.disabled = true;
    selectedOllamaModel = "";
    return;
  }

  for (const model of models) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    ollamaModelSelect.appendChild(option);
  }

  ollamaModelSelect.disabled = false;
  selectedOllamaModel = models.includes(previousSelection) ? previousSelection : models[0];
  ollamaModelSelect.value = selectedOllamaModel;
}

function updateLocalStatusUi(): void {
  setStatusChip(bridgeStatusValue, isBridgeReachable ? "Attivo" : "Non raggiungibile", isBridgeReachable);
  setStatusChip(ollamaStatusValue, isOllamaReachable ? "Attivo" : "Non raggiungibile", isOllamaReachable);

  if (!isBridgeReachable) {
    modelStatusMessage.textContent = "Il local-bridge non e' raggiungibile su http://localhost:3210.";
    return;
  }

  if (!isOllamaReachable) {
    modelStatusMessage.textContent = "Ollama non e' raggiungibile tramite il local-bridge.";
    return;
  }

  if (availableOllamaModels.length === 0) {
    modelStatusMessage.textContent = "Ollama e' attivo, ma non risultano modelli disponibili.";
    return;
  }

  modelStatusMessage.textContent = `Modelli disponibili: ${availableOllamaModels.length}.`;
}

function getSelectedWritingProfileId(): WritingProfileId {
  const selectedValue = writingProfileSelect.value as WritingProfileId;

  if (selectedValue in writingProfiles) {
    return selectedValue;
  }

  return "neutro";
}

function buildPrompt(profileId: WritingProfileId, userPrompt: string, selectedText: string): string {
  const profile = writingProfiles[profileId];
  const profileInstructions = profile.instructions.map((instruction) => `- ${instruction}`).join("\n");

  // Keep prompt construction outside the UI handler so profile rules stay explicit,
  // readable, and easy to inspect during development and review.
  return [
    "Ruolo:",
    "Sei LocalOfficeAI e devi riscrivere o trasformare il testo fornito seguendo il profilo di scrittura selezionato.",
    "",
    `Profilo di scrittura: ${profile.label}`,
    "Istruzioni del profilo:",
    profileInstructions,
    "",
    "Richiesta dell'utente:",
    userPrompt,
    "",
    "Testo di partenza:",
    selectedText,
    "",
    "Output richiesto:",
    "Restituisci solo il testo finale richiesto, senza titoli, note o spiegazioni aggiuntive."
  ].join("\n");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const responseText = await response.text();
    const suffix = responseText.trim().length > 0 ? ` Dettagli: ${responseText.trim()}` : "";
    throw new Error(`HTTP ${response.status}.${suffix}`);
  }

  return (await response.json()) as T;
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

async function checkBridgeHealth(): Promise<boolean> {
  await fetchJson<BridgeHealthResponse>(bridgeHealthUrl);
  return true;
}

async function checkOllamaHealth(): Promise<boolean> {
  const data = await fetchJson<OllamaHealthResponse>(ollamaHealthUrl);
  return data.status === "ok";
}

async function loadOllamaModels(): Promise<string[]> {
  const data = await fetchJson<OllamaModelsResponse>(ollamaModelsUrl);

  if (!Array.isArray(data.models)) {
    return [];
  }

  return data.models.filter((model): model is string => typeof model === "string" && model.trim().length > 0);
}

async function refreshLocalStatus(): Promise<void> {
  refreshStatusButton.disabled = true;
  bridgeStatusValue.textContent = "Verifica in corso...";
  ollamaStatusValue.textContent = "Verifica in corso...";
  modelStatusMessage.textContent = "Aggiornamento stato locale in corso...";

  try {
    isBridgeReachable = await checkBridgeHealth();
  } catch (error) {
    console.warn("Controllo local-bridge non riuscito.", error);
    isBridgeReachable = false;
    isOllamaReachable = false;
    availableOllamaModels = [];
    updateModelSelect([]);
    updateLocalStatusUi();
    refreshStatusButton.disabled = false;
    return;
  }

  try {
    isOllamaReachable = await checkOllamaHealth();
  } catch (error) {
    console.warn("Controllo Ollama non riuscito.", error);
    isOllamaReachable = false;
    availableOllamaModels = [];
    updateModelSelect([]);
    updateLocalStatusUi();
    refreshStatusButton.disabled = false;
    return;
  }

  try {
    availableOllamaModels = await loadOllamaModels();
    updateModelSelect(availableOllamaModels);
  } catch (error) {
    console.warn("Caricamento modelli Ollama non riuscito.", error);
    availableOllamaModels = [];
    updateModelSelect([]);
  }

  updateLocalStatusUi();
  refreshStatusButton.disabled = false;
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
  const selectedProfileId = getSelectedWritingProfileId();

  if (cachedSelectionText.trim().length === 0) {
    showPreviewMessage("Seleziona un testo nel documento e premi Leggi selezione.");
    return;
  }

  if (userPrompt.length === 0) {
    showPreviewMessage("Scrivi una richiesta per generare l'anteprima.");
    return;
  }

  if (!isBridgeReachable) {
    showPreviewMessage("Il local-bridge non e' raggiungibile. Premi Aggiorna stato e verifica che il servizio sia avviato.");
    return;
  }

  if (!isOllamaReachable) {
    showPreviewMessage("Ollama non e' raggiungibile. Premi Aggiorna stato e verifica che il servizio sia attivo.");
    return;
  }

  if (availableOllamaModels.length === 0 && selectedOllamaModel.trim().length === 0) {
    showPreviewMessage("Nessun modello Ollama disponibile. Premi Aggiorna stato e verifica i modelli installati.");
    return;
  }

  showPreviewMessage("Preparazione dell'anteprima locale in corso...");

  const bridgePrompt = buildPrompt(selectedProfileId, userPrompt, cachedSelectionText);

  try {
    const response = await fetch(bridgeGenerateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: bridgePrompt,
        ...(selectedOllamaModel.trim().length > 0 ? { model: selectedOllamaModel } : {})
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

  refreshStatusButton.addEventListener("click", () => {
    void refreshLocalStatus();
  });

  ollamaModelSelect.addEventListener("change", () => {
    selectedOllamaModel = ollamaModelSelect.value.trim();
  });

  copyPreviewButton.addEventListener("click", () => {
    void copyGeneratedPreview();
  });

  updateModelSelect([]);
  updateLocalStatusUi();
  updateCopyPreviewButtonState();
  void refreshLocalStatus();
});
