(function () {
    var generateButton = document.getElementById("generate-document");
    var statusMessage = document.getElementById("status-message");
    var documentOutput = document.getElementById("document-output");
  
    function displaySavedDocument() {
      var savedDocument = PrototypeStore.getDocument();
  
      if (savedDocument) {
        documentOutput.textContent = JSON.stringify(savedDocument, null, 2);
        statusMessage.textContent = "Previously generated document loaded.";
      }
    }
  
    generateButton.addEventListener("click", async function () {
      var interactionId = PrototypeStore.getInteractionId();
  
      if (!interactionId) {
        statusMessage.textContent =
          "No consultation was found. Start a consultation first.";
        return;
      }
  
      generateButton.disabled = true;
      statusMessage.textContent = "Generating document…";
  
      try {
        var response = await fetch("/api/create-document", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            interactionId: interactionId
          })
        });
  
        var result = await response.json();
  
        if (!response.ok || result.error) {
          throw new Error(result.error || "Document generation failed.");
        }
  
        PrototypeStore.setDocument(result.document);
  
        documentOutput.textContent = JSON.stringify(
          result.document,
          null,
          2
        );
  
        statusMessage.textContent = "Document generated successfully.";
      } catch (error) {
        console.error(error);
  
        statusMessage.textContent =
          error.message || "Document generation failed.";
      } finally {
        generateButton.disabled = false;
      }
    });
  
    displaySavedDocument();
  })();
  