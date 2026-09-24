/**
 * Terminal prompts, with a working hidden-input mode.
 *
 * Why this is hand-rolled rather than using readline
 * --------------------------------------------------
 * `readline` has no hidden-input mode. The usual workaround is to monkey-patch
 * the interface's write path so keystroke echoes are swallowed — and that is
 * exactly what broke on Windows PowerShell.
 *
 * The previous implementation assumed the FIRST write after `question()` was
 * the prompt text, and let it through before muting everything after it. On
 * Windows, readline emits cursor-positioning sequences before the prompt, so
 * the "first write" was a control sequence: the flag was spent on it, and the
 * actual prompt text was then swallowed along with the echoes. The result was
 * a cursor sitting on a blank line with no indication anything was wanted —
 * indistinguishable from a hang.
 *
 * Creating a second readline interface for the confirmation prompt made it
 * worse: closing the first one pauses stdin, and the replacement frequently
 * never receives input at all.
 *
 * This implementation instead reads stdin in raw mode and handles keypresses
 * directly. The prompt is written to the output stream by us, before any
 * muting is possible, so it cannot be suppressed by anything. Nothing is
 * echoed for hidden input. There are no readline internals involved, and one
 * mechanism serves every prompt, so there is no interface lifecycle to get
 * wrong.
 *
 * The functions take their streams as arguments so the behaviour can be tested
 * without a real terminal.
 */

const readline = require("readline");

/** Raised when the user cancels with Ctrl+C. */
class PromptCancelled extends Error {
  constructor() {
    super("Cancelled by user.");
    this.name = "PromptCancelled";
    this.cancelled = true;
  }
}

const KEY = {
  ENTER_CR: "\r",
  ENTER_LF: "\n",
  CTRL_C: "",
  CTRL_D: "",
  BACKSPACE: "",
  BACKSPACE_ALT: "\b",
  ESCAPE: "",
};

/**
 * Read one line from a raw-mode TTY.
 *
 * @param {object}  options
 * @param {NodeJS.ReadStream}  options.input
 * @param {NodeJS.WriteStream} options.output
 * @param {string}  options.question  written to `output` before reading
 * @param {boolean} options.hidden    when true, nothing is echoed
 * @returns {Promise<string>}
 */
function readFromTty({ input, output, question, hidden }) {
  return new Promise((resolve, reject) => {
    // The prompt is written directly, by us, before raw mode is entered.
    // Nothing downstream can swallow it — which is the whole point.
    output.write(question);

    let value = "";
    // Tracks an in-progress ANSI escape sequence (arrow keys, function keys),
    // so those never end up in the value as stray characters.
    let inEscape = false;
    let settled = false;

    const restore = () => {
      if (settled) return;
      settled = true;
      input.removeListener("data", onData);
      // Restore the terminal before returning, or the caller's shell is left
      // in raw mode with echo off.
      if (typeof input.setRawMode === "function") input.setRawMode(false);
      input.pause();
    };

    const finish = (result) => {
      restore();
      output.write("\n");
      resolve(result);
    };

    const onData = (chunk) => {
      // A single data event can carry several characters: fast typing, a
      // paste, or a multi-byte escape sequence. Process character by character.
      for (const char of String(chunk)) {
        if (inEscape) {
          // Escape sequences end on a letter or tilde.
          if (/[A-Za-z~]/.test(char)) inEscape = false;
          continue;
        }

        if (char === KEY.ESCAPE) {
          inEscape = true;
          continue;
        }

        if (char === KEY.ENTER_CR || char === KEY.ENTER_LF) {
          return finish(value);
        }

        if (char === KEY.CTRL_C) {
          restore();
          output.write("\n");
          return reject(new PromptCancelled());
        }

        if (char === KEY.CTRL_D) {
          // EOF: submit whatever has been typed so far.
          return finish(value);
        }

        if (char === KEY.BACKSPACE || char === KEY.BACKSPACE_ALT) {
          if (value.length > 0) {
            value = value.slice(0, -1);
            // Only visible input needs its echo erased. Hidden input never
            // wrote anything, so there is nothing to rub out — and emitting
            // anything here would leak the length.
            if (!hidden) output.write("\b \b");
          }
          continue;
        }

        // Ignore any remaining control characters.
        if (char < " ") continue;

        value += char;
        if (!hidden) output.write(char);
      }
      return undefined;
    };

    input.setEncoding("utf8");
    if (typeof input.setRawMode === "function") input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

/**
 * Read one line when stdin is not a terminal (piped or redirected).
 *
 * Hiding input is impossible without a TTY, so for a hidden prompt this warns
 * rather than silently echoing a password the caller believed was concealed.
 */
function readFromPipe({ input, output, question, hidden }) {
  return new Promise((resolve, reject) => {
    if (hidden) {
      output.write(
        "  (stdin is not a terminal — input cannot be hidden)\n"
      );
    }
    output.write(question);

    const rl = readline.createInterface({ input, output: undefined, terminal: false });
    let resolved = false;

    rl.once("line", (line) => {
      resolved = true;
      rl.close();
      resolve(line);
    });

    rl.once("close", () => {
      if (!resolved) reject(new Error("No input received on stdin."));
    });
  });
}

/**
 * Prompt for a line of input.
 *
 * @param {string} question
 * @param {object} [options]
 * @param {boolean} [options.hidden=false]  suppress echo (passwords)
 * @param {NodeJS.ReadStream}  [options.input=process.stdin]
 * @param {NodeJS.WriteStream} [options.output=process.stdout]
 * @returns {Promise<string>}
 */
function prompt(question, { hidden = false, input = process.stdin, output = process.stdout } = {}) {
  const isTty = Boolean(input.isTTY) && typeof input.setRawMode === "function";
  return isTty
    ? readFromTty({ input, output, question, hidden })
    : readFromPipe({ input, output, question, hidden });
}

/** Visible prompt, trimmed. */
const ask = (question, options) => prompt(question, options).then((value) => value.trim());

/**
 * Hidden prompt. Deliberately NOT trimmed: leading and trailing whitespace are
 * legitimate password characters, and silently removing them would make a
 * password unreproducible at sign-in.
 */
const askHidden = (question, options) => prompt(question, { ...options, hidden: true });

module.exports = { prompt, ask, askHidden, PromptCancelled };
