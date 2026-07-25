function calculateCreditCost(text) {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.length / 160);
}

function calculateTotalCredits(messages) {
  return messages.reduce((total, msg) => total + calculateCreditCost(msg.text || msg), 0);
}

module.exports = { calculateCreditCost, calculateTotalCredits };