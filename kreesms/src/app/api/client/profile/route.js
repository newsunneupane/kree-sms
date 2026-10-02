import { requireApiClient } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireApiClient(req);
    if (session.error) return session.error;
    const c = session.apiClient;
    return ok({
      project: {
        id: c.id,
        name: c.name,
        product: c.product,
        key_prefix: c.key_prefix,
        sms_balance: c.sms_balance,
        rate_limit_per_min: c.rate_limit_per_min,
        is_active: c.is_active,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
