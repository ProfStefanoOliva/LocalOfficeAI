import { createWriteStream, existsSync, mkdirSync, WriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { ChildProcess, spawn } from "node:child_process";

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

type ComponentProcessInfo = {
  runProcess?: ChildProcess;
  logFilePath: string;
};

export type RuntimeConfig = {
  repoRoot: string;
  logsDir: string;
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

const bridgeUrl = "http://localhost:3210/health";
const ollamaUrl = "http://localhost:11434/api/tags";
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

function writeProcessBanner(stream: WriteStream, message: string): void {
  stream.write(`\n[${new Date().toISOString()}] ${message}\n`);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
    const logStream = createLogStream(logFilePath);
    writeProcessBanner(logStream, `Componente: ${componentName}`);
    writeProcessBanner(logStream, `CWD: ${workingDirectory}`);
    writeProcessBanner(logStream, `Comando: ${commandToRun.displayCommand}`);

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

    writeProcessBanner(logStream, `PID: ${String(processHandle.pid ?? "non disponibile")}`);

    const timeoutHandle = setTimeout(() => {
      writeProcessBanner(logStream, `Timeout build dopo ${String(timeoutMs)} ms.`);
      processHandle.kill();
      settle(() => {
        logStream.end();
        reject(new Error(`Timeout durante il comando ${commandToRun.displayCommand}`));
      });
    }, timeoutMs);

    processHandle.stdout?.on("data", (chunk) => {
      logStream.write(chunk);
    });

    processHandle.stderr?.on("data", (chunk) => {
      logStream.write(chunk);
    });

    processHandle.once("error", (error) => {
      clearTimeout(timeoutHandle);
      writeProcessBanner(logStream, `Errore di spawn: ${String(error)}`);
      settle(() => {
        logStream.end();
        reject(error);
      });
    });

    processHandle.once("exit", (code, signal) => {
      writeProcessBanner(logStream, `Exit event - code: ${String(code)}, signal: ${String(signal)}`);
    });

    processHandle.once("close", (code, signal) => {
      clearTimeout(timeoutHandle);
      writeProcessBanner(logStream, `Close event - code: ${String(code)}, signal: ${String(signal)}`);
      settle(() => {
        logStream.end();

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
  private readonly repoRoot: string;
  private readonly logsDir: string;
  private readonly componentProcesses: Record<ComponentName, ComponentProcessInfo>;

  constructor(config: RuntimeConfig) {
    this.repoRoot = config.repoRoot;
    this.logsDir = config.logsDir;
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

  async getStatus(): Promise<LocalOfficeAIStatus> {
    const [ollama, localBridge, addinWordActive] = await Promise.all([
      checkHttpEndpoint(ollamaUrl),
      checkHttpEndpoint(bridgeUrl),
      checkTcpPort("127.0.0.1", addinPort)
    ]);

    return {
      ollama: {
        active: ollama.active,
        detail: ollama.active ? "Raggiungibile" : `Non raggiungibile (${ollama.detail})`
      },
      localBridge: {
        active: localBridge.active,
        detail: localBridge.active
          ? "Attivo o sembra attivo sulla porta 3210"
          : `Non attivo (${localBridge.detail})`
      },
      addinWord: {
        active: addinWordActive,
        detail: addinWordActive
          ? "Attivo o sembra attivo sulla porta 3000"
          : "Non attivo sulla porta 3000"
      }
    };
  }

  async startComponents(): Promise<void> {
    const status = await this.getStatus();

    if (!status.ollama.active) {
      throw new Error("Ollama non risulta raggiungibile. Avvia Ollama e riprova.");
    }

    if (!status.localBridge.active) {
      await this.startLocalBridge();
      await delay(processStartupDelayMs);
    }

    if (!status.addinWord.active) {
      await this.startAddinWordDevServer();
      await delay(processStartupDelayMs);
    }
  }

  async restartComponents(): Promise<void> {
    await this.stopManagedComponents();
    await this.startComponents();
  }

  async stopManagedComponents(): Promise<void> {
    await this.stopManagedComponent("local-bridge");
    await this.stopManagedComponent("addin-word");
  }

  private async startLocalBridge(): Promise<void> {
    const workingDirectory = join(this.repoRoot, "local-bridge");
    const logFilePath = this.componentProcesses["local-bridge"].logFilePath;

    createLogStream(logFilePath).end();
    await runCommandWithLogging("local-bridge", ["run", "build"], workingDirectory, logFilePath);

    this.componentProcesses["local-bridge"].runProcess = this.spawnLongRunningCommand(
      "local-bridge",
      workingDirectory,
      ["run", "start"],
      logFilePath
    );
  }

  private async startAddinWordDevServer(): Promise<void> {
    const workingDirectory = join(this.repoRoot, "addin-word");
    const logFilePath = this.componentProcesses["addin-word"].logFilePath;

    createLogStream(logFilePath).end();
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
    const logStream = createLogStream(logFilePath);
    writeProcessBanner(logStream, `Componente: ${componentName}`);
    writeProcessBanner(logStream, `CWD: ${workingDirectory}`);
    writeProcessBanner(logStream, `Avvio processo persistente: ${commandToRun.displayCommand}`);

    const processHandle = spawn(commandToRun.command, commandToRun.args, {
      cwd: workingDirectory,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false
    });

    writeProcessBanner(logStream, `PID: ${String(processHandle.pid ?? "non disponibile")}`);

    processHandle.stdout?.on("data", (chunk) => logStream.write(chunk));
    processHandle.stderr?.on("data", (chunk) => logStream.write(chunk));

    processHandle.once("error", (error) => {
      writeProcessBanner(logStream, `Errore processo ${componentName}: ${String(error)}`);
    });

    processHandle.once("exit", (code, signal) => {
      writeProcessBanner(logStream, `Exit event - code: ${String(code)}, signal: ${String(signal)}`);
    });

    processHandle.once("close", (code, signal) => {
      writeProcessBanner(logStream, `Close event - code: ${String(code)}, signal: ${String(signal)}`);

      if (this.componentProcesses[componentName].runProcess === processHandle) {
        this.componentProcesses[componentName].runProcess = undefined;
      }

      logStream.end();
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
