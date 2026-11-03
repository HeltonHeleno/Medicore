/**
 * D13: 90 pacientes de exemplo a mais (fictícios, RS-01), para que os módulos de leitos e
 * emergência tenham gente suficiente: ~10% menores (com responsável) e ~15% com alergias,
 * incluindo "Penicilina", "Dipirona" e "AINEs" para demonstrar o alerta da farmácia (A10).
 * Na instalação 1.1.0 eles entram pela migração v2 (`services/migracoes.ts`).
 */
import type { Convenio, Paciente, Sexo } from '../../types';
import { criarAleatorio, gerarCelular, gerarCpfValido, inteiro, sortear } from './gerador';

export const QUANTIDADE_EXTRAS = 90;
export const PREFIXO_EXTRAS = 'pac-g-';

const FEMININOS = [
  'Adriana',
  'Alice',
  'Amanda',
  'Bianca',
  'Bruna',
  'Carla',
  'Cecília',
  'Clara',
  'Débora',
  'Eduarda',
  'Elaine',
  'Fabiana',
  'Fernanda',
  'Gabriela',
  'Helena',
  'Isabela',
  'Jéssica',
  'Júlia',
  'Karina',
  'Laura',
  'Lívia',
  'Lorena',
  'Luana',
  'Manuela',
  'Marina',
  'Natália',
  'Paula',
  'Priscila',
  'Raquel',
  'Regina',
  'Sabrina',
  'Simone',
  'Tatiana',
  'Valéria',
  'Yasmin',
];
const MASCULINOS = [
  'Alexandre',
  'André',
  'Arthur',
  'Caio',
  'César',
  'Davi',
  'Diego',
  'Douglas',
  'Enzo',
  'Fábio',
  'Felipe',
  'Gustavo',
  'Heitor',
  'Henrique',
  'Igor',
  'Jorge',
  'José',
  'Leandro',
  'Leonardo',
  'Luiz',
  'Márcio',
  'Mateus',
  'Miguel',
  'Murilo',
  'Otávio',
  'Paulo',
  'Rodrigo',
  'Samuel',
  'Sérgio',
  'Vinícius',
  'Wagner',
  'Washington',
  'William',
  'Yuri',
  'Wellington',
];
const SOBRENOMES = [
  'Almeida',
  'Andrade',
  'Barros',
  'Bezerra',
  'Cavalcanti',
  'Costa',
  'Cunha',
  'Duarte',
  'Farias',
  'Fonseca',
  'Freire',
  'Guimarães',
  'Leite',
  'Macedo',
  'Matos',
  'Medeiros',
  'Melo',
  'Miranda',
  'Moraes',
  'Nascimento',
  'Nogueira',
  'Pacheco',
  'Peixoto',
  'Prado',
  'Queiroz',
  'Rezende',
  'Ribeiro',
  'Sales',
  'Santana',
  'Siqueira',
  'Soares',
  'Tavares',
  'Torres',
  'Vasconcelos',
  'Xavier',
];
const CONVENIOS = ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Saúde'] as const;
const ALERGIAS = [
  'Penicilina',
  'Dipirona',
  'AINEs',
  'Penicilina; látex',
  'Sulfa',
  'Iodo',
  'Dipirona; AINEs',
  'Frutos do mar',
  'Amoxicilina',
  'Penicilina',
  'Dipirona',
  'Látex',
  'AINEs',
];
const PARENTESCOS = ['Mãe', 'Pai', 'Avó', 'Tia'];

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Gera os 90 pacientes extras. `cpfsUsados` evita repetir um CPF já existente
 * (os gerados são adicionados ao conjunto).
 */
export function gerarPacientesExtras(cpfsUsados: Set<string>, momento: string): Paciente[] {
  const rand = criarAleatorio(2604);
  const novoCpf = () => {
    let cpf: string;
    do cpf = gerarCpfValido(rand);
    while (cpfsUsados.has(cpf));
    cpfsUsados.add(cpf);
    return cpf;
  };

  return Array.from({ length: QUANTIDADE_EXTRAS }, (_, i) => {
    const sexo: Sexo = i % 2 === 0 ? 'feminino' : 'masculino';
    const primeiro = sortear(rand, sexo === 'feminino' ? FEMININOS : MASCULINOS);
    const sobrenome1 = sortear(rand, SOBRENOMES);
    const sobrenome2 = sortear(rand, SOBRENOMES);
    const nome = `${primeiro} ${sobrenome1}${sobrenome1 !== sobrenome2 ? ` ${sobrenome2}` : ''}`;
    // ~10% menores: índices múltiplos de 10 (0, 10, …, 80) → 9 menores, de 0 a 16 anos.
    const menor = i % 10 === 0;
    const ano = menor ? 2026 - [0, 1, 3, 5, 7, 9, 11, 14, 16][i / 10] : inteiro(rand, 1940, 2006);
    const dataNascimento = `${menor && ano === 2026 ? 2025 : ano}-${pad2(inteiro(rand, 1, 12))}-${pad2(inteiro(rand, 1, 28))}`;
    // ~15% com alergias: 13 de 90.
    const alergias = i % 7 === 3 ? ALERGIAS[Math.floor(i / 7) % ALERGIAS.length] : undefined;
    const particular = i % 6 === 5;
    const convenio: Convenio = particular
      ? { tipo: 'particular' }
      : {
          tipo: 'convenio',
          nome: sortear(rand, CONVENIOS),
          carteirinha: String(100000000 + Math.floor(rand() * 899999999)),
        };
    const cpf = novoCpf();
    return {
      id: `${PREFIXO_EXTRAS}${String(i + 1).padStart(3, '0')}`,
      nome,
      cpf,
      dataNascimento,
      sexo,
      telefone: gerarCelular(rand),
      convenio,
      ...(alergias ? { alergias } : {}),
      ...(menor
        ? {
            responsavel: {
              nome: `${sortear(rand, FEMININOS)} ${sobrenome1}`,
              cpf: novoCpf(),
              parentesco: sortear(rand, PARENTESCOS),
              telefone: gerarCelular(rand),
            },
          }
        : {}),
      consentimentoLgpd: { aceito: true as const, em: momento },
      criadoEm: momento,
      atualizadoEm: momento,
      versao: 1,
      ativo: true,
    };
  });
}
