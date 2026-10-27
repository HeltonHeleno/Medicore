import { repoAtividades, repoConsultas } from '../services/colecoes';
import { agendarConsulta, concluirConsulta } from '../services/consultas';
import { ErroConcorrencia, ErroConflito, ErroValidacao } from '../services/erros';
import {
  atualizarPaciente,
  cpfDisponivel,
  criarPaciente,
  excluirPaciente,
  inativarPaciente,
  listarPacientes,
  obterPaciente,
  reativarPaciente,
} from '../services/pacientes';
import type { EntradaPaciente } from '../schemas/paciente';
import { ajustarRelogio, erroDe, prepararServicos } from './utils/servicos';

prepararServicos('2026-11-09T08:00:00-03:00'); // segunda-feira

const entrada = (extra: Partial<EntradaPaciente> = {}): EntradaPaciente => ({
  nome: '  Teste   da Silva ',
  cpf: '529.982.247-25',
  dataNascimento: '1990-01-01',
  sexo: 'feminino',
  telefone: '(11) 98765-4321',
  convenio: { tipo: 'particular' },
  consentimentoLgpd: true,
  ...extra,
});

describe('P1 — cadastrar paciente', () => {
  it('normaliza (R-G2), grava e registra a atividade', async () => {
    expect(await cpfDisponivel('52998224725')).toBe(true);
    const p = await criarPaciente(entrada({ alergias: 'Iodo' }));
    expect(p).toMatchObject({
      nome: 'Teste da Silva',
      cpf: '52998224725',
      telefone: '11987654321',
    });
    expect(p).toMatchObject({ versao: 1, ativo: true, consentimentoLgpd: { aceito: true } });
    expect(await obterPaciente(p.id)).toEqual(p);
    expect(await cpfDisponivel('52998224725')).toBe(false);
    expect(await cpfDisponivel('52998224725', p.id)).toBe(true);
    expect(repoAtividades.todos()).toEqual([
      expect.objectContaining({ tipo: 'paciente_cadastrado', referenciaId: p.id }),
    ]);
  });

  it('R-P1: CPF duplicado vai para o campo, com o id do cadastro existente', async () => {
    const p = await criarPaciente(entrada());
    const erro = await erroDe(criarPaciente(entrada({ nome: 'Outra Pessoa' })));
    expect(erro).toBeInstanceOf(ErroConflito);
    expect(erro).toMatchObject({ codigo: 'cpf_duplicado', campo: 'cpf', detalhes: { id: p.id } });
  });

  it('R-P5: menor sem responsável não passa', async () => {
    const erro = await erroDe(criarPaciente(entrada({ dataNascimento: '2015-05-05' })));
    expect(erro).toBeInstanceOf(ErroValidacao);
    expect((erro as unknown as ErroValidacao).campos).toHaveProperty('responsavel');
  });
});

describe('P2 — editar paciente', () => {
  it('incrementa a versão e apaga o campo opcional esvaziado', async () => {
    const p = await criarPaciente(entrada({ alergias: 'Iodo' }));
    const editado = await atualizarPaciente(p.id, entrada({ alergias: '' }), 1);
    expect(editado.versao).toBe(2);
    expect(editado.alergias).toBeUndefined();
    expect(editado.consentimentoLgpd).toEqual(p.consentimentoLgpd);
  });

  it('R-P1 ignora o próprio cadastro, mas não o dos outros', async () => {
    const p = await criarPaciente(entrada());
    await expect(atualizarPaciente(p.id, entrada(), 1)).resolves.toBeTruthy();
    const outro = await criarPaciente(entrada({ cpf: '111.444.777-35' }));
    const erro = await erroDe(atualizarPaciente(outro.id, entrada(), 1));
    expect(erro).toMatchObject({ codigo: 'cpf_duplicado' });
  });

  it('R-G1: versão desatualizada não grava', async () => {
    const p = await criarPaciente(entrada());
    await atualizarPaciente(p.id, entrada({ nome: 'Nome Novo' }), 1);
    expect(
      await erroDe(atualizarPaciente(p.id, entrada({ nome: 'Outro Nome' }), 1)),
    ).toBeInstanceOf(ErroConcorrencia);
    expect((await obterPaciente(p.id)).nome).toBe('Nome Novo');
  });
});

describe('P3/P4 — inativar e reativar', () => {
  it('R-P2: cancela só as consultas futuras agendadas, na mesma transação', async () => {
    const p = await criarPaciente(entrada());
    const base = {
      pacienteId: p.id,
      medicoId: 'med-paulo-mendes',
      duracaoMin: 30,
      tipo: 'retorno' as const,
    };
    const passada = await agendarConsulta({ ...base, data: '2026-11-23', hora: '09:00' });
    const futura = await agendarConsulta({ ...base, data: '2026-11-24', hora: '09:00' });
    ajustarRelogio('2026-11-23T10:00:00-03:00'); // depois dos dados de exemplo (±7 dias)
    await concluirConsulta(passada.id);

    expect(await inativarPaciente(p.id, 'Mudou de cidade')).toBe(1);

    expect(repoConsultas.obter(passada.id)?.status).toBe('concluida');
    const cancelada = repoConsultas.obter(futura.id)!;
    expect(cancelada).toMatchObject({
      status: 'cancelada',
      motivoCancelamento: 'Paciente inativado',
    });
    expect(cancelada.eventos.at(-1)).toMatchObject({ tipo: 'cancelada' });
    expect(await obterPaciente(p.id)).toMatchObject({
      ativo: false,
      motivoInativacao: 'Mudou de cidade',
    });
    expect(repoAtividades.todos().some((a) => a.tipo === 'paciente_inativado')).toBe(true);
  });

  it('R-G3: inativo sai da lista padrão e volta ao reativar', async () => {
    const p = await criarPaciente(entrada());
    await inativarPaciente(p.id);
    expect((await listarPacientes({ busca: 'Teste' })).total).toBe(0);
    expect((await listarPacientes({ busca: 'Teste', status: 'inativos' })).total).toBe(1);
    const reativado = await reativarPaciente(p.id);
    expect(reativado.ativo).toBe(true);
    expect(reativado.inativadoEm).toBeUndefined();
    expect((await listarPacientes({ busca: 'Teste' })).total).toBe(1);
  });
});

describe('P5 — excluir', () => {
  it('R-P3: bloqueia quem tem qualquer consulta', async () => {
    const erro = await erroDe(excluirPaciente('pac-joao-pereira'));
    expect(erro).toMatchObject({ codigo: 'tem_historico' });
    expect(await obterPaciente('pac-joao-pereira')).toBeTruthy();
  });

  it('exclui quem nunca teve consulta', async () => {
    const p = await criarPaciente(entrada());
    await excluirPaciente(p.id);
    expect(await erroDe(obterPaciente(p.id))).toMatchObject({ name: 'ErroNaoEncontrado' });
  });
});

describe('listarPacientes', () => {
  it('R-P6 e R-P4: nome social na lista, CPF mascarado; busca pelo nome social', async () => {
    const { itens } = await listarPacientes({ busca: 'rafaela' });
    expect(itens).toHaveLength(1);
    expect(itens[0].nomeExibicao).toBe('Rafaela Martins');
    expect(itens[0].cpfMascarado).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
  });

  it('pagina e ordena (padrão: só ativos, por nome)', async () => {
    const pagina1 = await listarPacientes();
    expect(pagina1.total).toBe(27);
    expect(pagina1.itens).toHaveLength(10);
    expect(pagina1.itens[0].nomeExibicao).toBe('Aline Carvalho');
    expect((await listarPacientes({ pagina: 3 })).itens).toHaveLength(7);
    const porIdade = await listarPacientes({ ordenarPor: 'idade', ordem: 'desc' });
    expect(porIdade.itens[0].nomeExibicao).toBe('Antônio Batista');
  });

  it('mostra a próxima consulta agendada', async () => {
    const p = await criarPaciente(entrada());
    const c = await agendarConsulta({
      pacienteId: p.id,
      medicoId: 'med-paulo-mendes',
      data: '2026-11-25',
      hora: '14:00',
      duracaoMin: 30,
      tipo: 'primeira_vez',
    });
    const { itens } = await listarPacientes({ busca: '529.982' });
    expect(itens[0].proximaConsulta).toBe(c.inicio);
  });
});
