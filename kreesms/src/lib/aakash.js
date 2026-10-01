// Aakash SMS gateway client.
// SECURITY: credentials come ONLY from server-side env vars. Never import this
// file (or these env keys) in client components, and never prefix with NEXT_PUBLIC_.

function env() {
  const token = process.env.AAKASH_SMS_TOKEN;
  const apiUrl = process.env.AAKASH_API_URL;
  const creditUrl = process.env.AAKASH_CREDIT_URL;
  if (!token || !apiUrl || !creditUrl) {
    throw new Error("Aakash SMS gateway is not configured (AAKASH_SMS_TOKEN / AAKASH_API_URL / AAKASH_CREDIT_URL).");
  }
  return { token, apiUrl, creditUrl };
}

async function gatewayGet(url, params) {
  const fullUrl = new URL(url);
  fullUrl.searchParams.append("auth_token", env().token);
  for (const [key, value] of Object.entries(params)) {
    fullUrl.searchParams.append(key, value);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(fullUrl.toString(), { method: "GET", signal: ctrl.signal });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    return { statusCode: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendSms(to, text) {
  try {
    const { apiUrl } = env();
    const result = await gatewayGet(apiUrl, { to, text });
    const body = result.body;
    const success = result.statusCode === 200 && body.error === false;
    return {
      success,
      httpCode: result.statusCode,
      gatewayError: body.error,
      availableCredit: body.available_credit ?? body.credits ?? body.balance ?? null,
      raw: body,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function checkCredit() {  // Primary: v4 available-credit (auth via `auth-token` header).
  // Fallback: legacy style (`auth_token` query param) for v1/v3 credit URLs.
  try {
    const { creditUrl, token } = env();
    const withTimeout = async (url, options = {}) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(url, { ...options, signal: ctrl.signal });
        const text = await res.text();
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          body = { raw: text };
        }
        return { statusCode: res.status, body };
      } finally {
        clearTimeout(timer);
      }
    };

    let result = await withTimeout(creditUrl, { headers: { "auth-token": token } });
    if (result.statusCode === 401) {
      const legacyUrl = new URL(creditUrl);
      legacyUrl.searchParams.append("auth_token", token);
      result = await withTimeout(legacyUrl.toString());
    }
    const balance =
      result.body.available_credit ?? result.body.credits ?? result.body.balance ?? null;
    return {
      success: result.statusCode === 200 && balance !== null,
      balance: typeof balance === "number" ? balance : parseInt(balance, 10) || 0,
      raw: result.body,
    };
  } catch (error) {
    return { success: false, error: error.message, balance: 0 };
  }
}

// --- Exact per-message charging -------------------------------------------
// v3 send responses carry the credits Aakash actually charged:
//   { error:false, data:{ valid:[{mobile, credit:1, ...}], invalid:[...] } }
// These helpers extract that so we deduct Aakash's number, not our estimate.

function normMobile(m) {
  return String(m || "").replace(/\D/g, "").slice(-10);
}

function validEntries(result) {
  const d = result?.raw?.data;
  if (!d || !Array.isArray(d.valid)) return [];
  return d.valid;
}

function invalidEntries(result) {
  const d = result?.raw?.data;
  if (!d || !Array.isArray(d.invalid)) return [];
  return d.invalid;
}

// True when Aakash explicitly rejected this recipient (aborted/invalid) even
// though the HTTP call itself succeeded.
export function isSmsRejected(result, to) {
  try {
    const target = normMobile(to);
    if (invalidEntries(result).some((v) => normMobile(v.mobile) === target)) return true;
    const valid = validEntries(result);
    if (valid.length === 0 && invalidEntries(result).length > 0) return true;
    return false;
  } catch {
    return false;
  }
}

// Exact credits Aakash charged for this recipient. Falls back to our estimate
// when the gateway response carries no per-message breakdown.
export function actualSmsCredit(result, to, estimate) {
  try {
    if (!result || !result.success) return 0;
    const target = normMobile(to);
    const valid = validEntries(result);
    const hit =
      valid.find((v) => normMobile(v.mobile) === target) ||
      (valid.length === 1 ? valid[0] : null);
    if (hit) {
      const c = parseInt(hit.credit, 10);
      if (Number.isFinite(c) && c >= 0) return c;
    }
    if (isSmsRejected(result, to)) return 0;
    return estimate;
  } catch {
    return result && result.success ? estimate : 0;
  }
}
