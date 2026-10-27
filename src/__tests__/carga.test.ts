/**
 * 14.5.2 — Teste de carga local: 1.000 pacientes e 3.000 consultas.
 * Metas: busca respondendo em menos de 100 ms e uso do armazenamento abaixo de 80% do limite.
 */
import { ALERTA_ARMAZENAMENTO, LIMITE_ARMAZENAMENTO_BYTES } from '../config/limites';
import {
  criarAleatorio,
  gerarCelular,
  gerarCpfValido,
  sortear,
  unicos,
} from '../data/seeds/gerador';
import { repoConsultas, repoMedicos, repoPacientes } from '../services/colecoes';
import { horariosLivres, listarConsultas } from '../services/consultas';
import { listarPacientes } from '../services/pacientes';
import { descarregarMemoria, transacao, usoArmazenamento } from '../services/repositorio';
import type { Consulta, Paciente } from '../types';
import { prepararServicos } from './utils/servicos';

prepararServicos('2026-11-09T08:00:00-03:00');

const PACIENTES = 1000;
const CONSULTAS = 3000;
const META_MS = 100;

const NOMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elisa',
  'Fábio',
  'Gabriela',
  'Heitor',
  'Íris',
  'João',
  'Larissa',
  'Marcos',
  'Natália',
  'Otávio',
  'Paula',
  'Rafael',
  'Sílvia',
  'Tiago',
  'Vera',
  'Wagner',
];
const SOBRENOMES = [
  'Silva',
  'Souza',
  'Oliveira',
  'Santos',
  'Pereira',
  'Costa',
  'Rodrigues',
  'Almeida',
  'Nascimento',
  'Lima',
  'Araújo',
  'Fernandes',
  'Carvalho',
  'Gomes',
  'Martins',
  'Rocha',
  'Ribeiro',
  'Barros',
  'Freitas',
  'Moura',
];

function gerarCarga() {
  const rand = criarAleatorio(7);
  const cpf = unicos(() => gerarCpfValido(rand));
  const momento = new Date().toISOString();
  const base = repoPacientes.obter('pac-ana-silva')!;
  const pacientes: Paciente[] = Array.from({ length: PACIENTES }, (_, i) => ({
    ...base,
    id: `pac-carga-${i}`,
    nome: `${sortear(rand, NOMES)} ${sortear(rand, SOBRENOMES)} ${sortear(rand, SOBRENOMES)}`,
    nomeSocial: undefined,
    cpf: cpf(),
    telefone: gerarCelular(rand),
    dataNascimento: `19${50 + (i % 50)}-0${1 + (i % 9)}-1${i % 10}`,
    criadoEm: momento,
    atualizadoEm: momento,
  }));

  const medicos = repoMedicos.todos().filter((m) => m.ativo);
  const modelo = repoConsultas.todos()[0];
  const consultas: Consulta[] = Array.from({ length: CONSULTAS }, (_, i) => {
    const medico = medicos[i % medicos.length];
    // 3.000 consultas espalhadas em ~150 dias úteis, 30 min cada, sem sobreposição por médico.
    const indice = Math.floor(i / medicos.length);
    const dia = Math.floor(indice / 16);
    const inicio = new Date(
      Date.UTC(2026, 9, 1 + dia, 11 + Math.floor((indice % 16) / 2), (indice % 2) * 30),
    );
    return {
      ...modelo,
      id: `con-carga-${i}`,
      pacienteId: pacientes[i % PACIENTES].id,
      medicoId: medico.id,
      departamentoId: medico.departamentoId,
      inicio: inicio.toISOString(),
      duracaoMin: 30,
      status: inicio.getTime() < Date.now() ? 'concluida' : 'agendada',
      eventos: [{ tipo: 'agendada', em: momento }],
      versao: 1,
      criadoEm: momento,
      atualizadoEm: momento,
    };
  });
  return { pacientes, consultas };
}

async function medir<T>(fn: () => Promise<T>): Promise<{ ms: number; resultado: T }> {
  const inicio = performance.now();
  const resultado = await fn();
  return { ms: performance.now() - inicio, resultado };
}

describe('carga: 1.000 pacientes e 3.000 consultas (14.5.2)', () => {
  it('cabe no armazenamento (< 80%) e a busca responde em menos de 100 ms', async () => {
    const { pacientes, consultas } = gerarCarga();
    transacao(() => {
      repoPacientes.substituirTodos(pacientes);
      repoConsultas.substituirTodos(consultas);
    });

    const uso = usoArmazenamento();
    const fracao = uso / LIMITE_ARMAZENAMENTO_BYTES;
    console.info(
      `[carga] armazenamento: ${(uso / 1024 / 1024).toFixed(2)} MB (${(fracao * 100).toFixed(1)}% do limite)`,
    );
    expect(fracao).toBeLessThan(ALERTA_ARMAZENAMENTO);

    // "Recarregar a página": lê tudo do storage de novo.
    descarregarMemoria();
    const leitura = await medir(() => listarPacientes({}));
    expect(leitura.resultado.total).toBe(PACIENTES);

    // Carregar 3,4 MB do storage acontece uma vez por página; a meta de 100 ms vale para as buscas.
    console.info(`[carga] primeira leitura (do storage): ${leitura.ms.toFixed(1)} ms`);
    expect(leitura.ms).toBeLessThan(500);
    const tempos: Record<string, number> = {};
    const buscas: [string, Parameters<typeof listarPacientes>[0]][] = [
      ['nome', { busca: 'silva' }],
      ['nome sem acento', { busca: 'iris' }],
      ['CPF', { busca: pacientes[500].cpf.slice(0, 6) }],
      ['ordenar por idade, pág. 50', { ordenarPor: 'idade', ordem: 'desc', pagina: 50 }],
    ];
    for (const [rotulo, filtros] of buscas) {
      const { ms, resultado } = await medir(() => listarPacientes(filtros));
      expect(resultado.total).toBeGreaterThan(0);
      tempos[`pacientes: ${rotulo}`] = ms;
    }
    tempos['agenda de um dia'] = (await medir(() => listarConsultas({ data: '2026-11-10' }))).ms;
    tempos['pendentes de registro (todas as datas)'] = (
      await medir(() => listarConsultas({ pendentes: true }))
    ).ms;
    tempos['horários livres (A1)'] = (
      await medir(() => horariosLivres('med-paulo-mendes', '2026-11-10', 30, 'pac-carga-1'))
    ).ms;

    console.info(
      '[carga] tempos (ms):\n' +
        Object.entries(tempos)
          .map(([k, v]) => `  ${k}: ${v.toFixed(1)}`)
          .join('\n'),
    );
    for (const [rotulo, ms] of Object.entries(tempos)) {
      expect(ms, rotulo).toBeLessThan(META_MS);
    }
  }, 30_000);
});
