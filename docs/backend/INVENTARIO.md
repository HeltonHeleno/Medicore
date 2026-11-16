# Inventário dos serviços do navegador (Fase 24, tarefa 24.0.2)

> **Para quê:** é a lista do que precisa ir para a API nas Fases 25 a 27 (BL-01.4 a BL-01.7). Cada função exportada de `apps/web/src/services/` aparece com o nome, a entrada, a saída, as coleções que usa **diretamente** e as que grava, e se roda dentro de `transacao()` (que no servidor vira uma transação do banco, R-API3).
> **Como foi gerado:** pela árvore sintática do TypeScript, a partir do código de 16/11/2026 (`apps/web/src/services/`). "Coleções usadas" e "Gravadas" contam só o uso direto (`repoX.metodo(...)`); funções que chamam outras herdam o que elas usam. "(inferido)" quer dizer que a função não declara o tipo de retorno.
> **Total:** 181 funções em 24 arquivos; 51 rodam numa transação.

## Destino de cada arquivo

| Arquivo | Linhas | Destino | Fase |
|---|---:|---|:---:|
| `pacientes.ts`, `medicos.ts`, `consultas.ts`, `atividades.ts`, `pendencias-modulos.ts` | 1.067 | Rotas de cadastros e agenda (P1–P13, R-X2–R-X4) | 25 |
| `leitos.ts`, `emergencia.ts`, `farmacia.ts`, `operacoes-comum.ts`, `situacao-hospitalar.ts` | 3.087 | Rotas dos módulos (L1–L9, E1–E10, F1–F9, R-X7, R-X8) | 26 |
| `indicadores-operacionais.ts`, `painel.ts` | 563 | Rotas de indicadores (A12–A14) | 26 |
| `retencao.ts` | 412 | Rotina do servidor (A15) | 26 |
| `repositorio.ts`, `colecoes.ts`, `colecoes-operacoes.ts`, `nomes-colecoes-operacoes.ts`, `migracoes.ts`, `infra.ts`, `inicializacao-operacoes.ts`, `demo.ts` | 705 | Saem do navegador: o banco e o adaptador HTTP tomam o lugar (o "Restaurar dados de exemplo" vira rotina da demonstração) | 27 |
| `api.ts` | 31 | Cards ainda simulados do Painel (`getKpis`, `getDepartamentos`) | 27 e 55 (BL-41) |
| `cep.ts` | 78 | Continua no navegador (só o CEP sai, para o ViaCEP) | — |

## Funções por arquivo

### `api.ts` (4)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `delay` | `ms` | `Promise<void>` | — | — |  |
| `getUsuario` | — | `Promise<Usuario>` | — | — |  |
| `getKpis` | — | `Promise<Kpis>` | — | — |  |
| `getDepartamentos` | — | `Promise<Departamento[]>` | — | — |  |

### `atividades.ts` (2)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `registrarAtividade` | `tipo: TipoAtividade, descricao: string, referenciaId?: string` | `Atividade` | Atividades | Atividades |  |
| `listarAtividades` | `{ limite = 10 }: { limite?: number }` | `(inferido)` | Atividades | — |  |

### `cep.ts` (2)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `limparCacheCep` | — | `(inferido)` | — | — |  |
| `buscarCep` | `cep: string, signal?: AbortSignal` | `Promise<EnderecoCep \| null>` | — | — |  |

### `colecoes-operacoes.ts` (2)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `garantirSemeadura` | — | `void` | — | — |  |
| `retratoAtual` | — | `RetratoOperacoes` | Leitos, Internacoes, Solicitacoes, Atendimentos, Lotes, Movimentacoes, Dispensacoes, Pacientes, Consultas | — |  |

### `consultas.ts` (11)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `detalhar` | `consulta: Consulta` | `ConsultaDetalhada` | Pacientes, Medicos | — |  |
| `listarConsultas` | `filtros: FiltrosAgenda` | `Promise<ConsultaDetalhada[]>` | — | — |  |
| `obterConsulta` | `id: string` | `Promise<ConsultaDetalhada>` | — | — |  |
| `horariosLivres` | `medicoId: string, data: string, duracaoMin: number, pacienteId?: string, ignorarConsultaId?: string` | `Promise<HorarioAgenda[]>` | — | — |  |
| `proximoDiaDisponivel` | `medicoId: string, data: string, duracaoMin: number, pacienteId?: string, ignorarConsultaId?: string` | `Promise<string \| null>` | — | — |  |
| `agendarConsulta` | `entrada: EntradaAgendamento` | `Promise<ConsultaDetalhada>` | Consultas | Consultas | sim |
| `reagendarConsulta` | `id: string, entrada: EntradaAgendamento, versao: number` | `Promise<ConsultaDetalhada>` | Consultas | Consultas | sim |
| `cancelarConsulta` | `id: string, motivo: string, versao: number` | `Promise<ConsultaDetalhada>` | Consultas | Consultas | sim |
| `concluirConsulta` | `id: string` | `Promise<ConsultaDetalhada>` | — | — | sim |
| `marcarFalta` | `id: string` | `Promise<ConsultaDetalhada>` | — | — | sim |
| `registrarEmLote` | `ids: string[], acao: 'concluida' \| 'faltou'` | `Promise<number>` | — | — | sim |

### `demo.ts` (1)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `restaurarDadosExemplo` | — | `void` | — | — |  |

### `emergencia.ts` (17)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `detalharAtendimento` | `a: Atendimento` | `AtendimentoDetalhado` | Pacientes | — |  |
| `listarFila` | — | `Promise<FilaEmergencia>` | Atendimentos | — |  |
| `obterAtendimento` | `id: string` | `Promise<AtendimentoDetalhado>` | Atendimentos | — |  |
| `listarHistorico` | `filtros: FiltrosHistoricoEmergencia` | `Promise<Paginado<AtendimentoDetalhado>>` | — | — |  |
| `registrarChegada` | `entrada: EntradaChegada` | `Promise<Atendimento>` | Atendimentos | Atendimentos | sim |
| `triar` | `id: string, entrada: EntradaTriagem, versao: number` | `Promise<Atendimento>` | Atendimentos, Solicitacoes | Solicitacoes, Atendimentos | sim |
| `reavaliar` | `id: string, entrada: EntradaReavaliacao, versao: number` | `Promise<Atendimento>` | Atendimentos | Atendimentos | sim |
| `chamar` | `id: string, medicoId: string, versao: number` | `Promise<Atendimento>` | Atendimentos | Atendimentos | sim |
| `colocarEmObservacao` | `id: string, leitoId: string, versao: number` | `Promise<Atendimento>` | Leitos, Pacientes, Atendimentos | Leitos, Atendimentos | sim |
| `retomarAtendimento` | `id: string, versao: number` | `Promise<Atendimento>` | Atendimentos | Atendimentos | sim |
| `solicitarLeito` | `id: string, entrada: EntradaPedirLeito, versao: number` | `Promise<Atendimento>` | Solicitacoes, Atendimentos | Solicitacoes, Atendimentos | sim |
| `desfechosPermitidos` | `status: StatusAtendimento` | `(inferido)` | — | — |  |
| `encerrar` | `id: string, entrada: EntradaDesfecho, versao: number` | `Promise<ResultadoEncerramento>` | Solicitacoes, Leitos, Atendimentos | Atendimentos | sim |
| `reabrir` | `id: string, motivo: string, versao: number, novoLeitoObservacaoId?: string` | `Promise<{ atendimento: Atendimento; obitoDesfeito: boolean }>` | Atendimentos, Pacientes, Leitos | Leitos, Atendimentos | sim |
| `vincularPaciente` | `id: string, pacienteId: string, versao: number` | `Promise<Atendimento>` | Atendimentos | Atendimentos | sim |
| `leitosParaObservacao` | `id: string` | `Promise<LeitoAvaliado[]>` | Atendimentos, Pacientes, Leitos | — |  |
| `medicosParaChamar` | — | `Promise<Medico[]>` | — | — |  |

### `farmacia.ts` (27)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `quantidadeComUnidade` | `m: Pick<Medicamento, 'unidade'>, n: number` | `(inferido)` | — | — |  |
| `nomeMedicamento` | `m: Pick<Medicamento, 'nome' \| 'concentracao'>` | `(inferido)` | — | — |  |
| `listarEstoque` | `filtros: FiltrosEstoque` | `Promise<Paginado<EstoqueMedicamento>>` | — | — |  |
| `obterMedicamento` | `id: string` | `Promise<DetalheMedicamento>` | Medicamentos | — |  |
| `listarLotesVencimento` | — | `Promise< (LoteDetalhado & { medicamento: Medicamento })[] >` | Medicamentos | — |  |
| `listarMovimentacoes` | `filtros: FiltrosMovimentacoes` | `Promise<Paginado<MovimentacaoDetalhada>>` | Dispensacoes, Medicamentos, Lotes | — |  |
| `obterDispensacao` | `id: string` | `Promise<DispensacaoDetalhada>` | Dispensacoes, Medicamentos, Lotes | — |  |
| `listarDispensacoesDoPaciente` | `pacienteId: string` | `Promise<Dispensacao[]>` | — | — |  |
| `livroControlados` | `medicamentoId: string, de: string, ate: string` | `Promise<LivroControlados>` | Medicamentos, Movimentacoes | — |  |
| `previaFefo` | `medicamentoId: string, quantidade: number` | `Promise<PlanoFefo & { lotes: Lote[] }>` | Lotes | — |  |
| `verificarAlergia` | `pacienteId: string, medicamentoId: string` | `Promise<CorrespondenciaAlergia \| null>` | Pacientes, Medicamentos | — |  |
| `criarMedicamento` | `entrada: EntradaMedicamento` | `Promise<Medicamento>` | Medicamentos | Medicamentos | sim |
| `editarMedicamento` | `id: string, entrada: EntradaMedicamento, versao: number` | `Promise<Medicamento>` | Medicamentos | Medicamentos | sim |
| `inativarMedicamento` | `id: string, versao: number, motivo?: string` | `Promise<Medicamento>` | Medicamentos | Medicamentos | sim |
| `reativarMedicamento` | `id: string, versao: number` | `Promise<Medicamento>` | Medicamentos | Medicamentos | sim |
| `registrarEntrada` | `entrada: EntradaLote` | `Promise<Lote>` | Lotes | Lotes | sim |
| `ajustar` | `loteId: string, entrada: EntradaAjuste, versao: number` | `Promise<Lote>` | Lotes, Medicamentos | — | sim |
| `descartarVencidos` | `entrada: EntradaDescarte` | `Promise<{ lotes: number; unidades: number }>` | Lotes, Medicamentos | — | sim |
| `bloquearLote` | `id: string, entrada: EntradaBloqueioLote, versao: number` | `Promise<Lote>` | Lotes, Medicamentos | Lotes | sim |
| `desbloquearLote` | `id: string, versao: number` | `Promise<Lote>` | Lotes | Lotes | sim |
| `destinoDoPaciente` | `pacienteId: string` | `Dispensacao['destino'] \| null` | — | — |  |
| `destinoDaDispensacao` | `pacienteId: string` | `(inferido)` | — | — |  |
| `destinoDetalhado` | `pacienteId: string` | `Promise<DestinoDetalhado \| null>` | Leitos | — |  |
| `listarDispensacoesDoDestino` | `destinoId: string` | `Promise<DispensacaoResumida[]>` | Medicamentos | — |  |
| `dispensar` | `entrada: EntradaDispensacao` | `Promise<Dispensacao>` | Pacientes, Lotes, Dispensacoes | Dispensacoes | sim |
| `devolver` | `dispensacaoId: string, itemIndice: number, entrada: EntradaDevolucao, versao: number` | `Promise<Dispensacao>` | Dispensacoes | Dispensacoes | sim |
| `estornar` | `id: string, motivo: string, versao: number` | `Promise<Dispensacao>` | Dispensacoes | Dispensacoes | sim |

### `indicadores-operacionais.ts` (11)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `calcularIndicadoresLeitos` | `d: { leitos: readonly Leito[]; internacoes: readonly Internacao[]; solicitacoes: readonly SolicitacaoLeito[]; }, momento: Date` | `IndicadoresLeitos` | — | — |  |
| `calcularIndicadoresEmergencia` | `atendimentos: readonly Atendimento[], momento: Date` | `IndicadoresEmergencia` | — | — |  |
| `calcularAlertas` | `d: DadosAlertas, momento: Date` | `AlertaOperacional[]` | — | — |  |
| `calcularSerieInternacoes` | `internacoes: readonly Internacao[], resumos: readonly ResumoMensal[], periodo: PeriodoInternacao, momento: Date` | `PontoInternacao[]` | — | — |  |
| `calcularResumoEstoque` | `medicamentos: readonly Medicamento[], lotes: readonly Lote[], hoje: string` | `ResumoEstoque` | — | — |  |
| `obterIndicadoresOperacionais` | — | `Promise<IndicadoresOperacionais>` | Leitos, Atendimentos, Solicitacoes, Internacoes, Medicamentos, Lotes | — |  |
| `obterIndicadoresLeitos` | — | `Promise<IndicadoresLeitos>` | Leitos, Internacoes, Solicitacoes | — |  |
| `obterIndicadoresEmergencia` | — | `Promise<IndicadoresEmergencia>` | Atendimentos | — |  |
| `obterResumoEstoque` | — | `Promise<ResumoEstoque>` | Medicamentos, Lotes | — |  |
| `listarAlertas` | — | `Promise<AlertaOperacional[]>` | Leitos, Atendimentos, Solicitacoes | — |  |
| `obterSerieInternacoes` | `periodo: PeriodoInternacao` | `Promise<PontoInternacao[]>` | Internacoes, Resumos | — |  |

### `infra.ts` (1)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `executar` | `operacao: () => T` | `Promise<T>` | — | — |  |

### `inicializacao-operacoes.ts` (1)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `iniciarOperacoes` | — | `void` | — | — |  |

### `leitos.ts` (26)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `listarLeitos` | `filtros: FiltrosLeitos` | `Promise<LeitoDetalhado[]>` | — | — |  |
| `obterLeito` | `id: string` | `Promise<LeitoDetalhado>` | Leitos | — |  |
| `buscarPacienteNoMapa` | `termo: string` | `Promise<LeitoDetalhado[]>` | Pacientes | — |  |
| `historicoLeito` | `id: string, dias` | `Promise<InternacaoDetalhada[]>` | — | — |  |
| `avaliarParaPaciente` | `c: CriterioCompatibilidade, ignorarLeitoId?: string` | `LeitoAvaliado[]` | Pacientes | — |  |
| `leitosCompativeis` | `c: CriterioCompatibilidade, ignorarLeitoId?: string` | `(inferido)` | — | — |  |
| `listarInternacoes` | `filtros: FiltrosInternacoes` | `Promise<Paginado<InternacaoDetalhada>>` | — | — |  |
| `obterInternacao` | `id: string` | `Promise<InternacaoDetalhada>` | Internacoes | — |  |
| `consultasNaInternacao` | `i: Internacao` | `Consulta[]` | — | — |  |
| `consultasDuranteInternacao` | `internacaoId: string` | `Promise<Consulta[]>` | Internacoes | — |  |
| `listarSolicitacoes` | — | `Promise<SolicitacaoDetalhada[]>` | — | — |  |
| `obterSolicitacao` | `id: string` | `Promise<SolicitacaoDetalhada>` | Solicitacoes | — |  |
| `internar` | `entrada: EntradaInternacao` | `Promise<Internacao>` | Solicitacoes, Leitos, Internacoes, Atendimentos | Internacoes, Leitos, Solicitacoes, Atendimentos | sim |
| `transferir` | `id: string, entrada: EntradaTransferencia, versao: number` | `Promise<Internacao>` | Pacientes, Leitos, Internacoes | Leitos, Internacoes | sim |
| `darAlta` | `id: string, entrada: EntradaAlta, versao: number` | `Promise<ResultadoAlta>` | Internacoes | Internacoes | sim |
| `desfazerAlta` | `id: string, motivo: string, versao: number` | `Promise<{ internacao: Internacao; obitoDesfeito: boolean }>` | Internacoes, Leitos, Pacientes | Leitos, Internacoes | sim |
| `concluirHigienizacao` | `itens: { id: string; versao: number }[]` | `Promise<ResultadoLote>` | Leitos | Leitos | sim |
| `reverterHigienizacao` | `id: string, versao: number, anterior: { desde: string; tipo: 'terminal' \| 'isolamento' }` | `Promise<Leito>` | Leitos | Leitos | sim |
| `bloquear` | `id: string, entrada: EntradaBloqueioLeito, versao: number` | `Promise<Leito>` | Leitos | Leitos | sim |
| `desbloquear` | `id: string, versao: number` | `Promise<Leito>` | Leitos | Leitos | sim |
| `editarInternacao` | `id: string, entrada: EntradaEdicaoInternacao, versao: number` | `Promise<Internacao>` | Leitos, Internacoes | Internacoes | sim |
| `solicitarLeitoEletivo` | `entrada: EntradaSolicitacaoEletiva` | `Promise<SolicitacaoLeito>` | Solicitacoes | Solicitacoes | sim |
| `reservarLeito` | `solicitacaoId: string, leitoId: string, versao: number` | `Promise<SolicitacaoLeito>` | Pacientes, Leitos, Solicitacoes | Leitos, Solicitacoes | sim |
| `cancelarReserva` | `solicitacaoId: string, versao: number` | `Promise<SolicitacaoLeito>` | Leitos, Solicitacoes | Leitos, Solicitacoes | sim |
| `cancelarSolicitacao` | `id: string, motivo: string, versao: number` | `Promise<SolicitacaoLeito>` | — | — | sim |
| `medicosResponsaveis` | `setorId?: string` | `Promise<Medico[]>` | — | — |  |

### `medicos.ts` (15)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `nomeExibicaoMedico` | `m: Pick<Medico, 'tratamento' \| 'nome'>` | `(inferido)` | — | — |  |
| `nomeDepartamento` | `id: string` | `(inferido)` | — | — |  |
| `listarDepartamentos` | — | `Promise<Departamento[]>` | — | — |  |
| `resumirDisponibilidade` | `d: Disponibilidade` | `string` | — | — |  |
| `listarMedicos` | `filtros: FiltrosMedicos` | `Promise<Paginado<MedicoResumo>>` | Consultas, Medicos | — |  |
| `obterMedico` | `id: string` | `Promise<Medico>` | — | — |  |
| `crmDisponivel` | `numero: string, uf: UF, ignorarId?: string` | `Promise<boolean>` | Medicos | — |  |
| `medicoComCrm` | `numero: string, uf: UF, ignorarId?: string` | `Promise<{ id: string; nomeExibicao: string } \| null>` | Medicos | — |  |
| `consultasFuturasDoMedico` | `id: string` | `Promise<Consulta[]>` | — | — |  |
| `consultasAfetadas` | `id: string, nova: Disponibilidade` | `Promise<Consulta[]>` | — | — |  |
| `criarMedico` | `entrada: EntradaMedico` | `Promise<Medico>` | Medicos | Medicos | sim |
| `atualizarMedico` | `id: string, entrada: EntradaMedico, versao: number` | `Promise<{ medico: Medico; consultasForaDoHorario: number }>` | Medicos | Medicos | sim |
| `inativarMedico` | `id: string, motivo?: string` | `Promise<Medico>` | Medicos | Medicos | sim |
| `reativarMedico` | `id: string` | `Promise<Medico>` | Medicos | Medicos | sim |
| `pendenciasDoMedico` | `id: string` | `(inferido)` | — | — |  |

### `migracoes.ts` (1)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `executarMigracoes` | `acesso: AcessoStorage, migracoes: Migracao[], esquemaAtual: number` | `void` | — | — |  |

### `operacoes-comum.ts` (24)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `momentoAtual` | — | `string` | — | — |  |
| `validarCom` | `esquema: E, entrada: unknown` | `z.output<E>` | — | — |  |
| `erroCampo` | `campo: string, mensagem: string` | `(inferido)` | — | — |  |
| `conflito` | `codigo: CodigoConflito, mensagem: string, campo?: string, detalhes?: Record<string, unknown>` | `(inferido)` | — | — |  |
| `conferirVersao` | `atual: { versao: number }, versao: number` | `void` | — | — |  |
| `transicaoInvalida` | `mensagem: string` | `(inferido)` | — | — |  |
| `conferirJanela` | `registradoEm: string, horas: number` | `void` | — | — |  |
| `obterOu` | `item: T \| undefined, mensagem: string` | `T` | — | — |  |
| `pacienteAtivo` | `id: string, campo` | `Paciente` | Pacientes | — |  |
| `medicoAtivo` | `id: string, campo` | `Medico` | Medicos | — |  |
| `medicosAtivosPorDepartamento` | `departamentoId: string` | `Medico[]` | — | — |  |
| `nomePaciente` | `id: string \| undefined` | `string` | Pacientes | — |  |
| `nomeMedico` | `id: string \| undefined` | `string` | Medicos | — |  |
| `idadePaciente` | `p: Paciente \| undefined` | `number \| undefined` | — | — |  |
| `codigoLeito` | `id: string \| undefined` | `string` | Leitos | — |  |
| `tipoHigienizacao` | `precaucao: Precaucao \| undefined` | `TipoHigienizacao` | — | — |  |
| `liberarParaHigienizacao` | `leitoId: string, precaucao?: Precaucao` | `Leito` | Leitos | Leitos |  |
| `atendimentoAberto` | `a: Atendimento` | `(inferido)` | — | — |  |
| `solicitacaoAberta` | `s: SolicitacaoLeito` | `(inferido)` | — | — |  |
| `situacaoDoPaciente` | `pacienteId: string` | `SituacaoHospitalar` | — | — |  |
| `erroSituacao` | `p: Paciente, s: SituacaoHospitalar, quais: { internacao?: boolean; atendimento?: boolean; solicitacao?: boolean }, campo` | `ErroConflito \| null` | — | — |  |
| `cancelarSolicitacaoInterna` | `sol: SolicitacaoLeito, motivo: string, voltarAtendimento: boolean` | `SolicitacaoLeito` | Leitos, Solicitacoes, Atendimentos | Leitos, Solicitacoes, Atendimentos |  |
| `registrarObito` | `pacienteId: string, em: string, referencia: { tipo: 'internacao' \| 'atendimento'; id: string }` | `number` | Pacientes, Consultas, Solicitacoes | Consultas, Pacientes |  |
| `desfazerObito` | `pacienteId: string` | `void` | Pacientes | Pacientes |  |

### `pacientes.ts` (15)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `nomeExibicaoPaciente` | `p: Pick<Paciente, 'nome' \| 'nomeSocial'>` | `(inferido)` | — | — |  |
| `filtrarStatus` | `itens: readonly T[], status: StatusFiltro` | `(inferido)` | — | — |  |
| `consultasFuturasAgendadas` | `filtro: (c: Consulta) => boolean` | `Consulta[]` | — | — |  |
| `listarPacientes` | `filtros: FiltrosPacientes` | `Promise<Paginado<PacienteResumo>>` | Pacientes | — |  |
| `obterPaciente` | `id: string` | `Promise<Paciente>` | — | — |  |
| `cpfDisponivel` | `cpf: string, ignorarId?: string` | `Promise<boolean>` | Pacientes | — |  |
| `pacienteComCpf` | `cpf: string, ignorarId?: string` | `Promise<{ id: string; nomeExibicao: string } \| null>` | Pacientes | — |  |
| `pacienteTemConsultas` | `id: string` | `Promise<boolean>` | Consultas | — |  |
| `consultasFuturasDoPaciente` | `id: string` | `Promise<Consulta[]>` | — | — |  |
| `criarPaciente` | `entrada: EntradaPaciente` | `Promise<Paciente>` | Pacientes | Pacientes | sim |
| `atualizarPaciente` | `id: string, entrada: EntradaPaciente, versao: number` | `Promise<Paciente>` | Pacientes | Pacientes | sim |
| `inativarPaciente` | `id: string, motivo?: string` | `Promise<number>` | Consultas, Pacientes | Consultas, Pacientes | sim |
| `reativarPaciente` | `id: string` | `Promise<Paciente>` | Pacientes | Pacientes | sim |
| `excluirPaciente` | `id: string` | `Promise<void>` | Consultas, Pacientes | Pacientes | sim |
| `pendenciasDoPaciente` | `id: string` | `(inferido)` | — | — |  |

### `painel.ts` (1)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `indicadoresPainel` | — | `Promise<IndicadoresPainel>` | Pacientes | — |  |

### `pendencias-modulos.ts` (3)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `pendenciasPaciente` | `pacienteId: string` | `PendenciaModulo[]` | Internacoes, Atendimentos | — |  |
| `temHistoricoNosModulos` | `pacienteId: string` | `boolean` | Internacoes, Atendimentos, Solicitacoes, Dispensacoes | — |  |
| `pendenciasMedico` | `medicoId: string` | `PendenciaModulo[]` | Internacoes, Pacientes, Atendimentos | — |  |

### `repositorio.ts` (10)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `usoArmazenamento` | — | `number` | — | — |  |
| `transacao` | `fn: () => R` | `R` | — | — |  |
| `criarRepositorio` | `nome: string, semear: () => T[]` | `Repositorio<T>` | — | — |  |
| `assinar` | `ouvinte: Ouvinte` | `() => void` | — | — |  |
| `assinarAvisos` | `ouvinte: OuvinteAviso` | `() => void` | — | — |  |
| `resetar` | — | `void` | — | — |  |
| `aoResetar` | `fn: () => void` | `() => void` | — | — |  |
| `lerMeta` | `campo: string` | `T \| undefined` | — | — |  |
| `gravarMeta` | `campo: string, valor: unknown` | `void` | — | — |  |
| `descarregarMemoria` | — | `void` | — | — |  |

### `retencao.ts` (1)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `executarRetencao` | `opcoes: { forcar?: boolean }` | `ResultadoRetencao \| null` | Internacoes, Atendimentos, Solicitacoes, Dispensacoes, Movimentacoes, Lotes, Medicamentos | Internacoes, Atendimentos, Solicitacoes, Dispensacoes, Lotes, Movimentacoes | sim |

### `situacao-hospitalar.ts` (6)

| Função | Entrada | Saída | Coleções usadas | Gravadas | Transação |
|---|---|---|---|---|:---:|
| `situacaoHospitalar` | `pacienteId: string` | `Promise<SituacaoResumida>` | — | — |  |
| `situacoesHospitalares` | — | `Promise<Record<string, SituacaoResumida>>` | Internacoes, Atendimentos | — |  |
| `etiquetaSituacao` | `s: SituacaoResumida` | `string \| undefined` | — | — |  |
| `etiquetasHospitalares` | — | `Promise<Record<string, string>>` | — | — |  |
| `historicoHospitalar` | `pacienteId: string` | `Promise<HistoricoHospitalar>` | Internacoes, Leitos | — |  |
| `vinculosDoMedico` | `medicoId: string` | `Promise<VinculosMedico>` | Leitos | — |  |

