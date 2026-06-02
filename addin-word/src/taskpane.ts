import {
  aiProviderDefinitions,
  buildPrompt,
  chooseOllamaModel,
  createViewState,
  defaultAIProviderId,
  defaultThemePreference,
  getAIProviderById,
  normalizeStoredPreferences,
  quickPromptTemplates,
  type AIProviderId,
  type QuickPromptId,
  type StoredPreferences,
  type TaskpaneViewName,
  type ThemePreference,
  type WritingProfileId,
  writingProfiles
} from "./taskpane-core.js";

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
const bridgeHealthUrl = "http://localhost:3210/health";
const ollamaHealthUrl = "http://localhost:3210/ollama/health";
const ollamaModelsUrl = "http://localhost:3210/ollama/models";
const preferencesStorageKey = "localofficeai.taskpane.preferences";

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
const taskpaneRoot = document.querySelector(".taskpane");
const mainView = getRequiredElement("main-view", HTMLDivElement);
const settingsView = getRequiredElement("settings-view", HTMLElement);
const infoView = getRequiredElement("info-view", HTMLElement);
const openSettingsButton = getRequiredElement("open-settings-button", HTMLButtonElement);
const openInfoButton = getRequiredElement("open-info-button", HTMLButtonElement);
const closeSettingsButton = getRequiredElement("close-settings-button", HTMLButtonElement);
const closeInfoButton = getRequiredElement("close-info-button", HTMLButtonElement);
const bridgeStatusValue = getRequiredElement("bridge-status-value", HTMLSpanElement);
const ollamaStatusValue = getRequiredElement("ollama-status-value", HTMLSpanElement);
const modelStatusMessage = getRequiredElement("model-status-message", HTMLParagraphElement);
const providerStatusMessage = getRequiredElement("provider-status-message", HTMLParagraphElement);
const refreshStatusButton = getRequiredElement("refresh-status-button", HTMLButtonElement);
const readSelectionButton = getRequiredElement("read-selection-button", HTMLButtonElement);
const clearSelectionButton = getRequiredElement("clear-selection-button", HTMLButtonElement);
const writingProfileSelect = getRequiredElement("writing-profile", HTMLSelectElement);
const defaultWritingProfileSelect = getRequiredElement("default-writing-profile", HTMLSelectElement);
const aiProviderSelect = getRequiredElement("ai-provider", HTMLSelectElement);
const ollamaModelSelect = getRequiredElement("ollama-model", HTMLSelectElement);
const themeSelect = getRequiredElement("theme-select", HTMLSelectElement);
const providerSummary = getRequiredElement("provider-summary", HTMLParagraphElement);
const providerSummaryBadge = getRequiredElement("provider-summary-badge", HTMLSpanElement);
const providerSummaryDetail = getRequiredElement("provider-summary-detail", HTMLParagraphElement);
const modelSummaryValue = getRequiredElement("model-summary-value", HTMLSpanElement);
const profileSummaryValue = getRequiredElement("profile-summary-value", HTMLSpanElement);
const userPromptInput = getRequiredElement("user-prompt", HTMLTextAreaElement);
const quickPromptButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-quick-prompt]"));
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
let selectedTheme: ThemePreference = defaultThemePreference;
let selectedAIProvider: AIProviderId = defaultAIProviderId;

function showMessage(message: string): void {
  statusMessage.textContent = message;
  selectionOutput.hidden = true;
  selectionOutput.textContent = "";
  updateClearSelectionButtonState();
}

function showSelection(text: string): void {
  statusMessage.textContent = "Testo selezionato letto correttamente.";
  selectionOutput.textContent = text;
  selectionOutput.hidden = false;
  cachedSelectionText = text;
  updateClearSelectionButtonState();
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

function updateClearSelectionButtonState(): void {
  clearSelectionButton.disabled = cachedSelectionText.trim().length === 0;
}

function clearStoredSelection(): void {
  cachedSelectionText = "";
  showMessage("Nessun testo selezionato. Puoi scrivere una richiesta libera oppure leggere una nuova selezione.");
}

function readStoredPreferences(): StoredPreferences {
  try {
    const rawPreferences = window.localStorage.getItem(preferencesStorageKey);

    if (!rawPreferences) {
      return {};
    }

    const parsed = JSON.parse(rawPreferences) as StoredPreferences;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (error) {
    console.warn("Lettura preferenze locali non riuscita.", error);
    return {};
  }
}

function writeStoredPreferences(): void {
  try {
    window.localStorage.setItem(
      preferencesStorageKey,
      JSON.stringify({
        theme: selectedTheme,
        writingProfile: writingProfileSelect.value,
        ollamaModel: selectedOllamaModel,
        aiProvider: selectedAIProvider
      })
    );
  } catch (error) {
    console.warn("Salvataggio preferenze locali non riuscito.", error);
  }
}

function applyTheme(theme: ThemePreference): void {
  selectedTheme = theme;
  document.body.dataset.theme = theme;
  themeSelect.value = theme;
  writeStoredPreferences();
}

function updateProviderSummary(): void {
  const provider = getAIProviderById(selectedAIProvider);
  const isActiveProvider = provider.availability === "active";
  const modelSummary =
    selectedOllamaModel.trim().length > 0
      ? selectedOllamaModel
      : availableOllamaModels.length > 0
        ? "Seleziona un modello nelle impostazioni"
        : "Nessun modello disponibile";
  const selectedProfile = writingProfiles[getSelectedWritingProfileId()];

  providerSummary.textContent = provider.label;
  providerSummaryDetail.textContent = provider.description;
  providerSummaryBadge.textContent = isActiveProvider ? "Attivo" : "Futuro";
  providerSummaryBadge.dataset.state = isActiveProvider ? "active" : "inactive";
  modelSummaryValue.textContent = modelSummary;
  profileSummaryValue.textContent = selectedProfile.label;
}

function applyQuickPrompt(promptId: QuickPromptId): void {
  const selectedPrompt = quickPromptTemplates.find((template) => template.id === promptId);

  if (!selectedPrompt) {
    return;
  }

  // Quick prompts are editable starting points: we prefill the request field
  // and leave the final wording under the user's control before generation.
  userPromptInput.value = selectedPrompt.promptText;
  userPromptInput.focus();
  userPromptInput.setSelectionRange(userPromptInput.value.length, userPromptInput.value.length);
}

function setViewVisibility(view: HTMLElement, isActive: boolean): void {
  view.hidden = !isActive;
  view.setAttribute("aria-hidden", String(!isActive));
  view.classList.toggle("taskpane-view--active", isActive);
  view.classList.toggle("is-hidden", !isActive);
}

function resetTaskpaneScroll(): void {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  if (taskpaneRoot instanceof HTMLElement) {
    taskpaneRoot.scrollTop = 0;
  }
}

function showView(viewName: TaskpaneViewName): void {
  const viewState = createViewState(viewName);

  setViewVisibility(mainView, viewState.main);
  setViewVisibility(settingsView, viewState.settings);
  setViewVisibility(infoView, viewState.info);
  resetTaskpaneScroll();
}

function setStatusChip(element: HTMLSpanElement, label: string, isActive: boolean): void {
  element.textContent = label;
  element.dataset.state = isActive ? "active" : "inactive";
}

function updateModelSelect(models: string[]): void {
  const previousSelection = selectedOllamaModel;
  const preferredModel = normalizeStoredPreferences(readStoredPreferences()).ollamaModel;
  ollamaModelSelect.innerHTML = "";

  if (models.length === 0) {
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "Nessun modello disponibile";
    ollamaModelSelect.appendChild(placeholderOption);
    ollamaModelSelect.disabled = true;
    selectedOllamaModel = "";
    updateProviderSummary();
    return;
  }

  for (const model of models) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    ollamaModelSelect.appendChild(option);
  }

  ollamaModelSelect.disabled = false;
  selectedOllamaModel = chooseOllamaModel(models, preferredModel, previousSelection);
  ollamaModelSelect.value = selectedOllamaModel;
  writeStoredPreferences();
  updateProviderSummary();
}

function updateLocalStatusUi(): void {
  setStatusChip(bridgeStatusValue, isBridgeReachable ? "Attivo" : "Non raggiungibile", isBridgeReachable);
  setStatusChip(ollamaStatusValue, isOllamaReachable ? "Attivo" : "Non raggiungibile", isOllamaReachable);

  const provider = getAIProviderById(selectedAIProvider);
  providerStatusMessage.textContent =
    provider.id === "ollama-local"
      ? "Ollama locale e' l'unico provider attivo nella v0.13.0. I provider cloud restano disabilitati."
      : `${provider.label} non e' ancora disponibile in questa release.`;

  if (!isBridgeReachable) {
    modelStatusMessage.textContent = "Il local-bridge non e' raggiungibile su http://localhost:3210.";
    updateProviderSummary();
    return;
  }

  if (!isOllamaReachable) {
    modelStatusMessage.textContent = "Ollama non e' raggiungibile tramite il local-bridge.";
    updateProviderSummary();
    return;
  }

  if (availableOllamaModels.length === 0) {
    modelStatusMessage.textContent = "Ollama e' attivo, ma non risultano modelli disponibili.";
    updateProviderSummary();
    return;
  }

  modelStatusMessage.textContent = `Modelli disponibili: ${availableOllamaModels.length}.`;
  updateProviderSummary();
}

function getSelectedWritingProfileId(): WritingProfileId {
  const selectedValue = writingProfileSelect.value as WritingProfileId;

  if (selectedValue in writingProfiles) {
    return selectedValue;
  }

  return "neutro";
}

function applyStoredPreferences(): void {
  const preferences = normalizeStoredPreferences(readStoredPreferences());

  selectedTheme = preferences.theme;
  selectedAIProvider = preferences.aiProvider;
  writingProfileSelect.value = preferences.writingProfile;
  defaultWritingProfileSelect.value = preferences.writingProfile;
  aiProviderSelect.value = selectedAIProvider;

  applyTheme(selectedTheme);
  updateProviderSummary();
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
  const hasSelectionText = cachedSelectionText.trim().length > 0;

  if (selectedAIProvider !== "ollama-local") {
    showPreviewMessage("Il provider selezionato non e' ancora disponibile. Usa Ollama locale nelle impostazioni.");
    return;
  }

  if (!hasSelectionText && userPrompt.length === 0) {
    showPreviewMessage("Scrivi una richiesta oppure seleziona un testo nel documento e premi Leggi selezione.");
    return;
  }

  if (hasSelectionText && userPrompt.length === 0) {
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

  clearSelectionButton.addEventListener("click", () => {
    clearStoredSelection();
  });

  generatePreviewButton.addEventListener("click", () => {
    void generatePreview();
  });

  refreshStatusButton.addEventListener("click", () => {
    void refreshLocalStatus();
  });

  openSettingsButton.addEventListener("click", () => {
    showView("settings");
  });

  openInfoButton.addEventListener("click", () => {
    showView("info");
  });

  closeSettingsButton.addEventListener("click", () => {
    showView("main");
  });

  closeInfoButton.addEventListener("click", () => {
    showView("main");
  });

  themeSelect.addEventListener("change", () => {
    const requestedTheme = themeSelect.value;

    if (requestedTheme === "dark" || requestedTheme === "light" || requestedTheme === "system") {
      applyTheme(requestedTheme);
    }
  });

  writingProfileSelect.addEventListener("change", () => {
    defaultWritingProfileSelect.value = writingProfileSelect.value;
    updateProviderSummary();
    writeStoredPreferences();
  });

  defaultWritingProfileSelect.addEventListener("change", () => {
    writingProfileSelect.value = defaultWritingProfileSelect.value;
    updateProviderSummary();
    writeStoredPreferences();
  });

  aiProviderSelect.addEventListener("change", () => {
    const requestedProvider = aiProviderSelect.value as AIProviderId;
    const provider = getAIProviderById(requestedProvider);

    if (provider.availability !== "active") {
      aiProviderSelect.value = selectedAIProvider;
      updateLocalStatusUi();
      return;
    }

    selectedAIProvider = requestedProvider;
    updateLocalStatusUi();
    writeStoredPreferences();
  });

  ollamaModelSelect.addEventListener("change", () => {
    selectedOllamaModel = ollamaModelSelect.value.trim();
    updateProviderSummary();
    writeStoredPreferences();
  });

  copyPreviewButton.addEventListener("click", () => {
    void copyGeneratedPreview();
  });

  for (const button of quickPromptButtons) {
    button.addEventListener("click", () => {
      const promptId = button.dataset.quickPrompt as QuickPromptId | undefined;

      if (!promptId) {
        return;
      }

      applyQuickPrompt(promptId);
    });
  }

  applyStoredPreferences();
  updateModelSelect([]);
  updateLocalStatusUi();
  updateClearSelectionButtonState();
  updateCopyPreviewButtonState();
  updateProviderSummary();
  showView("main");
  void refreshLocalStatus();
});
