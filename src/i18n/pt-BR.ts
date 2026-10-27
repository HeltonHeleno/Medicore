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
    horarioObrigatorio: 'Escolha um horário',
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
    carregandoPagina: 'Carregando página…',
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

  pacientes: {
    titulo: 'Pacientes',
    descricaoLista: 'Cadastro de pacientes do hospital.',
    novo: 'Novo paciente',
    editar: 'Editar paciente',
    detalhe: 'Paciente',
    editarBreadcrumb: 'Editar',
    buscar: 'Buscar por nome, CPF ou telefone',
    status: 'Situação',
    ativos: 'Ativos',
    inativos: 'Inativos',
    todos: 'Todos',
    ativo: 'Ativo',
    inativo: 'Inativo',
    legendaTabela: 'Lista de pacientes',
    colunas: {
      nome: 'Nome',
      cpf: 'CPF',
      idade: 'Idade',
      telefone: 'Telefone',
      convenio: 'Convênio',
      proximaConsulta: 'Próxima consulta',
      status: 'Situação',
    },
    anos: (n: number) => (n === 1 ? '1 ano' : `${n} anos`),
    possuiAlergias: 'Possui alergias',
    semConsulta: '—',
    nenhumCadastrado: 'Nenhum paciente cadastrado.',
    nenhumEncontrado: (termo: string) =>
      termo
        ? `Nenhum paciente encontrado para "${termo}".`
        : 'Nenhum paciente encontrado com estes filtros.',
    naoEncontradoDescricao: 'O cadastro pode ter sido excluído ou o endereço está incorreto.',
    voltarLista: 'Voltar para a lista de pacientes',
    acoes: {
      ver: 'Ver cadastro',
      editar: 'Editar',
      agendar: 'Agendar consulta',
      inativar: 'Inativar',
      reativar: 'Reativar',
      excluir: 'Excluir definitivamente',
    },
    // Formulário
    secoes: {
      dadosPessoais: 'Dados pessoais',
      responsavel: 'Responsável legal',
      responsavelDescricao: 'Obrigatório para menores de 18 anos.',
      contato: 'Contato',
      endereco: 'Endereço',
      enderecoDescricao: 'Opcional. Ao digitar o CEP, o endereço é preenchido automaticamente.',
      convenio: 'Convênio',
      clinicas: 'Informações clínicas',
      emergencia: 'Contato de emergência',
      emergenciaDescricao: 'Opcional.',
      consentimento: 'Consentimento (LGPD)',
    },
    campos: {
      nome: 'Nome completo',
      nomeSocial: 'Nome social',
      nomeSocialDica: 'Se preenchido, é o nome usado em listas, agenda e avisos.',
      cpf: 'CPF',
      dataNascimento: 'Data de nascimento',
      sexo: 'Sexo',
      telefone: 'Telefone',
      email: 'E-mail',
      cep: 'CEP',
      logradouro: 'Logradouro',
      numero: 'Número',
      complemento: 'Complemento',
      bairro: 'Bairro',
      cidade: 'Cidade',
      uf: 'UF',
      tipoConvenio: 'Tipo de atendimento',
      particular: 'Particular',
      convenio: 'Convênio',
      convenioNome: 'Nome do convênio',
      carteirinha: 'Número da carteirinha',
      validade: 'Validade da carteirinha',
      tipoSanguineo: 'Tipo sanguíneo',
      alergias: 'Alergias',
      alergiasDica:
        'Medicamentos, alimentos ou materiais. Aparece em destaque no cadastro e na agenda.',
      observacoes: 'Observações',
      responsavelNome: 'Nome do responsável',
      responsavelCpf: 'CPF do responsável',
      parentesco: 'Parentesco',
      responsavelTelefone: 'Telefone do responsável',
      emergenciaNome: 'Nome',
      emergenciaTelefone: 'Telefone',
      emergenciaParentesco: 'Parentesco',
      consentimento:
        'O paciente (ou responsável) autoriza o uso dos dados para o atendimento, conforme a LGPD.',
      consentimentoRegistrado: (data: string) => `Consentimento registrado em ${data}.`,
    },
    sexos: {
      feminino: 'Feminino',
      masculino: 'Masculino',
      outro: 'Outro',
      nao_informado: 'Prefere não informar',
    },
    idadeCalculada: (n: number) => (n === 1 ? '1 ano' : `${n} anos`),
    menorDeIdade: 'Menor de idade: preencha o responsável legal.',
    convenioVencido: 'A validade da carteirinha já passou. Confira com o paciente.',
    cpfVerificando: 'Verificando CPF…',
    cep: {
      buscando: 'Buscando endereço…',
      encontrado: 'Endereço preenchido pelo CEP.',
    },
    salvar: 'Salvar',
    salvando: 'Salvando…',
    cancelar: 'Cancelar',
    cadastrado: 'Paciente cadastrado.',
    alteracoesSalvas: 'Alterações salvas.',
    avisoInativo: 'Este paciente está inativo. Você pode corrigir os dados normalmente.',
    alterarCpfTitulo: 'Alterar o CPF deste paciente?',
    alterarCpfMensagem: (de: string, para: string) => `O CPF será trocado de ${de} para ${para}.`,
    alterarCpf: 'Alterar CPF',
    concorrenciaTitulo: 'Cadastro alterado em outro lugar',
    recarregarDados: 'Recarregar dados',
    continuarEditando: 'Continuar editando',
    alteradoOutraAba:
      'Este cadastro foi alterado em outra aba. Recarregue para ver a versão atual antes de salvar.',
    // Detalhe
    nomeCivil: 'Nome civil',
    mostrarCpf: 'Mostrar CPF',
    ocultarCpf: 'Ocultar CPF',
    alergiasTitulo: 'Alergias',
    inativoDesde: (data: string, motivo?: string) =>
      motivo
        ? `Paciente inativo desde ${data} — motivo: ${motivo}`
        : `Paciente inativo desde ${data}`,
    cards: {
      dadosPessoais: 'Dados pessoais',
      responsavel: 'Responsável legal',
      contato: 'Contato e endereço',
      convenio: 'Convênio',
      clinicas: 'Informações clínicas',
      emergencia: 'Contato de emergência',
      proximas: 'Próximas consultas',
      historico: 'Histórico de consultas',
    },
    enderecoFormatado: (e: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      uf: string;
      cep: string;
    }) =>
      `${e.logradouro}, ${e.numero}${e.complemento ? ` — ${e.complemento}` : ''} · ${e.bairro} · ${e.cidade}/${e.uf} · CEP ${e.cep}`,
    semProximas: 'Nenhuma consulta agendada.',
    semHistorico: 'Nenhuma consulta anterior.',
    consultaCom: (medico: string, departamento: string) => `${medico} · ${departamento}`,
    // Inativar / reativar / excluir
    inativarTitulo: (nome: string) => `Inativar ${nome}?`,
    inativarMensagem: (n: number) =>
      n === 0
        ? 'O paciente não aparecerá nas listas nem no agendamento. O histórico é mantido.'
        : n === 1
          ? '1 consulta futura será cancelada automaticamente.'
          : `${n} consultas futuras serão canceladas automaticamente.`,
    motivoInativacao: 'Motivo da inativação (opcional)',
    inativado: (n: number) =>
      n === 0
        ? 'Paciente inativado.'
        : n === 1
          ? 'Paciente inativado. 1 consulta cancelada.'
          : `Paciente inativado. ${n} consultas canceladas.`,
    verCanceladas: 'Ver consultas canceladas',
    reativarTitulo: (nome: string) => `Reativar ${nome}?`,
    reativarMensagem: 'O paciente volta a aparecer nas listas e no agendamento.',
    reativado: 'Paciente reativado. As consultas canceladas não foram restauradas.',
    excluirTitulo: 'Excluir o cadastro definitivamente?',
    excluirMensagem:
      'Esta ação não pode ser desfeita. Só é possível porque o paciente nunca teve consultas.',
    excluido: 'Cadastro excluído.',
  },

  medicos: {
    titulo: 'Médicos',
    descricaoLista: 'Corpo clínico, lotação e horários de atendimento.',
    novo: 'Novo médico',
    editar: 'Editar médico',
    detalhe: 'Médico',
    editarBreadcrumb: 'Editar',
    buscar: 'Buscar por nome ou CRM',
    departamento: 'Departamento',
    todosDepartamentos: 'Todos',
    legendaTabela: 'Lista de médicos',
    visualizacao: 'Visualização',
    tabela: 'Tabela',
    cartoes: 'Cartões',
    colunas: {
      nome: 'Nome',
      crm: 'CRM',
      departamento: 'Departamento',
      dias: 'Atendimento',
      consultasHoje: 'Consultas hoje',
      status: 'Situação',
    },
    nenhumCadastrado: 'Nenhum médico cadastrado.',
    nenhumEncontrado: (termo: string) =>
      termo
        ? `Nenhum médico encontrado para "${termo}".`
        : 'Nenhum médico encontrado com estes filtros.',
    naoEncontradoDescricao: 'O cadastro pode ter sido removido ou o endereço está incorreto.',
    voltarLista: 'Voltar para a lista de médicos',
    acoes: {
      ver: 'Ver cadastro',
      editar: 'Editar',
      verAgenda: 'Ver agenda',
      agendar: 'Agendar consulta',
      inativar: 'Inativar',
      reativar: 'Reativar',
    },
    secoes: {
      identificacao: 'Identificação',
      contato: 'Contato',
      lotacao: 'Lotação',
      disponibilidade: 'Disponibilidade',
      disponibilidadeDescricao:
        'Dias e horários em que o médico atende. Define os horários oferecidos no agendamento.',
    },
    campos: {
      tratamento: 'Tratamento',
      nome: 'Nome completo',
      nomeDica: 'Sem o "Dr." ou "Dra.", que vem do campo Tratamento.',
      crmNumero: 'Número do CRM',
      crmUf: 'UF do CRM',
      telefone: 'Telefone',
      email: 'E-mail',
      departamento: 'Departamento',
      dias: 'Dias de atendimento',
      inicio: 'Início do expediente',
      fim: 'Fim do expediente',
      temPausa: 'Tem pausa (ex.: almoço)',
      pausaInicio: 'Início da pausa',
      pausaFim: 'Fim da pausa',
      duracao: 'Duração padrão da consulta',
      minutos: (n: number) => `${n} minutos`,
    },
    previa: {
      titulo: 'Prévia',
      semDias: 'Selecione os dias e os horários para ver a prévia.',
      pausa: (inicio: string, fim: string) => `pausa ${inicio}–${fim}`,
      horarios: (n: number, duracao: number) =>
        n === 1 ? `1 horário de ${duracao} min por dia` : `${n} horários de ${duracao} min por dia`,
    },
    salvar: 'Salvar',
    salvando: 'Salvando…',
    cancelar: 'Cancelar',
    cadastrado: 'Médico cadastrado.',
    alteracoesSalvas: 'Alterações salvas.',
    avisoInativo: 'Este médico está inativo. Você pode corrigir os dados normalmente.',
    afetadasTitulo: 'Consultas fora do novo horário',
    afetadasMensagem: (n: number) =>
      n === 1
        ? '1 consulta futura ficará fora do novo horário. Ela não será alterada automaticamente.'
        : `${n} consultas futuras ficarão fora do novo horário. Elas não serão alteradas automaticamente.`,
    salvarMesmoAssim: 'Salvar mesmo assim',
    revisar: 'Revisar',
    salvasComAfetadas: (n: number) =>
      n === 1
        ? 'Alterações salvas. 1 consulta ficou fora do horário.'
        : `Alterações salvas. ${n} consultas ficaram fora do horário.`,
    verAfetadas: 'Ver consultas afetadas',
    concorrenciaTitulo: 'Cadastro alterado em outro lugar',
    recarregarDados: 'Recarregar dados',
    continuarEditando: 'Continuar editando',
    alteradoOutraAba:
      'Este cadastro foi alterado em outra aba. Recarregue para ver a versão atual antes de salvar.',
    // Detalhe
    cards: {
      contato: 'Contato',
      disponibilidade: 'Disponibilidade semanal',
      hoje: 'Agenda de hoje',
      semana: 'Próximos 7 dias',
      indicadores: 'Indicadores do mês',
    },
    gradeLegenda: 'Horário de atendimento por dia da semana',
    naoAtende: 'Não atende',
    naoAtendeHoje: 'Não atende hoje.',
    livresHoje: (n: number) => (n === 1 ? '1 horário livre' : `${n} horários livres`),
    semConsultasHoje: 'Nenhuma consulta hoje.',
    consultasNoDia: (n: number) => (n === 1 ? '1 consulta' : `${n} consultas`),
    indicadores: {
      consultas: 'Consultas no mês',
      taxaFaltas: 'Taxa de faltas',
      taxaFaltasDica: 'Faltas ÷ (concluídas + faltas)',
      cancelamentos: 'Cancelamentos',
    },
    inativoDesde: (data: string, motivo?: string) =>
      motivo ? `Médico inativo desde ${data} — motivo: ${motivo}` : `Médico inativo desde ${data}`,
    // Inativar / reativar
    inativarTitulo: (nome: string) => `Inativar ${nome}?`,
    inativarBloqueado: (n: number) =>
      n === 1
        ? 'Há 1 consulta futura agendada. Reagende ou cancele antes de inativar.'
        : `Há ${n} consultas futuras agendadas. Reagende ou cancele cada uma antes de inativar.`,
    inativarLiberado: 'Não há consultas futuras. O médico deixará de aparecer no agendamento.',
    consultasPendentes: 'Consultas futuras',
    reagendar: 'Reagendar',
    cancelarConsulta: 'Cancelar',
    motivoCancelamento: 'Motivo do cancelamento',
    confirmarCancelamento: 'Confirmar cancelamento',
    voltar: 'Voltar',
    consultaCancelada: 'Consulta cancelada.',
    motivoInativacao: 'Motivo da inativação (opcional)',
    inativado: 'Médico inativado.',
    reativarTitulo: (nome: string) => `Reativar ${nome}?`,
    reativarMensagem: 'O médico volta a aparecer nas listas e no agendamento.',
    reativado: 'Médico reativado.',
  },

  agenda: {
    titulo: 'Agenda',
    nova: 'Agendar consulta',
    detalhe: 'Consulta',
    editar: 'Reagendar consulta',
    editarBreadcrumb: 'Reagendar',
    hoje: 'Hoje',
    diaAnterior: 'Dia anterior',
    proximoDia: 'Próximo dia',
    escolherData: 'Data',
    todasAsDatas: 'Todas as datas',
    aPartirDeHoje: 'De hoje em diante',
    periodo: 'Período',
    periodos: { dia: 'Dia', futuras: 'Próximas', todas: 'Todas as datas' },
    medico: 'Médico',
    todosMedicos: 'Todos',
    departamento: 'Departamento',
    todosDepartamentos: 'Todos',
    status: 'Situação',
    todosStatus: 'Todas',
    pendentes: 'Pendentes de registro',
    filtroPaciente: (nome: string) => `Paciente: ${nome}`,
    removerFiltroPaciente: 'Remover filtro de paciente',
    visao: 'Organizar',
    porHorario: 'Por horário',
    porMedico: 'Por médico',
    resumo: {
      titulo: 'Resumo',
      total: 'Total',
      agendadas: 'Agendadas',
      concluidas: 'Concluídas',
      canceladas: 'Canceladas',
      faltas: 'Faltas',
      pendentes: 'Pendentes',
    },
    vazioDia: (data: string) => `Nenhuma consulta em ${data}.`,
    vazioFiltros: 'Nenhuma consulta com estes filtros.',
    legendaLista: 'Consultas',
    aguardandoRegistro: 'Aguardando registro',
    possuiAlergias: 'Possui alergias',
    tipos: {
      primeira_vez: 'Primeira vez',
      retorno: 'Retorno',
      exame: 'Exame',
      teleconsulta: 'Teleconsulta',
    },
    acoes: {
      ver: 'Ver consulta',
      reagendar: 'Reagendar',
      cancelar: 'Cancelar consulta',
      concluir: 'Concluir',
      faltou: 'Faltou',
      agendarNovamente: 'Agendar novamente',
    },
    disponivelAPartir: (hora: string) => `Disponível a partir das ${hora}`,
    concluirTitulo: (paciente: string) => `Concluir a consulta de ${paciente}?`,
    faltouTitulo: (paciente: string) => `Registrar falta de ${paciente}?`,
    concluida: 'Consulta concluída.',
    faltaRegistrada: 'Falta registrada.',
    selecionarConsulta: (texto: string) => `Selecionar ${texto}`,
    selecionarTodas: 'Selecionar todas',
    lote: {
      selecionadas: (n: number) => (n === 1 ? '1 selecionada' : `${n} selecionadas`),
      concluir: 'Marcar como concluídas',
      faltou: 'Marcar falta',
      concluirTitulo: (n: number) =>
        n === 1 ? 'Marcar 1 consulta como concluída?' : `Marcar ${n} consultas como concluídas?`,
      faltouTitulo: (n: number) =>
        n === 1 ? 'Registrar falta em 1 consulta?' : `Registrar falta em ${n} consultas?`,
      concluidas: (n: number) =>
        n === 1 ? '1 consulta marcada como concluída.' : `${n} consultas marcadas como concluídas.`,
      faltas: (n: number) =>
        n === 1 ? 'Falta registrada em 1 consulta.' : `Falta registrada em ${n} consultas.`,
    },
    // Cancelamento (P11)
    cancelarTitulo: 'Cancelar consulta',
    motivoCancelamento: 'Motivo do cancelamento',
    sugestoesMotivo: [
      'Paciente desmarcou',
      'Médico indisponível',
      'Remarcação solicitada',
      'Outro',
    ],
    sugestoes: 'Sugestões',
    confirmarCancelamento: 'Cancelar consulta',
    voltar: 'Voltar',
    cancelada: 'Consulta cancelada.',
    // Formulário (P9/P10)
    secoes: {
      paciente: 'Paciente',
      profissional: 'Médico e data',
      horario: 'Horário',
      detalhes: 'Detalhes',
    },
    campos: {
      paciente: 'Paciente',
      pacienteDica: 'Busque por nome, nome social ou CPF. Só pacientes ativos.',
      departamento: 'Departamento',
      departamentoDica: 'Opcional: filtra a lista de médicos.',
      medico: 'Médico',
      data: 'Data',
      tipo: 'Tipo de consulta',
      duracao: 'Duração',
      hora: 'Horário',
      motivo: 'Motivo da consulta',
    },
    cadastrarPaciente: 'Cadastrar novo paciente',
    resumoPaciente: (idade: string, convenio: string) => `${idade} · ${convenio}`,
    opcaoMedico: (nome: string, dias: string) => `${nome} — ${dias}`,
    naoAtendeNoDia: (medico: string, dia: string) => `${medico} não atende ${dia}.`,
    diasNaPreposicao: [
      'aos domingos',
      'às segundas',
      'às terças',
      'às quartas',
      'às quintas',
      'às sextas',
      'aos sábados',
    ],
    proximoAtendimento: (data: string) => `Próximo dia de atendimento: ${data}`,
    usarData: 'Usar esta data',
    sugestaoRetorno:
      'Sugerido "Retorno": o paciente teve consulta concluída com este médico nos últimos 30 dias.',
    minutos: (n: number) => `${n} min`,
    escolhaMedicoData: 'Escolha o médico e a data para ver os horários.',
    horariosDisponiveis: (n: number) => (n === 1 ? '1 horário livre' : `${n} horários livres`),
    semHorarios: 'Nenhum horário livre neste dia.',
    proximoDiaLivre: 'Próximo dia com horário livre',
    semProximoDia: 'Nenhum dia com horário livre nos próximos 60 dias.',
    horarioAtual: 'Horário atual',
    horarioInvalidado: (hora: string) =>
      `O horário ${hora} não está mais disponível. Escolha outro.`,
    motivosIndisponivel: {
      passado: 'Horário passado',
      pausa: 'Pausa',
      medico_ocupado: 'Ocupado',
      paciente_ocupado: 'Paciente já tem consulta',
      fora_expediente: 'Fora do expediente',
    },
    agendar: 'Agendar',
    salvarReagendamento: 'Salvar novo horário',
    salvando: 'Salvando…',
    cancelar: 'Cancelar',
    agendada: (quando: string, hora: string, medico: string) =>
      `Consulta agendada: ${quando} às ${hora} com ${medico}`,
    reagendada: (quando: string, hora: string) => `Consulta reagendada para ${quando} às ${hora}`,
    naoPodeAlterar: 'Esta consulta não pode mais ser reagendada.',
    semPacientes: 'Não há pacientes ativos. Cadastre um paciente para agendar.',
    semMedicos: 'Não há médicos ativos. Cadastre um médico para agendar.',
    cadastrarMedico: 'Cadastrar médico',
    pacienteFixo: 'O paciente não muda no reagendamento.',
    // Detalhe
    naoEncontradaDescricao: 'A consulta pode ter sido removida ou o endereço está incorreto.',
    voltarAgenda: 'Voltar para a agenda',
    tituloDetalhe: (paciente: string) => `Consulta de ${paciente}`,
    cards: {
      dados: 'Dados da consulta',
      historico: 'Histórico',
      paciente: 'Paciente',
      acoes: 'Ações',
    },
    campoData: 'Data',
    campoHorario: 'Horário',
    campoMedico: 'Médico',
    campoDepartamento: 'Departamento',
    campoTipo: 'Tipo',
    campoMotivo: 'Motivo',
    campoSituacao: 'Situação',
    campoMotivoCancelamento: 'Motivo do cancelamento',
    eventos: {
      agendada: 'Consulta agendada',
      reagendada: (de: string, para: string) => `Reagendada de ${de} para ${para}`,
      cancelada: 'Consulta cancelada',
      concluida: 'Consulta concluída',
      faltou: 'Falta registrada',
    },
    situacaoFinal: 'Consulta finalizada: não há ações disponíveis.',
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
