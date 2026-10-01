// Real SMS segmentation, matching how gateways (Aakash) bill:
// GSM-7: 160 chars single, 153 per concatenated segment (extended chars ^ { } \ [ ~ ] | € count double).
// Unicode (UCS-2, e.g. Nepali/Devanagari, emoji): 70 single, 67 per segment.
// Shared by server (src/lib/credits.js) and UI estimates — no node imports here.

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

const GSM_EXTENDED = "^{}\\[~]|€";

export function smsSegments(text) {
  if (!text || text.length === 0) return { segments: 0, encoding: "GSM-7", units: 0 };

  let septets = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) {
      septets += 1;
    } else if (GSM_EXTENDED.includes(ch)) {
      septets += 2;
    } else {
      gsm = false;
      break;
    }
  }

  if (gsm) {
    return {
      segments: septets <= 160 ? 1 : Math.ceil(septets / 153),
      encoding: "GSM-7",
      units: septets,
    };
  }
  const codePoints = [...text].length;
  return {
    segments: codePoints <= 70 ? 1 : Math.ceil(codePoints / 67),
    encoding: "Unicode",
    units: codePoints,
  };
}

export function smsCreditCost(text) {
  return smsSegments(text).segments;
}
