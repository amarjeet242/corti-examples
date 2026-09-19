(function () {
    var keys = {
      interactionId: "ambient-prototype-interaction-id",
      transcripts: "ambient-prototype-transcripts",
      facts: "ambient-prototype-facts",
      document: "ambient-prototype-document"
    };
  
    function readJson(key, fallback) {
      var value = sessionStorage.getItem(key);
  
      if (!value) {
        return fallback;
      }
  
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error("Could not read stored data:", error);
        return fallback;
      }
    }
  
    function writeJson(key, value) {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  
    function getInteractionId() {
      return sessionStorage.getItem(keys.interactionId);
    }
  
    function setInteractionId(interactionId) {
      if (interactionId) {
        sessionStorage.setItem(keys.interactionId, interactionId);
      } else {
        sessionStorage.removeItem(keys.interactionId);
      }
    }
  
    function getTranscripts() {
      return readJson(keys.transcripts, []);
    }
  
    function addTranscript(transcript) {
      var transcripts = getTranscripts();
      transcripts.push(transcript);
      writeJson(keys.transcripts, transcripts);
    }
  
    function getFacts() {
      return readJson(keys.facts, []);
    }
  
    function addFact(fact) {
      var facts = getFacts();
      facts.push(fact);
      writeJson(keys.facts, facts);
    }
  
    function getDocument() {
      return readJson(keys.document, null);
    }
  
    function setDocument(documentData) {
      writeJson(keys.document, documentData);
    }
  
    function clearConsultation() {
      Object.keys(keys).forEach(function (name) {
        sessionStorage.removeItem(keys[name]);
      });
    }
  
    window.PrototypeStore = {
      getInteractionId: getInteractionId,
      setInteractionId: setInteractionId,
      getTranscripts: getTranscripts,
      addTranscript: addTranscript,
      getFacts: getFacts,
      addFact: addFact,
      getDocument: getDocument,
      setDocument: setDocument,
      clearConsultation: clearConsultation
    };
  })();
  