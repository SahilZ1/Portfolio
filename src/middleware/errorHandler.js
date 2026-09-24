/**
 * Centralised error handling.
 *
 * The security requirement here is simple and absolute: a production client
 * never receives a stack trace, a SQL fragment, a driver error code or a file
 * path. Those leak schema structure, library versions and directory layout,
 * all of which are reconnaissance. The full error goes to the server log; the
 * client gets a status code, a stable machine-readable code, and a sentence.
 */

const { config } = require("../config");
const logger = require("../utils/logger");

/** Wraps an async route handler so a rejected promise reaches Express. */
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/** Creates an error carrying an HTTP status and a stable error code. */
function httpError(statusCode, code, message) {
  return Object.assign(new Error(message), { statusCode, code, expose: true });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: "not_found", message: "Resource not found." },
  });
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
function errorHandler(error, req, res, next) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

  // A malformed JSON body surfaces from body-parser as a SyntaxError. It is a
  // client mistake, not a server fault, and should not be logged as an alert.
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "invalid_json", message: "Request body is not valid JSON." },
    });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      error: { code: "payload_too_large", message: "Request body is too large." },
    });
  }

  const logMeta = {
    method: req.method,
    path: req.path,
    statusCode,
    message: error.message,
  };

  if (statusCode >= 500) {
    logger.error("Unhandled request error", { ...logMeta, stack: error.stack });
  } else {
    logger.warn("Request error", logMeta);
  }

  // Only errors explicitly marked safe, or genuine 4xx client errors, have
  // their message forwarded. Everything else becomes a generic 500.
  const isSafeToExpose = error.expose === true || (statusCode >= 400 && statusCode < 500);

  // `code` is forwarded ONLY for errors this application constructed via
  // httpError(). A driver error carries its own `code` -- PostgreSQL SQLSTATEs
  // such as "42883" or "23505" -- and echoing those tells an attacker which
  // statement broke and how, which is free schema reconnaissance.
  const clientCode = error.expose === true && typeof error.code === "string" && error.code.length < 40
    ? error.code
    : statusCode >= 500
      ? "internal_error"
      : "bad_request";

  const body = {
    error: {
      code: clientCode,
      message: isSafeToExpose ? error.message : "Something went wrong. Please try again.",
    },
  };

  // Stack traces in development only, and never for a request that reached a
  // production build.
  if (!config.isProduction && statusCode >= 500) {
    body.error.stack = error.stack;
  }

  return res.status(statusCode).json(body);
}

module.exports = { asyncHandler, httpError, notFoundHandler, errorHandler };
