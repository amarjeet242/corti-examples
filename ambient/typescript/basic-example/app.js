(function () {
  "use strict";

  var session = null;
  var startedAt = null;
  var timerHandle = null;
  var elements = {
    start: document.getElementById("start-consultation"), end: document.getElementById("end-consultation"), status: document.getElementById("status-message"),
    transcript: document.getElementById("transcript-output"), transcriptEmpty: document.getElementById("transcript-empty"),
    factsEditor: document.getElementById("facts-editor"), factsEmpty: document.getElementById("facts-empty"), factsCount: document.getElementById("facts-count"),
    generate: document.getElementById("generate-document"), documentOutput: document.getElementById("document-output"), documentSubtitle: document.getElementById("document-subtitle"),
    copy: document.getElementById("copy-document"), download: document.getElementById("download-document"), addFact: document.getElementById("add-fact"),
    headerStatus: document.getElementById("header-status-text"), headerDot: document.getElementById("header-status-dot"), headerTimer: document.getElementById("header-timer"), dockTimer: document.getElementById("dock-timer"),
    mic: document.getElementById("mic-indicator"), recordingLabel: document.getElementById("recording-label"), recordingDetail: document.getElementById("recording-detail")
  };

  function id() { return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "fact-" + Date.now() + "-" + Math.random().toString(16).slice(2); }
  function setStatus(message) { elements.status.textContent = message; }
  function elapsed(milliseconds) { var seconds = Math.max(0, Math.floor(milliseconds / 1000)); return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map(function (part) { return String(part).padStart(2, "0"); }).join(":"); }
  function updateTimer() { var value = startedAt ? elapsed(Date.now() - startedAt) : "00:00:00"; elements.headerTimer.textContent = value; elements.dockTimer.textContent = value; }
  function beginTimer() { startedAt = Date.now(); updateTimer(); window.clearInterval(timerHandle); timerHandle = window.setInterval(updateTimer, 1000); }
  function stopTimer() { window.clearInterval(timerHandle); timerHandle = null; }
  function setRecording(isRecording) {
    elements.start.disabled = isRecording; elements.end.disabled = !isRecording;
    elements.headerStatus.textContent = isRecording ? "Recording" : "Ready"; elements.headerDot.classList.toggle("live", isRecording); elements.mic.classList.toggle("live", isRecording);
    elements.recordingLabel.textContent = isRecording ? "Recording" : "Ready to record";
    elements.recordingDetail.textContent = isRecording ? "Streaming securely to the active Corti session." : "Microphone access is requested only when recording starts.";
  }

  function transcriptSegments(message) {
    var data = message && (message.data || message); var list = Array.isArray(data) ? data : (data && (data.segments || data.transcripts));
    if (!Array.isArray(list)) list = [data];
    return list.map(function (value) { return typeof value === "string" ? { text: value } : { text: String((value && (value.transcript || value.text || value.content)) || "").trim(), speaker: value && (value.speaker || value.participant || value.role) }; }).filter(function (value) { return value.text; });
  }
  function normaliseFact(value) {
    value = value && (value.data || value);
    if (typeof value === "string") return { id: id(), text: value, group: "Other", source: "user" };
    return { id: value && value.id ? String(value.id) : id(), text: String((value && (value.text || value.value || value.content)) || "").trim(), group: String((value && value.group) || "Other"), source: String((value && value.source) || "core") };
  }
  function facts() { return PrototypeStore.getFacts().map(normaliseFact).filter(function (fact) { return fact.text || fact.source === "user"; }); }
  function saveFacts(nextFacts) { PrototypeStore.replaceFacts(nextFacts); renderFacts(); }

  function renderTranscript() {
    var entries = PrototypeStore.getTranscripts(); elements.transcript.replaceChildren();
    if (!entries.length) { elements.transcript.appendChild(elements.transcriptEmpty); return; }
    entries.forEach(function (entry) {
      var line = document.createElement("article"), avatar = document.createElement("span"), content = document.createElement("div"), meta = document.createElement("div"), text = document.createElement("p");
      var clinician = String(entry.speaker || "").toLowerCase() === "doctor" || String(entry.speaker || "").toLowerCase() === "clinician";
      line.className = "transcript-line"; avatar.className = "avatar speaker-avatar" + (clinician ? " clinician" : ""); avatar.textContent = clinician ? "C" : "P"; meta.className = "line-meta"; meta.textContent = entry.timeLabel || "Live"; text.className = "line-text"; text.textContent = entry.text || String(entry); content.append(meta, text); line.append(avatar, content); elements.transcript.appendChild(line);
    });
    elements.transcript.scrollTop = elements.transcript.scrollHeight;
  }
  function renderFacts() {
    var currentFacts = facts(); elements.factsEditor.replaceChildren(); elements.factsEmpty.hidden = currentFacts.length > 0; elements.factsCount.textContent = String(currentFacts.filter(function (fact) { return fact.text.trim(); }).length);
    currentFacts.forEach(function (fact, index) {
      var wrapper = document.createElement("article"), label = document.createElement("label"), textarea = document.createElement("textarea"), remove = document.createElement("button");
      wrapper.className = "fact-editor"; label.htmlFor = "fact-" + index; label.textContent = fact.group + " · " + (fact.source === "user" ? "edited" : "extracted"); textarea.id = label.htmlFor; textarea.value = fact.text; textarea.maxLength = 4000; textarea.setAttribute("aria-label", "Edit " + fact.group + " fact");
      textarea.addEventListener("input", function () { var changed = facts(); var match = changed.find(function (item) { return item.id === fact.id; }); if (match) { match.text = textarea.value; match.source = "user"; PrototypeStore.replaceFacts(changed); elements.factsCount.textContent = String(changed.filter(function (item) { return item.text.trim(); }).length); } });
      remove.type = "button"; remove.className = "remove-fact"; remove.textContent = "×"; remove.title = "Remove fact from this local draft"; remove.setAttribute("aria-label", "Remove " + fact.group + " fact"); remove.addEventListener("click", function () { saveFacts(facts().filter(function (item) { return item.id !== fact.id; })); setStatus("Fact removed from the local draft."); });
      wrapper.append(label, textarea, remove); elements.factsEditor.appendChild(wrapper);
    });
  }
  function documentText(documentData) { var sections = documentData && (documentData.sections || (documentData.document && documentData.document.sections)); return Array.isArray(sections) ? sections.map(function (section) { return (section.name || section.key || "Section") + "\n" + (section.text || section.content || ""); }).join("\n\n") : JSON.stringify(documentData, null, 2); }
  function renderDocument() {
    var documentData = PrototypeStore.getDocument(); elements.documentOutput.replaceChildren(); elements.copy.disabled = !documentData; elements.download.disabled = !documentData;
    if (!documentData) { var placeholder = document.createElement("div"), icon = document.createElement("span"), message = document.createElement("p"); placeholder.className = "document-placeholder"; icon.setAttribute("aria-hidden", "true"); icon.textContent = "✦"; message.textContent = "Your generated clinical note will appear here."; placeholder.append(icon, message); elements.documentOutput.appendChild(placeholder); return; }
    var sections = documentData.sections || (documentData.document && documentData.document.sections);
    if (Array.isArray(sections) && sections.length) { sections.forEach(function (section) { var block = document.createElement("article"), heading = document.createElement("h4"), text = document.createElement("p"); block.className = "document-block"; heading.textContent = section.name || section.key || "Clinical note"; text.textContent = section.text || section.content || "No content generated."; block.append(heading, text); elements.documentOutput.appendChild(block); }); }
    else { var fallback = document.createElement("article"), title = document.createElement("h4"), value = document.createElement("pre"); fallback.className = "document-block"; title.textContent = documentData.name || "Generated consultation document"; value.textContent = documentText(documentData); fallback.append(title, value); elements.documentOutput.appendChild(fallback); }
    elements.documentSubtitle.textContent = "Generated locally from the reviewed facts.";
  }
  function handleTranscript(message) { var entries = PrototypeStore.getTranscripts(); transcriptSegments(message).forEach(function (part) { entries.push({ text: part.text, speaker: String(part.speaker || "patient").toLowerCase(), timeLabel: elapsed(Date.now() - (startedAt || Date.now())) }); }); PrototypeStore.replaceTranscripts(entries); renderTranscript(); }
  function handleFact(message) { var data = message && (message.data || message); var list = (message && (message.fact || message.facts)) || (data && (data.fact || data.facts)) || data; if (!Array.isArray(list)) list = [list]; var currentFacts = facts(); list.map(normaliseFact).filter(function (fact) { return fact.text; }).forEach(function (fact) { if (!currentFacts.some(function (current) { return current.id === fact.id || current.text === fact.text; })) currentFacts.push(fact); }); saveFacts(currentFacts); }
  async function json(response) { var contentType = response.headers.get("content-type") || ""; if (!contentType.includes("application/json")) throw new Error("The server returned an unexpected response."); var data = await response.json(); if (!response.ok || data.error) throw new Error(data.error || "Request failed."); return data; }

  elements.start.addEventListener("click", async function () {
    elements.start.disabled = true; setStatus("Preparing a scoped recording session…");
    try { PrototypeStore.clearConsultation(); renderTranscript(); renderFacts(); renderDocument(); var data = await json(await fetch("/api/start-session", { method: "POST", headers: { "Accept": "application/json" }, credentials: "same-origin" })); PrototypeStore.setInteractionId(data.interactionId); session = await AmbientScribe.startSession({ accessToken: data.accessToken, interactionId: data.interactionId, tenantName: data.tenantName, environment: data.environment, mode: "single", onTranscript: handleTranscript, onFact: handleFact }); beginTimer(); setRecording(true); setStatus("Recording. Live transcript and extracted facts will appear as Corti sends them."); }
    catch (error) { session = null; setRecording(false); setStatus(error && error.message ? error.message : "Could not start the consultation."); console.error("Consultation start failed."); }
  });
  elements.end.addEventListener("click", async function () { if (!session) return; elements.end.disabled = true; setStatus("Ending recording and waiting for the session to close…"); try { await session.endConsultation(); session = null; stopTimer(); setRecording(false); setStatus("Recording ended. Review facts, edit as needed, then generate the document."); } catch (error) { elements.end.disabled = false; setStatus(error && error.message ? error.message : "Could not end the consultation."); console.error("Consultation end failed."); } });
  elements.addFact.addEventListener("click", function () { var currentFacts = facts(); currentFacts.push({ id: id(), text: "", group: "Other", source: "user" }); saveFacts(currentFacts); var editors = elements.factsEditor.querySelectorAll("textarea"); if (editors.length) editors[editors.length - 1].focus(); setStatus("Added a local fact. It will be included when you generate the document."); });
  elements.generate.addEventListener("click", async function () {
    var interactionId = PrototypeStore.getInteractionId(), currentFacts = facts().filter(function (fact) { return fact.text.trim(); });
    if (!interactionId) { setStatus("Start a consultation before generating a document."); return; } if (!currentFacts.length) { setStatus("Add or wait for at least one fact before generating a document."); return; }
    elements.generate.disabled = true; setStatus("Generating document from the reviewed facts…");
    try { var result = await json(await fetch("/api/create-document", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, credentials: "same-origin", body: JSON.stringify({ interactionId: interactionId, facts: currentFacts.map(function (fact) { return { text: fact.text, group: fact.group }; }) }) })); PrototypeStore.setDocument(result.document); renderDocument(); setStatus("Document generated. It remains in this browser tab until you start a new consultation."); }
    catch (error) { setStatus(error && error.message ? error.message : "Document generation failed."); console.error("Document generation failed."); }
    finally { elements.generate.disabled = false; }
  });
  elements.copy.addEventListener("click", async function () { var documentData = PrototypeStore.getDocument(); if (!documentData) return; try { await navigator.clipboard.writeText(documentText(documentData)); setStatus("Document copied to the local clipboard."); } catch (_error) { setStatus("Clipboard access was not available. Use Download instead."); } });
  elements.download.addEventListener("click", function () { var documentData = PrototypeStore.getDocument(); if (!documentData) return; var url = URL.createObjectURL(new Blob([documentText(documentData)], { type: "text/plain;charset=utf-8" })); var link = document.createElement("a"); link.href = url; link.download = "consultation-document.txt"; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 0); setStatus("Document downloaded to your browser's download location."); });
  setRecording(false); updateTimer(); renderTranscript(); renderFacts(); renderDocument();
}());
