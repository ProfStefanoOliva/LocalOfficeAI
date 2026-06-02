import { defaultLocalAIBaseUrl, getLocalAISettings } from "./localAiSettings.js";

const defaultModel = "qwen2.5-coder:1.5b";

export type OllamaConfig = {
  baseUrl: string;
  defaultModel: string;
};

type OllamaTagResponse = {
  models?: Array<{
    name?: unknown;
  }>;
};

type OllamaGenerateResponse = {
  response?: unknown;
  model?: unknown;
  done?: unknown;
};

export type OllamaHealthResult =
  | {
      ok: true;
      baseUrl: string;
    }
  | {
      ok: false;
      baseUrl: string;
      error: string;
    };

export type OllamaModelsResult =
  | {
      ok: true;
      baseUrl: string;
      models: string[];
    }
  | {
      ok: false;
      baseUrl: string;
      error: string;
    };

export type OllamaGenerateResult =
  | {
      ok: true;
      model: string;
      response: string;
    }
  | {
      ok: false;
      error: string;
    };

export function getOllamaConfig(): OllamaConfig {
  const localAISettings = getLocalAISettings();

  return {
    baseUrl: localAISettings.baseUrl || process.env.LOCALOFFICEAI_OLLAMA_URL?.trim() || defaultLocalAIBaseUrl,
    defaultModel: process.env.LOCALOFFICEAI_OLLAMA_MODEL?.trim() || defaultModel
  };
}

function buildUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const responseText = await response.text();
    const suffix = responseText.trim().length > 0 ? ` Dettagli: ${responseText.trim()}` : "";
    throw new Error(`Ollama ha risposto con HTTP ${response.status}.${suffix}`);
  }

  return (await response.json()) as T;
}

function getConnectionErrorMessage(baseUrl: string, error: unknown): string {
  if (error instanceof Error) {
    return `Impossibile completare la richiesta verso Ollama su ${baseUrl}. Verifica che il servizio sia avviato, che il modello richiesto sia disponibile e consulta GET /ollama/models per l'elenco dei modelli locali. Dettagli: ${error.message}`;
  }

  return `Impossibile completare la richiesta verso Ollama su ${baseUrl}. Verifica che il servizio sia avviato, che il modello richiesto sia disponibile e consulta GET /ollama/models per l'elenco dei modelli locali.`;
}

export async function checkOllamaHealth(config: OllamaConfig): Promise<OllamaHealthResult> {
  try {
    await fetchJson<OllamaTagResponse>(buildUrl(config.baseUrl, "/api/tags"));
    return {
      ok: true,
      baseUrl: config.baseUrl
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl: config.baseUrl,
      error: getConnectionErrorMessage(config.baseUrl, error)
    };
  }
}

export async function listOllamaModels(config: OllamaConfig): Promise<OllamaModelsResult> {
  try {
    const data = await fetchJson<OllamaTagResponse>(buildUrl(config.baseUrl, "/api/tags"));
    const models =
      data.models
        ?.map((model) => (typeof model.name === "string" ? model.name : null))
        .filter((modelName): modelName is string => modelName !== null) ?? [];

    return {
      ok: true,
      baseUrl: config.baseUrl,
      models
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl: config.baseUrl,
      error: getConnectionErrorMessage(config.baseUrl, error)
    };
  }
}

export async function generateWithOllama(
  config: OllamaConfig,
  prompt: string,
  model?: string
): Promise<OllamaGenerateResult> {
  const selectedModel = model?.trim() || config.defaultModel;

  try {
    const data = await fetchJson<OllamaGenerateResponse>(buildUrl(config.baseUrl, "/api/generate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt,
        stream: false
      })
    });

    if (typeof data.response !== "string") {
      return {
        ok: false,
        error: "Ollama ha risposto senza un testo valido."
      };
    }

    return {
      ok: true,
      model: selectedModel,
      response: data.response
    };
  } catch (error) {
    return {
      ok: false,
      error: getConnectionErrorMessage(config.baseUrl, error)
    };
  }
}
