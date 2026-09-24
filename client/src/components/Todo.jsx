/**
 * Renders an unfilled content placeholder.
 *
 * Placeholders are shown as a visible dashed marker rather than silently
 * omitted or filled with plausible-looking text. The point is that a half-
 * finished portfolio should look obviously half-finished to its owner, and
 * should never present invented detail as fact to a reader.
 *
 * `<Text>` unwraps a value that may or may not be a placeholder, so pages can
 * pass content through without branching at every field.
 */

import { isTodo } from "../content/site.js";

export function Todo({ hint }) {
  return (
    <span className="todo" role="note">
      <span className="todo__tag">TODO</span>
      <span className="todo__hint">{hint}</span>
    </span>
  );
}

/** Render a value that may be a string or a placeholder. */
export function Text({ value, fallback = null }) {
  if (isTodo(value)) return <Todo hint={value.hint} />;
  if (value === null || value === undefined || value === "") return fallback;
  return <>{value}</>;
}

/** Render a list whose entries may individually be placeholders. */
export function TextList({ items, className, itemClassName }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={index} className={itemClassName}>
          <Text value={item} />
        </li>
      ))}
    </ul>
  );
}

/** True when a value is present and not a placeholder — for conditional links. */
export function isReal(value) {
  return Boolean(value) && !isTodo(value);
}
