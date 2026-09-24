/**
 * Shared validation helpers and schemas for the public ingest API.
 *
 * The tracking endpoints accept data from an untrusted browser, so everything
 * arriving there is treated as hostile input: bounded in size, constrained in
 * shape, normalised, and then bound into parameterised SQL. Nothing from a
 * request body is ever interpolated into a query string.
 */

const { z } = require("zod");

/** Event types the API will accept. An unknown type is rejected, not stored. */
const EVENT_TYPES = [
  "page_view",
  "project_view",
  "lab_view",
  "github_click",
  "external_link_click",
  "contact_click",
  "resume_download",
  "cta_click",
  "section_view",
  "copy_email",
];

/** Matches ASCII control characters, which have no place in a path or title. */
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

/**
 * Normalise a client-supplied path to a stable, storable internal route.
 *
 * - Query strings and fragments are discarded: they are not needed for
 *   analytics and are the most likely place for accidental personal data.
 * - Only same-origin relative paths are accepted; an absolute URL is rejected
 *   so a third party cannot inject arbitrary strings into the top-pages report.
 * - A trailing slash is trimmed so `/projects` and `/projects/` are one page.
 */
function normalisePath(input) {
  if (typeof input !== "string") return null;
  let value = input.trim();
  if (value === "") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null; // protocol-relative URL

  value = value.split("?")[0].split("#")[0];
  if (value.length > 1) value = value.replace(/\/+$/, "");
  if (value === "") value = "/";
  if (value.length > 512) return null;

  // Reject control characters outright rather than trying to clean them.
  if (CONTROL_CHARS.test(value)) {
    CONTROL_CHARS.lastIndex = 0;
    return null;
  }
  CONTROL_CHARS.lastIndex = 0;
  return value;
}

/** Collapse whitespace and bound a free-text field such as a page title. */
function cleanText(input, maxLength) {
  if (typeof input !== "string") return null;
  const value = input.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  return value === "" ? null : value.slice(0, maxLength);
}

const pathSchema = z
  .string()
  .max(1024)
  .transform((value, ctx) => {
    const normalised = normalisePath(value);
    if (normalised === null) {
      ctx.addIssue({ code: "custom", message: "Invalid path" });
      return z.NEVER;
    }
    return normalised;
  });

const pageViewSchema = z.object({
  path: pathSchema,
  title: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((value) => cleanText(value ?? "", 200)),
  // Only consulted for the first view of a session, to attribute the session.
  referrer: z.string().max(1024).optional().nullable(),
});

/**
 * Structured event metadata.
 *
 * Bounded to a flat object of at most 12 primitive keys. Allowing arbitrary
 * nesting would let a client push unbounded JSONB into storage, and a flat
 * shape is all the dashboard ever reads.
 */
const eventDataSchema = z
  .record(
    z.string().max(48),
    z.union([z.string().max(300), z.number().finite(), z.boolean(), z.null()])
  )
  .refine((value) => Object.keys(value).length <= 12, { message: "Too many metadata keys" })
  .optional()
  .nullable();

const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  path: pathSchema.optional().nullable(),
  data: eventDataSchema,
});

/** Query-parameter schema shared by the admin analytics endpoints. */
const rangeSchema = z.object({
  // Bounded window: an unbounded range would let one dashboard request scan the
  // entire history table.
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

module.exports = {
  EVENT_TYPES,
  normalisePath,
  cleanText,
  pageViewSchema,
  eventSchema,
  rangeSchema,
};
