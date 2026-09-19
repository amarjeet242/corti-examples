(function () {
    var output = document.getElementById("facts-output");
    var facts = PrototypeStore.getFacts();
  
    if (facts.length === 0) {
      return;
    }
  
    output.replaceChildren();
  
    facts.forEach(function (fact, index) {
      var article = document.createElement("article");
      var heading = document.createElement("h2");
      var contents = document.createElement("pre");
  
      heading.textContent = "Fact message " + (index + 1);
  
      if (typeof fact === "string") {
        contents.textContent = fact;
      } else {
        contents.textContent = JSON.stringify(fact, null, 2);
      }
  
      article.appendChild(heading);
      article.appendChild(contents);
      output.appendChild(article);
    });
  })();
  