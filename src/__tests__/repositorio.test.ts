import { vi } from 'vitest';
import { ErroArmazenamento } from '../services/erros';
import { executarMigracoes, type Migracao } from '../services/migracoes';
import {
  assinar,
  assinarAvisos,
  CHAVE_META,
  criarRepositorio,
  descarregarMemoria,
  resetar,
  transacao,
  usoArmazenamento,
} from '../services/repositorio';

interface Item {
  id: string;
  nome: string;
  versao: number;
  criadoEm: string;
  atualizadoEm: string;
}

const seedItens = (): Item[] => [
  {
    id: 'a',
    nome: 'Alfa',
    versao: 1,
    criadoEm: '2026-01-01T00:00:00Z',
    atualizadoEm: '2026-01-01T00:00:00Z',
  },
];
const repo = criarRepositorio<Item>('teste_itens', seedItens);
const outro = criarRepositorio<{ id: string; valor: number }>('teste_outros', () => []);
const novo = (id: string, nome = id): Item => ({
  id,
  nome,
  versao: 0,
  criadoEm: '',
  atualizadoEm: '',
});

beforeEach(() => {
  resetar();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('carga e semeadura', () => {
  it('semeia na primeira leitura e grava no localStorage', () => {
    expect(repo.todos().map((i) => i.nome)).toEqual(['Alfa']);
    expect(JSON.parse(localStorage.getItem('medicore:teste_itens:v1')!)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(CHAVE_META)!).esquema).toBe(1);
  });

  it('os dados sobrevivem a um "recarregar a página"', () => {
    repo.inserir(novo('b', 'Beta'));
    descarregarMemoria();
    expect(repo.obter('b')?.nome).toBe('Beta');
  });

  it('JSON corrompido: faz backup, recria pelo seed e avisa (E-07)', () => {
    localStorage.setItem('medicore:teste_itens:v1', '{isso não é json');
    const avisos: string[] = [];
    const parar = assinarAvisos((a) => avisos.push(a));
    expect(repo.todos().map((i) => i.id)).toEqual(['a']);
    expect(avisos).toEqual(['dados_corrompidos']);
    const backup = Object.keys(localStorage).find((k) => k.startsWith('medicore:backup:'));
    expect(localStorage.getItem(backup!)).toBe('{isso não é json');
    parar();
  });
});

describe('CRUD, versão e imutabilidade', () => {
  it('inserir começa a versão em 1 e preenche as datas', () => {
    const item = repo.inserir(novo('b'));
    expect(item.versao).toBe(1);
    expect(item.criadoEm).toBe('2026-10-27T12:00:00.000Z');
  });

  it('atualizar incrementa a versão e a data de atualização', () => {
    vi.setSystemTime(new Date('2026-10-28T09:00:00Z'));
    const item = repo.atualizar('a', { nome: 'Alfa 2' });
    expect(item).toMatchObject({
      nome: 'Alfa 2',
      versao: 2,
      atualizadoEm: '2026-10-28T09:00:00.000Z',
    });
    expect(item.criadoEm).toBe('2026-01-01T00:00:00Z');
  });

  it('itens lidos são imutáveis', () => {
    const item = repo.obter('a')!;
    expect(() => {
      (item as { nome: string }).nome = 'mudou';
    }).toThrow();
  });

  it('remover apaga o item', () => {
    repo.remover('a');
    expect(repo.obter('a')).toBeUndefined();
  });
});

describe('transação (M4)', () => {
  it('grava várias coleções juntas e notifica uma única vez', () => {
    const ouvinte = vi.fn();
    const parar = assinar(ouvinte);
    transacao(() => {
      repo.inserir(novo('b'));
      repo.inserir(novo('c'));
      outro.inserir({ id: 'x', valor: 1 });
    });
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect([...ouvinte.mock.calls[0][0]].sort()).toEqual(['teste_itens', 'teste_outros']);
    parar();
  });

  it('desfaz tudo (memória e storage) se uma regra falhar no meio', () => {
    const ouvinte = vi.fn();
    const parar = assinar(ouvinte);
    expect(() =>
      transacao(() => {
        repo.atualizar('a', { nome: 'Alterado' });
        outro.inserir({ id: 'x', valor: 1 });
        throw new Error('regra violada');
      }),
    ).toThrow('regra violada');
    expect(repo.obter('a')?.nome).toBe('Alfa');
    expect(outro.obter('x')).toBeUndefined();
    descarregarMemoria();
    expect(repo.obter('a')?.nome).toBe('Alfa');
    expect(ouvinte).not.toHaveBeenCalled();
    parar();
  });

  it('cota estourada: desfaz e lança ErroArmazenamento (E-06)', () => {
    repo.todos();
    outro.todos();
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k, v) {
      if (k === 'medicore:teste_outros:v1') throw new DOMException('cheio', 'QuotaExceededError');
      return original.call(this, k, v);
    });
    expect(() =>
      transacao(() => {
        repo.inserir(novo('b'));
        outro.inserir({ id: 'x', valor: 1 });
      }),
    ).toThrow(ErroArmazenamento);
    vi.restoreAllMocks();
    expect(repo.obter('b')).toBeUndefined();
    descarregarMemoria();
    expect(repo.obter('b')).toBeUndefined(); // a gravação que já tinha acontecido foi desfeita
  });

  it('avisa uma vez quando o uso passa de 80% do limite', () => {
    const avisos: string[] = [];
    const parar = assinarAvisos((a) => avisos.push(a));
    repo.inserir({ ...novo('grande'), nome: 'x'.repeat(2.2 * 1024 * 1024) });
    repo.inserir(novo('outro'));
    expect(avisos).toEqual(['armazenamento_quase_cheio']);
    expect(usoArmazenamento()).toBeGreaterThan(4 * 1024 * 1024);
    parar();
  });
});

describe('sem localStorage disponível', () => {
  it('continua funcionando só em memória', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    descarregarMemoria();
    expect(() => repo.todos()).not.toThrow();
  });
});

describe('sincronização entre abas (M6)', () => {
  it('uma gravação de outra aba recarrega a coleção e notifica', () => {
    repo.todos();
    const ouvinte = vi.fn();
    const parar = assinar(ouvinte);
    const outraAba = [...seedItens(), { ...novo('z', 'Zeta'), versao: 1 }];
    localStorage.setItem('medicore:teste_itens:v1', JSON.stringify(outraAba));
    window.dispatchEvent(new StorageEvent('storage', { key: 'medicore:teste_itens:v1' }));
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(repo.obter('z')?.nome).toBe('Zeta');
    parar();
  });

  it('gravação de outra aba sem o evento: a próxima transação relê antes de gravar (sem perder dados)', () => {
    repo.todos();
    const ouvinte = vi.fn();
    const parar = assinar(ouvinte);
    // Outra aba gravou, mas o evento `storage` ainda não chegou.
    const outraAba = [...seedItens(), { ...novo('z', 'Zeta'), versao: 1 }];
    localStorage.setItem('medicore:teste_itens:v1', JSON.stringify(outraAba));

    repo.inserir(novo('y', 'Ípsilon'));

    const gravado = JSON.parse(localStorage.getItem('medicore:teste_itens:v1')!) as Item[];
    expect(gravado.map((i) => i.id).sort()).toEqual(['a', 'y', 'z']);
    expect(ouvinte).toHaveBeenCalledTimes(1);
    parar();
  });

  it('ignora chaves que não são do MediCore', () => {
    const ouvinte = vi.fn();
    const parar = assinar(ouvinte);
    window.dispatchEvent(new StorageEvent('storage', { key: 'outra-app' }));
    expect(ouvinte).not.toHaveBeenCalled();
    parar();
  });
});

describe('migrações', () => {
  it('executa as pendentes em ordem e grava a nova versão', () => {
    const dados = new Map<string, string>([
      ['meta', JSON.stringify({ esquema: 1, semeadoEm: 'x' })],
      ['col', JSON.stringify([{ id: '1', nome: 'a' }])],
    ]);
    const acesso = {
      ler: (k: string) => dados.get(k) ?? null,
      gravar: (k: string, v: string) => void dados.set(k, v),
      chaveMeta: 'meta',
    };
    const v2: Migracao = {
      para: 2,
      executar: (a) => {
        const lista = JSON.parse(a.ler('col')!) as { nome: string }[];
        a.gravar('col', JSON.stringify(lista.map((i) => ({ ...i, nome: i.nome.toUpperCase() }))));
      },
    };
    executarMigracoes(acesso, [v2], 2);
    expect(JSON.parse(dados.get('col')!)[0].nome).toBe('A');
    expect(JSON.parse(dados.get('meta')!)).toEqual({ esquema: 2, semeadoEm: 'x' });
    executarMigracoes(acesso, [v2], 2); // não roda de novo
    expect(JSON.parse(dados.get('col')!)[0].nome).toBe('A');
  });
});
