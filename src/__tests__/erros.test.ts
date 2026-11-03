import { vi } from 'vitest';
import { esquemaPaciente } from '../schemas/paciente';
import {
  aplicarErrosNoFormulario,
  ErroArmazenamento,
  ErroConcorrencia,
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../services/erros';

describe('erros tipados', () => {
  it('são instâncias de Error com nome e mensagem em PT-BR', () => {
    expect(new ErroConcorrencia()).toBeInstanceOf(Error);
    expect(new ErroConcorrencia().message).toMatch(/alterado em outra aba/);
    expect(new ErroArmazenamento().name).toBe('ErroArmazenamento');
    expect(new ErroNaoEncontrado('Paciente não encontrado').message).toBe(
      'Paciente não encontrado',
    );
  });

  it('ErroValidacao.deZod guarda a primeira mensagem de cada campo, com caminho por ponto', () => {
    const r = esquemaPaciente.safeParse({ convenio: { tipo: 'convenio' } });
    const erro = ErroValidacao.deZod(r.error!);
    expect(erro.campos['convenio.nome']).toBe('Campo obrigatório');
    expect(erro.campos.nome).toBe('Campo obrigatório');
  });
});

describe('aplicarErrosNoFormulario', () => {
  it('aplica cada campo de um ErroValidacao', () => {
    const setError = vi.fn();
    const aplicado = aplicarErrosNoFormulario(
      new ErroValidacao({
        cpf: 'Informe um CPF válido',
        'endereco.cep': 'Informe um CEP com 8 dígitos',
      }),
      setError,
    );
    expect(aplicado).toBe(true);
    expect(setError).toHaveBeenCalledWith('cpf', {
      type: 'servico',
      message: 'Informe um CPF válido',
    });
    expect(setError).toHaveBeenCalledWith(
      'endereco.cep',
      expect.objectContaining({ type: 'servico' }),
    );
  });

  it('aplica ErroConflito com campo e ignora os que não têm campo', () => {
    const setError = vi.fn();
    expect(
      aplicarErrosNoFormulario(
        new ErroConflito('cpf_duplicado', 'Já existe', { campo: 'cpf' }),
        setError,
      ),
    ).toBe(true);
    expect(setError).toHaveBeenCalledWith('cpf', { type: 'cpf_duplicado', message: 'Já existe' });
    expect(aplicarErrosNoFormulario(new ErroConflito('tem_historico', 'x'), vi.fn())).toBe(false);
    expect(aplicarErrosNoFormulario(new ErroConcorrencia(), vi.fn())).toBe(false);
  });
});

describe('erros dos módulos operacionais (E-11 a E-18)', () => {
  it('cada conflito vai para o campo certo do formulário', () => {
    const casos: [ErroConflito, string][] = [
      [
        new ErroConflito('leito_indisponivel', 'Este leito acabou de ser ocupado. Escolha outro.', {
          campo: 'leitoId',
        }),
        'leitoId',
      ],
      [
        new ErroConflito(
          'estoque_insuficiente',
          'Estoque insuficiente: disponível 4 comprimidos.',
          {
            campo: 'itens.0.quantidade',
            detalhes: { disponivel: 4 },
          },
        ),
        'itens.0.quantidade',
      ],
      [
        new ErroConflito('paciente_internado', 'Fulana está internada no leito ENF-104A.', {
          campo: 'pacienteId',
        }),
        'pacienteId',
      ],
      [
        new ErroConflito(
          'destino_inativo',
          'O paciente não está mais internado nem em atendimento.',
          { campo: 'pacienteId' },
        ),
        'pacienteId',
      ],
    ];
    for (const [erro, campo] of casos) {
      const setError = vi.fn();
      expect(aplicarErrosNoFormulario(erro, setError)).toBe(true);
      expect(setError).toHaveBeenCalledWith(campo, { type: erro.codigo, message: erro.message });
    }
  });

  it('E-13 é erro de validação no campo do lote', () => {
    const setError = vi.fn();
    aplicarErrosNoFormulario(
      new ErroValidacao({ numero: 'Já existe o lote L123 com outra validade.' }),
      setError,
    );
    expect(setError).toHaveBeenCalledWith(
      'numero',
      expect.objectContaining({ message: 'Já existe o lote L123 com outra validade.' }),
    );
  });

  it('E-16, E-17 e E-18 não têm campo: a tela mostra em aviso ou diálogo', () => {
    for (const codigo of [
      'transicao_invalida',
      'pendencias_modulos',
      'janela_correcao_expirada',
    ] as const) {
      expect(aplicarErrosNoFormulario(new ErroConflito(codigo, 'x'), vi.fn())).toBe(false);
    }
  });
});
