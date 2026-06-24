import assert from "node:assert/strict";

import {
  appendAssistedSessionMessage,
  aiProviderDefinitions,
  buildAssistedSessionPrompt,
  buildPrompt,
  chooseOllamaModel,
  clearAssistedSessionState,
  createAssistedSessionState,
  createViewState,
  defaultAIProviderId,
  defaultThemePreference,
  defaultWritingProfileId,
  getAIProviderById,
  isDirectTextEditingRequest,
  normalizeStoredPreferences,
  quickPromptTemplates,
  writingProfiles
} from "../dist/taskpane-core.js";

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

test("buildPrompt combina profilo, richiesta utente e testo selezionato", () => {
  const prompt = buildPrompt("neutro", "Riscrivi il testo in modo più chiaro.", "Testo originale.");

  assert.match(prompt, /Profilo di scrittura: Neutro/);
  assert.match(prompt, /Richiesta dell'utente:\nRiscrivi il testo in modo più chiaro\./);
  assert.match(prompt, /Testo di partenza:\nTesto originale\./);
  assert.match(prompt, /Restituisci direttamente il testo finale richiesto/);
});

test("buildPrompt gestisce la richiesta libera senza testo selezionato", () => {
  const prompt = buildPrompt("didattico", "Spiega questo tema in modo semplice.", "   ");

  assert.match(prompt, /Profilo di scrittura: Didattico/);
  assert.match(prompt, /Richiesta libera senza testo selezionato\./);
  assert.doesNotMatch(prompt, /Testo di partenza:/);
  assert.match(prompt, /Applica il profilo di scrittura selezionato/);
});

test("buildPrompt include regole anti-clarification e orientate al risultato", () => {
  const prompt = buildPrompt("formale", "Correggi questo testo.", "Testo di prova.");

  assert.match(prompt, /Non fare domande all'utente/);
  assert.match(prompt, /Produci direttamente un risultato finale utilizzabile/);
  assert.match(prompt, /fai la migliore ipotesi prudente/);
  assert.match(prompt, /puoi aggiungere solo una breve nota finale/i);
});

test("buildPrompt resta coerente anche con richiesta utente vuota", () => {
  const prompt = buildPrompt("tecnico", "", "Specifiche API.");

  assert.match(prompt, /Profilo di scrittura: Tecnico/);
  assert.match(prompt, /Richiesta dell'utente:\n\s*\nTesto di partenza:/);
  assert.doesNotMatch(prompt, /undefined|null/);
});

test("buildAssistedSessionPrompt crea un prompt con testo base della sessione", () => {
  const prompt = buildAssistedSessionPrompt(
    "neutro",
    "Questo e' lo snapshot selezionato.",
    "Spiega il passaggio centrale."
  );

  assert.match(prompt, /modalita' Sessione assistita/);
  assert.match(prompt, /TESTO BASE DELLA SESSIONE - FONTE PRIMARIA DA ELABORARE:\n<<<\nQuesto e' lo snapshot selezionato\.\n>>>/);
  assert.match(prompt, /RICHIESTA CORRENTE DELL'UTENTE - PRIORITARIA SULLA CRONOLOGIA:\n<<<\nSpiega il passaggio centrale\.\n>>>/);
  assert.match(prompt, /Usa il TESTO BASE DELLA SESSIONE come contenuto principale/);
});

test("la sessione assistita mantiene lo stesso testo base nelle richieste successive", () => {
  let session = createAssistedSessionState("Snapshot iniziale della selezione.");
  session = appendAssistedSessionMessage(session, {
    role: "user",
    content: "Riassumi il testo."
  });
  session = appendAssistedSessionMessage(session, {
    role: "assistant",
    content: "Riassunto basato sullo snapshot iniziale."
  });

  const prompt = buildAssistedSessionPrompt(
    "formale",
    session.baseText,
    "Ora rendilo piu' istituzionale.",
    session.messages
  );

  assert.match(prompt, /TESTO BASE DELLA SESSIONE - FONTE PRIMARIA DA ELABORARE:\n<<<\nSnapshot iniziale della selezione\.\n>>>/);
  assert.match(prompt, /Utente: Riassumi il testo\./);
  assert.match(prompt, /Assistente: Riassunto basato sullo snapshot iniziale\./);
  assert.doesNotMatch(prompt, /selezione corrente nel documento/i);
});

test("buildAssistedSessionPrompt include solo una cronologia breve quando richiesto", () => {
  const history = [
    { role: "user", content: "Prima domanda molto lunga ".repeat(20) },
    { role: "assistant", content: "Prima risposta molto lunga ".repeat(20) },
    { role: "user", content: "Seconda domanda importante." },
    { role: "assistant", content: "Seconda risposta importante." }
  ];
  const prompt = buildAssistedSessionPrompt(
    "didattico",
    "Base stabile.",
    "Continua.",
    history,
    {
      maxHistoryMessages: 2,
      maxHistoryCharacters: 120
    }
  );

  assert.doesNotMatch(prompt, /Prima domanda/);
  assert.doesNotMatch(prompt, /Prima risposta/);
  assert.match(prompt, /Utente: Seconda domanda importante\./);
  assert.match(prompt, /Assistente: Seconda risposta importante\./);
});

test("buildAssistedSessionPrompt taglia una cronologia troppo lunga", () => {
  const prompt = buildAssistedSessionPrompt(
    "tecnico",
    "Base stabile.",
    "Rispondi.",
    [{ role: "user", content: "contenuto molto lungo ".repeat(80) }],
    {
      maxHistoryMessages: 4,
      maxHistoryCharacters: 90
    }
  );

  assert.match(prompt, /\[tagliato\]/);
  const historySection = prompt
    .split("CRONOLOGIA PRECEDENTE - SOLO CONTESTO CONVERSAZIONALE, NON FONTE PRIMARIA:\n<<<\n")[1]
    .split("\n>>>\n\nRICHIESTA CORRENTE")[0];
  assert.ok(historySection.length <= 100);
});

test("buildAssistedSessionPrompt delimita chiaramente testo base, cronologia e richiesta corrente", () => {
  const prompt = buildAssistedSessionPrompt(
    "neutro",
    "Questo e' un testo di prova.",
    "Correggi gli errori.",
    [{ role: "assistant", content: "Messaggio precedente." }]
  );

  assert.match(prompt, /TESTO BASE DELLA SESSIONE - FONTE PRIMARIA DA ELABORARE:\n<<<\nQuesto e' un testo di prova\.\n>>>/);
  assert.match(prompt, /CRONOLOGIA PRECEDENTE - SOLO CONTESTO CONVERSAZIONALE, NON FONTE PRIMARIA:\n<<<\nAssistente: Messaggio precedente\.\n>>>/);
  assert.match(prompt, /RICHIESTA CORRENTE DELL'UTENTE - PRIORITARIA SULLA CRONOLOGIA:\n<<<\nCorreggi gli errori\.\n>>>/);
});

test("buildAssistedSessionPrompt tratta la cronologia come contesto e non come fonte primaria", () => {
  const prompt = buildAssistedSessionPrompt(
    "neutro",
    "Testo base stabile.",
    "Ora correggilo.",
    [{ role: "user", content: "Prima parlavamo di un testo diverso." }]
  );

  assert.match(prompt, /CRONOLOGIA PRECEDENTE - SOLO CONTESTO CONVERSAZIONALE, NON FONTE PRIMARIA/);
  assert.match(prompt, /La RICHIESTA CORRENTE DELL'UTENTE ha priorita' sulla CRONOLOGIA PRECEDENTE/);
  assert.match(prompt, /La CRONOLOGIA PRECEDENTE serve solo per capire il dialogo, non per sostituire o modificare il testo base/);
  assert.match(prompt, /Non confondere la cronologia con il TESTO BASE DELLA SESSIONE/);
});

test("isDirectTextEditingRequest riconosce richieste di correzione e riscrittura senza classificatori complessi", () => {
  assert.equal(isDirectTextEditingRequest("Devi correggere eventuali errori presenti all'interno del testo"), true);
  assert.equal(isDirectTextEditingRequest("All'interno del testo ci sono errori ortografici, correggili"), true);
  assert.equal(isDirectTextEditingRequest("Ora rendilo più formale"), true);
  assert.equal(isDirectTextEditingRequest("Puoi spiegarmi il contesto generale?"), false);
});

test("per una richiesta di correzione il prompt chiede un testo corretto diretto", () => {
  const prompt = buildAssistedSessionPrompt(
    "neutro",
    "Questo e' un testo di prova che serve a verificare l'assente ai",
    "Devi correggere eventuali errori presenti all'interno del testo"
  );

  assert.match(prompt, /La richiesta corrente chiede di elaborare direttamente il TESTO BASE DELLA SESSIONE/);
  assert.match(prompt, /Se la richiesta chiede correzioni, restituisci direttamente il testo corretto completo/);
  assert.match(prompt, /Non chiedere esempi, frasi o parti da correggere/);
  assert.match(prompt, /il testo da elaborare e' gia' nel TESTO BASE DELLA SESSIONE/);
});

test("per una richiesta di correzione il prompt vieta esempi e correzioni di parole assenti", () => {
  const prompt = buildAssistedSessionPrompt(
    "neutro",
    "Questo e' un testo di prova che serve a verificare l'assente ai",
    "Correggi errori ortografici e refusi"
  );

  assert.match(prompt, /Non chiedere all'utente di fornire il testo se il TESTO BASE DELLA SESSIONE e' presente/);
  assert.match(prompt, /Non proporre correzioni di parole assenti dal testo base/);
});

test("clearAssistedSessionState cancella la sessione tramite logica pura", () => {
  const session = createAssistedSessionState("Base stabile.");
  const updatedSession = appendAssistedSessionMessage(session, {
    role: "user",
    content: "Domanda."
  });

  assert.equal(updatedSession.messages.length, 1);
  assert.equal(clearAssistedSessionState(), null);
});

test("la sessione assistita non richiede inserimento diretto nel documento", () => {
  const prompt = buildAssistedSessionPrompt("neutro", "Base stabile.", "Correggi il testo.");

  assert.match(prompt, /risposta copiabile manualmente/i);
  assert.doesNotMatch(prompt, /setSelectedDataAsync|insertText|insertContentControl|tracked range/i);
});

test("la logica core della sessione non salva cronologia in storage persistente", () => {
  const coreOperations = [
    createAssistedSessionState.toString(),
    appendAssistedSessionMessage.toString(),
    clearAssistedSessionState.toString(),
    buildAssistedSessionPrompt.toString()
  ].join("\n");

  assert.doesNotMatch(coreOperations, /localStorage|sessionStorage|indexedDB|IndexedDB|writeFile|setItem/i);
});

test("anteprima singola e sessione assistita restano prompt distinti", () => {
  const previewPrompt = buildPrompt("neutro", "Correggi.", "Testo.");
  const sessionPrompt = buildAssistedSessionPrompt("neutro", "Testo.", "Correggi.");

  assert.match(previewPrompt, /Non fare domande all'utente/);
  assert.match(previewPrompt, /Produci direttamente un risultato finale utilizzabile/);
  assert.doesNotMatch(previewPrompt, /Sessione assistita/);
  assert.match(sessionPrompt, /Chiedi chiarimenti solo se la richiesta e' impossibile o realmente ambigua nonostante il testo base/);
  assert.match(sessionPrompt, /TESTO BASE DELLA SESSIONE/);
});

test("profili significativi restano disponibili nel prompt builder", () => {
  const cases = [
    ["neutro", "Mantieni il significato originale."],
    ["didattico", "Usa un tono da docente."],
    ["tecnico", "Mantieni termini specialistici."],
    ["accademico", "Non inventare fonti, dati o riferimenti."],
    ["sintetico", "Elimina ridondanze."],
    ["narrativo", "Usa uno stile piu' naturale e coinvolgente."]
  ];

  for (const [profileId, expectedInstruction] of cases) {
    const prompt = buildPrompt(profileId, "Lavora su questo testo.", "Contenuto di prova.");

    assert.ok(profileId in writingProfiles);
    assert.match(prompt, new RegExp(expectedInstruction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("i prompt rapidi richiesti esistono con id stabile, etichetta leggibile e testo non vuoto", () => {
  const requiredPrompts = [
    "riscrivi",
    "sintetizza",
    "espandi",
    "correggi",
    "spiega",
    "piu-formale",
    "piu-didattico"
  ];

  assert.deepEqual(
    quickPromptTemplates.map((prompt) => prompt.id),
    requiredPrompts
  );

  for (const prompt of quickPromptTemplates) {
    assert.ok(prompt.label.trim().length > 0);
    assert.ok(prompt.promptText.trim().length > 0);
    assert.doesNotMatch(prompt.promptText, /insertText|setSelectedDataAsync|ContentControl|Range tracciati/i);
  }
});

test("i prompt rapidi restano testi iniziali modificabili e non istruzioni di inserimento nel documento", () => {
  for (const prompt of quickPromptTemplates) {
    assert.ok(prompt.promptText.endsWith("."));
    assert.doesNotMatch(prompt.promptText, /documento Word|incolla manualmente|localhost|Ollama/i);
  }
});

test("il prompt rapido Correggi richiede una correzione diretta e non conversazionale", () => {
  const prompt = quickPromptTemplates.find((item) => item.id === "correggi");

  assert.ok(prompt);
  assert.match(prompt.promptText, /Correggi direttamente grammatica, ortografia e punteggiatura/i);
  assert.match(prompt.promptText, /Restituisci solo il testo corretto/i);
  assert.match(prompt.promptText, /non fare domande/i);
  assert.match(prompt.promptText, /non rifiutare una normale correzione testuale/i);
});

test("normalizeStoredPreferences applica i default quando i valori mancano", () => {
  const normalized = normalizeStoredPreferences(undefined);

  assert.equal(normalized.theme, defaultThemePreference);
  assert.equal(normalized.writingProfile, defaultWritingProfileId);
  assert.equal(normalized.ollamaModel, "");
  assert.equal(normalized.aiProvider, defaultAIProviderId);
});

test("normalizeStoredPreferences scarta valori non validi ma conserva quelli corretti", () => {
  const normalized = normalizeStoredPreferences({
    theme: "not-valid",
    writingProfile: "tecnico",
    ollamaModel: " qwen2.5-coder:1.5b ",
    aiProvider: "ollama-local"
  });

  assert.equal(normalized.theme, defaultThemePreference);
  assert.equal(normalized.writingProfile, "tecnico");
  assert.equal(normalized.ollamaModel, "qwen2.5-coder:1.5b");
  assert.equal(normalized.aiProvider, "ollama-local");
});

test("i provider AI mantengono Ollama locale come default attivo e i provider cloud come placeholder futuri", () => {
  assert.equal(defaultAIProviderId, "ollama-local");
  assert.equal(getAIProviderById("ollama-local").availability, "active");

  const futureProviders = aiProviderDefinitions.filter((provider) => provider.id !== "ollama-local");

  assert.ok(futureProviders.length >= 3);

  for (const provider of futureProviders) {
    assert.equal(provider.availability, "future");
    assert.equal(provider.transport, "cloud");
    assert.match(provider.description, /non ancora disponibile/i);
  }
});

test("normalizeStoredPreferences torna a Ollama locale se il provider salvato non e' valido", () => {
  const normalized = normalizeStoredPreferences({
    aiProvider: "provider-non-valido",
    writingProfile: "narrativo"
  });

  assert.equal(normalized.aiProvider, "ollama-local");
  assert.equal(normalized.writingProfile, "narrativo");
});

test("normalizeStoredPreferences non attiva provider cloud futuri anche se presenti nelle preferenze", () => {
  const normalized = normalizeStoredPreferences({
    aiProvider: "claude",
    writingProfile: "didattico"
  });

  assert.equal(normalized.aiProvider, "ollama-local");
  assert.equal(normalized.writingProfile, "didattico");
});

test("chooseOllamaModel privilegia preferenza valida, poi selezione precedente, poi primo modello", () => {
  assert.equal(chooseOllamaModel([], "", ""), "");
  assert.equal(chooseOllamaModel(["m1", "m2"], "m2", "m1"), "m2");
  assert.equal(chooseOllamaModel(["m1", "m2"], "missing", "m2"), "m2");
  assert.equal(chooseOllamaModel(["m1", "m2"], "missing", "missing"), "m1");
});

test("createViewState attiva una sola vista alla volta", () => {
  assert.deepEqual(createViewState("main"), { main: true, settings: false, info: false });
  assert.deepEqual(createViewState("settings"), { main: false, settings: true, info: false });
  assert.deepEqual(createViewState("info"), { main: false, settings: false, info: true });
});

let failed = 0;

for (const currentTest of tests) {
  try {
    await currentTest.run();
    console.log(`PASS ${currentTest.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${currentTest.name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`PASS ${tests.length} test completati`);
}
