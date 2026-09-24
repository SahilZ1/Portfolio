/**
 * AI provider abstraction.
 *
 * The application must work with no AI key configured -- that is a hard
 * requirement, not a nicety. `resolveProvider()` returns a null provider when
 * `AI_PROVIDER=none` or no key is present, and every caller handles that as an
 * ordinary state rather than an error. The dashboard then shows deterministic,
 * rule-based insights instead, and nothing degrades.
 *
 * Providers are selected by environment variable so a key can be added later
 * without touching code. Adding a provider means implementing one method:
 *
 *   async complete({ system, user, maxTokens }) -> string
 */

const { config } = require("../config");
const logger = require("../utils/logger");

/**
 * Anthropic Messages API.
 * Called over plain fetch rather than pulling in an SDK: this is one POST with
 * a JSON body, and a dependency would be more surface than substance.
 */
class AnthropicProvider {
  constructor({ apiKey, model, timeoutMs }) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.name = "anthropic";
  }

  async complete({ system, user, maxTokens = 1200 }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });

      if (!response.ok) {
        // The response body can echo request detail; log the status only.
        throw new Error(`Anthropic API returned ${response.status}`);
      }

      const payload = await response.json();
      const text = (payload.content ?? [])
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!text) throw new Error("Empty completion from provider");
      return text;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * OpenAI-compatible Chat Completions. Covers OpenAI itself and the many
 * services that expose the same shape, via AI_BASE_URL.
 */
class OpenAICompatibleProvider {
  constructor({ apiKey, model, timeoutMs, baseUrl }) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.baseUrl = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    this.name = "openai";
  }

  async complete({ system, user, maxTokens = 1200 }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (!response.ok) throw new Error(`Provider API returned ${response.status}`);

      const payload = await response.json();
      const text = payload.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty completion from provider");
      return text;
    } finally {
      clearTimeout(timer);
    }
  }
}

let cachedProvider;

/**
 * @returns {{ name: string, complete: Function } | null} null when AI is not
 *          configured, which is a supported and fully functional state.
 */
function resolveProvider() {
  if (cachedProvider !== undefined) return cachedProvider;

  const { provider, apiKey, model, timeoutMs } = config.ai;

  if (provider === "none" || !provider) {
    cachedProvider = null;
    return cachedProvider;
  }
  if (!apiKey) {
    logger.warn("AI_PROVIDER is set but AI_API_KEY is empty; falling back to deterministic insights.");
    cachedProvider = null;
    return cachedProvider;
  }

  switch (provider) {
    case "anthropic":
      cachedProvider = new AnthropicProvider({ apiKey, model, timeoutMs });
      break;
    case "openai":
      cachedProvider = new OpenAICompatibleProvider({
        apiKey,
        model,
        timeoutMs,
        baseUrl: process.env.AI_BASE_URL,
      });
      break;
    default:
      logger.warn("Unknown AI_PROVIDER; falling back to deterministic insights.", { provider });
      cachedProvider = null;
  }

  return cachedProvider;
}

/** Test seam: lets the suite install a stub provider. */
function __setProviderForTests(provider) {
  cachedProvider = provider;
}

module.exports = { resolveProvider, __setProviderForTests, AnthropicProvider, OpenAICompatibleProvider };
