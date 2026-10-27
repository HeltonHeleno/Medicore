/**
 * ~30 pacientes de exemplo (D6), todos fictícios (RS-01).
 * Incluem os 4 da tabela de troca de nomes, 2 menores com responsável,
 * 3 com alergias, 2 com nome social e 3 inativos.
 */
import type { Convenio, Paciente, Sexo } from '../../types';
import { agora } from '../../utils/relogio';
import { criarAleatorio, gerarCelular, gerarCpfValido, sortear, unicos } from './gerador';

const CONVENIOS = ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Saúde'] as const;

type Extra = Partial<
  Pick<Paciente, 'nomeSocial' | 'alergias' | 'tipoSanguineo' | 'observacoes' | 'email'>
> & {
  menor?: { responsavel: string; parentesco: string };
  inativo?: boolean;
  particular?: boolean;
};

/** [id, nome civil, sexo, nascimento AAAA-MM-DD, extras] */
export const MODELOS_PACIENTES: [string, string, Sexo, string, Extra?][] = [
  [
    'pac-joao-pereira',
    'João Pereira',
    'masculino',
    '1968-03-14',
    { alergias: 'Dipirona', tipoSanguineo: 'O+' },
  ],
  [
    'pac-mariana-alves',
    'Mariana Alves',
    'feminino',
    '1991-07-22',
    { email: 'mariana.alves@exemplo.com.br' },
  ],
  ['pac-carlos-santos', 'Carlos Santos', 'masculino', '1979-11-02', { tipoSanguineo: 'A+' }],
  ['pac-daniel-oliveira', 'Daniel Oliveira', 'masculino', '1985-05-30', { particular: true }],
  ['pac-ana-silva', 'Ana Paula Silva', 'feminino', '1974-09-09', { alergias: 'Penicilina; látex' }],
  ['pac-lucas-ferreira', 'Lucas Ferreira', 'masculino', '2001-01-17'],
  ['pac-juliana-rocha', 'Juliana Rocha', 'feminino', '1988-12-05', { particular: true }],
  [
    'pac-pedro-gomes',
    'Pedro Henrique Gomes',
    'masculino',
    '1959-06-21',
    { observacoes: 'Usa marca-passo.' },
  ],
  ['pac-camila-souza', 'Camila Souza', 'feminino', '1996-04-11'],
  [
    'pac-rafaela-martins',
    'Rafael Martins',
    'outro',
    '1999-08-08',
    { nomeSocial: 'Rafaela Martins' },
  ],
  [
    'pac-beatriz-lima',
    'Beatriz Lima',
    'feminino',
    '2016-02-19',
    {
      menor: { responsavel: 'Cláudia Lima', parentesco: 'Mãe' },
      alergias: 'Amendoim',
    },
  ],
  [
    'pac-gabriel-castro',
    'Gabriel Castro',
    'masculino',
    '2013-10-03',
    {
      menor: { responsavel: 'Roberto Castro', parentesco: 'Pai' },
    },
  ],
  ['pac-fernando-araujo', 'Fernando Araújo', 'masculino', '1952-01-28', { tipoSanguineo: 'B-' }],
  ['pac-patricia-barbosa', 'Patrícia Barbosa', 'feminino', '1983-03-03'],
  ['pac-ricardo-teixeira', 'Ricardo Teixeira', 'masculino', '1970-07-07', { particular: true }],
  ['pac-larissa-cardoso', 'Larissa Cardoso', 'feminino', '1994-05-25'],
  ['pac-thiago-moreira', 'Thiago Moreira', 'masculino', '1990-09-15'],
  ['pac-vanessa-dias', 'Vanessa Dias', 'feminino', '1987-02-12', { tipoSanguineo: 'AB+' }],
  ['pac-eduardo-nunes', 'Eduardo Nunes', 'masculino', '1965-12-24'],
  ['pac-aline-carvalho', 'Aline Carvalho', 'feminino', '1998-06-30', { particular: true }],
  ['pac-bruno-mendes', 'Bruno Mendes', 'masculino', '1993-04-01'],
  ['pac-leticia-ramos', 'Letícia Ramos', 'feminino', '2003-11-19'],
  ['pac-joana-freitas', 'João Freitas', 'outro', '1997-10-10', { nomeSocial: 'Joana Freitas' }],
  ['pac-renata-pinto', 'Renata Pinto', 'feminino', '1976-08-16'],
  ['pac-marcelo-azevedo', 'Marcelo Azevedo', 'masculino', '1962-03-29'],
  ['pac-sofia-correia', 'Sofia Correia', 'feminino', '1980-01-05'],
  [
    'pac-antonio-batista',
    'Antônio Batista',
    'masculino',
    '1948-05-12',
    { observacoes: 'Mobilidade reduzida.' },
  ],
  ['pac-luiza-monteiro', 'Luíza Monteiro', 'feminino', '1992-12-01', { inativo: true }],
  ['pac-roberto-vieira', 'Roberto Vieira', 'masculino', '1958-07-19', { inativo: true }],
  [
    'pac-sandra-lopes',
    'Sandra Lopes',
    'feminino',
    '1971-04-04',
    { inativo: true, particular: true },
  ],
];

export function semearPacientes(): Paciente[] {
  const rand = criarAleatorio(1981);
  const cpf = unicos(() => gerarCpfValido(rand));
  const momento = agora().toISOString();

  return MODELOS_PACIENTES.map(([id, nome, sexo, dataNascimento, extra = {}], i) => {
    const { menor, inativo, particular, ...opcionais } = extra;
    const convenio: Convenio = particular
      ? { tipo: 'particular' }
      : {
          tipo: 'convenio',
          nome: sortear(rand, CONVENIOS),
          carteirinha: String(100000000 + Math.floor(rand() * 899999999)),
        };
    return {
      id,
      nome,
      cpf: cpf(),
      dataNascimento,
      sexo,
      telefone: gerarCelular(rand),
      convenio,
      ...opcionais,
      ...(menor
        ? {
            responsavel: {
              nome: menor.responsavel,
              cpf: cpf(),
              parentesco: menor.parentesco,
              telefone: gerarCelular(rand),
            },
          }
        : {}),
      ...(i % 3 === 0
        ? {
            endereco: {
              cep: '01310100',
              logradouro: 'Avenida Paulista',
              numero: String(100 + i * 10),
              bairro: 'Bela Vista',
              cidade: 'São Paulo',
              uf: 'SP' as const,
            },
          }
        : {}),
      consentimentoLgpd: { aceito: true as const, em: momento },
      criadoEm: momento,
      atualizadoEm: momento,
      versao: 1,
      ativo: !inativo,
      ...(inativo ? { inativadoEm: momento, motivoInativacao: 'Mudou de cidade' } : {}),
    };
  });
}
