import type { BankQuestion } from './data';

// Em cada grupo de quatro perguntas, a resposta correta ocupa as quatro posições
// em ordem aleatória. As cores e os símbolos pertencem à interface, não às respostas.
export const shuffledPositions = (): number[] => {
  const positions = [0, 1, 2, 3];
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions;
};
export const shuffleQuestion = (question: BankQuestion, correctPosition: number): BankQuestion => {
  const otherIndices = [0, 1, 2, 3].filter((index) => index !== question.correct);
  for (let i = otherIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherIndices[i], otherIndices[j]] = [otherIndices[j], otherIndices[i]];
  }
  const options = [...question.options] as BankQuestion['options'];
  options[correctPosition] = question.options[question.correct];
  let next = 0;
  for (let i = 0; i < 4; i++)
    if (i !== correctPosition) options[i] = question.options[otherIndices[next++]];
  return { ...question, options, correct: correctPosition };
};
