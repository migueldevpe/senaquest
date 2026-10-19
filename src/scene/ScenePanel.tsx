import { Text, RoundedBox } from '@react-three/drei';
import { useGame, currentArea, currentPlayer, currentQuestion } from '../game/store';
import { COURSES, NAMES } from '../game/data';
function Button3D({
  label,
  onClick,
  y,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  y: number;
  disabled?: boolean;
}) {
  return (
    <group
      position={[0, y, 0.06]}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <RoundedBox args={[2.9, 0.38, 0.09]} radius={0.08}>
        <meshStandardMaterial
          color={disabled ? '#657487' : '#16a7a0'}
          emissive={disabled ? '#000000' : '#07534e'}
          emissiveIntensity={0.12}
        />
      </RoundedBox>
      <Text position={[0, 0, 0.06]} fontSize={0.17} maxWidth={2.7} color="#ffffff">
        {label}
      </Text>
    </group>
  );
}
export function ScenePanel() {
  const s = useGame();
  if (['choose', 'confirm'].includes(s.phase)) return null;
  const id = currentPlayer(s),
    bot = id !== 0;
  let title = 'SENAQUEST',
    details = '';
  let buttons: { label: string; action: () => void }[] = [];
  switch (s.phase) {
    case 'intro':
      title = 'Vamos descobrir quem começa?';
      details =
        'Cada jogador lança o dado uma vez.\nO maior número começa.\nO sorteio não movimenta ninguém.';
      buttons = [{ label: 'Iniciar sorteio', action: s.startLottery }];
      break;
    case 'lottery':
      title = 'Sorteio inicial';
      details = `Agora: ${NAMES[s.eligible[s.lotteryIndex]]}\n${NAMES.map((n, i) => `${n}: ${s.lotteryRolls[i] ?? '—'}`).join('  |  ')}\n${s.message}`;
      if (s.eligible[s.lotteryIndex] === 0)
        buttons = [{ label: 'Lançar dado', action: s.lotteryStep }];
      break;
    case 'lotteryResult':
      title = 'Sorteio concluído';
      details = `${s.message}\nTodos continuam na casa 0.\nO vencedor lança novamente.`;
      buttons = [{ label: 'Começar partida', action: s.beginMatch }];
      break;
    case 'turn':
      title = id === 0 ? 'Sua vez' : `Vez de ${NAMES[id]}`;
      details = s.message;
      if (!bot && !s.players[id].skip) buttons = [{ label: 'Lançar dado', action: s.throwDie }];
      break;
    case 'question':
      title = `${currentArea(s)} • ${s.seconds}s`;
      details = `Dado: ${s.die}\n${currentQuestion(s).prompt}`;
      if (!bot)
        buttons = currentQuestion(s).options.map((v, i) => ({
          label: `${'ABCD'[i]}. ${v}`,
          action: () => s.answerQuestion(i),
        }));
      break;
    case 'feedback':
      title = s.message;
      details = `${currentQuestion(s).explanation}\nResposta: ${'ABCD'[currentQuestion(s).correct]}`;
      buttons = [{ label: 'Continuar', action: s.finishFeedback }];
      break;
    case 'moving':
      title = 'Movimentação';
      details = s.message;
      buttons = [{ label: 'Próximo turno', action: s.finishMovement }];
      break;
    case 'finished':
      title = 'Parabéns, temos um vencedor!';
      details = `Vencedor: ${NAMES[s.winner ?? 0]}\n${s.players.map((p, i) => `${NAMES[i]}: casa ${p.position}`).join('  |  ')}`;
      buttons = [
        { label: 'Jogar novamente', action: () => s.restart(false) },
        { label: 'Escolher outro curso', action: () => s.restart(true) },
      ];
      break;
  }
  return (
    <group position={[0, 2.2, 2.8]} rotation={[-0.12, 0, 0]}>
      <RoundedBox args={[4.15, 3.15, 0.12]} radius={0.15}>
        <meshStandardMaterial color="#142c49" transparent opacity={0.97} />
      </RoundedBox>
      <Text position={[0, 1.23, 0.09]} maxWidth={3.8} fontSize={0.25} color="#7de4d9">
        {title}
      </Text>
      <Text
        position={[0, 0.73, 0.09]}
        maxWidth={3.75}
        fontSize={0.155}
        lineHeight={1.35}
        color="#ffffff"
        anchorY="top"
        textAlign="center"
      >
        {details}
      </Text>
      {buttons.slice(0, 4).map((b, i) => (
        <Button3D
          key={i}
          label={b.label.length > 36 ? b.label.slice(0, 35) + '…' : b.label}
          y={-0.28 - i * 0.47}
          onClick={b.action}
        />
      ))}
      <Text position={[0, -1.45, 0.09]} fontSize={0.1} color="#a8c1d8">
        {COURSES[s.course].name} •{' '}
        {NAMES.map((n, i) => `${n}: ${s.players[i].position}`).join('  ')}
      </Text>
    </group>
  );
}
