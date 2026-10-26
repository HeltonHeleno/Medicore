/**
 * Todos os textos da interface do MediCore, em português do Brasil.
 * Nenhum texto visível deve ficar escrito diretamente nos componentes.
 */
export const t = {
  app: {
    nome: 'MediCore',
    subtitulo: 'Operações Hospitalares',
    tituloPagina: (pagina: string) => `MediCore — ${pagina}`,
    pularParaConteudo: 'Pular para o conteúdo',
  },

  menu: {
    rotuloNavegacao: 'Navegação principal',
    painel: 'Painel',
    pacientes: 'Pacientes',
    medicos: 'Médicos',
    consultas: 'Consultas',
    leitos: 'Gestão de leitos',
    emergencia: 'Emergência',
    farmacia: 'Farmácia',
    analises: 'Análises',
    configuracoes: 'Configurações',
    abrirMenu: 'Abrir menu',
    fecharMenu: 'Fechar menu',
  },

  header: {
    pesquisarPlaceholder: 'Pesquisar...',
    pesquisarRotulo: 'Pesquisar no sistema',
    alternarTema: 'Alternar modo escuro',
    temaClaro: 'Ativar modo claro',
    temaEscuro: 'Ativar modo escuro',
    notificacoes: 'Notificações',
    mensagens: 'Mensagens',
    haNovidades: 'há novidades',
    menuUsuario: 'Menu do usuário',
  },

  userMenu: {
    meuPerfil: 'Meu perfil',
    configuracoes: 'Configurações',
    sair: 'Sair',
  },

  suporte: {
    titulo: 'Precisa de ajuda?',
    descricao: 'Estamos disponíveis 24h para qualquer urgência.',
    botao: 'Falar com o suporte',
  },

  saudacao: {
    manha: 'Bom dia',
    tarde: 'Boa tarde',
    noite: 'Boa noite',
  },

  boasVindas: {
    titulo: (tratamento: string) => `Veja como está o hospital hoje, ${tratamento}.`,
    tituloSemNome: 'Veja como está o hospital hoje.',
    resumo: (consultas: number, previsaoUti: number, medicamentos: number) =>
      `${consultas} ${consultas === 1 ? 'consulta' : 'consultas'} hoje · ` +
      `UTI tendendo a ${previsaoUti}% até a noite · ` +
      `${medicamentos} ${medicamentos === 1 ? 'medicamento' : 'medicamentos'} com estoque baixo.`,
    verAgenda: 'Ver agenda',
    revisarUti: 'Revisar status da UTI',
  },

  kpisRegiao: 'Indicadores do dia',

  ia: {
    titulo: 'Assistente hospitalar com IA',
    insightsHoje: 'Insights de hoje',
    verTodos: 'Ver todos os insights',
  },

  kpis: {
    totalPacientes: 'Total de pacientes',
    variacao: (percentual: string) => `${percentual} em relação a ontem`,
    leitosDisponiveis: 'Leitos disponíveis',
    deTotalLeitos: (total: string) => `de ${total} leitos no total`,
    medicosPlantao: 'Médicos de plantão',
    escaladosHoje: 'Escalados para hoje',
    casosEmergencia: 'Casos de emergência',
    altaPrioridade: 'Alta prioridade — ver alertas',
  },

  departamentos: {
    titulo: 'Desempenho por departamento',
  },

  internacoes: {
    titulo: 'Tendência de internações',
    rotuloPeriodo: 'Período',
    periodos: {
      semana: 'Esta semana',
      mes: 'Este mês',
      ano: 'Este ano',
    },
    tooltip: (n: number) => `${n} ${n === 1 ? 'internação' : 'internações'}`,
    resumoGrafico: (minRotulo: string, min: number, maxRotulo: string, max: number) =>
      `Internações no período: mínimo de ${min} em ${minRotulo} e máximo de ${max} em ${maxRotulo}`,
    tabelaLegenda: 'Internações por período',
    colunaPeriodo: 'Período',
    colunaInternacoes: 'Internações',
  },

  leitos: {
    titulo: 'Ocupação de leitos',
    ocupadosCentro: 'ocupados',
    ocupados: 'Ocupados',
    disponiveis: 'Disponíveis',
    leitos: (n: number) => `${n} ${n === 1 ? 'leito' : 'leitos'}`,
    resumoGrafico: (percentual: number, ocupados: number, total: number) =>
      `${percentual}% dos leitos ocupados: ${ocupados} de ${total}`,
    setores: 'Ocupação por setor',
    setorResumo: (nome: string, ocupados: number, total: number) =>
      `${nome}: ${ocupados} de ${total} leitos ocupados`,
  },

  alertas: {
    titulo: 'Alertas de emergência',
    verTodos: 'Ver todos',
  },

  consultas: {
    titulo: 'Consultas de hoje',
    verTodas: 'Ver todas',
    legendaTabela: 'Consultas agendadas para hoje',
    colunas: {
      horario: 'Horário',
      paciente: 'Paciente',
      departamento: 'Departamento',
      status: 'Status',
    },
  },

  atividades: {
    titulo: 'Linha do tempo de atividades',
  },

  status: {
    concluida: 'Concluída',
    agendada: 'Agendada',
    cancelada: 'Cancelada',
  },

  prioridade: {
    alta: 'Alta',
    media: 'Média',
    baixa: 'Baixa',
  },

  vazio: {
    insights: 'Nenhum insight disponível no momento.',
    departamentos: 'Nenhum dado de desempenho disponível.',
    internacoes: 'Nenhuma internação registrada no período.',
    leitos: 'Nenhum setor de leitos cadastrado.',
    alertas: 'Nenhum alerta ativo.',
    consultas: 'Nenhuma consulta para hoje.',
    atividades: 'Nenhuma atividade registrada hoje.',
  },

  erro: {
    carregar: 'Não foi possível carregar os dados.',
    tentarNovamente: 'Tentar novamente',
    simulado: 'Erro simulado (VITE_SIMULAR_ERRO ativo).',
  },

  /** Página interna /ui (somente em desenvolvimento) que mostra os componentes base. */
  vitrine: {
    titulo: 'Componentes de UI',
    descricao: 'Página interna de desenvolvimento com todas as variantes dos componentes base.',
    botoes: 'Botões',
    primario: 'Primário',
    contorno: 'Contorno',
    suave: 'Suave',
    pequeno: 'Pequeno',
    desabilitado: 'Desabilitado',
    cards: 'Cards',
    cardPadrao: 'Card padrão',
    cardPerigo: 'Card de perigo',
    conteudoCard: 'Conteúdo do card.',
    progresso: 'Barras de progresso',
    badges: 'Badges',
    estados: 'Estados',
    carregando: 'Carregando',
    vazio: 'Vazio',
    erro: 'Erro',
  },

  paginas: {
    emConstrucao: 'Esta página será implementada em breve.',
    emConstrucaoDetalhe:
      'Por enquanto, apenas o Painel está disponível. Use o menu para voltar a ele.',
    naoEncontrada: 'Página não encontrada',
    voltarPainel: 'Voltar para o Painel',
  },
} as const;

export type Textos = typeof t;
