# Security

Threat model, implemented controls, and honest limitations.

---

## Threat model

What is actually worth defending on a personal portfolio with an analytics
console:

| Asset | Threat | Impact |
|---|---|---|
| Admin console | Brute force, credential stuffing, session theft | Analytics disclosure; a foothold on the host |
| Ingest endpoints | Injection, data poisoning, resource exhaustion | Corrupted figures; database or CPU exhaustion |
| Visitor data | Unauthorised disclosure | Privacy harm to visitors who never consented to that |
| The site itself | XSS, defacement, clickjacking | Reputational — on a *security* portfolio, severe |
| Credentials | Leakage via git, logs, or error responses | Full compromise |

Out of scope, stated honestly: a determined attacker with host access; supply
chain compromise of npm dependencies; hosting-provider compromise; DDoS beyond
what per-IP rate limiting absorbs.

---

## Controls by attack

### SQL injection

- Every statement parameterised. No string concatenation into SQL anywhere.
- Time windows use `make_interval(days => $1::INT)`, not `'$1 days'::INTERVAL`.
- The two places where an identifier appears in a template string
  (`getDevices` column names) use hard-coded literals chosen in that file,
  never values derived from a request.
- Ingest paths are normalised and length-bounded before reaching the database.
- Query parameters pass through a Zod schema that coerces `days` and `limit` to
  bounded integers; a non-numeric value is a 400, not a query.

Tested: `tracking.test.js` posts `/x'; DROP TABLE sessions; --` as a path and
asserts the table still exists and the value was stored verbatim.
`auth.test.js` sends an injection string as `?days=` and asserts a 400.

### Cross-site scripting

- React escapes interpolated content by default. The one
  `dangerouslySetInnerHTML` in the codebase emits JSON-LD built from our own
  constants, never from user input.
- CSP `script-src 'self'` with **no** `'unsafe-inline'` and no `'unsafe-eval'`
  in production. This is the control that actually matters and the one most
  deployed policies give away.
- CSP `connect-src 'self'` — even after successful injection, a payload cannot
  exfiltrate to an attacker-controlled host.
- `object-src 'none'` and `base-uri 'self'` close two classic amplifiers.
- The analytics cookie is `HttpOnly`, so an XSS payload cannot read the
  visitor identifier; the session cookie likewise.
- Page titles and paths are stripped of control characters at ingest, so stored
  values cannot smuggle terminal escapes into the console's tables.

Accepted: `style-src 'unsafe-inline'`. React and Framer Motion set inline
styles for animated transforms. Inline styles cannot execute code; the residual
risk is CSS-based exfiltration and UI redressing. Removing it would mean
abandoning transform-based animation or threading per-request nonces through
the render path. Recorded rather than left silent.

### Cross-site request forgery

- Session cookie `SameSite=Strict` — no cross-site request carries it at all.
- Double-submit token required in `X-CSRF-Token` on every unsafe method.
- Safe methods exempt: they change nothing, and requiring a token on GET would
  break bookmarking the console.

Tested: requests with no token and with a wrong token are both 403; the correct
token succeeds; GET needs none.

### Session attacks

| Attack | Control |
|---|---|
| Fixation | `session.regenerate()` at the exact moment privileges change, with the CSRF token reissued alongside |
| Hijacking | `HttpOnly` + `Secure` + `SameSite=Strict`; server-side state |
| Replay after logout | `session.destroy()` deletes the row — clearing the cookie is not a logout |
| Indefinite validity | 8-hour rolling expiry; `pruneSessionInterval` clears expired rows |
| Framework fingerprinting | Cookie renamed from `connect.sid`; `x-powered-by` disabled |

### Brute force and enumeration

Layered, because the layers stop different attacker shapes:

| Layer | Stops |
|---|---|
| Per-IP rate limit (8 failures / 15 min, successes not counted) | The fast single-source attacker |
| Per-account lockout (10 failures → 15 min) | The patient attacker distributed across many addresses |
| bcrypt cost 12 (~250 ms) | Offline cracking if the hash table leaks |
| Identical error for every failure mode | Enumeration via response text |
| Dummy bcrypt comparison on every failure path | Enumeration via **response timing** |
| Input bounded before hashing | A client buying expensive CPU time |
| No registration endpoint | Account creation entirely |

The timing defence is the one most often missed. A username that does not exist
returns in microseconds if the code skips hashing, while a real one costs a
full bcrypt comparison. That difference is reliably measurable over a network
and is a working oracle no matter how careful the error message is.
`auth.test.js` measures the ratio of the two paths and fails if they diverge.

### IP spoofing / rate-limit bypass

`app.set('trust proxy', <number>)`, never `true`. With `true`, Express believes
any client-supplied `X-Forwarded-For`, so an attacker rotates a header field and
every IP-keyed limit becomes decorative. `TRUST_PROXY` is a hop count, and
`.env.example` says why in place.

### Sensitive data exposure

| Surface | Control |
|---|---|
| Error responses | No stack trace, SQL fragment, or driver error code in production. `error.code` is forwarded **only** for errors the application constructed — a PostgreSQL SQLSTATE like `42883` reaching the client is free schema reconnaissance. |
| Logs | Key-based redaction (`password`, `secret`, `token`, `cookie`, `authorization`, …) at any depth; pseudonymous identifiers truncated to 8 characters. Bound query parameters are never logged. |
| Git | `.env` and `.env.*` ignored (with `!.env.example`); keys, certs, and database dumps ignored. |
| Responses | The password is never echoed; a test asserts it does not appear anywhere in the login response. |
| Audit table | Source addresses stored as `HMAC-SHA256(ip, SESSION_SECRET)` — enough to correlate a burst, not reversible from a database dump. |
| Console UI | Only an 8-character session prefix is shown, never a full identifier. |

### Resource exhaustion

- Request bodies capped at 4 kb (ingest) and 2 kb (login), far below any
  legitimate payload.
- Event metadata capped at 12 flat primitive keys — no nesting, so a client
  cannot push unbounded JSONB into storage.
- Analytics windows bounded to 365 days and result limits to 100.
- Connection pool capped with connection and idle timeouts.
- `ua-parser-js` input truncated to 512 characters, so an absurdly long header
  cannot become CPU time.
- Page dwell time capped at one hour.

### Clickjacking

`frame-ancestors 'none'` plus `X-Frame-Options: DENY`.

### Open redirect

There is no redirect endpoint. Outbound links are static values from content
files, and every one carries `rel="noopener noreferrer"` — without `noopener`
the opened page gets a `window.opener` handle back to ours and can navigate it
elsewhere (reverse tabnabbing).

### Dependency risk

Nine runtime dependencies on the server, four on the client. `npm audit` is
clean at the time of writing. Fewer dependencies is itself the control: every
one is code running with full process privileges.

---

## Security headers

Verified in production mode:

```
Content-Security-Policy: default-src 'self'; script-src 'self';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
  font-src 'self' data:; connect-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'self'; frame-ancestors 'none';
  manifest-src 'self'; worker-src 'self' blob:; upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin
```

HSTS is enabled only in production. Sending it from a localhost HTTP server
pins the browser and breaks development.

`preload` is deliberately **not** set. Preload submission is effectively
irreversible and should not be enabled before the domain is settled.

The development CSP is separate and more relaxed (Vite needs a websocket and
injects its client). Keeping them separate is how `'unsafe-inline'` avoids
reaching production.

---

## Secrets handling

- All secrets come from the environment; nothing is hard-coded.
- Production boot **refuses to start** without `SESSION_SECRET`, with the dev
  placeholder value, or with a secret shorter than 32 characters. Verified.
- `npm run admin:create` reads the password with terminal echo disabled, keeps
  it out of shell history, never prints it, and stores only the bcrypt hash.
- No secret is ever sent to the frontend bundle or to an AI provider.

Rotating `SESSION_SECRET` signs out every admin session and invalidates the
login-audit IP hashes. Both are intended consequences.

---

## Known limitations

Stated plainly, because a security document that claims completeness is not
credible:

1. **Bot detection is a User-Agent pattern match.** It keeps obvious crawlers
   and unfurlers out of the figures. It will not catch a headless browser
   pretending to be Chrome, and it is not trying to — this is data hygiene, not
   bot defence.

2. **Analytics can be poisoned by a determined attacker.** The ingest endpoints
   are unauthenticated by necessity. Rate limiting and validation bound the
   damage; they do not eliminate it. The data is not security-critical.

3. **`style-src 'unsafe-inline'` is accepted**, with the reasoning above.

4. **No WAF, no IDS, no anomaly detection.** Out of proportion for a personal
   site.

5. **Single administrator, no MFA.** TOTP would be a genuine improvement and is
   the most worthwhile next control. The password policy (≥12 characters,
   length weighted over composition, per NIST SP 800-63B) and the lockout are
   what currently stand in for it.

6. **Rate limiting is per-process and in-memory.** Across multiple instances
   each would hold its own counters, multiplying the effective limit. A shared
   store (Redis) would be required for a horizontally scaled deployment.

7. **No Subresource Integrity**, because there are no external scripts to pin.

8. **The host keeps its own request logs**, including IP addresses, outside
   this application's control.

---

## Reporting

Found something? Contact details are on `/contact`. Please report privately
before disclosing publicly.
