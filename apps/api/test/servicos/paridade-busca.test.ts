/**
 * 25.1.1 — A busca e a ordenação das listas no banco dão o mesmo resultado que as funções das
 * telas (`filtrarPorTermo` e `ordenar`), sobre os mesmos dados de exemplo.
 */
import { DEPARTAMENTOS } from '@medicore/dominio/config/departamentos';
import { semearMedicos } from '@medicore/dominio/seeds/medicos';
import { semearPacientes } from '@medicore/dominio/seeds/pacientes';
import type { Ordem } from '@medicore/dominio/types';
import { filtrarPorTermo, ordenar } from '@medicore/dominio/utils/busca';
import { nomeExibicaoPaciente } from '@medicore/dominio/utils/cadastros';
import { idade } from '@medicore/dominio/utils/datas';
import { usarApi } from '../apoio/cliente';

const { cliente } = usarApi('2026-11-09T08:00:00-03:00');

const TERMOS = [
  'joao',
  'JOÃO',
  'joão pereira',
  'pereira joao',
  'silva',
  'ana   silva',
  'júlia',
  'julia',
  'Rafaela',
  '529',
  '11 9',
  '(11) 9',
  '98',
  'ã',
  '%',
  '_',
  'zz-nao-existe',
];

/** Todas as páginas de uma lista. */
async function todas<T>(buscar: (pagina: number) => Promise<{ itens: T[]; total: number }>) {
  const itens: T[] = [];
  for (let pagina = 1; ; pagina++) {
    const r = await buscar(pagina);
    itens.push(...r.itens);
    if (itens.length >= r.total) return itens;
  }
}

describe('pacientes: busca e ordem iguais às das telas', () => {
  it.each(TERMOS)('busca "%s"', async (termo) => {
    const esperado = filtrarPorTermo(semearPacientes(), termo, {
      textos: (p) => [p.nome, p.nomeSocial],
      digitos: (p) => [p.cpf, p.telefone],
    }).map((p) => p.id);
    const obtido = await todas((pagina) =>
      cliente.listarPacientes({ busca: termo, status: 'todos', porPagina: 100, pagina }),
    );
    expect(obtido.map((p) => p.id).sort()).toEqual([...esperado].sort());
  });

  it.each([
    ['nome', 'asc'],
    ['nome', 'desc'],
    ['idade', 'asc'],
    ['idade', 'desc'],
  ] as const)('ordem por %s %s', async (ordenarPor, ordem: Ordem) => {
    const resumos = semearPacientes().map((p) => ({
      id: p.id,
      nome: nomeExibicaoPaciente(p),
      idade: idade(p.dataNascimento),
    }));
    const esperado = ordenar(resumos, (r) => (ordenarPor === 'nome' ? r.nome : r.idade), ordem);
    const obtido = await todas((pagina) =>
      cliente.listarPacientes({ status: 'todos', ordenarPor, ordem, porPagina: 50, pagina }),
    );
    expect(obtido.map((p) => p.id)).toEqual(esperado.map((r) => r.id));
  });
});

describe('médicos: busca e ordem iguais às das telas', () => {
  it.each(['paulo', 'MÉNDES', 'dra', '5366', '3333', 'fernanda lima'])(
    'busca "%s"',
    async (termo) => {
      const esperado = filtrarPorTermo(semearMedicos(), termo, {
        textos: (m) => [m.nome],
        digitos: (m) => [m.crm.numero, m.telefone],
      }).map((m) => m.id);
      const { itens } = await cliente.listarMedicos({
        busca: termo,
        status: 'todos',
        porPagina: 100,
      });
      expect(itens.map((m) => m.id).sort()).toEqual([...esperado].sort());
    },
  );

  it.each(['asc', 'desc'] as const)('ordem por departamento %s', async (ordem) => {
    const nome = (id: string) => DEPARTAMENTOS.find((d) => d.id === id)?.nome ?? id;
    const esperado = ordenar(semearMedicos(), (m) => `${nome(m.departamentoId)} ${m.nome}`, ordem);
    const { itens } = await cliente.listarMedicos({
      status: 'todos',
      ordenarPor: 'departamento',
      ordem,
      porPagina: 100,
    });
    expect(itens.map((m) => m.id)).toEqual(esperado.map((m) => m.id));
  });
});
