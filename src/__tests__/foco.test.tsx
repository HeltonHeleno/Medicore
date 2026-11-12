/** 21.2.3 — foco no 1º campo inválido na ordem da tela e foco em grupos de opções. */
import { render } from '@testing-library/react';
import { idDoCampo } from '../components/ui/form/estilos';
import { focarCampo, naOrdemDaTela } from '../components/ui/form/foco';

function Tela() {
  return (
    <form>
      <input id={idDoCampo('paciente')} aria-label="Paciente" />
      <fieldset id={idDoCampo('risco')} tabIndex={-1}>
        <input type="radio" name="risco" aria-label="Vermelho" />
        <input type="radio" name="risco" aria-label="Laranja" defaultChecked />
      </fieldset>
      <div id={idDoCampo('itens.0.quantidade')} tabIndex={-1}>
        <button type="button" disabled>
          −
        </button>
        <input aria-label="Quantidade" />
      </div>
      <textarea name="motivo" aria-label="Motivo" />
    </form>
  );
}

describe('naOrdemDaTela', () => {
  it('ordena pela posição na tela, não pela ordem do esquema; campos fora da tela vão para o fim', () => {
    render(<Tela />);
    const itens = ['motivo', 'fantasma', 'itens.0.quantidade', 'paciente', 'risco'].map(
      (campo) => ({ campo }),
    );
    expect(naOrdemDaTela(itens).map((i) => i.campo)).toEqual([
      'paciente',
      'risco',
      'itens.0.quantidade',
      'motivo',
      'fantasma',
    ]);
  });
});

describe('focarCampo', () => {
  it('campo simples, pelo id ou pelo name', () => {
    const { getByLabelText } = render(<Tela />);
    focarCampo('paciente');
    expect(getByLabelText('Paciente')).toHaveFocus();
    focarCampo('motivo');
    expect(getByLabelText('Motivo')).toHaveFocus();
  });

  it('grupo: a opção marcada; sem marcada, o primeiro controle habilitado', () => {
    const { getByLabelText } = render(<Tela />);
    focarCampo('risco');
    expect(getByLabelText('Laranja')).toHaveFocus();
    focarCampo('itens.0.quantidade');
    expect(getByLabelText('Quantidade')).toHaveFocus();
  });
});
