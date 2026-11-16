/**
 * Porte de `apps/web/src/__tests__/atividades.test.ts` (25.T.1, R-X6).
 * Diferença: o limite de 200 atividades era do navegador (D15) e não existe no banco; a guarda
 * passa a ser da retenção (A15, Fase 26). O teste do limite foi trocado por "não perde nenhuma".
 */
import { ajustarRelogio, usarApi } from '../apoio/cliente';
import { registrarAtividade } from '../../src/servicos/atividades';
import { emTransacao } from '../../src/servicos/comum';

const { cliente, ler, api } = usarApi('2026-11-09T08:00:00-03:00');
const { listarAtividades } = cliente;

describe('atividades', () => {
  it('não perde nenhuma (sem o limite de 200 do navegador)', async () => {
    const antes = (await ler.atividades()).length;
    await emTransacao(api().banco.app, async (tx) => {
      for (let i = 0; i < 205; i++) {
        ajustarRelogio(new Date(Date.UTC(2026, 10, 9, 11, i)).toISOString());
        await registrarAtividade(tx, 'paciente_cadastrado', `Atividade ${i}`);
      }
    });
    const todas = await ler.atividades();
    expect(todas).toHaveLength(antes + 205);
    expect(todas.some((a) => a.descricao === 'Atividade 4')).toBe(true);
  });

  it('lista da mais recente para a mais antiga, com limite', async () => {
    for (let i = 0; i < 6; i++) {
      ajustarRelogio(new Date(Date.UTC(2026, 10, 9, 11, i)).toISOString());
      await emTransacao(api().banco.app, (tx) =>
        registrarAtividade(tx, 'medico_cadastrado', `A${i}`, `ref-${i}`),
      );
    }
    const ultimas = await listarAtividades({ limite: 4 });
    expect(ultimas.map((a) => a.descricao)).toEqual(['A5', 'A4', 'A3', 'A2']);
    expect(ultimas[0]!.referenciaId).toBe('ref-5');
  });

  it('é desfeita junto com a operação que falhou', async () => {
    const antes = (await ler.atividades()).length;
    await expect(
      emTransacao(api().banco.app, async (tx) => {
        await registrarAtividade(tx, 'paciente_cadastrado', 'não deve ficar');
        throw new Error('falhou');
      }),
    ).rejects.toThrow('falhou');
    expect(await ler.atividades()).toHaveLength(antes);
  });

  it('os dados de exemplo trazem o histórico das consultas, já ocorrido e sem duplicatas', async () => {
    const todas = await ler.atividades();
    expect(todas.length).toBeGreaterThan(4);
    expect(new Set(todas.map((a) => a.id)).size).toBe(todas.length);
    expect(todas.every((a) => a.em < '2026-11-09T11:00:00.000Z')).toBe(true);
    const ultimas = await listarAtividades({ limite: 4 });
    expect(ultimas.map((a) => a.em)).toEqual([...ultimas.map((a) => a.em)].sort().reverse());
    for (const a of todas) {
      const consulta = (await ler.consulta(a.referenciaId!))!;
      const paciente = (await ler.paciente(consulta.pacienteId))!;
      expect(a.descricao).toContain(paciente.nomeSocial || paciente.nome);
    }
  });

  it('uma operação que falha na API não deixa atividade (R-X6)', async () => {
    const antes = (await ler.atividades()).length;
    await expect(cliente.excluirPaciente('pac-joao-pereira')).rejects.toMatchObject({
      codigo: 'tem_historico',
    });
    expect(await ler.atividades()).toHaveLength(antes);
  });
});
