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
    faltou: 'Faltou',
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

  /** Mensagens de validação de formulários (E-01). */
  validacao: {
    obrigatorio: 'Campo obrigatório',
    selecione: 'Selecione uma opção',
    minimo: (n: number) => `Use pelo menos ${n} caracteres`,
    maximo: (n: number) => `Use no máximo ${n} caracteres`,
    nomeCompleto: 'Informe nome e sobrenome',
    cpfInvalido: 'Informe um CPF válido',
    telefoneInvalido: 'Informe um telefone válido com DDD',
    emailInvalido: 'Informe um e-mail válido',
    cepInvalido: 'Informe um CEP com 8 dígitos',
    ufInvalida: 'Selecione um estado (UF) válido',
    dataInvalida: 'Informe uma data válida',
    dataFutura: 'A data não pode estar no futuro',
    idadeMaxima: 'Verifique a data de nascimento (idade acima de 130 anos)',
    horaInvalida: 'Informe um horário válido (HH:mm)',
    horaMultipla5: 'Use horários em intervalos de 5 minutos',
    crmInvalido: 'Informe um CRM com 4 a 7 dígitos',
    consentimento: 'É preciso autorizar o uso dos dados para salvar',
    responsavelObrigatorio: 'Paciente menor de 18 anos: informe o responsável legal',
    responsavelCpfIgual: 'O CPF do responsável deve ser diferente do CPF do paciente',
    enderecoIncompleto: 'Preencha o endereço completo ou deixe todos os campos em branco',
    diasObrigatorio: 'Selecione pelo menos um dia de atendimento',
    fimAntesInicio: 'O fim do expediente deve ser depois do início',
    pausaInvalida: 'O fim da pausa deve ser depois do início',
    pausaForaExpediente: 'A pausa deve estar dentro do expediente',
    expedienteCurto: 'O expediente é menor que a duração de uma consulta',
    duracaoInvalida: 'A duração deve ser de 5 a 120 minutos, em múltiplos de 5',
  },

  /** Mensagens de erro dos cadastros (E-01 a E-10 da especificação). */
  erros: {
    resumoValidacao: (n: number) =>
      n === 1 ? '1 campo precisa de correção' : `${n} campos precisam de correção`,
    cpfDuplicado: 'Já existe um paciente com este CPF',
    crmDuplicado: 'Já existe um médico com este CRM',
    emailDuplicado: 'Já existe um médico com este e-mail',
    abrirExistente: 'Abrir cadastro existente',
    medicoInativo: 'Este médico foi inativado',
    pacienteInativo: 'Este paciente foi inativado',
    horarioOcupado: 'Este horário acabou de ser ocupado',
    concorrencia:
      'Este registro foi alterado em outra aba ou por outra pessoa. Recarregue para ver a versão atual.',
    armazenamentoCheio:
      'Não há espaço para salvar. Exclua dados antigos ou restaure os dados de exemplo.',
    armazenamentoQuaseCheio: 'O armazenamento local está quase cheio.',
    dadosCorrompidos: 'Alguns dados não puderam ser lidos e foram restaurados.',
    pacienteNaoEncontrado: 'Paciente não encontrado',
    medicoNaoEncontrado: 'Médico não encontrado',
    consultaNaoEncontrada: 'Consulta não encontrada',
    inesperadoTitulo: 'Algo deu errado nesta tela.',
    inesperadoDescricao:
      'O restante do sistema continua funcionando. Tente novamente ou volte para o Painel.',
    cepFalhou: 'Não foi possível buscar o CEP. Preencha o endereço manualmente.',
    cepNaoEncontrado: 'CEP não encontrado',
  },

  /** Mensagens das regras de negócio verificadas pelos serviços. */
  conflitos: {
    horarioPassado: 'Escolha um horário que ainda não passou',
    foraExpediente: 'Fora do horário de atendimento do médico',
    pausa: 'Este horário cruza a pausa do médico',
    antecedenciaMaxima: (dias: number) => `Agendamentos só até ${dias} dias à frente`,
    medicoOcupado: 'O médico já tem consulta neste horário',
    pacienteOcupado: 'O paciente já tem consulta neste horário',
    transicaoInvalida: 'Esta consulta não pode mais ser alterada',
    antesDoInicio: 'Só é possível registrar a partir do horário de início',
    consultasFuturas: (n: number) =>
      n === 1
        ? 'O médico tem 1 consulta futura agendada. Reagende ou cancele antes de inativar.'
        : `O médico tem ${n} consultas futuras agendadas. Reagende ou cancele antes de inativar.`,
    temHistorico:
      'Este paciente tem consultas registradas e não pode ser excluído. Inative o cadastro.',
    motivoPacienteInativado: 'Paciente inativado',
  },

  /** Textos da linha do tempo, gerados pelos serviços. */
  textosAtividade: {
    pacienteCadastrado: (nome: string) => `Paciente ${nome} cadastrado`,
    pacienteInativado: (nome: string) => `Cadastro de ${nome} inativado`,
    medicoCadastrado: (nome: string, departamento: string) =>
      `${nome} entrou na equipe de ${departamento}`,
    consultaAgendada: (paciente: string, medico: string) =>
      `Consulta agendada: ${paciente} com ${medico}`,
    consultaReagendada: (paciente: string, medico: string) =>
      `Consulta reagendada: ${paciente} com ${medico}`,
    consultaConcluida: (paciente: string) => `Consulta concluída com ${paciente}`,
    consultaCancelada: (paciente: string) => `Consulta de ${paciente} cancelada`,
    consultaFaltou: (paciente: string) => `${paciente} faltou à consulta`,
  },

  convenio: {
    particular: 'Particular',
  },

  diasSemanaCurto: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  diasAte: (de: string, ate: string) => `${de} a ${ate}`,

  erro: {
    carregar: 'Não foi possível carregar os dados.',
    tentarNovamente: 'Tentar novamente',
    simulado: 'Erro simulado (VITE_SIMULAR_ERRO ativo).',
  },

  formulario: {
    obrigatorio: 'obrigatório',
    opcional: '(opcional)',
    contador: (atual: number, maximo: number) => `${atual}/${maximo}`,
    contadorLeitor: (atual: number, maximo: number) => `${atual} de ${maximo} caracteres`,
    selecione: 'Selecione…',
    salvar: 'Salvar',
    salvando: 'Salvando…',
    cancelar: 'Cancelar',
    descartarTitulo: 'Descartar alterações?',
    descartarMensagem:
      'As alterações feitas neste formulário ainda não foram salvas e serão perdidas.',
    descartar: 'Descartar',
    continuarEditando: 'Continuar editando',
    buscando: 'Buscando…',
    nenhumResultado: 'Nenhum resultado',
    resultados: (n: number) =>
      n === 0 ? 'Nenhum resultado' : n === 1 ? '1 resultado' : `${n} resultados`,
    limparSelecao: 'Limpar seleção',
    digiteParaBuscar: 'Digite para buscar',
  },

  lista: {
    buscar: 'Buscar',
    limparFiltros: 'Limpar filtros',
    filtros: 'Filtros',
    mostrando: (de: number, ate: number, total: number) =>
      total === 0 ? 'Nenhum registro' : `Mostrando ${de}–${ate} de ${total}`,
    nenhumRegistro: 'Nenhum registro encontrado.',
    paginacao: 'Paginação',
    anterior: 'Página anterior',
    proxima: 'Próxima página',
    pagina: (n: number) => `Página ${n}`,
    selecionarTodos: 'Selecionar todos desta página',
    selecionarLinha: (nome: string) => `Selecionar ${nome}`,
    selecionados: (n: number) => (n === 1 ? '1 selecionado' : `${n} selecionados`),
    acoes: 'Ações',
    maisAcoes: (nome: string) => `Mais ações para ${nome}`,
    ordenarPor: (coluna: string) => `Ordenar por ${coluna}`,
    breadcrumb: 'Você está em',
    inicio: 'Painel',
    carregando: 'Carregando lista…',
  },

  confirmacao: {
    confirmar: 'Confirmar',
    cancelar: 'Cancelar',
    digiteParaConfirmar: (texto: string) => `Para confirmar, digite "${texto}"`,
    fecharJanela: 'Fechar janela',
  },

  toast: {
    regiao: 'Notificações',
    fechar: 'Fechar notificação',
  },

  demo: {
    aviso: 'Ambiente de demonstração — use apenas dados fictícios.',
  },

  rota: {
    anuncio: (titulo: string) => `Página: ${titulo}`,
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
    // Fase 9
    formulario: 'Campos de formulário',
    formularioDescricao: 'Estados: normal, erro, desabilitado e somente leitura.',
    mascaras: 'Campos com máscara',
    escolhas: 'Seleção',
    combobox: 'Busca com sugestões (combobox)',
    pacienteRotulo: 'Paciente',
    pacienteDica: 'Digite parte do nome ou do CPF.',
    nome: 'Nome completo',
    nomeDica: 'Como está no documento.',
    nomeErro: 'Informe nome e sobrenome',
    desabilitadoValor: 'Campo desabilitado',
    somenteLeitura: 'Somente leitura',
    somenteLeituraValor: 'Valor que não pode ser alterado',
    observacoes: 'Observações',
    uf: 'UF',
    cpf: 'CPF',
    telefone: 'Telefone',
    cep: 'CEP',
    aceite: 'Li e aceito o termo de consentimento (LGPD)',
    aceiteDescricao: 'Obrigatório para o cadastro.',
    convenio: 'Convênio',
    particular: 'Particular',
    convenioPlano: 'Plano de saúde',
    resumoErros: 'Resumo de erros',
    listagem: 'Listagem',
    buscarPacientes: 'Buscar por nome, CPF ou telefone',
    status: 'Situação',
    ativos: 'Ativos',
    inativos: 'Inativos',
    todos: 'Todos',
    colunaNome: 'Nome',
    colunaCpf: 'CPF',
    colunaIdade: 'Idade',
    colunaConvenio: 'Convênio',
    anos: (n: number) => `${n} anos`,
    acaoVer: 'Ver detalhes',
    acaoEditar: 'Editar',
    acaoInativar: 'Inativar',
    estadosTabela: 'Estados da tabela',
    descricaoLista: 'Lista de descrição',
    feedback: 'Modal, confirmação e notificações',
    abrirModal: 'Abrir modal',
    modalTitulo: 'Exemplo de janela',
    modalTexto: 'O foco fica preso aqui dentro até a janela ser fechada.',
    confirmarSimples: 'Confirmação simples',
    confirmarPerigo: 'Confirmação de perigo',
    confirmarTexto: 'Confirmação digitando texto',
    confirmacaoTitulo: 'Inativar paciente?',
    confirmacaoMensagem: '2 consultas futuras serão canceladas.',
    exclusaoTitulo: 'Excluir paciente definitivamente?',
    respostaConfirmou: 'Confirmou',
    respostaCancelou: 'Cancelou',
    toastSucesso: 'Notificação de sucesso',
    toastAviso: 'Notificação de aviso',
    toastErro: 'Notificação de erro',
    toastSucessoTexto: 'Paciente cadastrado com sucesso.',
    toastAvisoTexto: '2 consultas ficaram fora do novo horário.',
    toastErroTexto: 'Não foi possível salvar. Tente novamente.',
    verConsultas: 'Ver consultas',
    excluir: 'Excluir',
    textoExclusao: 'EXCLUIR',
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
