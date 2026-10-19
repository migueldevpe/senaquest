# Padrões técnicos de personagens 3D — SENAQUEST

- Todos os novos personagens utilizam o sistema compartilhado `FBXCharacter` em `src/scene/characters/FBXCharacter.tsx`, com identidade, modelo, posição e índice próprios.
- Pré-carregar os modelos; usar `SkeletonUtils.clone` para preservar os esqueletos individuais.
- Reutilizar texturas quando seguro, preferir WebP sem perdas quando viável, preservar materiais e UVs específicos de cada personagem.
- Animar somente ossos existentes. Manter postura sentada, gesto de preparação e lançamento, reação de erro, soquinho discreto em acertos e braços erguidos na vitória.
- Evitar travessias completas da hierarquia por quadro e recriações de geometrias, materiais e vetores temporários desnecessários.
- Validar rigging, escala, texturas, posição, reações, reinício e desempenho real no Quest 3S antes de considerar uma integração concluída.
- Câmera desktop: giro horizontal limitado a ±180°. No VR, nunca bloquear o rastreamento físico da cabeça.
- UI: modais 16px, superfícies internas 8px, botões 14px; contorno do tooltip do dado `#ff981a`.

- Toda textura UV enviada separadamente deve ser vinculada explicitamente ao FBX, pré-carregada e convertida para WebP sem perdas quando apropriado; validar cores e orientação UV visualmente.
- Nunca tornar o tabuleiro visível temporariamente durante a inicialização ou pré-compilação; sua visibilidade deve seguir o estado do jogo desde o primeiro quadro.

## Configuração individual e vitória

- Ajustar a altura da Paty em `src/scene/characters/characterConfig.ts`, na propriedade `paty.targetHeight`; Chico usa `chico.targetHeight` independente.
- `Chico.tsx` e `Paty.tsx` são apenas carregadores dos próprios modelos e texturas; rigging e animações ficam no `FBXCharacter.tsx`.
- Soquinho de acerto curto e discreto, com cotovelo direito flexionado; vitória final ergue ambos os braços por aproximadamente 3 segundos.
- A coroa permanece até reiniciar ou começar nova partida, com nickname elevado para não sobrepor; confetes param após alguns segundos.
- Cada personagem deve usar uma cor de identidade única no nickname, pino, base e indicador do placar.
- Posição do personagem, base do pino, direção do lançamento e colisor de entrada devem corresponder ao mesmo índice do jogador.

- Cores de identidade devem vir exclusivamente de `src/game/playerVisual.ts` (nickname, pino e placar).
- Comemoração de acerto: soquinho de vitória com mão direita fechada, animado pelo módulo compartilhado `characterAnimation.ts`; preservar reação de erro.
