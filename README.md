# SENAQUEST v1.9

Novidades: quatro bases quadradas individuais, cada uma diante do respectivo jogador; cronômetros com prazo único e animação suave independente do React; sorteio compacto com destaque de quem lança; bloqueio de lançamento duplicado por clique/timeout. Não inclui indicador de FPS.

Para executar: `npm install` e `npm run dev`. Para validar: `npm run build` e `npm test`.

# SENAQUEST WebXR v1.5

## Ajustes desta versão

- Balão 3D azul arredondado, com ponta inferior apontando para o dado e acompanhamento espacial via Billboard.
- Impulso padrão do dado 0.060 (calibrável na depuração).
- Cena 3D isolada dos rerenders do relógio do painel com React.memo(World).
- Sorteio: jogador humano lança apenas o próprio dado; bots lançam automaticamente (inclusive desempates).

**Importante:** o isolamento de World elimina os rerenders causados pelo estado local do cronômetro no App; não substitui perfilamento de FPS no Quest 3S.

# SENAQUEST WebXR v1.4

Projeto completo e independente. Não é necessário instalar versões anteriores.

## Novidades

- Lançamentos físicos originados de cada um dos quatro lados da mesa, com pontos de origem próximos à posição das mãos.
- Barreira de entrada temporariamente desativada para o lançador; ativada após o dado entrar inteiramente na arena. As demais barreiras continuam ativas.
- Pequena variação física nos impulsos, sombra projetada e identificação de quem lançou.
- Recuperação com até duas novas tentativas físicas para lançamentos inválidos ou longos; após esse limite, usa a face física atual para não bloquear a partida.
- Barra de tempo fluida via animação CSS (`transform: scaleX`), sem atualizações React a cada quadro.
- Depuração com visualização opcional dos limites físicos.

## Execução

```bash
npm install
npm run dev
```

## Validação

```bash
npm run build
npm test
```

O ZIP contém o projeto completo. Os testes de colisão no navegador/Quest 3S ainda são necessários. A instalação de dependências não concluiu neste ambiente, portanto não foi possível validar o build aqui.

## Limitações conhecidas

- Se o dado continuar instável após duas novas tentativas físicas, a partida usa a face superior mais próxima, sem endireitar visualmente o cubo.
- Os modelos dos professores são provisórios e não há animações de arremesso dos braços.
- A interface HTML das perguntas ainda requer adaptação para interação WebXR completa.
- Questões demonstrativas precisam de revisão pedagógica.

## v1.4

- Cronômetro em componente memoizado, CSS transform e contador a 1 Hz.
- Sorteio inicial usa exclusivamente resultado físico (sem sorteio lógico antecipado).
- Número do dado aparece sobre o objeto após estabilizar, com mais 1 s de exibição.
- Força do dado ajustada e números das casas encostados à superfície.
- Transparência desativada durante a movimentação e transições.

## Ajustes v1.6

- Balão do resultado sincronizado à posição física do dado mesmo depois de estabilizar (antes ele ficava na origem porque o loop retornava cedo).
- Balão 3D com renderOrder alto e materiais sem teste de profundidade para evitar ficar atrás do cenário.
- Sorteio inicial anuncia o nome real de cada bot.
- Ajustes suaves de sombra para reduzir manchas duras sobre o tabuleiro.

**Nota:** a mancha escura destacada na captura parece uma sombra projetada, mas a identificação definitiva requer inspecionar a cena em execução.

## Novidades v1.7

- Largada exclusiva na borda interna, com quatro posições independentes para os pinos.
- Pinos apoiados na altura da largada e das casas; primeiro salto parte da largada.
- Retirados objetos decorativos soltos nas paredes e reposicionada placa do estoque.
- Sorteio inicial humano: lançamento automático após 10 segundos sem clique, também nos desempates.

## Atualização v1.9

- Quatro bases quadradas físicas, elevadas e integradas à moldura do tabuleiro, uma à frente de cada participante.
- Pinos repousam sobre a superfície das bases antes de entrar nas casas numeradas.
- Placas laterais reposicionadas acima das estantes e afastadas dos painéis gráficos.
- Zoom desktop com amortecimento exponencial independente do FPS, sem afastar além do FOV inicial.
- Modo VR mantém o rastreamento natural do headset.

## Ajuste v2.0: personagem rigado no Chico

O personagem rigado foi transferido da Claudinha para Chico (indice 3). Claudinha voltou ao personagem anterior.

### v2.0 — correção de visibilidade do Chico

O GLB já tem eixo vertical **Y**, conforme os acessores do próprio arquivo. A versão anterior aplicava uma rotação adicional de -90 graus no eixo X, deitando o personagem e fazendo-o desaparecer atrás da cadeira. Essa rotação foi removida, preservando escala 190 (aprox. 1,80 m), cadeira e rig. A animação procedural permanece experimental e exige teste visual.

## Chico procedural (v2.2 otimizada)

O Chico é gerado em `src/scene/ProceduralChico.tsx`, sem GLB, Armature ou carregamento de modelos externos. Os arquivos antigos de diagnóstico e o painel de debug foram removidos. Sombras dinâmicas são desligadas no Quest/Android e mantidas no desktop; a resolução de renderização permanece limitada por dispositivo.
