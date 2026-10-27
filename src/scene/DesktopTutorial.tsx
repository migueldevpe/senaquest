import { useEffect, useRef } from 'react';
import { useTutorial } from './tutorialState';
import { DESKTOP_TUTORIAL_STEPS, TUTORIAL_STEPS } from './tutorialFlow';

export function DesktopTutorial() {
  const mode = useTutorial((s) => s.mode);
  const index = useTutorial((s) => s.index);
  const back = useTutorial((s) => s.back);
  const next = useTutorial((s) => s.next);
  const end = useTutorial((s) => s.end);
  const firstButton = useRef<HTMLButtonElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== 'desktop') return;
    // A camada transparente bloqueia o mouse; `inert` bloqueia também teclado,
    // foco e comandos dos painéis e do Canvas atrás do modal.
    const app = backdrop.current?.parentElement;
    const disabled: Array<{ element: HTMLElement; wasInert: boolean }> = [];
    if (app)
      for (const sibling of Array.from(app.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === backdrop.current) continue;
        disabled.push({ element: sibling, wasInert: sibling.inert });
        sibling.inert = true;
      }
    firstButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        end(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      disabled.forEach(({ element, wasInert }) => {
        element.inert = wasInert;
      });
    };
  }, [mode, end]);
  if (mode !== 'desktop') return null;
  const stepId = DESKTOP_TUTORIAL_STEPS[Math.min(index, DESKTOP_TUTORIAL_STEPS.length - 1)];
  const step = TUTORIAL_STEPS[stepId];
  return (
    <div ref={backdrop} className="sena-tutorial-backdrop">
      <section
        className="sena-tutorial-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sena-tutorial-title"
        aria-describedby="sena-tutorial-description"
      >
        <header className="sena-tutorial-header">
          <span className="sena-tutorial-eyebrow">SENAQUEST · COMO JOGAR</span>
          <span className="sena-tutorial-count">
            {index + 1} / {DESKTOP_TUTORIAL_STEPS.length}
          </span>
        </header>
        <div className="sena-tutorial-progress" aria-hidden="true">
          {DESKTOP_TUTORIAL_STEPS.map((id, i) => (
            <span key={id} className={i <= index ? 'is-active' : ''} />
          ))}
        </div>
        <div className="sena-tutorial-content">
          <div className="sena-tutorial-symbol" aria-hidden="true">
            {stepId === 'lottery'
              ? '⚄'
              : stepId === 'questions'
                ? '?'
                : stepId === 'movement'
                  ? '➜'
                  : stepId === 'events'
                    ? '✦'
                    : '30'}
          </div>
          <div className="sena-tutorial-copy">
            <h2 id="sena-tutorial-title">{step.title}</h2>
            <p id="sena-tutorial-description" className="sena-tutorial-lead">
              {step.description}
            </p>
            <p className="sena-tutorial-detail">{step.detail}</p>
          </div>
          {/* Ilustrações estáticas em CSS: o Desktop ensina SOMENTE as regras.
              Os WebPs animados de mãos são exclusivos do tutorial XR. */}
          {stepId === 'lottery' && (
            <div
              className="sena-tutorial-rule-visual sena-tutorial-lottery"
              aria-label="Exemplo de sorteio inicial"
            >
              {(
                [
                  ['Você', '3'],
                  ['Claudinha', '6'],
                  ['Paty', '2'],
                  ['Chico', '5'],
                ] as const
              ).map(([name, die]) => (
                <div key={name}>
                  <strong>{name}</strong>
                  <span>⚄ {die}</span>
                </div>
              ))}
              <small>
                Maior resultado começa • Empates pelo primeiro lugar são resolvidos com novo
                lançamento.
              </small>
            </div>
          )}
          {stepId === 'movement' && (
            <div
              className="sena-tutorial-rule-visual sena-tutorial-movement"
              aria-label="Exemplo de percurso de peão"
            >
              {[4, 5, 6, 7, 8].map((n) => (
                <div key={n} className={n === 7 ? 'is-current' : ''}>
                  <span>{n}</span>
                  <span>{n === 7 ? '♟' : ' '}</span>
                </div>
              ))}
              <small>Exemplo: casa 4 + dado 3 = casa 7 após acertar.</small>
            </div>
          )}
          {stepId === 'victory' && (
            <div
              className="sena-tutorial-rule-visual sena-tutorial-victory"
              aria-label="Vitória na casa 30"
            >
              <strong>29</strong>
              <span aria-hidden="true">➜</span>
              <strong className="is-winner">30 ★</strong>
              <small>Se a jogada ultrapassar a casa 30, o peão permanece onde está.</small>
            </div>
          )}
          {stepId === 'events' && (
            <div className="sena-tutorial-event-tags" aria-label="Casas especiais">
              <span className="benefit">Benefícios: 11 · 18 · 25</span>
              <span className="penalty">Penalidades: 10 · 12 · 17 · 19 · 24 · 26</span>
            </div>
          )}
          {stepId === 'questions' && (
            <div className="sena-tutorial-example" aria-label="Exemplo de movimentação">
              <div>
                <b className="green">✓ Acerto</b>
                <span>Avança o valor do dado</span>
              </div>
              <div>
                <b className="orange">× Erro</b>
                <span>Recua o valor do dado</span>
              </div>
            </div>
          )}
        </div>
        <footer className="sena-tutorial-footer">
          <button
            ref={firstButton}
            type="button"
            className="sena-tutorial-secondary"
            onClick={() => end(true)}
          >
            Pular tutorial
          </button>
          <div className="sena-tutorial-nav">
            <button
              type="button"
              className="sena-tutorial-secondary"
              onClick={back}
              disabled={index === 0}
            >
              Voltar
            </button>
            <button type="button" className="sena-tutorial-primary" onClick={next}>
              {index === DESKTOP_TUTORIAL_STEPS.length - 1 ? 'Concluir' : 'Próximo →'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
