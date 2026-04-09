(() => {
  const OUTER_WRAP = "\"\"\"\"\"\"";
  const INNER_WRAP = "``````";
  const SELECTOR = "user-query, model-response";
  const USER_TEXT_SELECTORS = [
    ".query-text",
    "user-query-content",
    "div[class*=\"query-content\"]"
  ];
  const ASSISTANT_TEXT_SELECTORS = [
    "message-content",
    ".message-content",
    ".markdown"
  ];
  const COMMON_NOISE_LINES = [/^You said$/i, /^Gemini said$/i, /^Show thinking$/i];
  const ASSISTANT_NOISE_LINES = [/^Sources$/i, /^\+\d+$/];

  const getRole = (element) =>
    element.matches("user-query") ? "User" : "Assistant";

  const getPreferredTextRoot = (element) => {
    const selectors = element.matches("user-query")
      ? USER_TEXT_SELECTORS
      : ASSISTANT_TEXT_SELECTORS;

    for (const selector of selectors) {
      const match = element.querySelector(selector);

      if (match?.innerText?.trim()) {
        return match;
      }
    }

    return element;
  };

  const isNoiseLine = (line, role) => {
    const normalizedLine = line.trim();

    if (!normalizedLine) {
      return false;
    }

    if (COMMON_NOISE_LINES.some((pattern) => pattern.test(normalizedLine))) {
      return true;
    }

    if (
      role === "Assistant" &&
      ASSISTANT_NOISE_LINES.some((pattern) => pattern.test(normalizedLine))
    ) {
      return true;
    }

    return false;
  };

  const normalizeMessageText = (text, role) =>
    text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .filter((line) => !isNoiseLine(line, role))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const getMessageText = (element, role) =>
    normalizeMessageText(getPreferredTextRoot(element).innerText, role);

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
      .map((element) => {
        const role = getRole(element);

        return {
          role,
          text: getMessageText(element, role)
        };
      })
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
