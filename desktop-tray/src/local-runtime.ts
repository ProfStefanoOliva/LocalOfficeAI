import { createWriteStream, existsSync, mkdirSync, WriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { ChildProcess, spawn, spawnSync } from "node:child_process";

export type ComponentName = "local-bridge" | "addin-word";

export type ComponentStatus = {
  active: boolean;
  detail: string;
};

export type LocalOfficeAIStatus = {
  ollama: ComponentStatus;
  localBridge: ComponentStatus;
  addinWord: ComponentStatus;
};

export type ComponentStartSource = "auto" | "manual" | "restart" | "self-check";

type ComponentProcessInfo = {
  runProcess?: ChildProcess;
  logFilePath: string;
};

export type RuntimeConfig = {
  appRoot: string;
  logsDir: string;
  localBridgeDir: string;
  addinWordDir: string;
  mode: "repository-development" | "portable-release";
};

type HttpStatusCheck = {
  active: boolean;
  detail: string;
};

type SpawnedCommand = {
  command: string;
  args: string[];
  displayCommand: string;
};

type LocalAISettingsResponse = {
  baseUrl?: unknown;
  isDefault?: unknown;
  isLocalhost?: unknown;
};

type BridgeOllamaHealthResponse = {
  status?: unknown;
  baseUrl?: unknown;
  error?: unknown;
};

type CommandCheckResult = {
  available: boolean;
  detail: string;
};

type ManagedLogWriter = {
  write(chunk: string | Buffer): void;
  banner(message: string): void;
  end(): void;
};

const bridgeUrl = "http://localhost:3210/health";
const bridgeLocalAISettingsUrl = "http://localhost:3210/settings/local-ai";
const bridgeOllamaHealthUrl = "http://localhost:3210/ollama/health";
const addinPort = 3000;
const processStartupDelayMs = 2500;
const buildTimeoutMs = 60_000;

function ensureDirectory(directoryPath: string): void {
  if (!existsSync(directoryPath)) {
    mkdirSync(directoryPath, { recursive: true });
  }
}

function createLogStream(logFilePath: string): WriteStream {
  ensureDirectory(dirname(logFilePath));
  return createWriteStream(logFilePath, { flags: "a" });
}

function createManagedLogWriter(logFilePath: string): ManagedLogWriter {
  const stream = createLogStream(logFilePath);
  let closed = false;

  const write = (chunk: string | Buffer): void => {
    if (closed || stream.destroyed || stream.writableEnded) {
      return;
    }

    try {
      stream.write(chunk);
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String((error as { code?: unknown }).code) : "";

      if (code === "ERR_STREAM_WRITE_AFTER_END" || code === "EPIPE") {
        closed = true;
        return;
      }

      console.error("Scrittura log non riuscita.", error);
      closed = true;
    }
  };

  stream.on("error", (error) => {
    const code = error instanceof Error && "code" in error ? String((error as { code?: unknown }).code) : "";

    if (code === "ERR_STREAM_WRITE_AFTER_END" || code === "EPIPE") {
      closed = true;
      return;
    }

    console.error("Errore stream di log.", error);
    closed = true;
  });

  return {
    write,
    banner(message: string) {
      write(`\n[${new Date().toISOString()}] ${message}\n`);
    },
    end() {
      if (closed || stream.destroyed || stream.writableEnded) {
        return;
      }

      closed = true;

      try {
        stream.end();
      } catch (error) {
        const code = error instanceof Error && "code" in error ? String((error as { code?: unknown }).code) : "";

        if (code !== "ERR_STREAM_WRITE_AFTER_END" && code !== "EPIPE") {
          console.error("Chiusura stream di log non riuscita.", error);
        }
      }
    }
  };
}

function quoteForWindowsCommand(value: string): string {
  if (!/[ \t"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function createNpmCommand(args: string[]): SpawnedCommand {
  if (process.platform === "win32") {
    const npmExecutable = process.env.npm_execpath?.toLowerCase().endsWith("npm-cli.js")
      ? `node ${quoteForWindowsCommand(process.env.npm_execpath)}`
      : "npm.cmd";
    const npmCommandLine = [npmExecutable, ...args.map((argument) => quoteForWindowsCommand(argument))].join(" ");

    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", npmCommandLine],
      displayCommand: npmCommandLine
    };
  }

  return {
    command: "npm",
    args,
    displayCommand: `npm ${args.join(" ")}`
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function checkNodeCommandAvailable(): CommandCheckResult {
  const result = spawnSync("node", ["--version"], {
    shell: false,
    windowsHide: true,
    stdio: "ignore"
  });

  if (result.status === 0) {
    return { available: true, detail: "Node.js disponibile nel PATH." };
  }

  return { available: false, detail: "Node.js non disponibile nel PATH." };
}

function checkNpmCommandAvailable(): CommandCheckResult {
  const npmCommand = createNpmCommand(["--version"]);
  const result = spawnSync(npmCommand.command, npmCommand.args, {
    shell: false,
    windowsHide: true,
    stdio: "ignore"
  });

  if (result.status === 0) {
    return { available: true, detail: "npm disponibile nel PATH." };
  }

  return { available: false, detail: "npm non disponibile nel PATH." };
}

async function checkHttpEndpoint(url: string): Promise<HttpStatusCheck> {
  try {
    const response = await fetch(url, { method: "GET" });
    return {
      active: response.ok,
      detail: response.ok ? "Attivo" : `Risposta HTTP ${response.status}`
    };
  } catch (error) {
    return {
      active: false,
      detail: error instanceof Error ? error.message : "Non raggiungibile"
    };
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    const responseText = await response.text();
    const suffix = responseText.trim().length > 0 ? ` ${responseText.trim()}` : "";
    throw new Error(`HTTP ${response.status}.${suffix}`.trim());
  }

  return (await response.json()) as T;
}

async function checkTcpPort(hostname: string, port: number): Promise<boolean> {
  const net = await import("node:net");

  return await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: hostname, port });

    const finish = (value: boolean): void => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(1500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function runCommandWithLogging(
  componentName: ComponentName,
  args: string[],
  workingDirectory: string,
  logFilePath: string,
  timeoutMs = buildTimeoutMs
): Promise<void> {
  const commandToRun = createNpmCommand(args);

  await new Promise<void>((resolve, reject) => {
    const logWriter = createManagedLogWriter(logFilePath);
    logWriter.banner(`Componente: ${componentName}`);
    logWriter.banner(`CWD: ${workingDirectory}`);
    logWriter.banner(`Comando: ${commandToRun.displayCommand}`);

    const processHandle = spawn(commandToRun.command, commandToRun.args, {
      cwd: workingDirectory,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false
    });

    let settled = false;

    const settle = (callback: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      callback();
    };

    logWriter.banner(`PID: ${String(processHandle.pid ?? "non disponibile")}`);

    const timeoutHandle = setTimeout(() => {
      logWriter.banner(`Timeout build dopo ${String(timeoutMs)} ms.`);
      processHandle.kill();
      settle(() => {
        logWriter.end();
        reject(new Error(`Timeout durante il comando ${commandToRun.displayCommand}`));
      });
    }, timeoutMs);

    processHandle.stdout?.on("data", (chunk) => {
      logWriter.write(chunk);
    });

    processHandle.stderr?.on("data", (chunk) => {
      logWriter.write(chunk);
    });

    processHandle.once("error", (error) => {
      clearTimeout(timeoutHandle);
      logWriter.banner(`Errore di spawn: ${String(error)}`);
      settle(() => {
        logWriter.end();
        reject(error);
      });
    });

    processHandle.once("exit", (code, signal) => {
      logWriter.banner(`Exit event - code: ${String(code)}, signal: ${String(signal)}`);
    });

    processHandle.once("close", (code, signal) => {
      clearTimeout(timeoutHandle);
      logWriter.banner(`Close event - code: ${String(code)}, signal: ${String(signal)}`);
      settle(() => {
        logWriter.end();

        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Comando terminato con codice ${String(code)} e signal ${String(signal)}`));
      });
    });
  });
}

export class LocalOfficeAIRuntime {
  private readonly appRoot: string;
  private readonly logsDir: string;
  private readonly localBridgeDir: string;
  private readonly addinWordDir: string;
  private readonly mode: "repository-development" | "portable-release";
  private readonly componentProcesses: Record<ComponentName, ComponentProcessInfo>;

  constructor(config: RuntimeConfig) {
    this.appRoot = config.appRoot;
    this.logsDir = config.logsDir;
    this.localBridgeDir = config.localBridgeDir;
    this.addinWordDir = config.addinWordDir;
    this.mode = config.mode;
    this.componentProcesses = {
      "local-bridge": {
        logFilePath: join(this.logsDir, "local-bridge.log")
      },
      "addin-word": {
        logFilePath: join(this.logsDir, "addin-word.log")
      }
    };
  }

  getLogsDirectory(): string {
    ensureDirectory(this.logsDir);
    return this.logsDir;
  }

  private logComponentMessage(componentName: ComponentName, message: string): void {
    const logWriter = createManagedLogWriter(this.componentProcesses[componentName].logFilePath);
    logWriter.banner(message);
    logWriter.end();
  }

  async getStatus(): Promise<LocalOfficeAIStatus> {
    const nodeStatus = checkNodeCommandAvailable();
    const npmStatus = checkNpmCommandAvailable();
    const [localBridge, addinWordActive] = await Promise.all([
      checkHttpEndpoint(bridgeUrl),
      checkTcpPort("127.0.0.1", addinPort)
    ]);

    let ollama: ComponentStatus;

    if (!localBridge.active) {
      ollama = {
        active: false,
        detail: "Non verificabile finche' il local-bridge non e' attivo."
      };
    } else {
      try {
        let localAISettings: LocalAISettingsResponse | null = null;

        try {
          localAISettings = await fetchJson<LocalAISettingsResponse>(bridgeLocalAISettingsUrl);
        } catch {
          localAISettings = null;
        }

        const ollamaHealth = await fetchJson<BridgeOllamaHealthResponse>(bridgeOllamaHealthUrl);
        const baseUrl =
          typeof ollamaHealth.baseUrl === "string"
            ? ollamaHealth.baseUrl
            : localAISettings && typeof localAISettings.baseUrl === "string"
              ? localAISettings.baseUrl
              : "endpoint non specificato";
        const isLocalhost = localAISettings?.isLocalhost === true;

        ollama = {
          active: true,
          detail: `${isLocalhost ? "Raggiungibile" : "Raggiungibile su endpoint configurato"} (${baseUrl})`
        };
      } catch (error) {
        ollama = {
          active: false,
          detail: error instanceof Error ? error.message : "Non raggiungibile"
        };
      }
    }

    return {
      ollama,
      localBridge: {
        active: localBridge.active,
        detail: localBridge.active
          ? "Attivo o sembra attivo sulla porta 3210"
          : !nodeStatus.available || !npmStatus.available
            ? `Non attivo. ${nodeStatus.available ? "" : `${nodeStatus.detail} `}${npmStatus.available ? "" : npmStatus.detail}`.trim()
            : `Non attivo (${localBridge.detail})`
      },
      addinWord: {
        active: addinWordActive,
        detail: addinWordActive
          ? "Attivo o sembra attivo sulla porta 3000"
          : !nodeStatus.available || !npmStatus.available
            ? `Non attivo. ${nodeStatus.available ? "" : `${nodeStatus.detail} `}${npmStatus.available ? "" : npmStatus.detail}`.trim()
            : "Non attivo sulla porta 3000"
      }
    };
  }

  async startComponents(source: ComponentStartSource = "manual"): Promise<void> {
    const nodeStatus = checkNodeCommandAvailable();
    const npmStatus = checkNpmCommandAvailable();

    this.logComponentMessage("local-bridge", `Root rilevata: ${this.appRoot} (${this.mode}).`);
    this.logComponentMessage("addin-word", `Root rilevata: ${this.appRoot} (${this.mode}).`);

    if (!nodeStatus.available || !npmStatus.available) {
      const message = `Avvio componenti annullato. ${nodeStatus.detail} ${npmStatus.detail}`.trim();
      this.logComponentMessage("local-bridge", message);
      this.logComponentMessage("addin-word", message);
      return;
    }

    let status = await this.getStatus();
    const sourceLabel = `Tentativo avvio componenti (${source}).`;

    this.logComponentMessage("local-bridge", sourceLabel);
    this.logComponentMessage("addin-word", sourceLabel);

    if (!status.localBridge.active) {
      this.logComponentMessage("local-bridge", "local-bridge non attivo: avvio richiesto.");
      await this.startLocalBridge();
      await delay(processStartupDelayMs);
      status = await this.getStatus();
    } else {
      this.logComponentMessage("local-bridge", "local-bridge gia' attivo: nessun duplicato avviato.");
    }

    if (!status.ollama.active) {
      this.logComponentMessage(
        "local-bridge",
        `Endpoint AI locale non raggiungibile al momento dell'avvio componenti: ${status.ollama.detail}`
      );
    }

    if (!status.addinWord.active) {
      this.logComponentMessage("addin-word", "addin-word dev-server non attivo: avvio richiesto.");
      await this.startAddinWordDevServer();
      await delay(processStartupDelayMs);
    } else {
      this.logComponentMessage("addin-word", "addin-word dev-server gia' attivo: nessun duplicato avviato.");
    }
  }

  async restartComponents(): Promise<void> {
    await this.stopManagedComponents();
    await this.startComponents("restart");
  }

  async stopManagedComponents(): Promise<void> {
    await this.stopManagedComponent("local-bridge");
    await this.stopManagedComponent("addin-word");
  }

  private async startLocalBridge(): Promise<void> {
    const workingDirectory = this.localBridgeDir;
    const logFilePath = this.componentProcesses["local-bridge"].logFilePath;

    if (!existsSync(workingDirectory)) {
      this.logComponentMessage("local-bridge", `Cartella local-bridge non trovata: ${workingDirectory}`);
      throw new Error(`Cartella local-bridge non trovata: ${workingDirectory}`);
    }

    createManagedLogWriter(logFilePath).end();
    await runCommandWithLogging("local-bridge", ["run", "build"], workingDirectory, logFilePath);

    this.componentProcesses["local-bridge"].runProcess = this.spawnLongRunningCommand(
      "local-bridge",
      workingDirectory,
      ["run", "start"],
      logFilePath
    );
  }

  private async startAddinWordDevServer(): Promise<void> {
    const workingDirectory = this.addinWordDir;
    const logFilePath = this.componentProcesses["addin-word"].logFilePath;

    if (!existsSync(workingDirectory)) {
      this.logComponentMessage("addin-word", `Cartella addin-word non trovata: ${workingDirectory}`);
      throw new Error(`Cartella addin-word non trovata: ${workingDirectory}`);
    }

    createManagedLogWriter(logFilePath).end();
    await runCommandWithLogging("addin-word", ["run", "build"], workingDirectory, logFilePath);

    this.componentProcesses["addin-word"].runProcess = this.spawnLongRunningCommand(
      "addin-word",
      workingDirectory,
      ["run", "dev-server"],
      logFilePath
    );
  }

  private spawnLongRunningCommand(
    componentName: ComponentName,
    workingDirectory: string,
    args: string[],
    logFilePath: string
  ): ChildProcess {
    const commandToRun = createNpmCommand(args);
    const logWriter = createManagedLogWriter(logFilePath);
    logWriter.banner(`Componente: ${componentName}`);
    logWriter.banner(`CWD: ${workingDirectory}`);
    logWriter.banner(`Avvio processo persistente: ${commandToRun.displayCommand}`);

    const processHandle = spawn(commandToRun.command, commandToRun.args, {
      cwd: workingDirectory,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false
    });

    logWriter.banner(`PID: ${String(processHandle.pid ?? "non disponibile")}`);

    processHandle.stdout?.on("data", (chunk) => logWriter.write(chunk));
    processHandle.stderr?.on("data", (chunk) => logWriter.write(chunk));

    processHandle.once("error", (error) => {
      logWriter.banner(`Errore processo ${componentName}: ${String(error)}`);
    });

    processHandle.once("exit", (code, signal) => {
      logWriter.banner(`Exit event - code: ${String(code)}, signal: ${String(signal)}`);
    });

    processHandle.once("close", (code, signal) => {
      logWriter.banner(`Close event - code: ${String(code)}, signal: ${String(signal)}`);

      if (this.componentProcesses[componentName].runProcess === processHandle) {
        this.componentProcesses[componentName].runProcess = undefined;
      }

      logWriter.end();
    });

    return processHandle;
  }

  private async stopManagedComponent(componentName: ComponentName): Promise<void> {
    const processHandle = this.componentProcesses[componentName].runProcess;

    if (!processHandle || processHandle.killed) {
      return;
    }

    await new Promise<void>((resolve) => {
      const finish = (): void => {
        this.componentProcesses[componentName].runProcess = undefined;
        resolve();
      };

      processHandle.once("close", () => finish());

      if (process.platform === "win32") {
        const killProcess = spawn("taskkill", ["/pid", String(processHandle.pid), "/t", "/f"], {
          stdio: "ignore",
          windowsHide: true,
          shell: false
        });

        killProcess.once("close", () => finish());
      } else {
        processHandle.kill("SIGTERM");
      }
    });
  }
}
