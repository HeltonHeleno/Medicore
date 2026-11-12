import { esquemaMedicamento } from '../schemas/farmacia';
import { esquemaSinais } from '../schemas/emergencia';
import { MODELOS_PACIENTES } from '../data/seeds/pacientes';
import { QUANTIDADE_EXTRAS } from '../data/seeds/pacientes-extras';
import { repoMedicos, repoPacientes } from '../services/colecoes';
import {
  garantirSemeadura,
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoLotes,
  repoMedicamentos,
  repoSolicitacoes,
  retratoAtual,
} from '../services/colecoes-operacoes';
import { obterIndicadoresOperacionais } from '../services/indicadores-operacionais';
import { descarregarMemoria, resetar, usoArmazenamento } from '../services/repositorio';
import { verificarConsistencia } from '../utils/consistencia';
import { dataDoInstante, idade } from '../utils/datas';
import { prepararOperacoes } from './utils/operacoes';

prepararOperacoes('2026-11-10T10:30:00-03:00');

describe('dados de exemplo dos módulos (D13, A16)', () => {
  it('nascem coerentes: nenhuma violação das invariantes', () => {
    expect(verificarConsistencia(retratoAtual(), Date.now())).toEqual([]);
  });

  it('130 leitos com a distribuição da especificação', () => {
    const leitos = repoLeitos.todos();
    const conta = (f: (l: (typeof leitos)[number]) => boolean) => leitos.filter(f).length;
    expect(leitos).toHaveLength(130);
    expect(conta((l) => l.setorId === 'uti')).toBe(30);
    expect(conta((l) => l.setorId === 'uti' && l.perfil === 'pediatrico')).toBe(4);
    expect(conta((l) => l.setorId === 'enfermaria')).toBe(70);
    expect(conta((l) => l.setorId === 'enfermaria' && l.perfil === 'pediatrico')).toBe(10);
    expect(conta((l) => l.setorId === 'apartamento')).toBe(20);
    expect(conta((l) => l.setorId === 'observacao')).toBe(10);
    expect(conta((l) => l.isolamento)).toBe(4 + 6 + 2 + 1);
    expect(new Set(leitos.map((l) => l.codigo)).size).toBe(130);
  });

  it('internações coerentes com o leito (perfil e isolamento) e responsáveis ativos', () => {
    const leitos = new Map(repoLeitos.todos().map((l) => [l.id, l]));
    const pacientes = new Map(repoPacientes.todos().map((p) => [p.id, p]));
    for (const i of repoInternacoes.todos().filter((x) => x.status === 'ativa')) {
      const l = leitos.get(i.leitoId)!;
      const anos = idade(pacientes.get(i.pacienteId)!.dataNascimento);
      expect(l.perfil, i.id).toBe(anos < 18 ? 'pediatrico' : 'adulto');
      if (i.precaucao !== 'padrao') expect(l.isolamento).toBe(true);
      expect(repoMedicos.obter(i.medicoResponsavelId)?.ativo).toBe(true);
      if (i.origem === 'transferencia_externa') expect(i.hospitalOrigem).toBeTruthy();
    }
  });

  it('atendimentos: 13 abertos em todos os status, sinais válidos, números únicos por dia', () => {
    const abertos = repoAtendimentos.todos().filter((a) => a.status !== 'encerrado');
    expect(abertos).toHaveLength(13);
    expect(new Set(abertos.map((a) => a.status))).toEqual(
      new Set([
        'aguardando_triagem',
        'aguardando_atendimento',
        'em_atendimento',
        'em_observacao',
        'aguardando_leito',
      ]),
    );
    for (const a of repoAtendimentos.todos()) {
      for (const t of a.triagens)
        expect(esquemaSinais.safeParse(t.sinais).success, a.numero).toBe(true);
    }
    const chaves = repoAtendimentos
      .todos()
      .map((a) => `${dataDoInstante(a.chegadaEm)}-${a.numero}`);
    expect(new Set(chaves).size).toBe(chaves.length);
    expect(repoSolicitacoes.todos().filter((s) => s.status === 'reservada')).toHaveLength(1);
    expect(repoSolicitacoes.todos().filter((s) => s.status === 'pendente')).toHaveLength(2);
  });

  it('farmácia: 45 medicamentos válidos, 4 controlados; indicadores do Painel atual', async () => {
    const meds = repoMedicamentos.todos();
    expect(meds).toHaveLength(45);
    expect(meds.filter((m) => m.controlado)).toHaveLength(4);
    for (const m of meds) {
      const r = esquemaMedicamento.safeParse({ ...m, controlado: m.controlado?.lista });
      expect(r.success, m.id).toBe(true);
    }
    expect(repoLotes.todos().length).toBeGreaterThanOrEqual(90);
    const { leitos, estoque } = await obterIndicadoresOperacionais();
    expect(leitos.percentual).toBe(72);
    expect(estoque.baixo).toBe(3);
  });

  it('M31: primeira semeadura em menos de 300 ms e armazenamento perto de 1 MB', () => {
    resetar();
    for (const r of [repoPacientes, repoMedicos]) r.todos();
    const inicio = performance.now();
    garantirSemeadura();
    const ms = performance.now() - inicio;
    expect(ms).toBeLessThan(300);
    expect(usoArmazenamento()).toBeLessThan(1.2 * 1024 * 1024);
  });

  it('RS-15: sobre uma instalação 1.1.0 modificada (migração v2 + pacientes do usuário)', () => {
    resetar();
    // Instalação 1.1.0: só os 30 pacientes da D6, alguns alterados, um excluído e um médico inativado.
    const base = repoPacientes.todos().filter((p) => MODELOS_PACIENTES.some(([id]) => id === p.id));
    const alterados = base
      .filter((p) => p.id !== 'pac-camila-souza')
      .map((p) => (p.id === 'pac-lucas-ferreira' ? { ...p, nome: 'Lucas Ferreira Alterado' } : p));
    const medicos = repoMedicos
      .todos()
      .map((m) => (m.id === 'med-helena-duarte' ? { ...m, ativo: false } : m));
    localStorage.clear();
    localStorage.setItem(
      'medicore:meta',
      JSON.stringify({ esquema: 1, semeadoEm: '2026-10-28T10:00:00.000Z' }),
    );
    localStorage.setItem('medicore:pacientes:v1', JSON.stringify(alterados));
    localStorage.setItem('medicore:medicos:v1', JSON.stringify(medicos));
    descarregarMemoria();

    // 21.4.3 (M31): migração v2 + semeadura dos módulos sobre a 1.1.0 em menos de 300 ms.
    const inicio = performance.now();
    const pacientes = repoPacientes.todos();
    garantirSemeadura();
    expect(performance.now() - inicio).toBeLessThan(300);
    expect(pacientes).toHaveLength(29 + QUANTIDADE_EXTRAS);
    expect(pacientes.find((p) => p.id === 'pac-lucas-ferreira')?.nome).toBe(
      'Lucas Ferreira Alterado',
    );
    expect(new Set(pacientes.map((p) => p.cpf)).size).toBe(pacientes.length);
    expect(JSON.parse(localStorage.getItem('medicore:meta')!).esquema).toBe(2);

    const r = retratoAtual();
    expect(verificarConsistencia(r, Date.now())).toEqual([]);
    const ids = new Set(pacientes.map((p) => p.id));
    expect(r.internacoes.every((i) => ids.has(i.pacienteId))).toBe(true);
    expect(r.internacoes.some((i) => i.pacienteId === 'pac-camila-souza')).toBe(false);
    expect(r.internacoes.every((i) => i.medicoResponsavelId !== 'med-helena-duarte')).toBe(true);
  });
});
