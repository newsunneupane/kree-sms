# KreeSMS Public API — integration guide for third-party systems

Send SMS from your own software (school MIS, restaurant management, accounting
system, …) through your KreeSMS balance. One endpoint, key-based auth, no
browser or login session required.

Base URL (production): `https://kreesms.kree.com.np`
Endpoint: `POST /api/public/send-sms`

## 1. Get your credentials (from the KreeSMS admin)

You receive **three secrets, shown once** — store them in your server config
(environment variables), never in frontend code or git:

| Secret | Used for | Header / field |
|---|---|---|
| API key (`kree_pk_live_…`) | Identifies your project | `x-api-key` |
| API secret (64-hex string) | Signs every request (HMAC) | never sent — used to compute `x-signature` |
| Panel email + password | Your usage dashboard login | login form at the portal |

Lost a secret? Ask the admin to revoke the old key and issue a new one.
Secrets cannot be recovered — only replaced.

## 2. Signing requests (HMAC-SHA256)

Every request carries three headers besides the key:

```
x-api-key:   kree_pk_live_…
x-timestamp: 2026-10-02T09:00:00.000Z        (UTC ISO-8601, max 5 min skew)
x-signature: hex(HMAC_SHA256(secret, timestamp + "." + exactRequestBody))
x-request-id: <unique per message>           (optional, strongly recommended)
```

The signature covers the **exact JSON bytes you send** (no pretty-printing,
no key reordering — `JSON.stringify` your object once and sign that string).

### Node.js

```js
import crypto from "crypto";

const BODY = JSON.stringify({ to: "9841234567", message: "Fee due reminder" });
const TS = new Date().toISOString();
const sig = crypto.createHmac("sha256", process.env.KREE_SECRET)
  .update(`${TS}.${BODY}`).digest("hex");

const res = await fetch("https://kreesms.kree.com.np/api/public/send-sms", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.KREE_API_KEY,
    "x-timestamp": TS,
    "x-signature": sig,
    "x-request-id": crypto.randomUUID(), // idempotency: safe to retry
  },
  body: BODY,
});
console.log(await res.json());
```

### Python

```python
import hashlib, hmac, json, uuid, datetime, requests, os

body = json.dumps({"to": "9841234567", "message": "Fee due reminder"},
                  separators=(",", ":"))  # compact = exact bytes sent
ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
sig = hmac.new(os.environ["KREE_SECRET"].encode(),
               f"{ts}.{body}".encode(), hashlib.sha256).hexdigest()

r = requests.post("https://kreesms.kree.com.np/api/public/send-sms",
    data=body.encode(),
    headers={"Content-Type": "application/json",
             "x-api-key": os.environ["KREE_API_KEY"],
             "x-timestamp": ts, "x-signature": sig,
             "x-request-id": str(uuid.uuid4())})
print(r.status_code, r.json())
```

### PHP (cURL)

```php
$body = json_encode(["to" => "9841234567", "message" => "Fee due reminder"]);
$ts = gmdate("Y-m-d\TH:i:s.v\Z");
$sig = hash_hmac("sha256", $ts . "." . $body, getenv("KREE_SECRET"));
$ch = curl_init("https://kreesms.kree.com.np/api/public/send-sms");
curl_setopt_array($ch, [
  CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ["Content-Type: application/json",
    "x-api-key: " . getenv("KREE_API_KEY"), "x-timestamp: $ts",
    "x-signature: $sig", "x-request-id: " . uniqid("sms-", true)],
]);
echo curl_exec($ch);
```

## 3. Request body

```json
{
  "to": "9841234567",
  "message": "Your bill of Rs. 5,000 is due tomorrow.",
  "senderId": "<KREE>" ,
  "clientRef": "invoice-1024"
}
```

| Field | Required | Rules |
|---|---|---|
| `to` | yes | Nepal mobile: `98XXXXXXXX`, optionally `+977-…`/`977…` |
| `message` | yes | 1–1000 chars. 1 credit per segment (GSM-7: 160/153, Unicode incl. Nepali: 70/67) |
| `senderId` | no | Max 11 chars (telco-approved IDs only) |
| `clientRef` | no | Your own reference (max 64 chars), echoed nowhere but stored |

## 4. Responses

Success (`200`):

```json
{ "success": true, "segments": 1, "creditsUsed": 1, "balanceRemaining": 499 }
```

Errors (all also recorded in your audit log):

| Status | Meaning | What to do |
|---|---|---|
| `400` | Bad phone / message / JSON | Fix the payload (see `message`) |
| `401` | Missing/invalid key, bad signature, stale timestamp | Check key, secret, clock sync (NTP), exact-body signing |
| `402` | Out of credits | Contact the KreeSMS admin for a top-up |
| `403` | Key revoked or IP not allowlisted | Contact the admin |
| `429` | Rate limit hit | Back off for `Retry-After` seconds, then retry |
| `502` | Provider failed | **Credits were refunded.** Retry with the same `x-request-id` |
| `413` | Body over 10 KB | Shrink the message |

## 5. Reliability rules (read these)

1. **Always send `x-request-id`** (unique per message, e.g. UUID). Retries with the
   same ID never double-charge — the stored result is replayed with
   `"deduped": true`.
2. **Retry only on network errors, `429`, and `502`** — with exponential backoff.
   Never blind-retry `402` (you'll just burn quota checks) or `400` (fix the data).
3. **Sync clocks via NTP.** Timestamps older than 5 minutes are rejected to stop
   replay attacks.
4. **One message per call.** Fan out bulk sends client-side, sequentially or with
   small concurrency (≤5), respecting `429` responses.

## 6. Your panel dashboard

Log into the KreeSMS portal with your **panel email + password** to see:
balance, key prefix, rate limit, 24h usage, and your full request log
(including failures, with masked numbers) — plus this integration recipe with
your key prefix prefilled. The panel is **view-only**: top-ups, revocation, and
new keys go through the admin.

## 7. Security obligations

- Secrets live in server-side env/config only. A key found in frontend JS, a
  mobile app, or a public repo will be revoked on sight.
- Use HTTPS always; verify the timestamp is fresh on every call.
- Tell the admin immediately if a secret may have leaked — revocation is
  instant and your panel + key stop together.

## 8. Troubleshooting

- `401 Invalid signature` → most common cause: signing different bytes than
  sent (pretty-printed JSON, reordered keys, or a framework re-serializing the
  body). Log `TS + "." + BODY` on your side and compare.
- `401 Stale request timestamp` → server clock drift; enable NTP.
- `402` right after top-up → balance updates are immediate; re-check the exact
  `to` (each recipient costs its own segments).
- `429` on first call → you share an outbound IP (NAT) with a flooder; ask the
  admin about an IP allowlist entry for your server.
