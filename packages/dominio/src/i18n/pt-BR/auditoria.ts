/**
 * Fase 29 (BL-03) — Textos da auditoria: a consulta, o histórico de acesso do paciente, o pedido do
 * titular e a conferência de integridade. Carregado só por essas telas e pela API.
 */
import type { AcaoAuditoria } from '../../contrato/auditoria';
import { t } from '../pt-BR';

export const tau = {
  titulo: 'Auditoria',
  descricao: 'Quem viu ou mudou cada registro, quando e de onde (LGPD).',
  abas: { usuarios: 'Usuários', auditoria: 'Auditoria' },

  filtros: {
    pessoa: 'Pessoa',
    todasPessoas: 'Todas as pessoas',
    paciente: 'Paciente (id)',
    acao: 'Ação',
    todasAcoes: 'Todas as ações',
    entidade: 'Registro',
    todasEntidades: 'Todos os registros',
    de: 'De',
    ate: 'Até',
    aplicar: 'Filtrar',
    limpar: 'Limpar filtros',
  },

  colunas: {
    em: 'Quando',
    pessoa: 'Pessoa',
    acao: 'Ação',
    entidade: 'Registro',
    registro: 'Id do registro',
    paciente: 'Paciente',
    ip: 'De onde (IP)',
    detalhe: 'O que mudou ou foi visto',
  },

  acoes: {
    inclusao: 'Inclusão',
    alteracao: 'Alteração',
    exclusao: 'Exclusão',
    leitura: 'Leitura',
    exportacao: 'Exportação',
  } satisfies Record<AcaoAuditoria, string>,

  /** Quem fez, quando não é uma pessoa. */
  origens: { api: 'Sem login', rotina: 'Rotina do sistema', banco: 'Banco de dados' },

  entidades: {
    pacientes: 'Paciente',
    medicos: 'Médico',
    consultas: 'Consulta',
    leitos: 'Leito',
    atendimentos: 'Atendimento',
    solicitacoes: 'Pedido de leito',
    internacoes: 'Internação',
    medicamentos: 'Medicamento',
    lotes: 'Lote',
    dispensacoes: 'Dispensação',
    movimentacoes: 'Movimentação',
    usuarios: 'Usuário',
    perfis_usuario: 'Perfis do usuário',
    auditoria: 'Auditoria',
  } as Record<string, string>,

  /** O que foi visto (BL-03.2), pelos códigos gravados no `detalhe`. */
  detalhes: {
    cadastro: 'cadastro',
    cpf_completo: 'CPF completo',
    alergias: 'alergias',
    historico_hospitalar: 'histórico hospitalar',
    dispensacoes: 'dispensações',
    atendimento: 'atendimento',
    internacao: 'internação',
    dispensacao: 'dispensação',
    busca_cpf: 'busca por CPF',
    pedido_titular: 'pedido do titular (relatório)',
    exportacao_auditoria: 'exportação da auditoria',
  } as Record<string, string>,

  campos: {
    alterados: (n: number) => (n === 1 ? '1 campo' : `${n} campos`),
    antes: 'antes',
    depois: 'depois',
    adicionados: 'adicionado',
    vazio: '(vazio)',
  },

  exportar: 'Exportar CSV',
  exportando: 'Exportando…',
  exportado: 'Arquivo gerado. A exportação também fica registrada na auditoria.',
  vazia: 'Nenhum registro com estes filtros.',
  verDetalhes: 'Ver o que mudou',
  ocultarDetalhes: 'Ocultar',

  integridade: {
    titulo: 'Integridade da trilha',
    descricao:
      'Cada dia fechado recebe um selo (hash encadeado). Conferir refaz os selos: um registro alterado ou apagado aparece aqui.',
    conferir: 'Conferir agora',
    conferindo: 'Conferindo…',
    ok: (dias: number, registros: number) =>
      `Trilha íntegra: ${dias} ${dias === 1 ? 'dia conferido' : 'dias conferidos'}, ${registros.toLocaleString('pt-BR')} registros.`,
    nenhumSelo: 'Nenhum dia selado ainda (o selo é feito de madrugada, depois que o dia termina).',
    violacao: (dia: string, selada: number, atual: number) =>
      `${dia}: o selo não confere (${selada} registros selados, ${atual} agora). Investigue.`,
  },

  historico: {
    titulo: 'Histórico de acesso',
    descricao: 'Quem viu ou mudou este cadastro (os mais recentes primeiro).',
    vazio: 'Nenhum acesso registrado.',
    verTudo: 'Ver tudo na auditoria',
  },

  titular: {
    botao: 'Pedido do titular (LGPD)',
    titulo: t.pacientes.titular,
    descricao: (nome: string) =>
      `Dados pessoais de ${nome} guardados no MediCore e os acessos a eles (LGPD, art. 18).`,
    gerado: (quando: string) => `Gerado em ${quando}.`,
    imprimir: 'Imprimir ou salvar em PDF',
    dados: 'Dados do cadastro',
    consultas: 'Consultas',
    internacoes: 'Internações',
    atendimentos: 'Atendimentos na emergência',
    dispensacoes: 'Dispensações',
    acessos: 'Acessos ao cadastro',
    nenhum: 'Nenhum.',
    voltar: 'Voltar para o paciente',
    colunasAcessos: { em: 'Quando', pessoa: 'Quem', acao: 'O quê' },
    quantidade: (n: number) => (n === 1 ? '1 registro' : `${n} registros`),
  },
};
