/** Tutorial independente do estado da partida, compartilhado entre Desktop e XR. */
export type TutorialMode = 'desktop' | 'vr';
export type TutorialStepId =
  | 'welcome'
  | 'hands'
  | 'click'
  | 'hover'
  | 'tablet'
  | 'pinch'
  | 'lottery'
  | 'questions'
  | 'movement'
  | 'events'
  | 'victory';
export type TutorialStep = {
  id: TutorialStepId;
  title: string;
  description: string;
  detail: string;
};

export const TUTORIAL_STEPS: Record<TutorialStepId, TutorialStep> = {
  welcome: {
    id: 'welcome',
    title: 'Bem-vindo ao SENAQUEST',
    description: 'Aprenda as regras antes de iniciar sua jornada.',
    detail:
      'O tutorial usa exemplos, não altera peões, pontos, perguntas ou turnos. Você pode pulá-lo e revê-lo pelo menu.',
  },
  hands: {
    id: 'hands',
    title: 'Encontre suas mãos',
    description: 'Olhe para suas mãos e mova-as na sua frente.',
    detail:
      'Com rastreamento de mãos, deixe ambas visíveis às câmeras do headset. Com controles, use os raios dos controles para apontar.',
  },
  click: {
    id: 'click',
    title: 'Aprenda a selecionar',
    description: 'Aponte para o botão de treinamento e selecione.',
    detail:
      'Use a pinça de seleção ou o gatilho do controle. O botão mudará de cor ao ser apontado e confirmado.',
  },
  hover: {
    id: 'hover',
    title: 'Passe o cursor e selecione',
    description: 'Destaque o cartão azul e então selecione-o.',
    detail:
      'O contorno indica o alvo sob o ponteiro. Não basta olhar para o botão: é preciso realizar a seleção.',
  },
  tablet: {
    id: 'tablet',
    title: 'Responda uma questão de teste',
    description: 'Treine a escolha de uma alternativa.',
    detail: 'A pergunta a seguir é demonstrativa: a resposta não altera a partida.',
  },
  pinch: {
    id: 'pinch',
    title: 'Zoom com duas mãos',
    description: 'Faça uma pinça simultânea com as duas mãos.',
    detail:
      'O SENAQUEST aproxima a visão da mesa enquanto você mantém as duas pinças e retorna ao soltar. Se estiver usando controles, pode pular este exercício.',
  },
  lottery: {
    id: 'lottery',
    title: 'Sorteio inicial',
    description: 'O maior número define quem começa.',
    detail:
      'Cada participante lança o dado. Em caso de empate pelo maior resultado, os empatados lançam novamente. O sorteio define a ordem dos turnos; ele não move peões.',
  },
  questions: {
    id: 'questions',
    title: 'Perguntas e movimentação',
    description: 'Responda e avance pelo tabuleiro.',
    detail:
      'Acertando, o peão avança o valor do dado. Errando, recua esse valor sem passar da casa 0. Se o tempo acabar, não se move e perde o próximo turno. As perguntas seguem as subáreas do curso escolhido.',
  },
  movement: {
    id: 'movement',
    title: 'Movimentação no tabuleiro',
    description: 'Acompanhe o avanço ou recuo do seu peão.',
    detail:
      'O peão começa na casa 0. Após acertar uma questão, avança o número sorteado no dado; se errar, recua sem passar da casa 0; se o tempo acabar, fica parado e perde o próximo turno. A ordem dos jogadores é definida no sorteio inicial.',
  },
  events: {
    id: 'events',
    title: 'Casas especiais',
    description: 'Verde ajuda. Vermelho traz desafios.',
    detail:
      'As casas verdes 11, 18 e 25 dão benefícios; as vermelhas 10, 12, 17, 19, 24 e 26 trazem penalidades. A casa 11 protege do próximo malefício. Os eventos são aplicados após acertos, sem encadeamento.',
  },
  victory: {
    id: 'victory',
    title: 'Como vencer',
    description: 'Chegue exatamente à casa 30!',
    detail:
      'Para vencer, acerte uma pergunta e alcance exatamente a casa 30. Se o dado ultrapassaria a casa 30, o peão permanece onde está. A classificação mostra pontos e casas alcançadas.',
  },
};

export const DESKTOP_TUTORIAL_STEPS: readonly TutorialStepId[] = [
  'lottery',
  'questions',
  'movement',
  'events',
  'victory',
];
export const VR_TUTORIAL_STEPS: readonly TutorialStepId[] = [
  'welcome',
  'hands',
  'click',
  'hover',
  'tablet',
  'pinch',
  'lottery',
  'questions',
  'movement',
  'events',
  'victory',
];
export function stepsFor(mode: TutorialMode): readonly TutorialStepId[] {
  return mode === 'vr' ? VR_TUTORIAL_STEPS : DESKTOP_TUTORIAL_STEPS;
}
// Tutorial v4 VR: reabre uma vez para apresentar as animações aprovadas; Desktop preserva v3.
export const TUTORIAL_STORAGE_KEYS: Record<TutorialMode, string> = {
  desktop: 'senaquest:tutorial:desktop:v3',
  vr: 'senaquest:tutorial:vr:v4',
};
export function isTutorialComplete(mode: TutorialMode): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEYS[mode]) === 'done';
  } catch {
    return false;
  }
}
export function saveTutorialComplete(mode: TutorialMode): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEYS[mode], 'done');
  } catch {
    /* Browsers can disable storage: keep tutorial usable. */
  }
}

/** Signed shortest angular difference, free from wraparound at +/-PI. */
export function yawDifference(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
export function shouldFollowTutorialPanel(headYaw: number, panelYaw: number): boolean {
  return Math.abs(yawDifference(headYaw, panelYaw)) > Math.PI / 4;
}

/** Mostra o botão somente quando o painel sair do campo de visão.
 * Dois limiares evitam piscar ao redor do limite angular. */
export function shouldShowTutorialRecenter(angle: number, currentlyVisible: boolean): boolean {
  const limit = ((currentlyVisible ? 32 : 42) * Math.PI) / 180;
  return angle > limit;
}
