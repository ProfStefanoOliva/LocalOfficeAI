import assert from "node:assert/strict";

import {
  aiProviderDefinitions,
  buildPrompt,
  chooseOllamaModel,
  createViewState,
  defaultAIProviderId,
  defaultThemePreference,
  defaultWritingProfileId,
  getAIProviderById,
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
