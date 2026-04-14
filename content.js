(() => {
  const OUTER_WRAP = "\"\"\"\"\"\"";
  const INNER_WRAP = "``````";
  const DISCLAIMER = "[Disclaimer: markdown formatting is lost in the pasted text, but artifacts of triple backtick formatting may include guesses at language names (e.g. python, json, vbnet, etc.) that were not part of the original message. It will be clear, this disclaimer is just to say you can safely disregard]";

  const SITES_CONFIG = {
    "gemini.google.com": {
      name: "Gemini",
      selector: "user-query, model-response",
      getRole: (el) => (el.matches("user-query") ? "User" : "Assistant"),
      textSelectors: {
        User: [
          ".query-text",
          "user-query-content",
          "div[class*=\"query-content\"]"
        ],
        Assistant: [
          "message-content",
          ".message-content",
          ".markdown"
        ]
      },
      noisePatterns: [
        /^You said$/i,
        /^Gemini said$/i,
        /^Show thinking$/i,
        /^Sources$/i,
        /^\+\d+$/
      ]
    },
    "chat.ai.jh.edu": {
      name: "HopGPT",
      selector: "[aria-label^=\"Message \"]",
      getRole: (el) => (el.querySelector(".user-turn") ? "User" : "Assistant"),
      textSelectors: {
        User: [".message-content"],
        Assistant: [".message-content"]
      },
      noisePatterns: [/Copy code/i]
    }
  };

  const getConfig = () => SITES_CONFIG[window.location.hostname];

  const getPreferredTextRoot = (element, role, config) => {
    const selectors = config.textSelectors[role] || [];

    for (const selector of selectors) {
      const match = element.querySelector(selector);

      if (match?.innerText?.trim()) {
        return match;
      }
    }

    return element;
  };

  const isNoiseLine = (line, config) => {
    const normalizedLine = line.trim();

    if (!normalizedLine) {
      return false;
    }

    return config.noisePatterns.some((pattern) => pattern.test(normalizedLine));
  };

  const normalizeMessageText = (text, config) =>
    text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .filter((line) => !isNoiseLine(line, config))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const getMessageText = (element, role, config) =>
    normalizeMessageText(getPreferredTextRoot(element, role, config).innerText, config);

  const buildFormattedConversation = (messages) =>
    [
      OUTER_WRAP,
      DISCLAIMER,
      ...messages.flatMap(({ role, text }) => [
        `${role}:`,
        INNER_WRAP,
        text,
        INNER_WRAP
      ]),
      OUTER_WRAP
    ].join("\n");

  const extractConversation = () => {
    const config = getConfig();

    if (!config) {
      throw new Error(`This site (${window.location.hostname}) is not supported.`);
    }

    const elements = Array.from(document.querySelectorAll(config.selector));
    const messages = elements
      .map((element) => {
        const role = config.getRole(element);

        return {
          role,
          text: getMessageText(element, role, config)
        };
      })
      .filter(({ text }) => text.length > 0);

    if (messages.length === 0) {
      throw new Error(`No ${config.name} messages were found on this page.`);
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
