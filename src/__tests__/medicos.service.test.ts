import { listarAtividades } from '../services/atividades';
import { repoConsultas, repoMedicos } from '../services/colecoes';
import { agendarConsulta, cancelarConsulta, horariosLivres } from '../services/consultas';
import { ErroConcorrencia } from '../services/erros';
import {
  atualizarMedico,
  consultasAfetadas,
  crmDisponivel,
  criarMedico,
  inativarMedico,
  listarMedicos,
  obterMedico,
  reativarMedico,
} from '../services/medicos';
import type { EntradaMedico } from '../schemas/medico';
import type { Disponibilidade } from '../types';
import { erroDe, prepararServicos } from './utils/servicos';

prepararServicos('2026-11-09T08:00:00-03:00'); // segunda-feira

const entrada = (extra: Partial<EntradaMedico> = {}): EntradaMedico => ({
  nome: 'Clara Antunes',
  tratamento: 'Dra.',
  crm: { numero: '123456', uf: 'SP' },
  departamentoId: 'pediatria',
  telefone: '(11) 3333-4444',
  email: 'Clara.Antunes@Exemplo.com',
  disponibilidade: {
    diasSemana: [5, 1, 3, 1],
    inicio: '08:00',
    fim: '12:00',
    duracaoPadraoMin: 30,
  },
  ...extra,
});

/** Disponibilidade do Dr. Paulo Mendes sem as sextas. */
const paulo = () => repoMedicos.obter('med-paulo-mendes')!;
const pauloSemSexta = (): Disponibilidade => ({
  ...paulo().disponibilidade,
  diasSemana: [1, 2, 3, 4],
});
const entradaPaulo = (disp = pauloSemSexta()): EntradaMedico => {
  const { nome, tratamento, crm, departamentoId, telefone, email } = paulo();
  return {
    nome,
    tratamento,
    crm,
    departamentoId,
    telefone,
    email,
    disponibilidade: { ...disp, diasSemana: [...disp.diasSemana] },
  };
};

const agendarSexta = () =>
  agendarConsulta({
    pacienteId: 'pac-ana-silva',
    medicoId: 'med-paulo-mendes',
    data: '2026-11-20', // sexta, além dos dados de exemplo (±7 dias)
    hora: '09:00',
    duracaoMin: 30,
    tipo: 'retorno',
  });

describe('P6 — cadastrar médico', () => {
  it('normaliza, ordena os dias e registra a atividade', async () => {
    const m = await criarMedico(entrada());
    expect(m).toMatchObject({
      email: 'clara.antunes@exemplo.com',
      telefone: '1133334444',
      versao: 1,
    });
    expect(m.disponibilidade.diasSemana).toEqual([1, 3, 5]);
    expect(await obterMedico(m.id)).toEqual(m);
    expect((await listarAtividades({ limite: 1 }))[0].descricao).toBe(
      'Dra. Clara Antunes entrou na equipe de Pediatria',
    );
  });

  it('R-M1: CRM (número + UF) único', async () => {
    const { numero } = paulo().crm;
    expect(await crmDisponivel(numero, 'SP')).toBe(false);
    expect(await crmDisponivel(numero, 'RJ')).toBe(true);
    const erro = await erroDe(criarMedico(entrada({ crm: { numero, uf: 'SP' } })));
    expect(erro).toMatchObject({ codigo: 'crm_duplicado', campo: 'crm.numero' });
    await expect(criarMedico(entrada({ crm: { numero, uf: 'RJ' } }))).resolves.toBeTruthy();
  });

  it('R-M1: e-mail único', async () => {
    const erro = await erroDe(criarMedico(entrada({ email: 'PAULO.mendes@medicore.example' })));
    expect(erro).toMatchObject({ codigo: 'email_duplicado', campo: 'email' });
  });

  it('R-M4: pausa fora do expediente é recusada', async () => {
    const disp = {
      diasSemana: [1],
      inicio: '08:00',
      fim: '12:00',
      pausa: { inicio: '11:30', fim: '12:30' },
      duracaoPadraoMin: 30,
    };
    const erro = await erroDe(criarMedico(entrada({ disponibilidade: disp })));
    expect(erro.name).toBe('ErroValidacao');
  });
});

describe('P7 — editar médico', () => {
  it('R-M3 / A3: informa as consultas afetadas sem alterá-las', async () => {
    const consulta = await agendarSexta();
    const afetadas = await consultasAfetadas('med-paulo-mendes', pauloSemSexta());
    expect(afetadas.map((c) => c.id)).toContain(consulta.id);
    // Só as de sexta (as outras dos dados de exemplo continuam cabendo).
    expect(afetadas.every((c) => new Date(c.inicio).getUTCDay() === 5)).toBe(true);
    const { medico, consultasForaDoHorario } = await atualizarMedico(
      'med-paulo-mendes',
      entradaPaulo(),
      1,
    );
    expect(consultasForaDoHorario).toBe(afetadas.length);
    expect(medico.versao).toBe(2);
    expect(repoConsultas.obter(consulta.id)?.status).toBe('agendada');
  });

  it('pode remover a pausa', async () => {
    const { pausa: _, ...semPausa } = pauloSemSexta();
    const { medico } = await atualizarMedico('med-paulo-mendes', entradaPaulo(semPausa), 1);
    expect(medico.disponibilidade.pausa).toBeUndefined();
  });

  it('R-G1: versão desatualizada', async () => {
    await atualizarMedico('med-paulo-mendes', entradaPaulo(), 1);
    expect(await erroDe(atualizarMedico('med-paulo-mendes', entradaPaulo(), 1))).toBeInstanceOf(
      ErroConcorrencia,
    );
  });
});

describe('P8 — inativar médico', () => {
  it('R-M2: bloqueia enquanto houver consultas futuras e libera depois', async () => {
    const consulta = await agendarSexta();
    const erro = await erroDe(inativarMedico('med-paulo-mendes'));
    expect(erro).toMatchObject({ codigo: 'consultas_futuras' });
    expect((erro.detalhes as { consultas: string[] }).consultas).toContain(consulta.id);

    // Cancela todas as futuras (inclusive as dos dados de exemplo).
    for (const c of repoConsultas.todos()) {
      if (
        c.medicoId === 'med-paulo-mendes' &&
        c.status === 'agendada' &&
        new Date(c.inicio) >= new Date()
      )
        await cancelarConsulta(c.id, 'Médico de férias', c.versao);
    }
    const inativo = await inativarMedico('med-paulo-mendes', 'Férias longas');
    expect(inativo).toMatchObject({ ativo: false, motivoInativacao: 'Férias longas' });
    expect((await listarMedicos()).itens.some((m) => m.id === 'med-paulo-mendes')).toBe(false);
    expect(await erroDe(agendarSexta())).toMatchObject({
      codigo: 'medico_inativo',
      campo: 'medicoId',
    });

    expect((await reativarMedico('med-paulo-mendes')).ativo).toBe(true);
  });
});

describe('listarMedicos', () => {
  it('resume os dias e filtra por departamento', async () => {
    const { itens, total } = await listarMedicos();
    expect(total).toBe(7);
    const porId = Object.fromEntries(itens.map((m) => [m.id, m]));
    expect(porId['med-paulo-mendes'].diasResumo).toBe('Seg a Sex · 08:00–17:00');
    expect(porId['med-fernanda-lima'].diasResumo).toBe('Seg a Qui · 09:00–18:00');
    expect(porId['med-paulo-mendes'].crmFormatado).toMatch(/^\d{6}\/SP$/);
    expect(porId['med-paulo-mendes'].nomeExibicao).toBe('Dr. Paulo Mendes');

    const cardio = await listarMedicos({ departamentoId: 'cardiologia' });
    expect(cardio.itens.map((m) => m.nomeExibicao)).toEqual([
      'Dr. Paulo Mendes',
      'Dr. Rafael Costa',
    ]);
    expect((await listarMedicos({ status: 'todos' })).total).toBe(8);
  });

  it('busca pelo número do CRM e conta as consultas de hoje', async () => {
    const antes = (await listarMedicos({ busca: 'gustavo' })).itens[0].consultasHoje;
    const livre = (
      await horariosLivres('med-gustavo-martins', '2026-11-09', 30, 'pac-beatriz-lima')
    ).find((h) => h.livre)!;
    await agendarConsulta({
      pacienteId: 'pac-beatriz-lima',
      medicoId: 'med-gustavo-martins',
      data: '2026-11-09',
      hora: livre.hora,
      duracaoMin: 30,
      tipo: 'retorno',
    });
    const { itens } = await listarMedicos({ busca: paulo().crm.numero });
    expect(itens.map((m) => m.id)).toEqual(['med-paulo-mendes']);
    const gustavo = (await listarMedicos({ busca: 'gustavo' })).itens[0];
    expect(gustavo.consultasHoje).toBe(antes + 1);
  });
});
