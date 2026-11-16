import type { Leito } from '../types';
import {
  avaliarLeitos,
  motivosIncompatibilidade,
  perfilDoPaciente,
} from '../utils/compatibilidade-leito';

const leito = (codigo: string, extra: Partial<Leito> = {}): Leito => ({
  id: codigo,
  codigo,
  setorId: 'enfermaria',
  perfil: 'adulto',
  isolamento: false,
  status: 'livre',
  desde: '2026-11-10T10:00:00Z',
  criadoEm: '',
  atualizadoEm: '',
  versao: 1,
  ...extra,
});

describe('A11 — compatibilidade de leito', () => {
  it('R-L5: 17 anos é pediátrico, 18 é adulto', () => {
    expect(perfilDoPaciente(17)).toBe('pediatrico');
    expect(perfilDoPaciente(18)).toBe('adulto');
  });

  it('informa cada motivo de incompatibilidade', () => {
    const l = leito('UTI-01', { setorId: 'uti', status: 'ocupado', perfil: 'pediatrico' });
    expect(
      motivosIncompatibilidade(l, {
        perfil: 'adulto',
        precaucao: 'contato',
        setorDesejado: 'enfermaria',
      }),
    ).toEqual(['situacao', 'perfil', 'isolamento', 'setor']);
  });

  it('reservado só serve para a mesma solicitação (R-L2)', () => {
    const l = leito('ENF-101A', { status: 'reservado', solicitacaoId: 's1' });
    expect(motivosIncompatibilidade(l, { perfil: 'adulto', precaucao: 'padrao' })).toEqual([
      'situacao',
    ]);
    expect(
      motivosIncompatibilidade(l, { perfil: 'adulto', precaucao: 'padrao', solicitacaoId: 's1' }),
    ).toEqual([]);
  });

  it('precaução de contato sem leito de isolamento: nenhum compatível', () => {
    const r = avaliarLeitos([leito('ENF-101A'), leito('ENF-102A')], {
      perfil: 'adulto',
      precaucao: 'contato',
    });
    expect(r.every((x) => !x.compativel && x.motivos.includes('isolamento'))).toBe(true);
    expect(r.some((x) => x.sugerido)).toBe(false);
  });

  it('precaução padrão prefere leito sem isolamento (guarda os de isolamento)', () => {
    const r = avaliarLeitos([leito('ENF-101A', { isolamento: true }), leito('ENF-102A')], {
      perfil: 'adulto',
      precaucao: 'padrao',
    });
    expect(r[0]).toMatchObject({ sugerido: true, leito: { codigo: 'ENF-102A' } });
  });

  it('prefere o quarto em que o outro leito também está livre', () => {
    const r = avaliarLeitos(
      [
        leito('ENF-101A', { quarto: '101' }),
        leito('ENF-101B', { quarto: '101', status: 'ocupado' }),
        leito('ENF-102A', { quarto: '102' }),
        leito('ENF-102B', { quarto: '102' }),
      ],
      { perfil: 'adulto', precaucao: 'padrao' },
    );
    expect(r[0].leito.codigo).toBe('ENF-102A');
    expect(r.map((x) => x.leito.codigo)).toEqual(['ENF-102A', 'ENF-101A', 'ENF-102B', 'ENF-101B']);
  });

  it('o reservado para a mesma solicitação vem sugerido; setor desejado filtra', () => {
    const r = avaliarLeitos(
      [
        leito('UTI-01', { setorId: 'uti' }),
        leito('UTI-07', { setorId: 'uti', status: 'reservado', solicitacaoId: 's1' }),
        leito('ENF-101A'),
      ],
      { perfil: 'adulto', precaucao: 'padrao', setorDesejado: 'uti', solicitacaoId: 's1' },
    );
    expect(r[0]).toMatchObject({ sugerido: true, leito: { codigo: 'UTI-07' } });
    expect(r.find((x) => x.leito.codigo === 'ENF-101A')).toMatchObject({
      compativel: false,
      motivos: ['setor'],
    });
  });
});
