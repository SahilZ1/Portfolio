#!/usr/bin/env node
/**
 * Create or update the administrator account.
 *
 * Run interactively:  npm run admin:create
 *
 * Why this is a CLI and not an HTTP endpoint: a self-service registration route
 * on an admin console is an open door, and a "first user wins" bootstrap is a
 * race anyone can win by finding the site before its owner does. Account
 * creation requires shell access to the server, which is the correct bar.
 *
 * The password is read with terminal echo disabled, is never written to the
 * shell history, never logged, and never printed back. Only the bcrypt hash is
 * stored. See scripts/lib/prompt.js for how hidden input is handled and why it
 * is not implemented with readline.
 *
 * A password may also be supplied as ADMIN_PASSWORD for non-interactive setup
 * (a deploy hook, for instance). That is a convenience for automation only —
 * it leaves the value in the environment, so the interactive prompt is the
 * normal path and the default.
 */

const { config } = require("../src/config");
const { upsertAdmin, checkPasswordPolicy } = require("../src/services/authService");
const { pool } = require("../src/db/database");
const { ask, askHidden, PromptCancelled } = require("./lib/prompt");

async function main() {
  process.stdout.write("\n  Portfolio — administrator account setup\n");
  process.stdout.write("  ---------------------------------------\n");
  process.stdout.write(`  Database: ${config.db.database}\n`);
  process.stdout.write(`  bcrypt cost factor: ${config.security.bcryptRounds}\n\n`);

  const username = process.env.ADMIN_USERNAME || (await ask("  Username: "));
  if (!username) {
    throw new Error("A username is required.");
  }

  let password = process.env.ADMIN_PASSWORD;

  if (password) {
    process.stdout.write("  Using ADMIN_PASSWORD from the environment.\n");
  } else {
    password = await askHidden("  Password (minimum 12 characters, not echoed): ");

    // Check the policy before asking for confirmation. Making someone type a
    // password twice only to be told the first one was too short is needless.
    const policyError = checkPasswordPolicy(password);
    if (policyError) {
      throw new Error(policyError);
    }

    const confirmation = await askHidden("  Confirm password: ");
    if (password !== confirmation) {
      throw new Error("Passwords do not match.");
    }
  }

  // Re-checked here so the ADMIN_PASSWORD path is held to the same policy.
  const policyError = checkPasswordPolicy(password);
  if (policyError) {
    throw new Error(policyError);
  }

  const result = await upsertAdmin({ username, password });

  process.stdout.write(
    `\n  ${result.created ? "Created" : "Updated"} administrator "${result.username}".\n` +
      "  Sign in at /admin. The password is stored only as a bcrypt hash.\n\n"
  );
}

main()
  .catch((error) => {
    if (error instanceof PromptCancelled) {
      process.stdout.write("\n  Cancelled. No account was created or changed.\n\n");
      process.exitCode = 130; // 128 + SIGINT
      return;
    }
    // `error.message` here is always one of our own validation messages or a
    // driver error. It never contains the password.
    process.stderr.write(`\n  Failed: ${error.message}\n\n`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
