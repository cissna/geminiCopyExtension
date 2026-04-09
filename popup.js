const copyButton = document.getElementById("copyButton");
const statusMessage = document.getElementById("status");

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : "Unable to copy the conversation.";

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
      func: () => window.__extractGeminiConversation()
    });

    if (!result?.success || !result.text) {
      throw new Error(result?.error || "Unable to read the conversation.");
    }

    await navigator.clipboard.writeText(result.text);
    showStatus("Copied!", "success");
  } catch (error) {
    showStatus(getErrorMessage(error), "error");
  } finally {
    setLoadingState(false);
  }
});
