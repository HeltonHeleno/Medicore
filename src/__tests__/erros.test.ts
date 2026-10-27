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
