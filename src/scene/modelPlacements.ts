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
  // Estante definitiva shelfvendas.fbx.
  // X é a FACE TRASEIRA, encostada à parede direita (não o centro do móvel).
  // Y é a base do móvel, junto ao piso. Z é o centro ao longo da parede.
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
  // Os nomes foram corrigidos sem alterar a geometria nem a posição dos modelos.
  // 'mesa' identifica o modelo com iMac; o arquivo foi renomeado sem alterar a malha.
  mesa: { position: [3.1, 0.005, 7.35], rotationY: Math.PI, maxDimensions: [2.2, 1.3, 2] },
  maca: { position: [-2, 0.005, 5.85], rotationY: Math.PI / 2, maxDimensions: [3.85, 4.725, 3.51] },
  trolley: { position: [-3.5, 0.005, 6.25], rotationY: 2.75, maxDimensions: [1, 1.3, 1.03] },

  // 'mesa_medicina' identifica o modelo anteriormente registrado como 'mesa'.
  mesa_medicina: {
    position: [0.3, 0.005, 7.25],
    rotationY: 4.7125,
    maxDimensions: [2.5, 2.1, 2.6],
  },

  // iMac: position é LOCAL ao TAMPO da mesa (não ao piso da sala).
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
  // Usa o outro modelo de mesa (mesa.fbx), voltado para o centro da sala.
  administration_table: {
    position: [-7.4, 0.005, -1.5],
    rotationY: Math.PI / 2,
    maxDimensions: [2.5, 2.1, 2.6],
  },
  // Rack decorativo da parede: sua posição/rotação são absolutas; o conteúdo usa
  // posições locais relativas a este grupo para facilitar o ajuste das prateleiras.
  administration_chair: {
    position: [-6.45, 0, -2.25],
    rotationY: -Math.PI / 2 + 0.25,
    maxDimensions: [1.55, 1.9, 1.55],
  },
  administration_rack: {
    position: [-7.8275, 1.55, 2.125],
    rotationY: Math.PI / 2,
    maxDimensions: [4.25, 1.57, 0.31],
  },
  administration_rack_document_holder_1: {
    position: [-1.68, -0.665, 0.13],
    rotationY: Math.PI / 2 - 0.1,
    maxDimensions: [0.84, 1.35, 0.6],
  },
  administration_rack_document_holder_2: {
    position: [-1.08, -0.665, 0.13],
    rotationY: Math.PI / 2 + 0.2,
    maxDimensions: [0.84, 1.35, 0.6],
  },
  administration_rack_document_holder_3: {
    position: [-0.48, -0.665, 0.13],
    rotationY: Math.PI / 2 + 0.3,
    maxDimensions: [0.84, 1.35, 0.6],
  },
  administration_rack_document_holder_4: {
    position: [0.48, 0.095, 0.13],
    rotationY: Math.PI / 2 + 0.3,
    maxDimensions: [0.84, 1.35, 0.6],
  },
  administration_rack_document_holder_5: {
    position: [1.08, 0.095, 0.13],
    rotationY: Math.PI / 2 - 0.1,
    maxDimensions: [0.84, 1.35, 0.6],
  },
  administration_rack_document_holder_6: {
    position: [1.68, 0.095, 0.13],
    rotationY: Math.PI / 2 + 0.2,
    maxDimensions: [0.84, 1.35, 0.6],
  },
  administration_rack_book_1: {
    position: [0.25, -0.665, 0.13],
    rotationY: -0.08,
    maxDimensions: [0.5, 0.6, 0.4],
  },
  administration_rack_book_2: {
    position: [0.5, -0.665, 0.13],
    rotationY: 0.1,
    maxDimensions: [0.5, 0.6, 0.4],
  },
  administration_rack_book_3: {
    position: [0.75, -0.665, 0.13],
    rotationY: -0.04,
    maxDimensions: [0.5, 0.6, 0.4],
  },
  administration_rack_book_4: {
    position: [-1.75, 0.095, 0.13],
    rotationY: 0.08,
    maxDimensions: [0.5, 0.6, 0.4],
  },
  administration_rack_book_5: {
    position: [-1.5, 0.095, 0.13],
    rotationY: -0.12,
    maxDimensions: [0.5, 0.6, 0.4],
  },
  administration_rack_book_6: {
    position: [-1.25, 0.095, 0.13],
    rotationY: 0.04,
    maxDimensions: [0.5, 0.6, 0.4],
  },
  administration_whiteboard: {
    position: [-7.86, 2.75, -5],
    rotationY: Math.PI / 2,
    maxDimensions: [2.6, 1.32, 0.16],
  },
  administration_printer: {
    position: [-7.4, 0.01, -0.675],
    rotationY: -Math.PI / 2,
    maxDimensions: [0.96, 0.76, 0.6],
  },
  administration_imac: {
    position: [-7.4, 0.01, -1.85],
    rotationY: Math.PI / 2,
    maxDimensions: [1.42, 1.36, 0.6],
  },
  administration_telephone: {
    position: [-7.625, 0.01, -2.55],
    rotationY: 0,
    maxDimensions: [0.38, 0.28, 0.32],
  },
  administration_paper_stack: {
    position: [-7.4, 0.01, -1.25],
    rotationY: Math.PI / 2,
    maxDimensions: [0.7, 0.3, 0.54],
  },
  administration_stack_of_paper: {
    position: [-7.275, -0.415, -0.725],
    rotationY: Math.PI / 2,
    maxDimensions: [0.8, 0.1, 0.6],
  },

  // === LOGÍSTICA E VENDAS ===
  logistics_whiteboard: {
    position: [7.84, 2.75, -5],
    rotationY: -Math.PI / 2,
    maxDimensions: [2.6, 1.32, 0.16],
  },
  // Usa mesa_medicina.fbx, a mesa metálica com prateleira inferior.
  logistics_table: {
    position: [7.35, 0.005, -1.75],
    rotationY: 0,
    maxDimensions: [2.5, 2.1, 2.6],
  },
  logistics_shelf: {
    position: [7.905, 0.00475, 2.25],
    rotationY: -Math.PI / 2,
    maxDimensions: [3, 3.25, 1.2],
  },
  // Caixa registradora sobre o tampo da mesa de logística. X/Z são absolutos;
  // Y é um pequeno afastamento acima do tampo, calculado pela altura real do FBX.
  logistics_cash_register: {
    position: [7.325, -0.0625, -0.85],
    rotationY: -Math.PI,
    maxDimensions: [0.82, 0.56, 0.62],
  },
  logistics_payment_terminal: {
    position: [7.1, -0.0625, -1.3],
    rotationY: -Math.PI / 2,
    maxDimensions: [0.28, 0.3, 0.24],
  },
  // Conjunto de boxes reposicionado dentro de Logística, longe do setor de Saúde.
  logistics_boxes_stack: {
    position: [7, 0.005, 0.1],
    rotationY: -Math.PI / 2,
    maxDimensions: [1.75, 1.75, 1.75],
  },
  // Quatro caixas individuais alinhadas no nível intermediário da estante.
  logistics_box_single: {
    position: [7.5, 2.15, 3.35],
    rotationY: -Math.PI / 2,
    maxDimensions: [0.44, 0.44, 0.44],
  },
  logistics_box_shelf_2: {
    position: [7.65, 1.475, 1.25],
    rotationY: -Math.PI / 2,
    maxDimensions: [0.44, 0.44, 0.44],
  },
  logistics_box_shelf_3: {
    position: [7.5, 0.825, 2.5],
    rotationY: -Math.PI / 2,
    maxDimensions: [0.44, 0.44, 0.44],
  },
  logistics_box_shelf_4: {
    position: [7.65, 0.15, 1.75],
    rotationY: -Math.PI / 2,
    maxDimensions: [0.44, 0.44, 0.44],
  },
  // Três caixas apoiadas na prateleira inferior da mesa de Logística e Vendas.
  logistics_box_under_table_1: {
    position: [7.5, 1.15, -1.75],
    rotationY: -12,
    maxDimensions: [0.44, 0.44, 0.44],
  },
  logistics_box_under_table_2: {
    position: [7.25, 1.15, -2.25],
    rotationY: 12,
    maxDimensions: [0.44, 0.44, 0.44],
  },
  logistics_box_under_table_3: {
    position: [7.25, 0.2, -1.5],
    rotationY: 0,
    maxDimensions: [0.44, 0.44, 0.44],
  },
} satisfies Record<string, ModelPlacement>;

export type UserModelId = keyof typeof MODEL_PLACEMENTS;
/** Os três FBX do conjunto original de Saúde (pastas individuais). */
export type HealthModelId =
  | 'mesa_medicina'
  | 'maca'
  | 'trolley'
  | 'iv_pole'
  | 'trash'
  | 'glove_box'
  | 'defibrillator'
  | 'medical_kit';
/** Compatibilidade com o identificador que já era usado em HealthSectorModels. */
export const HEALTH_MODEL_PLACEMENTS = MODEL_PLACEMENTS;
