(function () {
  "use strict";

  // Session storage is deliberately tab-scoped: this prototype does not persist
  // consultation content after the browser tab is closed.
  var keys = {
    interactionId: "ambient-prototype-interaction-id",
    transcripts: "ambient-prototype-transcripts",
    facts: "ambient-prototype-facts",
    document: "ambient-prototype-document"
  };

  function readJson(key, fallback) {
    var value = sessionStorage.getItem(key);
    if (!value) return fallback;
    try { return JSON.parse(value); }
    catch (_error) { sessionStorage.removeItem(key); return fallback; }
  }
  function writeJson(key, value) { sessionStorage.setItem(key, JSON.stringify(value)); }
  function getList(key) { var value = readJson(key, []); return Array.isArray(value) ? value : []; }

  window.PrototypeStore = {
    getInteractionId: function () { return sessionStorage.getItem(keys.interactionId); },
    setInteractionId: function (interactionId) { if (interactionId) sessionStorage.setItem(keys.interactionId, interactionId); else sessionStorage.removeItem(keys.interactionId); },
    getTranscripts: function () { return getList(keys.transcripts); },
    addTranscript: function (transcript) { var transcripts = getList(keys.transcripts); transcripts.push(transcript); writeJson(keys.transcripts, transcripts); },
    replaceTranscripts: function (transcripts) { writeJson(keys.transcripts, Array.isArray(transcripts) ? transcripts : []); },
    getFacts: function () { return getList(keys.facts); },
    addFact: function (fact) { var facts = getList(keys.facts); facts.push(fact); writeJson(keys.facts, facts); },
    replaceFacts: function (facts) { writeJson(keys.facts, Array.isArray(facts) ? facts : []); },
    getDocument: function () { return readJson(keys.document, null); },
    setDocument: function (documentData) { writeJson(keys.document, documentData); },
    clearConsultation: function () { Object.keys(keys).forEach(function (name) { sessionStorage.removeItem(keys[name]); }); }
  };
}());
