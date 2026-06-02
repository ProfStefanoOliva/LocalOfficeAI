import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const defaultLocalAIBaseUrl = "http://localhost:11434";

export type LocalAISettings = {
  provider: "ollama-local";
  baseUrl: string;
  isDefault: boolean;
  isLocalhost: boolean;
};

type StoredLocalAISettings = {
  baseUrl?: unknown;
};

type LocalAISettingsPayload = {
  baseUrl?: unknown;
  endpoint?: unknown;
};

const settingsFilePath = join(__dirname, "..", ".local", "local-ai-settings.json");

function ensureSettingsDirectory(): void {
  mkdirSync(dirname(settingsFilePath), { recursive: true });
}

export function normalizeLocalAIBaseUrl(baseUrl: string): string {
  const trimmedValue = baseUrl.trim();

  if (trimmedValue.length === 0) {
    throw new Error("L'endpoint AI locale non puo' essere vuoto.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    throw new Error("L'endpoint AI locale deve essere un URL valido.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("L'endpoint AI locale deve usare http:// oppure https://.");
  }

  if (parsedUrl.pathname !== "/" || parsedUrl.search.length > 0 || parsedUrl.hash.length > 0) {
    throw new Error("L'endpoint AI locale deve indicare solo host e porta, senza path aggiuntivi.");
  }

  if (parsedUrl.username.length > 0 || parsedUrl.password.length > 0) {
    throw new Error("L'endpoint AI locale non deve contenere credenziali.");
  }

  return parsedUrl.origin;
}

export function parseLocalAISettingsBody(bodyText: string): { baseUrl: string } | { error: string } {
  if (bodyText.trim().length === 0) {
    return { error: "Il body JSON e' obbligatorio." };
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    return { error: "Il body deve essere un JSON valido." };
  }

  if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) {
    return { error: "Il body JSON deve essere un oggetto." };
  }

  const { baseUrl, endpoint } = parsedBody as LocalAISettingsPayload;
  const hasBaseUrl = baseUrl !== undefined;
  const hasEndpoint = endpoint !== undefined;

  if (!hasBaseUrl && !hasEndpoint) {
    return { error: "Il body deve contenere `baseUrl` oppure `endpoint`." };
  }

  if (hasBaseUrl && typeof baseUrl !== "string") {
    return { error: "Il campo `baseUrl`, se presente, deve essere una stringa." };
  }

  if (hasEndpoint && typeof endpoint !== "string") {
    return { error: "Il campo `endpoint`, se presente, deve essere una stringa." };
  }

  if (typeof baseUrl === "string" && typeof endpoint === "string" && baseUrl.trim() !== endpoint.trim()) {
    return { error: "I campi `baseUrl` ed `endpoint`, se presenti entrambi, devono coincidere." };
  }

  const candidateValue = typeof baseUrl === "string" ? baseUrl : (endpoint as string);
  return { baseUrl: candidateValue };
}

export function isLocalhostLocalAIBaseUrl(baseUrl: string): boolean {
  try {
    const parsedUrl = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
  } catch {
    return false;
  }
}

function readStoredBaseUrl(): string {
  if (!existsSync(settingsFilePath)) {
    return process.env.LOCALOFFICEAI_OLLAMA_URL?.trim() || defaultLocalAIBaseUrl;
  }

  try {
    const parsedSettings = JSON.parse(readFileSync(settingsFilePath, "utf-8")) as StoredLocalAISettings;

    if (typeof parsedSettings.baseUrl === "string") {
      return normalizeLocalAIBaseUrl(parsedSettings.baseUrl);
    }
  } catch {
    return defaultLocalAIBaseUrl;
  }

  return defaultLocalAIBaseUrl;
}

export function getLocalAISettings(): LocalAISettings {
  const baseUrl = readStoredBaseUrl();

  return {
    provider: "ollama-local",
    baseUrl,
    isDefault: baseUrl === defaultLocalAIBaseUrl,
    isLocalhost: isLocalhostLocalAIBaseUrl(baseUrl)
  };
}

export function saveLocalAISettings(baseUrl: string): LocalAISettings {
  const normalizedBaseUrl = normalizeLocalAIBaseUrl(baseUrl);

  ensureSettingsDirectory();
  writeFileSync(
    settingsFilePath,
    JSON.stringify(
      {
        baseUrl: normalizedBaseUrl
      },
      null,
      2
    ),
    "utf-8"
  );

  return getLocalAISettings();
}

export function resetLocalAISettings(): LocalAISettings {
  if (existsSync(settingsFilePath)) {
    rmSync(settingsFilePath, { force: true });
  }

  return getLocalAISettings();
}
