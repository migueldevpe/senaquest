/**
 * CONFIGURAÇÃO CENTRAL DE POSICIONAMENTO DOS MODELOS 3D DEFINITIVOS.
 *
 * Edite SOMENTE este cadastro para ajustar a localização/escala dos modelos
 * escolhidos pelo usuário, de QUALQUER setor (Saúde, Tecnologia, Administração,
 * Logística e Vendas). Cada novo modelo definitivo deve ganhar uma entrada
 * com os mesmos campos: position, rotationY e maxDimensions.
 *
 * position: [X, Y, Z] em unidades da sala (~metros), EXCETO modelos explicitamente
 * identificados como relativos a outro objeto (como o iMac abaixo).
 * rotationY: rotação em RADIANOS (Math.PI / 2 = 90 graus).
 * maxDimensions: [largura X, altura Y, profundidade Z], sem deformar o modelo.
 *
 * Os PLACEHOLDERS temporários são separados deste cadastro para que possam
 * ser apagados pelo script de limpeza sem afetar os modelos definitivos.
 */

export type Vec3 = [number, number, number];
export type ModelPlacement = {
  position: Vec3;
  rotationY: number;
  maxDimensions: Vec3;
};

export const MODEL_PLACEMENTS = {
  // === ORGANIZAÇÃO DA SALA / MOBILIÁRIO CONFIGURÁVEL ===
  // Estantes de setor e cadeiras auxiliares também entram aqui para que TODO
  // elemento novo siga o mesmo padrão position / rotationY / maxDimensions.
  // Compatibilidade histórica APENAS: não há prateleira de TI renderizada.
  technology_shelf: {
    position: [-4.5, 1.3, -7.15],
    rotationY: 0,
    maxDimensions: [2.3, 2.55, 0.5],
  },
  health_shelf: {
    position: [6.15, 1.3, 7.15],
    rotationY: Math.PI,
    maxDimensions: [2.3, 2.55, 0.5],
  },
  // Estante definitiva shelfvendas.fbx.
  // X é a FACE TRASEIRA, encostada à parede direita (não o centro do móvel).
  // Y é a base do móvel, junto ao piso. Z é o centro ao longo da parede.
  logistics_shelf: {
    position: [7.905, 0.005, 4.5],
    rotationY: -Math.PI / 2,
    maxDimensions: [2.3, 2.55, 0.5],
  },
  // Cadeira extra do setor Saúde, reaproveitando o mesmo FBX das cadeiras dos players.
  cadeira_mesa_saude: {
    position: [2.6, 0, 6.45],
    rotationY: Math.PI * 2.25,
    maxDimensions: [1.55, 1.9, 1.55],
  },

  // === ILUMINAÇÃO DECORATIVA DO TETO (4 luminárias retangulares) ===
  // Os feixes são puramente visuais e não alteram as três luzes estabilizadas.
  // Posição Y = parte inferior do forro; maxDimensions controla o encaixe do GLB.
  // Dimensões exatas [2.6, 0.60, 0.55]: topo do feixe = face inferior do GLB.
  ceiling_light_1: { position: [-4, 5.15, -4], rotationY: 0, maxDimensions: [2.6, 0.6, 0.55] },
  ceiling_light_2: { position: [4, 5.15, -4], rotationY: 0, maxDimensions: [2.6, 0.6, 0.55] },
  ceiling_light_3: { position: [-4, 5.15, 4], rotationY: 0, maxDimensions: [2.6, 0.6, 0.55] },
  ceiling_light_4: { position: [4, 5.15, 4], rotationY: 0, maxDimensions: [2.6, 0.6, 0.55] },

  // === ADMINISTRAÇÃO EM SAÚDE / MEDICINA ===
  // Todos estes três usam coordenadas ABSOLUTAS da sala.
  mesa: { position: [0.3, 0.005, 7.25], rotationY: 4.7125, maxDimensions: [2.5, 2.1, 2.6] },
  maca: { position: [-2, 0.005, 5.85], rotationY: Math.PI / 2, maxDimensions: [3.85, 4.725, 3.51] },
  trolley: { position: [-3.5, 0.005, 6.25], rotationY: 2.75, maxDimensions: [1, 1.3, 1.03] },

  // Mesa de Medicina: coordenadas ABSOLUTAS da sala.
  mesa_medicina: {
    position: [3.1, 0.005, 7.35],
    rotationY: Math.PI,
    maxDimensions: [2.2, 1.3, 2],
  },

  // iMac: position é LOCAL ao TAMPO da mesa de Medicina (não ao piso da sala).
  // X/Z são relativos ao centro da mesa; Y é a distância ACIMA do tampo.
  // rotationY é relativa à rotação da própria mesa. Isto mantém o iMac apoiado
  // automaticamente se a mesa mudar de posição, escala ou orientação.
  imac: {
    position: [0, 0.01, 0],
    rotationY: 0,
    maxDimensions: [1.42, 1.36, 0.6],
  },

  // Acessórios adicionais de Saúde, todos configuráveis pelo mesmo padrão.
  iv_pole: {
    position: [-3.3, 0.005, 7.25],
    rotationY: 3.125,
    maxDimensions: [1.2, 2.45, 1.2],
  },
  trash: {
    position: [-0.8, 0.005, 6.5],
    rotationY: Math.PI * 2,
    maxDimensions: [0.72, 1.05, 0.72],
  },
  glove_box: {
    position: [0.25, 1.175, 7],
    rotationY: Math.PI / 2,
    maxDimensions: [0.46, 0.18, 0.32],
  },
  defibrillator: {
    position: [0.25, 1.75, 7.75],
    rotationY: Math.PI * 3,
    maxDimensions: [0.74, 0.46, 0.34],
  },
  // Kit de primeiros socorros: posição provisória perto da mesa de Medicina.
  // Ajuste aqui caso queira colocá-lo na estante ou em outro expositor.
  medical_kit: {
    position: [1, 1.175, 7.1],
    rotationY: Math.PI,
    maxDimensions: [0.5, 0.39, 0.24],
  },

  // === TECNOLOGIA ===
  // Óculos VR: coordenadas definitivas informadas pelo usuário.
  // Y é a base do modelo; verificar o apoio real na estante durante o teste.
  technology_vr_1: {
    position: [-2.15, 1.375, -7.5],
    rotationY: 0.5,
    maxDimensions: [0.56, 0.34, 0.38],
  },
  technology_vr_2: {
    position: [-1.75, 1.375, -7.35],
    rotationY: 0,
    maxDimensions: [0.56, 0.34, 0.38],
  },
  technology_vr_3: {
    position: [-1.35, 1.375, -7.65],
    rotationY: -0.5,
    maxDimensions: [0.56, 0.34, 0.38],
  },
  // Servidores lado a lado, próximos à parede traseira, apoiados no piso.
  technology_server_1: {
    position: [4.55, 0.005, -7.25],
    rotationY: 0,
    maxDimensions: [1.24, 3.4, 1.04],
  },
  technology_server_2: {
    position: [6, 0.005, -7.25],
    rotationY: 0,
    maxDimensions: [1.24, 3.4, 1.04],
  },
  // PS5 e monitor: coordenadas definitivas enviadas pelo usuário.
  // Y representa a BASE de ambos os modelos; o monitor substitui os antigos.
  technology_monitor_1: {
    position: [1.2, 1.375, -7.5],
    rotationY: Math.PI / -2,
    maxDimensions: [3.35, 2.54, 1.22],
  },
  technology_ps5: {
    position: [2.15, 1.375, -7.5],
    rotationY: 0,
    maxDimensions: [0.45, 0.55, 0.38],
  },
  // TV na parede da área de TI: NÃO há prateleira antiga renderizada.
  technology_tv: {
    position: [-4.5, 2.02, -7.65],
    rotationY: 0,
    maxDimensions: [2.45, 1.45, 0.58],
  },
  // Fone: materiais e cores do FBX preservados.
  technology_headphones: {
    position: [2.15, 1.55, -7.5],
    rotationY: 0,
    maxDimensions: [0.56, 0.55, 0.45],
  },
  // Laptop NEW, aberto, com mapas PBR próprios. Posição INICIAL provisória
  // sobre a bancada de TI; pode ser refinada após testar no Meta Quest.
  technology_laptop: {
    position: [-0.75, 1.375, -7.5],
    rotationY: 0,
    maxDimensions: [0.72, 0.48, 0.6],
  },
  // Três gabinetes pretos empilhados abaixo da TV: dois na base e um no topo.
  // Posições iniciais apenas para visualização; o usuário enviará ajuste fino.
  technology_pc_1: {
    position: [-5.0, 0.005, -7.65],
    rotationY: Math.PI,
    maxDimensions: [0.88, 0.74, 0.66],
  },
  technology_pc_2: {
    position: [-4.25, 0.005, -7.65],
    rotationY: Math.PI,
    maxDimensions: [0.88, 0.74, 0.66],
  },
  technology_pc_3: {
    position: [-4.6, 0.68, -7.65],
    rotationY: Math.PI,
    maxDimensions: [0.88, 0.74, 0.66],
  },
  // Teclado apoiado no gabinete superior da pilha abaixo da TV.
  technology_keyboard: {
    position: [-4.5, 1.425, -7.65],
    rotationY: 0.2,
    maxDimensions: [0.72, 0.09, 0.32],
  },

  // === ADMINISTRAÇÃO ===
  // Os próximos modelos definitivos de Administração serão inseridos aqui.

  // === LOGÍSTICA E VENDAS ===
  // Os próximos modelos definitivos de Logística e Vendas serão inseridos aqui.
} satisfies Record<string, ModelPlacement>;

export type UserModelId = keyof typeof MODEL_PLACEMENTS;
/** Os três FBX do conjunto original de Saúde (pastas individuais). */
export type HealthModelId =
  'mesa' | 'maca' | 'trolley' | 'iv_pole' | 'trash' | 'glove_box' | 'defibrillator' | 'medical_kit';
/** Compatibilidade com o identificador que já era usado em HealthSectorModels. */
export const HEALTH_MODEL_PLACEMENTS = MODEL_PLACEMENTS;
