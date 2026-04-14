(() => {
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

  const getMaxConsecutive = (text, char) => {
    const regex = new RegExp(`${char}+`, "g");
    const matches = text.match(regex) || [];
    return matches.reduce((max, match) => Math.max(max, match.length), 0);
  };

  const buildFormattedConversation = (messages) => {
    const allText = messages.map(m => m.text).join("\n");
    const maxBackticks = getMaxConsecutive(allText, "`");
    const maxQuotes = getMaxConsecutive(allText, "\"");

    const innerCount = (Math.floor(maxBackticks / 3) + 1) * 3;
    const outerCount = (Math.floor(maxQuotes / 3) + 1) * 3;

    const innerWrap = "`".repeat(innerCount);
    const outerWrap = "\"".repeat(outerCount);

    return [
      outerWrap,
      DISCLAIMER,
      ...messages.flatMap(({ role, text }) => [
        `${role}:`,
        innerWrap,
        text,
        innerWrap
      ]),
      outerWrap
    ].join("\n");
  };

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
