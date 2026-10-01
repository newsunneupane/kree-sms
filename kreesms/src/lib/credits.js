import { smsCreditCost } from "./sms-segments.js";

// Pre-send ESTIMATE (balance pre-check + scheduling reservation).
// Exact per-message charges come from Aakash's send response — see
// actualSmsCredit() in ./aakash.js, which the send paths deduct instead.
export function calculateCreditCost(text) {
  return smsCreditCost(text);
}

export function calculateTotalCredits(messages) {
  return messages.reduce((total, msg) => total + smsCreditCost(msg.text || msg), 0);
}
