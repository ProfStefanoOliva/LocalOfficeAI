import { createServer, IncomingMessage, ServerResponse } from "node:http";

const serviceName = "LocalOfficeAI Local Bridge";
const serviceVersion = "0.2.0";
const port = 3210;

type JsonObject = Record<string, unknown>;

function sendJson(response: ServerResponse, statusCode: number, payload: JsonObject): void {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
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

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const url = request.url ?? "/";

  if (method === "GET" && url === "/health") {
    sendJson(response, 200, {
      status: "ok",
      service: serviceName,
      version: serviceVersion
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

  sendJson(response, 404, {
    error: "Endpoint non trovato."
  });
});

server.listen(port, () => {
  console.log(`${serviceName} in ascolto su http://localhost:${port}`);
});
