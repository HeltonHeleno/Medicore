import { MAX_ATIVIDADES } from '../config/limites';
import { listarAtividades, registrarAtividade } from '../services/atividades';
import { repoAtividades } from '../services/colecoes';
import { transacao } from '../services/repositorio';
import { ajustarRelogio, prepararServicos } from './utils/servicos';

prepararServicos('2026-11-09T08:00:00-03:00');

describe('atividades', () => {
  it('mantém só as 200 mais recentes', () => {
    transacao(() => {
      for (let i = 0; i < MAX_ATIVIDADES + 5; i++) {
        ajustarRelogio(new Date(Date.UTC(2026, 10, 9, 11, i)).toISOString());
        registrarAtividade('paciente_cadastrado', `Atividade ${i}`);
      }
    });
    const todas = repoAtividades.todos();
    expect(todas).toHaveLength(MAX_ATIVIDADES);
    expect(todas.some((a) => a.descricao === 'Atividade 4')).toBe(false);
    expect(todas.some((a) => a.descricao === 'Atividade 5')).toBe(true);
  });

  it('lista da mais recente para a mais antiga, com limite', async () => {
    for (let i = 0; i < 6; i++) {
      ajustarRelogio(new Date(Date.UTC(2026, 10, 9, 11, i)).toISOString());
      registrarAtividade('medico_cadastrado', `A${i}`, `ref-${i}`);
    }
    const ultimas = await listarAtividades({ limite: 4 });
    expect(ultimas.map((a) => a.descricao)).toEqual(['A5', 'A4', 'A3', 'A2']);
    expect(ultimas[0].referenciaId).toBe('ref-5');
  });

  it('é desfeita junto com a operação que falhou', () => {
    expect(() =>
      transacao(() => {
        registrarAtividade('paciente_cadastrado', 'não deve ficar');
        throw new Error('falhou');
      }),
    ).toThrow('falhou');
    expect(repoAtividades.todos()).toHaveLength(0);
  });
});
