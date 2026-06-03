import { app, Menu, Tray, nativeImage, shell, type Event as ElectronEvent } from "electron";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { LocalOfficeAIRuntime, type LocalOfficeAIStatus } from "./local-runtime.js";

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

type ResolvedLocalOfficeAIPaths = {
  appRoot: string;
  localBridgeDir: string;
  addinWordDir: string;
  instructionsPath: string;
  mode: "repository-development" | "portable-release" | "invalid";
  detail: string;
};

function looksLikeRepositoryRoot(candidatePath: string): boolean {
  return (
    existsSync(join(candidatePath, "addin-word")) &&
    existsSync(join(candidatePath, "local-bridge")) &&
    existsSync(join(candidatePath, "desktop-tray"))
  );
}

function looksLikePortableRoot(candidatePath: string): boolean {
  return (
    existsSync(join(candidatePath, "manifest.xml")) &&
    existsSync(join(candidatePath, "packages")) &&
    existsSync(join(candidatePath, "portable"))
  );
}

function findRootByWalkingUp(startPath: string): string | null {
  let currentPath = resolve(startPath);

  for (let index = 0; index < 6; index += 1) {
    if (looksLikePortableRoot(currentPath) || looksLikeRepositoryRoot(currentPath)) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);

    if (parentPath === currentPath) {
      break;
    }

    currentPath = parentPath;
  }

  return null;
}

function resolveLocalOfficeAIPaths(): ResolvedLocalOfficeAIPaths {
  const candidatePaths = [
    process.env.LOCALOFFICEAI_ROOT,
    process.env.LOCALOFFICEAI_REPO_ROOT,
    process.env.LOCALOFFICEAI_PORTABLE_ROOT,
    process.env.LOCALOFFICEAI_ROOT ? findRootByWalkingUp(process.env.LOCALOFFICEAI_ROOT) : null,
    findRootByWalkingUp(dirname(process.execPath)),
    findRootByWalkingUp(process.resourcesPath),
    findRootByWalkingUp(resolve(__dirname, "..", ".."))
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  for (const candidatePath of candidatePaths) {
    if (looksLikePortableRoot(candidatePath)) {
      return {
        appRoot: candidatePath,
        localBridgeDir: join(candidatePath, "packages", "local-bridge"),
        addinWordDir: join(candidatePath, "packages", "addin-word"),
        instructionsPath: existsSync(join(candidatePath, "LEGGIMI_PRIMA.txt"))
          ? join(candidatePath, "LEGGIMI_PRIMA.txt")
          : existsSync(join(candidatePath, "README.txt"))
            ? join(candidatePath, "README.txt")
            : join(candidatePath, "README.md"),
        mode: "portable-release",
        detail: `Root portable rilevata: ${candidatePath}`
      };
    }

    if (looksLikeRepositoryRoot(candidatePath)) {
      return {
        appRoot: candidatePath,
        localBridgeDir: join(candidatePath, "local-bridge"),
        addinWordDir: join(candidatePath, "addin-word"),
        instructionsPath: join(candidatePath, "README.md"),
        mode: "repository-development",
        detail: `Root repository rilevata: ${candidatePath}`
      };
    }
  }

  const fallbackRoot = resolve(__dirname, "..", "..");

  return {
    appRoot: fallbackRoot,
    localBridgeDir: join(fallbackRoot, "local-bridge"),
    addinWordDir: join(fallbackRoot, "addin-word"),
    instructionsPath: join(fallbackRoot, "README.md"),
    mode: "invalid",
    detail:
      "Root di LocalOfficeAI non riconosciuta. Servono manifest.xml + packages + portable per la release portable, oppure addin-word + local-bridge + desktop-tray nel repository."
  };
}

const localOfficeAIPaths = resolveLocalOfficeAIPaths();
const trayIconPath = resolve(__dirname, "..", "assets", "icon-32.png");
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
    rebuildTrayMenu();
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
  if (!tray) {
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
          enabled: runtime !== null,
          click: () => {
            void refreshStatus();
          }
        }
      ]
    },
    {
      label: "Avvia componenti",
      enabled: runtime !== null,
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
      enabled: runtime !== null,
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
      enabled: runtime !== null,
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
        if (existsSync(localOfficeAIPaths.instructionsPath)) {
          await shell.openPath(localOfficeAIPaths.instructionsPath);
          return;
        }

        await shell.openPath(localOfficeAIPaths.appRoot);
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
  tray = new Tray(getTrayImage());
  console.log(`[LocalOfficeAI] ${localOfficeAIPaths.detail}`);

  if (localOfficeAIPaths.mode !== "invalid") {
    runtime = new LocalOfficeAIRuntime({
      appRoot: localOfficeAIPaths.appRoot,
      localBridgeDir: localOfficeAIPaths.localBridgeDir,
      addinWordDir: localOfficeAIPaths.addinWordDir,
      logsDir: join(app.getPath("userData"), "logs"),
      mode: localOfficeAIPaths.mode
    });
  } else {
    cachedStatus = {
      ollama: { active: false, detail: "Root LocalOfficeAI non valida o non trovata." },
      localBridge: { active: false, detail: localOfficeAIPaths.detail },
      addinWord: { active: false, detail: localOfficeAIPaths.detail }
    };
  }

  rebuildTrayMenu();
  await refreshStatus();

  if (!selfCheckMode && runtime) {
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
