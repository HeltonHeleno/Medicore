/**
 * Textos comuns aos módulos operacionais (erros E-11 a E-18, R-X, invariantes). Importado só
 * pelos serviços dos módulos, para não entrar no pacote inicial (`npm run pacote:medir`).
 * Os textos de pendência que os cadastros mostram ficam em `t.operacoes` (pt-BR.ts).
 */
export const to = {
  autorDemonstracao: 'Usuário de demonstração',
  /** E-11 a E-18 */
  leitoIndisponivel: 'Este leito acabou de ser ocupado. Escolha outro.',
  estoqueInsuficiente: (disponivel: number, unidade: string) =>
    `Estoque insuficiente: disponível ${disponivel} ${unidade}.`,
  loteVencido: 'Lote vencido não pode entrar no estoque.',
  loteOutraValidade: (numero: string) => `Já existe o lote ${numero} com outra validade.`,
  pacienteInternado: (nome: string, leito: string) =>
    `${nome} está internado(a) no leito ${leito}.`,
  pacienteEmAtendimento: (nome: string, numero: string) =>
    `${nome} está em atendimento na emergência (${numero}).`,
  pacienteComSolicitacao: (nome: string) => `${nome} já tem um pedido de leito em aberto.`,
  destinoInativo: 'O paciente não está mais internado nem em atendimento.',
  situacaoMudou: 'Este registro mudou de situação. A tela foi atualizada.',
  janelaExpirada: (horas: number, limite: string) =>
    `Não é mais possível desfazer: o prazo de ${horas} h terminou em ${limite}.`,
  pendenciaInternacao: (leito: string) => `Internação ativa no leito ${leito}`,
  pendenciaAtendimento: (numero: string) => `Atendimento ${numero} aberto na emergência`,
  pendenciaResponsavel: (paciente: string, leito: string) =>
    `Responsável pela internação de ${paciente} (${leito})`,
  pendenciaMedicoAtendimento: (numero: string) => `Atendimento ${numero} em curso`,
  /** A14: rótulos do gráfico de internações. */
  mesesCurtos: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  semanaN: (n: number) => `Sem ${n}`,
  /** A12: nomes curtos dos sinais no título do alerta. */
  sinaisCurtos: {
    pas: 'PA',
    pad: 'PA',
    fc: 'FC',
    fr: 'FR',
    temperatura: 'Temperatura',
    spo2: 'SpO₂',
    dor: 'Dor',
    glicemia: 'Glicemia',
  },
  localEmergencia: (numero: string) => `Emergência, ${numero}`,
  localLeito: (setor: string, leito: string) => `${setor}, leito ${leito}`,
  /** R-X7 */
  motivoObito: (data: string) => `Óbito em ${data}`,
  consultaCanceladaObito: 'Óbito do paciente',
  consultasNaoVoltam: 'O cadastro foi reativado. As consultas canceladas pelo óbito não voltam.',
  /** R-X8 */
  /** Etiqueta de contexto no `ComboboxPaciente` (16.5). */
  etiquetaInternado: (leito: string) => `Internado em ${leito}`,
  etiquetaEmergencia: (numero: string) => `Emergência ${numero}`,
  /** R-F15 */
  alergiasNaoInformadas: 'Alergias não informadas',
  leitoPerfilIncompativel:
    'O perfil do leito (adulto ou pediátrico) não combina com a idade do paciente.',
  /** R-E15 */
  motivoAtendimentoEncerrado: (desfecho: string) => `Atendimento encerrado: ${desfecho}`,

  /** Descrições das violações de INV-1 a INV-10 (só aparecem nos testes e no console em desenvolvimento). */
  inv: {
    ocupado: (codigo: string, total: number) =>
      `Leito ${codigo} ocupado com ${total} ocupação(ões) ou sem apontar para ela`,
    statusComOcupacao: (codigo: string, status: string) =>
      `Leito ${codigo} está "${status}", mas tem ocupação`,
    reservado: (codigo: string, n: number) => `Leito ${codigo} reservado com ${n} solicitação(ões)`,
    reservaEmOutroStatus: (codigo: string, status: string) =>
      `Solicitação reservada para o leito ${codigo}, que está "${status}"`,
    reservaSemLeito: 'Solicitação reservada sem leito',
    apontaSemOcupacao: (codigo: string, status: string) =>
      `Leito ${codigo} "${status}" ainda aponta para uma ocupação ou reserva`,
    porPaciente: (i: number, a: number, s: number) =>
      `Paciente com ${i} internação(ões) ativa(s), ${a} atendimento(s) aberto(s) e ${s} pedido(s) de leito`,
    aguardandoLeito: (numero: string, n: number) =>
      `Atendimento ${numero} aguardando leito com ${n} pedido(s) aberto(s)`,
    pedidoAberto: (numero: string, status: string) =>
      `Atendimento ${numero} "${status}" com pedido de leito aberto`,
    desfechoSemInternacao: (numero: string) =>
      `Atendimento ${numero} encerrado por internação sem a internação correspondente`,
    internacaoSemDesfecho:
      'Internação vinda da emergência sem o atendimento encerrado por internação',
    saldo: (lote: string, saldo: number, esperado: number) =>
      `Lote ${lote}: saldo ${saldo}, movimentações somam ${esperado}`,
    saldoNegativo: (lote: string) => `Lote ${lote} com saldo negativo`,
    itemDispensacao: (id: string, item: number) =>
      `Dispensação ${id}, item ${item}: lotes não batem com o item`,
    obito: 'Paciente com óbito ainda ativo ou com pendências',
  },
} as const;
