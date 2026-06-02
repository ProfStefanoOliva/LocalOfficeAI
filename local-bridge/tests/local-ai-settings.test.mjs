import assert from "node:assert/strict";

import {
  defaultLocalAIBaseUrl,
  getLocalAISettings,
  isLocalhostLocalAIBaseUrl,
  normalizeLocalAIBaseUrl,
  parseLocalAISettingsBody
} from "../dist/localAiSettings.js";

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

test("normalizeLocalAIBaseUrl accetta endpoint locali e LAN validi", () => {
  assert.equal(normalizeLocalAIBaseUrl("http://localhost:11434/"), "http://localhost:11434");
  assert.equal(normalizeLocalAIBaseUrl("http://127.0.0.1:11434"), "http://127.0.0.1:11434");
  assert.equal(normalizeLocalAIBaseUrl("http://192.168.1.50:11434"), "http://192.168.1.50:11434");
  assert.equal(normalizeLocalAIBaseUrl("http://nome-server-lan:11434"), "http://nome-server-lan:11434");
});

test("normalizeLocalAIBaseUrl rifiuta protocolli o path non ammessi", () => {
  assert.throws(() => normalizeLocalAIBaseUrl(""), /non puo' essere vuoto/i);
  assert.throws(() => normalizeLocalAIBaseUrl("ftp://localhost:11434"), /http/i);
  assert.throws(() => normalizeLocalAIBaseUrl("javascript:alert(1)"), /http/i);
  assert.throws(() => normalizeLocalAIBaseUrl("http://localhost:11434/api/tags"), /senza path aggiuntivi/i);
});

test("parseLocalAISettingsBody accetta baseUrl valido", () => {
  assert.deepEqual(parseLocalAISettingsBody('{"baseUrl":"http://localhost:11434"}'), {
    baseUrl: "http://localhost:11434"
  });
});

test("parseLocalAISettingsBody accetta endpoint valido come alias leggibile", () => {
  assert.deepEqual(parseLocalAISettingsBody('{"endpoint":"http://localhost:11434"}'), {
    baseUrl: "http://localhost:11434"
  });
});

test("parseLocalAISettingsBody accetta baseUrl ed endpoint uguali", () => {
  assert.deepEqual(
    parseLocalAISettingsBody('{"baseUrl":"http://localhost:11434","endpoint":"http://localhost:11434"}'),
    {
      baseUrl: "http://localhost:11434"
    }
  );
});

test("parseLocalAISettingsBody rifiuta baseUrl ed endpoint diversi", () => {
  assert.deepEqual(
    parseLocalAISettingsBody('{"baseUrl":"http://localhost:11434","endpoint":"http://192.168.1.50:11434"}'),
    {
      error: "I campi `baseUrl` ed `endpoint`, se presenti entrambi, devono coincidere."
    }
  );
});

test("parseLocalAISettingsBody rifiuta body senza baseUrl e endpoint", () => {
  assert.deepEqual(parseLocalAISettingsBody('{"provider":"ollama-local"}'), {
    error: "Il body deve contenere `baseUrl` oppure `endpoint`."
  });
});

test("parseLocalAISettingsBody mantiene la validazione per valori non validi", () => {
  assert.deepEqual(parseLocalAISettingsBody('{"baseUrl":123}'), {
    error: "Il campo `baseUrl`, se presente, deve essere una stringa."
  });
  assert.deepEqual(parseLocalAISettingsBody('{"endpoint":123}'), {
    error: "Il campo `endpoint`, se presente, deve essere una stringa."
  });
});

test("isLocalhostLocalAIBaseUrl distingue localhost da endpoint LAN", () => {
  assert.equal(isLocalhostLocalAIBaseUrl("http://localhost:11434"), true);
  assert.equal(isLocalhostLocalAIBaseUrl("http://127.0.0.1:11434"), true);
  assert.equal(isLocalhostLocalAIBaseUrl("http://192.168.1.50:11434"), false);
});

test("getLocalAISettings restituisce una configurazione valida e coerente", () => {
  const settings = getLocalAISettings();

  assert.equal(settings.provider, "ollama-local");
  assert.equal(settings.baseUrl.length > 0, true);
  assert.equal(typeof settings.isDefault, "boolean");
  assert.equal(typeof settings.isLocalhost, "boolean");
  assert.equal(
    settings.isDefault ? settings.baseUrl === defaultLocalAIBaseUrl : settings.baseUrl !== defaultLocalAIBaseUrl,
    true
  );
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
