export const COLORS = ['#3986c9', '#39b49a', '#9065cc', '#f29a35', '#e4c23d'] as const;
export const COLOR_NAMES = ['Azul', 'Verde', 'Roxo', 'Laranja', 'Amarelo'] as const;
export const COURSES = {
  supermercado: {
    name: 'Supermercado',
    areas: [
      'Operação de caixa',
      'Atendimento ao cliente',
      'Reposição de mercadorias',
      'Estoque e validade',
      'Prevenção de perdas',
    ],
  },
  administracao: {
    name: 'Administração',
    areas: [
      'Financeiro',
      'Recursos Humanos (RH)',
      'Departamento Pessoal (DP)',
      'Compras e fornecedores',
      'Rotinas administrativas',
    ],
  },
  vendas: {
    name: 'Vendas',
    areas: [
      'Prospecção',
      'Atendimento',
      'Apresentação de produtos',
      'Negociação e fechamento',
      'Pós-venda',
    ],
  },
  ads: {
    name: 'Análise e Desenvolvimento de Sistemas (ADS)',
    areas: [
      'Lógica de programação',
      'Algoritmos e programação',
      'Banco de dados',
      'Desenvolvimento de sistemas',
      'Testes e segurança',
    ],
  },
  logistica: {
    name: 'Logística',
    areas: [
      'Controle de estoque',
      'Armazenagem',
      'Transporte',
      'Distribuição e roteirização',
      'Documentação e indicadores',
    ],
  },
  saude: {
    name: 'Administração em Saúde',
    areas: [
      'Recepção e agendamento',
      'Prontuários e confidencialidade',
      'Faturamento e convênios',
      'Organização de clínicas',
      'Ética e atendimento humanizado',
    ],
  },
} as const;
export type CourseId = keyof typeof COURSES;
export const COURSE_IDS = Object.keys(COURSES) as CourseId[];
export type Question = {
  prompt: string;
  options: [string, string, string, string];
  correct: number;
  explanation: string;
};
// Perguntas originais de demonstração, NÃO fornecidas pelo PDF; precisam de validação pedagógica.
export const QUESTIONS: Record<CourseId, Question[]> = {
  supermercado: [
    {
      prompt: 'Qual ação ajuda a evitar divergências no fechamento do caixa?',
      options: [
        'Ignorar comprovantes',
        'Conferir valores e registros',
        'Misturar dinheiro pessoal',
        'Não registrar troco',
      ],
      correct: 1,
      explanation: 'A conferência dos registros e valores reduz divergências.',
    },
    {
      prompt: 'Um cliente não encontra um produto. Qual é a melhor atitude?',
      options: [
        'Ignorar a dúvida',
        'Responder sem verificar',
        'Orientar com cordialidade',
        'Encerrar o atendimento',
      ],
      correct: 2,
      explanation: 'Atendimento cordial e orientação clara ajudam o cliente.',
    },
    {
      prompt: 'Na reposição, qual cuidado é importante?',
      options: [
        'Bloquear corredores',
        'Conferir etiquetas e organização',
        'Misturar categorias',
        'Esconder preços',
      ],
      correct: 1,
      explanation: 'Etiquetas e organização facilitam a compra e reduzem erros.',
    },
    {
      prompt: 'Qual prática ajuda a controlar a validade dos produtos?',
      options: [
        'Não verificar datas',
        'Usar primeiro os mais novos',
        'Conferir prazos regularmente',
        'Descartar etiquetas',
      ],
      correct: 2,
      explanation: 'Conferir prazos ajuda a prevenir perdas.',
    },
    {
      prompt: 'O que contribui para prevenir perdas?',
      options: [
        'Registrar ocorrências',
        'Ignorar avarias',
        'Deixar estoque sem controle',
        'Evitar inventários',
      ],
      correct: 0,
      explanation: 'Registrar ocorrências permite identificar e corrigir problemas.',
    },
  ],
  administracao: [
    {
      prompt: 'Qual documento ajuda a acompanhar entradas e saídas de dinheiro?',
      options: ['Fluxo de caixa', 'Lista de aniversários', 'Catálogo de cores', 'Escala de férias'],
      correct: 0,
      explanation: 'O fluxo de caixa organiza movimentações financeiras.',
    },
    {
      prompt: 'Qual é uma atividade típica de RH?',
      options: [
        'Reparar impressoras',
        'Apoiar recrutamento e integração',
        'Definir rotas de entrega',
        'Emitir notas de venda',
      ],
      correct: 1,
      explanation: 'RH atua com pessoas, seleção e integração.',
    },
    {
      prompt: 'O Departamento Pessoal costuma cuidar de:',
      options: [
        'Campanhas publicitárias',
        'Controle de documentos trabalhistas',
        'Design de vitrines',
        'Controle de estoque',
      ],
      correct: 1,
      explanation: 'O DP organiza registros e rotinas trabalhistas.',
    },
    {
      prompt: 'Antes de comprar materiais para a empresa, é recomendável:',
      options: [
        'Escolher sem comparar',
        'Solicitar cotações',
        'Ignorar orçamento',
        'Comprar duplicado',
      ],
      correct: 1,
      explanation: 'Cotações ajudam a comparar condições de fornecimento.',
    },
    {
      prompt: 'Uma boa rotina administrativa envolve:',
      options: [
        'Perder documentos',
        'Organizar tarefas e arquivos',
        'Evitar registros',
        'Não definir prazos',
      ],
      correct: 1,
      explanation: 'Organização e registros tornam os processos mais confiáveis.',
    },
  ],
  vendas: [
    {
      prompt: 'Prospecção significa:',
      options: [
        'Buscar potenciais clientes',
        'Encerrar contratos antigos',
        'Repor mercadorias',
        'Fazer inventário',
      ],
      correct: 0,
      explanation: 'Prospecção identifica possíveis compradores.',
    },
    {
      prompt: 'Para entender a necessidade do cliente, o vendedor deve:',
      options: [
        'Interromper sempre',
        'Ouvir e perguntar',
        'Oferecer qualquer item',
        'Evitar diálogo',
      ],
      correct: 1,
      explanation: 'A escuta ativa orienta uma oferta adequada.',
    },
    {
      prompt: 'Ao apresentar um produto, é útil destacar:',
      options: [
        'Somente o preço',
        'Características e benefícios',
        'Informações falsas',
        'Apenas a embalagem',
      ],
      correct: 1,
      explanation: 'Benefícios conectam o produto às necessidades do cliente.',
    },
    {
      prompt: 'Diante de uma objeção, a melhor atitude é:',
      options: [
        'Pressionar o cliente',
        'Ouvir e esclarecer dúvidas',
        'Encerrar a conversa',
        'Ignorar a objeção',
      ],
      correct: 1,
      explanation: 'Esclarecer dúvidas ajuda na negociação responsável.',
    },
    {
      prompt: 'Qual é um exemplo de pós-venda?',
      options: [
        'Esquecer o comprador',
        'Acompanhar a satisfação',
        'Alterar o preço após a compra',
        'Não oferecer suporte',
      ],
      correct: 1,
      explanation: 'O acompanhamento fortalece o relacionamento.',
    },
  ],
  ads: [
    {
      prompt: 'Em lógica, a expressão verdadeiro E falso resulta em:',
      options: ['Verdadeiro', 'Falso', 'Nulo', 'Infinito'],
      correct: 1,
      explanation: 'O operador E só é verdadeiro quando ambos os lados são verdadeiros.',
    },
    {
      prompt: 'Um algoritmo é:',
      options: [
        'Uma sequência de instruções',
        'Apenas uma imagem',
        'Um tipo de monitor',
        'Um erro do sistema',
      ],
      correct: 0,
      explanation: 'Algoritmos descrevem passos para resolver problemas.',
    },
    {
      prompt: 'Em um banco de dados relacional, registros são organizados em:',
      options: ['Tabelas', 'Cabos', 'Telas físicas', 'Ventoinhas'],
      correct: 0,
      explanation: 'Tabelas organizam linhas e colunas de dados.',
    },
    {
      prompt: 'Qual elemento costuma receber cliques em uma interface?',
      options: ['Botão', 'Processador', 'Memória RAM', 'Cabo HDMI'],
      correct: 0,
      explanation: 'Botões são componentes interativos comuns.',
    },
    {
      prompt: 'Qual é uma boa prática de segurança?',
      options: [
        'Compartilhar senhas',
        'Usar senhas fortes',
        'Ignorar atualizações',
        'Desativar verificações',
      ],
      correct: 1,
      explanation: 'Senhas fortes ajudam a proteger acessos.',
    },
  ],
  logistica: [
    {
      prompt: 'Inventário serve para:',
      options: [
        'Contar e conferir itens',
        'Escolher uniformes',
        'Criar anúncios',
        'Emitir certificados',
      ],
      correct: 0,
      explanation: 'Inventários verificam quantidades em estoque.',
    },
    {
      prompt: 'Uma boa armazenagem exige:',
      options: [
        'Produtos sem identificação',
        'Organização e conservação',
        'Bloqueio das saídas',
        'Mistura aleatória',
      ],
      correct: 1,
      explanation: 'Organização facilita localização e preservação.',
    },
    {
      prompt: 'Qual opção representa um modal de transporte?',
      options: ['Rodoviário', 'Contábil', 'Administrativo', 'Digital'],
      correct: 0,
      explanation: 'Rodoviário é um modal usado para transportar cargas.',
    },
    {
      prompt: 'Roteirização ajuda a:',
      options: [
        'Planejar trajetos de entrega',
        'Trocar etiquetas',
        'Redigir contratos de trabalho',
        'Criar embalagens',
      ],
      correct: 0,
      explanation: 'Planejar rotas pode melhorar a distribuição.',
    },
    {
      prompt: 'Um indicador logístico pode medir:',
      options: ['Entregas no prazo', 'Cor da parede', 'Nome do uniforme', 'Número de cadeiras'],
      correct: 0,
      explanation: 'Indicadores ajudam a acompanhar desempenho.',
    },
  ],
  saude: [
    {
      prompt: 'Na recepção de uma clínica, é importante:',
      options: [
        'Confirmar dados do agendamento',
        'Expor dados pessoais',
        'Ignorar pacientes',
        'Trocar horários sem aviso',
      ],
      correct: 0,
      explanation: 'Conferir dados ajuda a organizar o atendimento.',
    },
    {
      prompt: 'Prontuários devem ser:',
      options: [
        'Compartilhados publicamente',
        'Protegidos e acessados conforme autorização',
        'Deixados em locais públicos',
        'Descartados sem critério',
      ],
      correct: 1,
      explanation: 'Informações de saúde exigem confidencialidade.',
    },
    {
      prompt: 'O faturamento em saúde pode envolver:',
      options: [
        'Registros de cobranças e convênios',
        'Somente decoração',
        'Controle de transporte escolar',
        'Criação de jogos',
      ],
      correct: 0,
      explanation: 'O faturamento organiza processos de cobrança.',
    },
    {
      prompt: 'Uma clínica bem organizada deve:',
      options: [
        'Definir fluxos de atendimento',
        'Ignorar horários',
        'Evitar registros',
        'Confundir setores',
      ],
      correct: 0,
      explanation: 'Fluxos claros tornam o atendimento mais eficiente.',
    },
    {
      prompt: 'Atendimento humanizado envolve:',
      options: ['Respeito e escuta', 'Pressa e indiferença', 'Exposição de dados', 'Discriminação'],
      correct: 0,
      explanation: 'Respeito, acolhimento e escuta são fundamentais.',
    },
  ],
};
export function colorIndex(square: number): number {
  if (square <= 0) return 0;
  const block = Math.floor((square - 1) / 5);
  return (((square - 1) % 5) + (block === 5 ? 0 : block)) % 5;
}
export const PENALTIES: Record<number, number> = { 5: 2, 10: 2, 15: 2, 20: 4, 25: 4 };
export const NAMES = ['Você', 'Claudinha', 'Paty', 'Chico'] as const;

// Questões demonstrativas independentes por subárea, sujeitas à revisão pedagógica.
export type BankQuestion = Question & { id: string; areaIndex: number; conceptId: string };
const EXTRA_QUESTIONS: Record<CourseId, Question[][]> = {
  supermercado: [
    [
      {
        prompt: 'Ao receber pagamento por cartão, qual conferência é adequada?',
        options: [
          'Verificar a aprovação da transação',
          'Guardar o cartão do cliente',
          'Dispensar o comprovante sempre',
          'Digitar valores aleatórios',
        ],
        correct: 0,
        explanation: 'A confirmação da transação evita divergências.',
      },
      {
        prompt: 'O cliente entrega R$ 50 por uma compra de R$ 37. Qual é o troco?',
        options: ['R$ 13', 'R$ 17', 'R$ 23', 'R$ 87'],
        correct: 0,
        explanation: '50 menos 37 resulta em 13.',
      },
      {
        prompt: 'Para evitar erros de preço no caixa, o operador deve:',
        options: [
          'Conferir o valor exibido no sistema',
          'Alterar preços sem autorização',
          'Ignorar divergências',
          'Cobrar valores estimados',
        ],
        correct: 0,
        explanation: 'Divergências devem ser conferidas e encaminhadas.',
      },
    ],
    [
      {
        prompt: 'Uma pessoa idosa pede ajuda para localizar um item. O ideal é:',
        options: [
          'Explicar o caminho com clareza e respeito',
          'Apontar sem ouvir',
          'Ignorar o pedido',
          'Criticar a dúvida',
        ],
        correct: 0,
        explanation: 'Orientação clara e respeitosa melhora o atendimento.',
      },
      {
        prompt: 'Quando há reclamação sobre um produto, é adequado:',
        options: [
          'Ouvir e encaminhar conforme a política da loja',
          'Discutir com o cliente',
          'Prometer algo impossível',
          'Desconsiderar a reclamação',
        ],
        correct: 0,
        explanation: 'Escuta e encaminhamento correto ajudam a resolver problemas.',
      },
      {
        prompt: 'Se o item procurado está em falta, o atendente deve:',
        options: [
          'Informar a disponibilidade com transparência',
          'Inventar prazo de chegada',
          'Culpar o cliente',
          'Omitir a informação',
        ],
        correct: 0,
        explanation: 'A transparência preserva a confiança.',
      },
    ],
    [
      {
        prompt: 'Na gôndola, itens mais pesados devem ficar preferencialmente:',
        options: [
          'Em prateleiras estáveis e baixas',
          'Em pontos altos instáveis',
          'No chão do corredor',
          'Em frente à saída',
        ],
        correct: 0,
        explanation: 'O armazenamento adequado reduz riscos.',
      },
      {
        prompt: 'Antes de colocar produtos na prateleira, deve-se:',
        options: [
          'Conferir integridade da embalagem',
          'Remover todas as etiquetas',
          'Misturar produtos danificados',
          'Ignorar avarias',
        ],
        correct: 0,
        explanation: 'A integridade protege consumidores e mercadorias.',
      },
      {
        prompt: 'Qual prática facilita encontrar produtos?',
        options: [
          'Agrupar por categoria e sinalizar',
          'Mudar tudo diariamente',
          'Ocultar placas',
          'Misturar itens sem critério',
        ],
        correct: 0,
        explanation: 'A organização orienta clientes e equipe.',
      },
    ],
    [
      {
        prompt: 'No sistema PEPS, qual lote sai primeiro?',
        options: [
          'O que entrou primeiro',
          'O que chegou por último',
          'O mais caro',
          'O maior lote',
        ],
        correct: 0,
        explanation: 'PEPS significa primeiro que entra, primeiro que sai.',
      },
      {
        prompt: 'Um produto refrigerado deve ser armazenado:',
        options: [
          'Na temperatura indicada pelo fabricante',
          'Em qualquer temperatura',
          'Ao sol',
          'Perto de fontes de calor',
        ],
        correct: 0,
        explanation: 'A temperatura adequada preserva a qualidade.',
      },
      {
        prompt: 'Durante o inventário, o objetivo principal é:',
        options: [
          'Comparar estoque físico e registros',
          'Aumentar preços',
          'Trocar fornecedores',
          'Criar publicidade',
        ],
        correct: 0,
        explanation: 'A contagem identifica diferenças de estoque.',
      },
    ],
    [
      {
        prompt: 'Ao identificar uma embalagem avariada, o funcionário deve:',
        options: [
          'Separar e registrar a ocorrência',
          'Recolocar na venda sem análise',
          'Esconder o problema',
          'Descartar sem registrar',
        ],
        correct: 0,
        explanation: 'O registro permite tratar a perda corretamente.',
      },
      {
        prompt: 'Qual medida reduz furtos sem constranger clientes?',
        options: [
          'Organização e monitoramento conforme normas',
          'Acusar pessoas sem provas',
          'Bloquear toda circulação',
          'Revistar todos indiscriminadamente',
        ],
        correct: 0,
        explanation: 'Prevenção exige procedimentos adequados e respeito.',
      },
      {
        prompt: 'Por que acompanhar indicadores de quebra?',
        options: [
          'Para identificar causas recorrentes',
          'Para ocultar perdas',
          'Para dispensar registros',
          'Para aumentar avarias',
        ],
        correct: 0,
        explanation: 'Indicadores ajudam a melhorar processos.',
      },
    ],
  ],
  administracao: [
    [
      {
        prompt: 'Uma despesa fixa costuma ser:',
        options: [
          'Aluguel mensal',
          'Compra ocasional de equipamento',
          'Venda inesperada',
          'Bonificação eventual',
        ],
        correct: 0,
        explanation: 'Despesa fixa tende a se repetir periodicamente.',
      },
      {
        prompt: 'Qual é a finalidade de um orçamento?',
        options: [
          'Planejar receitas e despesas',
          'Eliminar todos os custos',
          'Substituir registros',
          'Garantir lucro',
        ],
        correct: 0,
        explanation: 'O orçamento orienta decisões financeiras.',
      },
      {
        prompt: 'Se despesas superam receitas, a empresa apresenta:',
        options: [
          'Déficit no período',
          'Superávit automático',
          'Estoque maior',
          'Aumento obrigatório de vendas',
        ],
        correct: 0,
        explanation: 'Despesas maiores que receitas geram resultado negativo.',
      },
    ],
    [
      {
        prompt: 'O processo de integração de novos colaboradores é chamado de:',
        options: ['Onboarding', 'Inventário', 'Faturamento', 'Roteirização'],
        correct: 0,
        explanation: 'Integração apresenta cultura e procedimentos da organização.',
      },
      {
        prompt: 'Qual atitude contribui para um clima organizacional saudável?',
        options: [
          'Comunicação respeitosa',
          'Boatos e hostilidade',
          'Falta de feedback',
          'Desigualdade deliberada',
        ],
        correct: 0,
        explanation: 'Relações respeitosas favorecem a colaboração.',
      },
      {
        prompt: 'Uma avaliação de desempenho bem conduzida deve:',
        options: [
          'Usar critérios claros e feedback construtivo',
          'Basear-se em boatos',
          'Omitir critérios',
          'Punir sem diálogo',
        ],
        correct: 0,
        explanation: 'Critérios transparentes apoiam o desenvolvimento.',
      },
    ],
    [
      {
        prompt: 'Qual documento registra informações de remuneração?',
        options: [
          'Folha de pagamento',
          'Nota de transporte',
          'Pedido de compra',
          'Catálogo de produtos',
        ],
        correct: 0,
        explanation: 'A folha reúne dados de remuneração e descontos.',
      },
      {
        prompt: 'O controle de ponto registra:',
        options: [
          'Jornada e horários de trabalho',
          'Volume de estoque',
          'Preço de mercadorias',
          'Rotas de entrega',
        ],
        correct: 0,
        explanation: 'O registro de jornada apoia rotinas trabalhistas.',
      },
      {
        prompt: 'Ao atualizar cadastro funcional, é importante:',
        options: [
          'Proteger os dados pessoais',
          'Divulgar documentos',
          'Usar dados sem finalidade',
          'Ignorar correções',
        ],
        correct: 0,
        explanation: 'Dados pessoais devem ser tratados com segurança.',
      },
    ],
    [
      {
        prompt: 'Na escolha de fornecedor, deve-se considerar:',
        options: [
          'Prazo, qualidade e custo total',
          'Apenas a cor do logotipo',
          'Somente o nome',
          'Preferências pessoais sem critérios',
        ],
        correct: 0,
        explanation: 'A análise considera diferentes condições de fornecimento.',
      },
      {
        prompt: 'O pedido de compra serve para:',
        options: [
          'Formalizar itens, quantidades e condições',
          'Registrar férias',
          'Criar anúncio',
          'Alterar folha de pagamento',
        ],
        correct: 0,
        explanation: 'O pedido documenta a aquisição.',
      },
      {
        prompt: 'O que significa prazo de entrega?',
        options: [
          'Tempo acordado para disponibilizar o pedido',
          'Tempo de férias',
          'Prazo de garantia sempre',
          'Duração de reunião',
        ],
        correct: 0,
        explanation: 'Prazos devem ser acompanhados nas compras.',
      },
    ],
    [
      {
        prompt: 'Uma ata de reunião registra:',
        options: [
          'Decisões e encaminhamentos',
          'Somente presença informal',
          'Vendas do caixa',
          'Movimentação do estoque',
        ],
        correct: 0,
        explanation: 'A ata documenta o que foi acordado.',
      },
      {
        prompt: 'Qual ferramenta auxilia a priorizar tarefas?',
        options: [
          'Lista organizada por urgência e importância',
          'Arquivo sem nomes',
          'Pilha aleatória',
          'Agenda sem datas',
        ],
        correct: 0,
        explanation: 'Priorização melhora o uso do tempo.',
      },
      {
        prompt: 'Um documento digital compartilhado deve ter:',
        options: [
          'Controle de acesso e versão',
          'Senha pública',
          'Edição irrestrita sempre',
          'Cópias sem identificação',
        ],
        correct: 0,
        explanation: 'Controle de acesso e versões reduz erros.',
      },
    ],
  ],
  vendas: [
    [
      {
        prompt: 'Um lead é:',
        options: [
          'Contato com potencial de se tornar cliente',
          'Nota fiscal paga',
          'Produto devolvido',
          'Contrato encerrado',
        ],
        correct: 0,
        explanation: 'Leads são contatos que podem evoluir no funil de vendas.',
      },
      {
        prompt: 'Qual informação ajuda a qualificar um prospect?',
        options: [
          'Necessidade e perfil de compra',
          'Cor favorita do vendedor',
          'Número de cadeiras',
          'Temperatura do escritório',
        ],
        correct: 0,
        explanation: 'A qualificação verifica aderência à oferta.',
      },
      {
        prompt: 'Uma abordagem inicial ética deve:',
        options: [
          'Explicar o motivo do contato',
          'Esconder a identidade',
          'Prometer resultados impossíveis',
          'Insistir após recusa explícita',
        ],
        correct: 0,
        explanation: 'Transparência é importante na prospecção.',
      },
    ],
    [
      {
        prompt: 'A escuta ativa significa:',
        options: [
          'Prestar atenção e confirmar entendimento',
          'Interromper constantemente',
          'Memorizar roteiro sem ouvir',
          'Mudar de assunto',
        ],
        correct: 0,
        explanation: 'Escuta ativa identifica necessidades reais.',
      },
      {
        prompt: 'Qual pergunta ajuda a entender o cliente?',
        options: [
          'Qual problema você quer resolver?',
          'Você vai comprar agora, sim ou não?',
          'Por que não sabe disso?',
          'Posso ignorar sua dúvida?',
        ],
        correct: 0,
        explanation: 'Perguntas abertas permitem compreender o contexto.',
      },
      {
        prompt: 'Se o cliente está insatisfeito, o vendedor deve:',
        options: [
          'Reconhecer a situação e buscar solução',
          'Culpar o cliente',
          'Encerrar abruptamente',
          'Ocultar canais de suporte',
        ],
        correct: 0,
        explanation: 'Postura acolhedora ajuda a resolver conflitos.',
      },
    ],
    [
      {
        prompt: 'Qual é a diferença entre recurso e benefício?',
        options: [
          'Benefício mostra o valor do recurso para o cliente',
          'São sempre idênticos',
          'Recurso é desconto obrigatório',
          'Benefício é só embalagem',
        ],
        correct: 0,
        explanation: 'Benefícios conectam características às necessidades.',
      },
      {
        prompt: 'Uma demonstração eficaz deve:',
        options: [
          'Mostrar uso relevante do produto',
          'Inventar funcionalidades',
          'Omitir limitações',
          'Ignorar dúvidas',
        ],
        correct: 0,
        explanation: 'Demonstrações devem ser verdadeiras e pertinentes.',
      },
      {
        prompt: 'Quando o produto possui garantia, deve-se:',
        options: [
          'Informar condições e cobertura corretamente',
          'Prometer cobertura ilimitada',
          'Esconder termos',
          'Alterar prazos oralmente',
        ],
        correct: 0,
        explanation: 'Informações corretas evitam expectativas falsas.',
      },
    ],
    [
      {
        prompt: 'Em uma negociação, uma concessão deve:',
        options: [
          'Considerar limites e contrapartidas',
          'Ser feita sem avaliação',
          'Ignorar margem',
          'Depender de pressão',
        ],
        correct: 0,
        explanation: 'Negociar requer equilíbrio e critérios.',
      },
      {
        prompt: 'O fechamento de venda adequado ocorre quando:',
        options: [
          'O cliente compreendeu e concordou com as condições',
          'O vendedor omitiu taxas',
          'O cliente foi coagido',
          'Não houve explicação',
        ],
        correct: 0,
        explanation: 'Consentimento informado é essencial.',
      },
      {
        prompt: 'Uma objeção sobre preço pode ser tratada com:',
        options: [
          'Esclarecimento de valor e condições',
          'Desrespeito',
          'Informação falsa',
          'Pressão contínua',
        ],
        correct: 0,
        explanation: 'Argumentação transparente ajuda a decisão.',
      },
    ],
    [
      {
        prompt: 'Uma pesquisa pós-venda serve para:',
        options: [
          'Entender satisfação e pontos de melhoria',
          'Evitar contato',
          'Eliminar garantias',
          'Esconder reclamações',
        ],
        correct: 0,
        explanation: 'Feedback ajuda a aperfeiçoar a experiência.',
      },
      {
        prompt: 'Um cliente relata defeito após a compra. O ideal é:',
        options: [
          'Orientar os canais de suporte e garantia',
          'Ignorar a mensagem',
          'Negar toda assistência',
          'Expor dados pessoais',
        ],
        correct: 0,
        explanation: 'O pós-venda dá continuidade ao relacionamento.',
      },
      {
        prompt: 'O acompanhamento pós-venda pode favorecer:',
        options: [
          'Fidelização baseada em confiança',
          'Cobranças sem motivo',
          'Promessas falsas',
          'Pressão excessiva',
        ],
        correct: 0,
        explanation: 'Atendimento consistente fortalece relações.',
      },
    ],
  ],
  ads: [
    [
      {
        prompt: 'Uma variável booleana armazena:',
        options: [
          'Verdadeiro ou falso',
          'Apenas imagens',
          'Arquivos compactados',
          'Somente números decimais',
        ],
        correct: 0,
        explanation: 'Booleanos representam estados lógicos.',
      },
      {
        prompt: 'O operador OU retorna verdadeiro quando:',
        options: [
          'Ao menos uma condição é verdadeira',
          'Todas são falsas',
          'Não existem condições',
          'Apenas ambas são falsas',
        ],
        correct: 0,
        explanation: 'OU lógico é verdadeiro com pelo menos uma condição verdadeira.',
      },
      {
        prompt: 'Em uma condição SE, o bloco executa quando:',
        options: [
          'A expressão avaliada é verdadeira',
          'O computador desliga',
          'O código não compila',
          'A variável não existe',
        ],
        correct: 0,
        explanation: 'Condições controlam a execução.',
      },
    ],
    [
      {
        prompt: 'Um laço de repetição é usado para:',
        options: [
          'Executar instruções várias vezes',
          'Apagar o sistema operacional',
          'Substituir o monitor',
          'Criar arquivos manualmente sempre',
        ],
        correct: 0,
        explanation: 'Laços automatizam repetições.',
      },
      {
        prompt: 'Uma função com parâmetros permite:',
        options: [
          'Receber valores para processar',
          'Impedir reutilização',
          'Remover todas as variáveis',
          'Executar somente uma vez',
        ],
        correct: 0,
        explanation: 'Parâmetros tornam funções reutilizáveis.',
      },
      {
        prompt: 'Qual estrutura guarda vários elementos em sequência?',
        options: ['Array ou lista', 'Comentário', 'Operador lógico', 'Compilador'],
        correct: 0,
        explanation: 'Arrays organizam coleções de valores.',
      },
    ],
    [
      {
        prompt: 'Uma chave primária serve para:',
        options: [
          'Identificar unicamente um registro',
          'Duplicar todas as linhas',
          'Apagar a tabela',
          'Criptografar o monitor',
        ],
        correct: 0,
        explanation: 'Chaves primárias distinguem registros.',
      },
      {
        prompt: 'Uma consulta SELECT em SQL é usada para:',
        options: ['Recuperar dados', 'Desligar servidor', 'Criar cabo de rede', 'Formatar disco'],
        correct: 0,
        explanation: 'SELECT consulta informações armazenadas.',
      },
      {
        prompt: 'Uma chave estrangeira representa:',
        options: [
          'Relacionamento com outra tabela',
          'Senha de administrador',
          'Cópia de segurança',
          'Cor de uma coluna',
        ],
        correct: 0,
        explanation: 'Chaves estrangeiras ligam entidades.',
      },
    ],
    [
      {
        prompt: 'O versionamento de código permite:',
        options: [
          'Acompanhar alterações ao longo do tempo',
          'Impedir trabalho em equipe',
          'Remover histórico',
          'Garantir ausência de bugs',
        ],
        correct: 0,
        explanation: 'Controle de versão registra evolução do projeto.',
      },
      {
        prompt: 'Uma API é utilizada para:',
        options: [
          'Permitir comunicação entre sistemas',
          'Aumentar brilho da tela',
          'Trocar teclado',
          'Criar cabos',
        ],
        correct: 0,
        explanation: 'APIs definem interfaces de comunicação.',
      },
      {
        prompt: 'Em uma interface responsiva, o layout deve:',
        options: [
          'Adaptar-se a diferentes telas',
          'Ter largura fixa sempre',
          'Ignorar dispositivos móveis',
          'Ocultar todas as informações',
        ],
        correct: 0,
        explanation: 'Responsividade melhora a experiência em vários dispositivos.',
      },
    ],
    [
      {
        prompt: 'Um teste unitário verifica:',
        options: [
          'Uma unidade pequena do código',
          'Somente a aparência da sala',
          'A velocidade da internet sempre',
          'A compra de computadores',
        ],
        correct: 0,
        explanation: 'Testes unitários verificam componentes isolados.',
      },
      {
        prompt: 'Qual medida ajuda a proteger contas?',
        options: [
          'Autenticação multifator',
          'Reutilizar senha fraca',
          'Divulgar senhas',
          'Desativar atualizações',
        ],
        correct: 0,
        explanation: 'Múltiplos fatores dificultam acesso indevido.',
      },
      {
        prompt: 'Uma entrada de usuário deve ser:',
        options: [
          'Validada antes do processamento',
          'Sempre confiável',
          'Executada como código',
          'Compartilhada publicamente',
        ],
        correct: 0,
        explanation: 'Validação reduz falhas e riscos.',
      },
    ],
  ],
  logistica: [
    [
      {
        prompt: 'Estoque mínimo é utilizado para:',
        options: [
          'Sinalizar necessidade de reposição',
          'Aumentar avarias',
          'Eliminar inventários',
          'Impedir entregas',
        ],
        correct: 0,
        explanation: 'O mínimo ajuda a planejar reposições.',
      },
      {
        prompt: 'A acuracidade de estoque compara:',
        options: [
          'Registros e quantidades reais',
          'Cores e tamanhos de mesas',
          'Vendas e salários',
          'Notas e horários de aula',
        ],
        correct: 0,
        explanation: 'Acuracidade mede correspondência entre sistema e físico.',
      },
      {
        prompt: 'O ponto de pedido indica:',
        options: [
          'Quando iniciar uma nova compra',
          'Quando encerrar a empresa',
          'O tamanho da embalagem',
          'O peso do caminhão',
        ],
        correct: 0,
        explanation: 'Ajuda a repor antes da ruptura.',
      },
    ],
    [
      {
        prompt: 'Endereçamento de estoque é:',
        options: [
          'Identificação da localização de itens',
          'Preço do produto',
          'Nome do fornecedor',
          'Rota do cliente',
        ],
        correct: 0,
        explanation: 'Endereços agilizam localização e separação.',
      },
      {
        prompt: 'Produtos frágeis exigem:',
        options: [
          'Proteção e empilhamento adequados',
          'Peso excessivo sobre eles',
          'Transporte sem embalagem',
          'Quedas controladas',
        ],
        correct: 0,
        explanation: 'A armazenagem deve respeitar características dos itens.',
      },
      {
        prompt: 'Separação de pedidos também é chamada de:',
        options: ['Picking', 'Faturamento', 'Recrutamento', 'Prospecção'],
        correct: 0,
        explanation: 'Picking reúne itens de um pedido.',
      },
    ],
    [
      {
        prompt: 'O modal aéreo costuma ser escolhido quando:',
        options: [
          'Rapidez é prioritária e custo viável',
          'Não há urgência e custo é mínimo',
          'A carga exige navio',
          'O trajeto é dentro do depósito',
        ],
        correct: 0,
        explanation: 'Transporte aéreo oferece rapidez em certos contextos.',
      },
      {
        prompt: 'O conhecimento de transporte é um:',
        options: [
          'Documento ligado à prestação do transporte',
          'Plano de férias',
          'Manual de vendas',
          'Relatório médico',
        ],
        correct: 0,
        explanation: 'Documentos formalizam operações de transporte.',
      },
      {
        prompt: 'Consolidação de cargas significa:',
        options: [
          'Agrupar remessas compatíveis',
          'Dividir cada item em um caminhão',
          'Eliminar embalagens',
          'Ignorar destinos',
        ],
        correct: 0,
        explanation: 'Agrupamento pode otimizar recursos.',
      },
    ],
    [
      {
        prompt: 'Uma rota eficiente considera:',
        options: [
          'Distâncias, restrições e prazos',
          'Somente a cor do veículo',
          'A ordem alfabética dos clientes',
          'A preferência musical do motorista',
        ],
        correct: 0,
        explanation: 'Roteirização avalia múltiplas restrições.',
      },
      {
        prompt: 'O rastreamento de entregas permite:',
        options: [
          'Acompanhar status e localização',
          'Alterar nota fiscal automaticamente',
          'Substituir conferência',
          'Eliminar todos os atrasos',
        ],
        correct: 0,
        explanation: 'Rastreamento melhora visibilidade da distribuição.',
      },
      {
        prompt: 'A última milha é:',
        options: [
          'Trecho final da entrega ao destinatário',
          'Primeira etapa de fabricação',
          'Controle de férias',
          'Área do estoque refrigerado',
        ],
        correct: 0,
        explanation: 'Última milha corresponde à entrega final.',
      },
    ],
    [
      {
        prompt: 'OTIF mede entregas:',
        options: [
          'No prazo e completas',
          'Somente baratas',
          'Apenas internacionais',
          'Sem documentação',
        ],
        correct: 0,
        explanation: 'OTIF avalia pontualidade e completude.',
      },
      {
        prompt: 'Um indicador de avarias acompanha:',
        options: [
          'Danos durante operações logísticas',
          'Cor dos uniformes',
          'Número de reuniões',
          'Tempo de treinamento apenas',
        ],
        correct: 0,
        explanation: 'Acompanhamento ajuda a reduzir perdas.',
      },
      {
        prompt: 'A nota fiscal eletrônica registra:',
        options: [
          'Operações fiscais de mercadorias ou serviços',
          'Apenas horários de trabalho',
          'Somente endereço do depósito',
          'Movimentos da câmera',
        ],
        correct: 0,
        explanation: 'Documentação fiscal é parte dos processos.',
      },
    ],
  ],
  saude: [
    [
      {
        prompt: 'Uma agenda com horários sobrepostos pode causar:',
        options: [
          'Conflitos de atendimento',
          'Maior confidencialidade',
          'Eliminação de filas',
          'Melhoria automática',
        ],
        correct: 0,
        explanation: 'A agenda precisa evitar conflitos.',
      },
      {
        prompt: 'Ao confirmar uma consulta, a recepção deve:',
        options: [
          'Verificar data, horário e identificação',
          'Informar dados de outros pacientes',
          'Modificar o procedimento',
          'Expor histórico médico',
        ],
        correct: 0,
        explanation: 'Conferências reduzem falhas de agendamento.',
      },
      {
        prompt: 'Qual informação deve ser compartilhada com discrição?',
        options: [
          'Dados de identificação do paciente',
          'Horário público de funcionamento',
          'Endereço público da clínica',
          'Nome da unidade',
        ],
        correct: 0,
        explanation: 'Dados pessoais merecem proteção.',
      },
    ],
    [
      {
        prompt: 'O princípio de acesso mínimo significa:',
        options: [
          'Acessar apenas o necessário para a função',
          'Compartilhar tudo com todos',
          'Usar uma senha coletiva',
          'Deixar telas desbloqueadas',
        ],
        correct: 0,
        explanation: 'Acesso mínimo protege informações sensíveis.',
      },
      {
        prompt: 'Ao deixar o computador da recepção, o correto é:',
        options: [
          'Bloquear a sessão',
          'Deixar prontuários abertos',
          'Anotar senhas em público',
          'Compartilhar login',
        ],
        correct: 0,
        explanation: 'Bloquear a sessão evita acesso indevido.',
      },
      {
        prompt: 'O descarte de documentos com dados de saúde deve:',
        options: [
          'Seguir procedimento seguro e autorizado',
          'Ir para lixo aberto',
          'Ser fotografado',
          'Ser exposto em murais',
        ],
        correct: 0,
        explanation: 'Descarte adequado preserva confidencialidade.',
      },
    ],
    [
      {
        prompt: 'Uma guia de convênio pode servir para:',
        options: [
          'Registrar autorização ou solicitação de atendimento',
          'Controlar estoque de alimentos',
          'Definir escala de férias',
          'Criar campanhas de marketing',
        ],
        correct: 0,
        explanation: 'Guias fazem parte de rotinas administrativas de convênios.',
      },
      {
        prompt: 'Antes de emitir cobrança, é importante:',
        options: [
          'Conferir dados e procedimentos registrados',
          'Cobrar sem verificar',
          'Duplicar registros',
          'Ignorar autorizações',
        ],
        correct: 0,
        explanation: 'Conferências reduzem inconsistências.',
      },
      {
        prompt: 'Uma glosa é:',
        options: [
          'Recusa ou ajuste de pagamento de conta apresentada',
          'Tipo de consulta',
          'Equipamento de rede',
          'Modal de transporte',
        ],
        correct: 0,
        explanation: 'Glosas exigem análise administrativa.',
      },
    ],
    [
      {
        prompt: 'Um fluxo de atendimento descreve:',
        options: [
          'Etapas e responsáveis pelo processo',
          'Apenas decoração',
          'Somente preços',
          'O uniforme da equipe',
        ],
        correct: 0,
        explanation: 'Fluxos ajudam a organizar rotinas.',
      },
      {
        prompt: 'Indicadores de tempo de espera ajudam a:',
        options: [
          'Identificar gargalos no atendimento',
          'Eliminar agendamentos',
          'Substituir prontuários',
          'Ocultar filas',
        ],
        correct: 0,
        explanation: 'Indicadores orientam melhorias operacionais.',
      },
      {
        prompt: 'Uma passagem de turno adequada deve:',
        options: [
          'Comunicar pendências relevantes com segurança',
          'Omitir tudo',
          'Divulgar dados publicamente',
          'Descartar registros',
        ],
        correct: 0,
        explanation: 'Continuidade exige comunicação responsável.',
      },
    ],
    [
      {
        prompt: 'Em uma recepção, acolhimento significa:',
        options: [
          'Tratar pessoas com respeito e atenção',
          'Ignorar dúvidas',
          'Fazer julgamentos',
          'Expor condições de saúde',
        ],
        correct: 0,
        explanation: 'Acolhimento considera dignidade e necessidades.',
      },
      {
        prompt: 'Quando há barreira de comunicação, a equipe deve:',
        options: [
          'Buscar forma acessível de orientar',
          'Culpar a pessoa',
          'Desistir de explicar',
          'Falar apenas mais rápido',
        ],
        correct: 0,
        explanation: 'Comunicação acessível melhora o atendimento.',
      },
      {
        prompt: 'Diante de informação sensível, o profissional deve:',
        options: [
          'Preservar privacidade e discrição',
          'Comentar com terceiros',
          'Publicar nas redes',
          'Falar em voz alta na fila',
        ],
        correct: 0,
        explanation: 'Ética exige confidencialidade.',
      },
    ],
  ],
};
export const QUESTION_BANK: Record<CourseId, BankQuestion[]> = Object.fromEntries(
  COURSE_IDS.map((course) => [
    course,
    QUESTIONS[course].flatMap((original, areaIndex) =>
      [original, ...EXTRA_QUESTIONS[course][areaIndex]].map((question, variant) => ({
        ...question,
        id: `${course}-${areaIndex}-${variant}`,
        conceptId: `${course}-${areaIndex}-${variant}`,
        areaIndex,
      })),
    ),
  ]),
) as Record<CourseId, BankQuestion[]>;
