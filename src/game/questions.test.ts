import { describe, expect, it } from 'vitest';
import { COURSE_IDS, QUESTION_BANK } from './data';

describe('banco de perguntas independentes', () => {
  it('contém 20 perguntas diferentes por curso', () => {
    for (const course of COURSE_IDS) {
      const questions = QUESTION_BANK[course];
      expect(questions).toHaveLength(20);
      expect(new Set(questions.map((question) => question.prompt.trim().toLowerCase())).size).toBe(
        20,
      );
      expect(new Set(questions.map((question) => question.id)).size).toBe(20);
      expect(new Set(questions.map((question) => question.conceptId)).size).toBe(20);
    }
  });

  it('distribui quatro perguntas por subárea', () => {
    for (const course of COURSE_IDS) {
      for (let area = 0; area < 5; area++) {
        expect(
          QUESTION_BANK[course].filter((question) => question.areaIndex === area),
        ).toHaveLength(4);
      }
    }
  });

  it('possui alternativas distintas e resposta válida', () => {
    for (const course of COURSE_IDS) {
      for (const question of QUESTION_BANK[course]) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options)).toHaveProperty('size', 4);
        expect(question.correct).toBeGreaterThanOrEqual(0);
        expect(question.correct).toBeLessThan(4);
      }
    }
  });
});
