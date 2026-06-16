(function () {
  var script = document.currentScript;
  if (!script) return;

  var marinaId = script.getAttribute("data-marina");
  var apiKey = script.getAttribute("data-key");
  var appUrl = script.getAttribute("data-app-url") || "http://localhost:3000";
  var width = script.getAttribute("data-width") || "100%";
  var height = script.getAttribute("data-height") || "600";

  if (!marinaId) {
    console.error("[MarinaHub] data-marina attribute is required");
    return;
  }

  if (!apiKey) {
    console.error("[MarinaHub] data-key attribute is required");
    return;
  }

  var container = document.createElement("div");
  container.id = "marinahub-widget-" + marinaId;
  script.parentNode.insertBefore(container, script.nextSibling);

  var iframe = document.createElement("iframe");
  iframe.src = appUrl + "/embed/" + marinaId;
  iframe.width = width;
  iframe.height = height;
  iframe.frameBorder = "0";
  iframe.style.border = "none";
  iframe.style.borderRadius = "12px";
  iframe.style.boxShadow = "0 4px 24px rgba(0,0,0,0.08)";
  iframe.title = "MarinaHub Booking Widget";
  iframe.allow = "payment";

  function sendApiKey() {
    if (!iframe.contentWindow || !apiKey) return;
    iframe.contentWindow.postMessage(
      {
        type: "MARINAHUB_WIDGET_KEY",
        marinaId: marinaId,
        key: apiKey,
      },
      appUrl
    );
  }

  iframe.addEventListener("load", sendApiKey);

  window.addEventListener("message", function (event) {
    if (event.origin !== new URL(appUrl).origin) return;
    if (
      event.data &&
      event.data.type === "MARINAHUB_WIDGET_READY" &&
      event.data.marinaId === marinaId
    ) {
      sendApiKey();
    }
  });

  container.appendChild(iframe);
})();
