export type WritingProfileId =
  | "neutro"
  | "didattico"
  | "formale"
  | "tecnico"
  | "accademico"
  | "sintetico"
  | "narrativo";

export type WritingProfile = {
  label: string;
  instructions: string[];
};

export type ThemePreference = "system" | "dark" | "light";
export type TaskpaneViewName = "main" | "settings" | "info";
export type AIProviderId = "ollama-local" | "openai-compatible" | "claude" | "deepseek-compatible";
export type QuickPromptId =
  | "riscrivi"
  | "sintetizza"
  | "espandi"
  | "correggi"
  | "spiega"
  | "piu-formale"
  | "piu-didattico";

export type QuickPromptTemplate = {
  id: QuickPromptId;
  label: string;
  promptText: string;
};

export type StoredPreferences = {
  theme?: unknown;
  writingProfile?: unknown;
  ollamaModel?: unknown;
  aiProvider?: unknown;
};

export type NormalizedStoredPreferences = {
  theme: ThemePreference;
  writingProfile: WritingProfileId;
  ollamaModel: string;
  aiProvider: AIProviderId;
};

export type AIProviderDefinition = {
  id: AIProviderId;
  label: string;
  availability: "active" | "future";
  transport: "local" | "cloud";
  description: string;
};

export const defaultThemePreference: ThemePreference = "system";
export const defaultWritingProfileId: WritingProfileId = "neutro";
export const defaultAIProviderId: AIProviderId = "ollama-local";

export const aiProviderDefinitions: AIProviderDefinition[] = [
  {
    id: "ollama-local",
    label: "Ollama locale",
    availability: "active",
    transport: "local",
    description: "Provider locale attivo nella v0.13.0 tramite local-bridge e Ollama su localhost."
  },
  {
    id: "openai-compatible",
    label: "OpenAI-compatible",
    availability: "future",
    transport: "cloud",
    description: "Provider futuro non ancora disponibile in questa release."
  },
  {
    id: "claude",
    label: "Claude",
    availability: "future",
    transport: "cloud",
    description: "Provider futuro non ancora disponibile in questa release."
  },
  {
    id: "deepseek-compatible",
    label: "DeepSeek e compatibili",
    availability: "future",
    transport: "cloud",
    description: "Provider futuro non ancora disponibile in questa release."
  }
];

export const quickPromptTemplates: QuickPromptTemplate[] = [
  {
    id: "riscrivi",
    label: "Riscrivi",
    promptText:
      "Riscrivi direttamente il contenuto in modo piu' chiaro, mantenendo il significato originale. Non fare domande e non trasformare la risposta in conversazione."
  },
  {
    id: "sintetizza",
    label: "Sintetizza",
    promptText:
      "Sintetizza direttamente il contenuto mantenendo solo le informazioni essenziali. Non fare domande e restituisci subito il testo finale."
  },
  {
    id: "espandi",
    label: "Espandi",
    promptText:
      "Espandi direttamente il contenuto aggiungendo dettagli utili senza alterare il significato originale. Non fare domande e restituisci subito il testo finale."
  },
  {
    id: "correggi",
    label: "Correggi",
    promptText:
      "Correggi direttamente grammatica, ortografia e punteggiatura, mantenendo il significato originale. Restituisci solo il testo corretto, non spiegare ogni modifica salvo richiesta esplicita, non fare domande e non rifiutare una normale correzione testuale."
  },
  {
    id: "spiega",
    label: "Spiega",
    promptText:
      "Spiega direttamente il contenuto in modo chiaro e comprensibile. Non fare domande e produci subito una proposta finale utilizzabile."
  },
  {
    id: "piu-formale",
    label: "Rendi più formale",
    promptText:
      "Rendi direttamente il contenuto piu' formale, preciso e professionale. Non fare domande e restituisci subito il testo finale."
  },
  {
    id: "piu-didattico",
    label: "Rendi più didattico",
    promptText:
      "Rendi direttamente il contenuto piu' didattico, chiaro e adatto a studenti. Non fare domande e restituisci subito il testo finale."
  }
];

export const writingProfiles: Record<WritingProfileId, WritingProfile> = {
  neutro: {
    label: "Neutro",
    instructions: [
      "Rispondi alla richiesta dell'utente lavorando sul testo fornito.",
      "Mantieni il significato originale.",
      "Non aggiungere informazioni non presenti, salvo richiesta esplicita.",
      "Restituisci solo il testo finale, senza spiegazioni introduttive."
    ]
  },
  didattico: {
    label: "Didattico",
    instructions: [
      "Rendi il testo chiaro, ordinato e comprensibile a studenti.",
      "Usa un tono da docente.",
      "Evita frasi troppo lunghe.",
      "Mantieni accuratezza e semplicita'.",
      "Restituisci solo il testo finale."
    ]
  },
  formale: {
    label: "Formale",
    instructions: [
      "Usa un tono professionale e istituzionale.",
      "Migliora precisione, fluidita' e registro.",
      "Evita espressioni colloquiali.",
      "Mantieni il contenuto originale.",
      "Restituisci solo il testo finale."
    ]
  },
  tecnico: {
    label: "Tecnico",
    instructions: [
      "Usa un tono tecnico, preciso e asciutto.",
      "Mantieni termini specialistici.",
      "Riduci ambiguita'.",
      "Non semplificare eccessivamente se il testo e' destinato a utenti tecnici.",
      "Restituisci solo il testo finale."
    ]
  },
  accademico: {
    label: "Accademico",
    instructions: [
      "Usa un registro accademico.",
      "Migliora coesione, rigore e struttura argomentativa.",
      "Evita affermazioni non supportate dal testo.",
      "Non inventare fonti, dati o riferimenti.",
      "Restituisci solo il testo finale."
    ]
  },
  sintetico: {
    label: "Sintetico",
    instructions: [
      "Riduci il testo mantenendo le informazioni essenziali.",
      "Elimina ridondanze.",
      "Mantieni chiarezza e significato.",
      "Non aggiungere nuovi contenuti.",
      "Restituisci solo il testo finale."
    ]
  },
  narrativo: {
    label: "Narrativo",
    instructions: [
      "Migliora ritmo, fluidita' e resa espressiva.",
      "Mantieni il significato originale.",
      "Non trasformare il testo in modo eccessivo salvo richiesta esplicita.",
      "Usa uno stile piu' naturale e coinvolgente.",
      "Restituisci solo il testo finale."
    ]
  }
};

export function normalizeStoredPreferences(
  preferences: StoredPreferences | null | undefined
): NormalizedStoredPreferences {
  const theme =
    preferences?.theme === "dark" || preferences?.theme === "light" || preferences?.theme === "system"
      ? preferences.theme
      : defaultThemePreference;

  const writingProfile =
    typeof preferences?.writingProfile === "string" && preferences.writingProfile in writingProfiles
      ? (preferences.writingProfile as WritingProfileId)
      : defaultWritingProfileId;

  const ollamaModel = typeof preferences?.ollamaModel === "string" ? preferences.ollamaModel.trim() : "";
  const aiProvider =
    typeof preferences?.aiProvider === "string" &&
    aiProviderDefinitions.some(
      (provider) => provider.id === preferences.aiProvider && provider.availability === "active"
    )
      ? (preferences.aiProvider as AIProviderId)
      : defaultAIProviderId;

  return {
    theme,
    writingProfile,
    ollamaModel,
    aiProvider
  };
}

export function getAIProviderById(providerId: AIProviderId): AIProviderDefinition {
  return aiProviderDefinitions.find((provider) => provider.id === providerId) ?? aiProviderDefinitions[0];
}

export function chooseOllamaModel(
  models: string[],
  preferredModel: string,
  previousSelection: string
): string {
  if (models.length === 0) {
    return "";
  }

  if (preferredModel.trim().length > 0 && models.includes(preferredModel)) {
    return preferredModel;
  }

  if (previousSelection.trim().length > 0 && models.includes(previousSelection)) {
    return previousSelection;
  }

  return models[0];
}

export function createViewState(activeView: TaskpaneViewName): Record<TaskpaneViewName, boolean> {
  return {
    main: activeView === "main",
    settings: activeView === "settings",
    info: activeView === "info"
  };
}

export function buildPrompt(profileId: WritingProfileId, userPrompt: string, selectedText: string): string {
  const profile = writingProfiles[profileId];
  const profileInstructions = profile.instructions.map((instruction) => `- ${instruction}`).join("\n");
  const generalExecutionRules = [
    "- Non fare domande all'utente e non trasformare la risposta in una conversazione.",
    "- Produci direttamente un risultato finale utilizzabile.",
    "- Se il testo e' ambiguo o incompleto, fai la migliore ipotesi prudente sulla base del contenuto disponibile.",
    "- Se hai dovuto fare una ipotesi prudente, puoi aggiungere solo una breve nota finale: Nota: correzione o proposta basata sul testo disponibile."
  ].join("\n");
  const trimmedSelectedText = selectedText.trim();

  if (trimmedSelectedText.length === 0) {
    return [
      "Ruolo:",
      "Sei LocalOfficeAI e devi rispondere alla richiesta dell'utente seguendo il profilo di scrittura selezionato.",
      "",
      `Profilo di scrittura: ${profile.label}`,
      "Istruzioni del profilo:",
      profileInstructions,
      "",
      "Regole generali di esecuzione:",
      generalExecutionRules,
      "",
      "Modalita':",
      "Richiesta libera senza testo selezionato.",
      "",
      "Richiesta dell'utente:",
      userPrompt,
      "",
      "Output richiesto:",
      "Applica il profilo di scrittura selezionato e restituisci solo il testo finale, salvo richiesta diversa dell'utente."
    ].join("\n");
  }

  return [
    "Ruolo:",
    "Sei LocalOfficeAI e devi riscrivere o trasformare il testo fornito seguendo il profilo di scrittura selezionato.",
    "",
    `Profilo di scrittura: ${profile.label}`,
    "Istruzioni del profilo:",
    profileInstructions,
    "",
    "Regole generali di esecuzione:",
    generalExecutionRules,
    "",
    "Richiesta dell'utente:",
    userPrompt,
    "",
    "Testo di partenza:",
    trimmedSelectedText,
    "",
    "Output richiesto:",
    "Restituisci direttamente il testo finale richiesto, senza trasformare la risposta in chat. Non fare domande all'utente. Mantieni il significato originale quando la richiesta riguarda correzione, riscrittura o miglioramento del testo."
  ].join("\n");
}
