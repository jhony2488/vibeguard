// Intentionally insecure fixture — do NOT copy patterns from this file.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const OPENAI_KEY = 'sk-proj-abc123def456ghi789jkl000mno111pqr222stu333';

export function authenticate(token: string) {
  return token === OPENAI_KEY;
}

export function runUserScript(input: string) {
  return eval(input);
}
