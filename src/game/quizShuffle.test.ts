import { describe, expect, it } from 'vitest';
import { QUESTION_BANK } from './data';
import { shuffledPositions, shuffleQuestion } from './quizShuffle';

describe('quiz: alternativas sem alterar identidade da resposta', () => {
  const question = QUESTION_BANK.ads[0];
  it('distribui as quatro posições exatamente uma vez por bloco', () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      expect([...shuffledPositions()].sort()).toEqual([0, 1, 2, 3]);
    }
  });
  it('preserva o texto correto e todas as alternativas para qualquer posição', () => {
    for (let position = 0; position < 4; position++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const shuffled = shuffleQuestion(question, position);
        expect(shuffled.correct).toBe(position);
        expect(shuffled.options[position]).toBe(question.options[question.correct]);
        expect([...shuffled.options].sort()).toEqual([...question.options].sort());
        expect(question.correct).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
