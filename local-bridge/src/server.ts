import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  checkOllamaHealth,
  generateWithOllama,
  getOllamaConfig,
  listOllamaModels
} from "./ollamaClient.js";
import {
  getLocalAISettings,
  parseLocalAISettingsBody,
  resetLocalAISettings,
  saveLocalAISettings
} from "./localAiSettings.js";

const serviceName = "LocalOfficeAI Local Bridge";
const serviceVersion = "0.16.0";
const port = 3210;
const allowedOrigin = "https://localhost:3000";

type JsonObject = Record<string, unknown>;

function sendJson(response: ServerResponse, statusCode: number, payload: JsonObject): void {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function collectRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });

    request.on("error", (error: Error) => {
      reject(error);
    });
  });
}

function parseEchoBody(bodyText: string): { text: string } | { error: string } {
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

  const { text } = parsedBody as { text?: unknown };

  if (typeof text !== "string") {
    return { error: "Il campo `text` e' obbligatorio e deve essere una stringa." };
  }

  return { text };
}

function parseOllamaGenerateBody(
  bodyText: string
): { prompt: string; model?: string } | { error: string } {
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

  const { prompt, model } = parsedBody as { prompt?: unknown; model?: unknown };

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return { error: "Il campo `prompt` e' obbligatorio e deve essere una stringa non vuota." };
  }

  if (model !== undefined && typeof model !== "string") {
    return { error: "Il campo `model`, se presente, deve essere una stringa." };
  }

  return {
    prompt: prompt.trim(),
    model: typeof model === "string" && model.trim().length > 0 ? model.trim() : undefined
  };
}

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const url = request.url ?? "/";
  const ollamaConfig = getOllamaConfig();

  if (method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Origin": allowedOrigin
    });
    response.end();
    return;
  }

  if (method === "GET" && url === "/health") {
    sendJson(response, 200, {
      status: "ok",
      service: serviceName,
      version: serviceVersion
    });
    return;
  }

  if (method === "GET" && url === "/settings/local-ai") {
    const localAISettings = getLocalAISettings();
    sendJson(response, 200, localAISettings);
    return;
  }

  if (method === "GET" && url === "/ollama/health") {
    const result = await checkOllamaHealth(ollamaConfig);

    if (!result.ok) {
      sendJson(response, 503, {
        status: "error",
        service: "ollama",
        baseUrl: result.baseUrl,
        error: result.error
      });
      return;
    }

    sendJson(response, 200, {
      status: "ok",
      service: "ollama",
      baseUrl: result.baseUrl
    });
    return;
  }

  if (method === "POST" && url === "/settings/local-ai") {
    try {
      const bodyText = await collectRequestBody(request);
      const parsedBody = parseLocalAISettingsBody(bodyText);

      if ("error" in parsedBody) {
        sendJson(response, 400, {
          error: parsedBody.error
        });
        return;
      }

      const localAISettings = saveLocalAISettings(parsedBody.baseUrl);
      sendJson(response, 200, localAISettings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      sendJson(response, 400, {
        error: message
      });
    }
    return;
  }

  if (method === "POST" && url === "/settings/local-ai/reset") {
    try {
      const localAISettings = resetLocalAISettings();
      sendJson(response, 200, localAISettings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      sendJson(response, 500, {
        error: `Impossibile ripristinare l'endpoint AI locale: ${message}`
      });
    }
    return;
  }

  if (method === "GET" && url === "/ollama/models") {
    const result = await listOllamaModels(ollamaConfig);

    if (!result.ok) {
      sendJson(response, 503, {
        error: result.error,
        baseUrl: result.baseUrl
      });
      return;
    }

    sendJson(response, 200, {
      baseUrl: result.baseUrl,
      models: result.models
    });
    return;
  }

  if (method === "POST" && url === "/echo") {
    try {
      const bodyText = await collectRequestBody(request);
      const parsedBody = parseEchoBody(bodyText);

      if ("error" in parsedBody) {
        sendJson(response, 400, {
          error: parsedBody.error
        });
        return;
      }

      sendJson(response, 200, {
        text: parsedBody.text
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      sendJson(response, 500, {
        error: `Impossibile leggere la richiesta: ${message}`
      });
    }
    return;
  }

  if (method === "POST" && url === "/ollama/generate") {
    try {
      const bodyText = await collectRequestBody(request);
      const parsedBody = parseOllamaGenerateBody(bodyText);

      if ("error" in parsedBody) {
        sendJson(response, 400, {
          error: parsedBody.error
        });
        return;
      }

      const result = await generateWithOllama(ollamaConfig, parsedBody.prompt, parsedBody.model);

      if (!result.ok) {
        sendJson(response, 503, {
          error: result.error
        });
        return;
      }

      sendJson(response, 200, {
        model: result.model,
        response: result.response
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      sendJson(response, 500, {
        error: `Impossibile elaborare la richiesta verso Ollama: ${message}`
      });
    }
    return;
  }

  sendJson(response, 404, {
    error: "Endpoint non trovato."
  });
});

server.listen(port, () => {
  console.log(`${serviceName} in ascolto su http://localhost:${port}`);
});
