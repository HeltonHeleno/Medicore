import { filtrarPorTermo, normalizar, ordenar, paginar } from '../utils/busca';

const pessoas = [
  { id: '1', nome: 'João Pereira', nomeSocial: undefined, cpf: '52998224725', tel: '11987654321' },
  { id: '2', nome: 'Ana Silva', nomeSocial: 'Aninha', cpf: '11144477735', tel: '2134567890' },
  { id: '3', nome: 'Ângela Souza', nomeSocial: undefined, cpf: '39053344705', tel: '31999990000' },
  { id: '4', nome: 'anderson lima', nomeSocial: undefined, cpf: '15350946056', tel: '11912345678' },
];
const campos = {
  textos: (p: (typeof pessoas)[number]) => [p.nome, p.nomeSocial],
  digitos: (p: (typeof pessoas)[number]) => [p.cpf, p.tel],
};
const ids = (l: { id: string }[]) => l.map((x) => x.id);

describe('normalizar', () => {
  it('remove acentos, maiúsculas e espaços extras', () => {
    expect(normalizar('  JOÃO   Pereira ')).toBe('joao pereira');
  });
});

describe('filtrarPorTermo (A4)', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(ids(filtrarPorTermo(pessoas, 'joao', campos))).toEqual(['1']);
    expect(ids(filtrarPorTermo(pessoas, 'ANGELA', campos))).toEqual(['3']);
  });
  it('aceita palavras em qualquer ordem', () => {
    expect(ids(filtrarPorTermo(pessoas, 'silva ana', campos))).toEqual(['2']);
  });
  it('procura também no nome social', () => {
    expect(ids(filtrarPorTermo(pessoas, 'aninha', campos))).toEqual(['2']);
  });
  it('CPF e telefone com ou sem máscara', () => {
    expect(ids(filtrarPorTermo(pessoas, '529.982.247-25', campos))).toEqual(['1']);
    expect(ids(filtrarPorTermo(pessoas, '529982', campos))).toEqual(['1']);
    expect(ids(filtrarPorTermo(pessoas, '(21) 3456', campos))).toEqual(['2']);
  });
  it('termo vazio devolve tudo', () => {
    expect(filtrarPorTermo(pessoas, '  ', campos)).toHaveLength(4);
  });
});

describe('ordenar', () => {
  it('ordena sem diferenciar acentos e maiúsculas, com desempate estável', () => {
    expect(ids(ordenar(pessoas, (p) => p.nome))).toEqual(['2', '4', '3', '1']);
    expect(ids(ordenar(pessoas, (p) => p.nome, 'desc'))).toEqual(['1', '3', '4', '2']);
  });
  it('valores vazios vão para o fim', () => {
    expect(ids(ordenar(pessoas, (p) => p.nomeSocial))).toEqual(['2', '1', '3', '4']);
  });
});

describe('paginar', () => {
  const itens = Array.from({ length: 23 }, (_, i) => i);
  it('fatia a página pedida', () => {
    expect(paginar(itens, 3, 10)).toEqual({
      itens: [20, 21, 22],
      total: 23,
      pagina: 3,
      porPagina: 10,
    });
  });
  it('página além do fim volta para a última válida', () => {
    expect(paginar(itens, 9, 10).pagina).toBe(3);
    expect(paginar([], 5, 10)).toEqual({ itens: [], total: 0, pagina: 1, porPagina: 10 });
  });
});
