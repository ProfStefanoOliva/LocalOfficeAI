import { createServer } from "node:https";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import devCerts from "office-addin-dev-certs";

const projectRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(projectRoot, "dist");
const port = 3000;

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"]
]);

if (!existsSync(distDir)) {
  console.error("La cartella dist non esiste. Esegui prima `npm run build`.");
  process.exit(1);
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `https://localhost:${port}`);
  const pathname = url.pathname === "/" ? "/taskpane.html" : url.pathname;
  const relativePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  return join(distDir, relativePath);
}

const httpsOptions = await devCerts.getHttpsServerOptions();

const server = createServer(httpsOptions, (request, response) => {
  if (!request.url) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Richiesta non valida.");
    return;
  }

  const filePath = resolveRequestPath(request.url);

  if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Risorsa non trovata.");
    return;
  }

  const extension = extname(filePath);
  const contentType = mimeTypes.get(extension) ?? "application/octet-stream";

  response.writeHead(200, { "Content-Type": contentType });
  response.end(readFileSync(filePath));
});

server.listen(port, () => {
  console.log(`LocalOfficeAI dev server in ascolto su https://localhost:${port}`);
  console.log("Premi Ctrl+C per arrestare il server.");
});

server.on("error", (error) => {
  console.error(`Impossibile avviare il server locale: ${error.message}`);
  process.exit(1);
});
