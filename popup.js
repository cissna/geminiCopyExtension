const copyButton = document.getElementById("copyButton");
const statusMessage = document.getElementById("status");

const showStatus = (message, type) => {
  statusMessage.textContent = message;
  statusMessage.className = type;
  statusMessage.style.display = "block";
};

const setLoadingState = (isLoading) => {
  copyButton.disabled = isLoading;
  copyButton.textContent = isLoading ? "Copying..." : "Copy Chat";
};

const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active tab was found.");
  }

  return tab;
};

copyButton.addEventListener("click", async () => {
  statusMessage.style.display = "none";
  statusMessage.className = "";
  setLoadingState(true);

  try {
    const tab = await getActiveTab();

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__geminiCopyResult
    });

    if (!result?.success) {
      throw new Error(result?.error || "Unable to copy the conversation.");
    }

    showStatus("Copied!", "success");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to copy the conversation.";
    showStatus(message, "error");
  } finally {
    setLoadingState(false);
  }
});
