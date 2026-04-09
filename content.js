(() => {
  const OUTER_WRAP = "\"\"\"\"\"\"";
  const INNER_WRAP = "``````";
  const SELECTOR = "user-query, model-response";

  const getRole = (element) =>
    element.matches("user-query") ? "User" : "Assistant";

  const getMessageText = (element) =>
    element.innerText.replace(/\r\n/g, "\n").trim();

  const buildFormattedConversation = (messages) =>
    [
      OUTER_WRAP,
      ...messages.flatMap(({ role, text }) => [
        `${role}:`,
        INNER_WRAP,
        text,
        INNER_WRAP
      ]),
      OUTER_WRAP
    ].join("\n");

  const extractConversation = () => {
    if (window.location.hostname !== "gemini.google.com") {
      throw new Error("Open a conversation on gemini.google.com first.");
    }

    const elements = Array.from(document.querySelectorAll(SELECTOR));
    const messages = elements
      .map((element) => ({
        role: getRole(element),
        text: getMessageText(element)
      }))
      .filter(({ text }) => text.length > 0);

    if (messages.length === 0) {
      throw new Error("No Gemini messages were found on this page.");
    }

    return {
      success: true,
      text: buildFormattedConversation(messages)
    };
  };

  window.__extractGeminiConversation = () => {
    try {
      return extractConversation();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to copy the conversation."
      };
    }
  };
})();
