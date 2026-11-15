// Default LLM provider — offline "echo" implementation.
// Keeps the CLI fully functional without a configured model: findings pass
// through unchanged and explain returns a static notice. Real providers
// (Ollama, remote APIs) plug into the same { audit, explain, provider } shape.

export function createLocalEchoLlm() {
  return {
    provider: 'local',
    audit: async ({ findings }) => findings,
    explain: async ({ ruleId }) => ({
      explanation: `Offline mode: no LLM configured to explain rule ${ruleId}. Set VIBEGUARD_LLM_KEY or run a local model (Ollama) for semantic explanations.`,
      patch: null,
    }),
  };
}
