import { createInterface } from 'node:readline/promises';

const affirmativeAnswers = new Set(['s', 'si', 'sí', 'y', 'yes']);

export function isAffirmative(answer: string): boolean {
  return affirmativeAnswers.has(answer.trim().toLowerCase());
}

export async function askConfirmation(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}
