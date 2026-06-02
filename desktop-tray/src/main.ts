import { app, Menu, Tray, nativeImage, shell, type Event as ElectronEvent } from "electron";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { LocalOfficeAIRuntime, type LocalOfficeAIStatus } from "./local-runtime.js";

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

function looksLikeLocalOfficeAIRoot(candidatePath: string): boolean {
  return existsSync(join(candidatePath, "addin-word")) && existsSync(join(candidatePath, "local-bridge"));
}

function resolveLocalOfficeAIRoot(): string {
  const candidatePaths = [
    process.env.LOCALOFFICEAI_REPO_ROOT,
    resolve(__dirname, "..", ".."),
    resolve(process.resourcesPath, ".."),
    resolve(process.resourcesPath, "..", "..")
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  for (const candidatePath of candidatePaths) {
    if (looksLikeLocalOfficeAIRoot(candidatePath)) {
      return candidatePath;
    }
  }

  return resolve(__dirname, "..", "..");
}

const repoRoot = resolveLocalOfficeAIRoot();
const trayIconPath = resolve(__dirname, "..", "assets", "icon-32.png");
const instructionsPath = resolve(repoRoot, "README.md");
const selfCheckMode = process.argv.includes("--self-check");

let tray: Tray | null = null;
let runtime: LocalOfficeAIRuntime | null = null;
let cachedStatus: LocalOfficeAIStatus | null = null;
let isShuttingDown = false;
let startComponentsPromise: Promise<void> | null = null;

function getTrayImage() {
  const trayImage = nativeImage.createFromPath(trayIconPath);

  if (!trayImage.isEmpty()) {
    return trayImage;
  }

  return nativeImage.createEmpty();
}

function formatStatusLine(label: string, value: { active: boolean; detail: string }): string {
  return `${label}: ${value.active ? "attivo" : "non attivo"} - ${value.detail}`;
}

async function refreshStatus(): Promise<void> {
  if (!runtime) {
    return;
  }

  try {
    cachedStatus = await runtime.getStatus();
  } catch (error) {
    cachedStatus = {
      ollama: { active: false, detail: error instanceof Error ? error.message : "Errore stato" },
      localBridge: { active: false, detail: "Stato non disponibile" },
      addinWord: { active: false, detail: "Stato non disponibile" }
    };
  }

  rebuildTrayMenu();
}

async function ensureComponentsStarted(source: "auto" | "manual" | "restart"): Promise<void> {
  if (!runtime) {
    return;
  }

  if (startComponentsPromise) {
    await startComponentsPromise;
    return;
  }

  startComponentsPromise = (async () => {
    try {
      if (source === "restart") {
        await runtime.restartComponents();
        return;
      }

      await runtime.startComponents(source);
    } finally {
      startComponentsPromise = null;
    }
  })();

  await startComponentsPromise;
}

function rebuildTrayMenu(): void {
  if (!tray || !runtime) {
    return;
  }

  const status = cachedStatus ?? {
    ollama: { active: false, detail: "Stato non ancora letto" },
    localBridge: { active: false, detail: "Stato non ancora letto" },
    addinWord: { active: false, detail: "Stato non ancora letto" }
  };

  const menu = Menu.buildFromTemplate([
    {
      label: "Stato LocalOfficeAI",
      submenu: [
        {
          label: formatStatusLine("Ollama", status.ollama),
          enabled: false
        },
        {
          label: formatStatusLine("local-bridge", status.localBridge),
          enabled: false
        },
        {
          label: formatStatusLine("addin-word dev-server", status.addinWord),
          enabled: false
        },
        {
          type: "separator"
        },
        {
          label: "Aggiorna stato",
          click: () => {
            void refreshStatus();
          }
        }
      ]
    },
    {
      label: "Avvia componenti",
      click: async () => {
        try {
          await ensureComponentsStarted("manual");
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await refreshStatus();
        } catch (error) {
          console.error("Avvio componenti non riuscito.", error);
        }
      }
    },
    {
      label: "Arresta componenti",
      click: async () => {
        try {
          await runtime?.stopManagedComponents();
          await refreshStatus();
        } catch (error) {
          console.error("Arresto componenti non riuscito.", error);
        }
      }
    },
    {
      label: "Riavvia componenti",
      click: async () => {
        try {
          await ensureComponentsStarted("restart");
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await refreshStatus();
        } catch (error) {
          console.error("Riavvio componenti non riuscito.", error);
        }
      }
    },
    {
      type: "separator"
    },
    {
      label: "Apri cartella log",
      click: async () => {
        if (!runtime) {
          return;
        }

        await shell.openPath(runtime.getLogsDirectory());
      }
    },
    {
      label: "Apri istruzioni",
      click: async () => {
        if (existsSync(instructionsPath)) {
          await shell.openPath(instructionsPath);
          return;
        }

        await shell.openPath(repoRoot);
      }
    },
    {
      type: "separator"
    },
    {
      label: "Esci",
      click: async () => {
        isShuttingDown = true;
        await runtime?.stopManagedComponents();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip("LocalOfficeAI");
}

async function createTray(): Promise<void> {
  runtime = new LocalOfficeAIRuntime({
    repoRoot,
    logsDir: join(app.getPath("userData"), "logs")
  });

  tray = new Tray(getTrayImage());
  rebuildTrayMenu();
  await refreshStatus();

  if (!selfCheckMode) {
    try {
      await ensureComponentsStarted("auto");
    } catch (error) {
      console.error("Avvio automatico componenti non riuscito.", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await refreshStatus();
  }

  if (selfCheckMode && cachedStatus) {
    console.log("SELF_CHECK_TRAY=OK");
    console.log(`SELF_CHECK_OLLAMA=${cachedStatus.ollama.detail}`);
    console.log(`SELF_CHECK_LOCAL_BRIDGE=${cachedStatus.localBridge.detail}`);
    console.log(`SELF_CHECK_ADDIN_WORD=${cachedStatus.addinWord.detail}`);
    tray.destroy();
    tray = null;
    isShuttingDown = true;
    app.exit(0);
  }
}

app.on("second-instance", () => {
  if (tray) {
    tray.popUpContextMenu();
  }
});

app.on("before-quit", async (event: ElectronEvent) => {
  if (!isShuttingDown && runtime) {
    event.preventDefault();
    isShuttingDown = true;
    await runtime.stopManagedComponents();
    app.quit();
  }
});

app.whenReady().then(async () => {
  await createTray();
}).catch((error) => {
  console.error("Inizializzazione tray app non riuscita.", error);
  app.quit();
});
