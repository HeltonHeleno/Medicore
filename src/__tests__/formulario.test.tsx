import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Campo } from '../components/ui/form/Campo';
import { Checkbox } from '../components/ui/form/Checkbox';
import { Input } from '../components/ui/form/Input';
import { InputMascarado } from '../components/ui/form/InputMascarado';
import { RadioGroup } from '../components/ui/form/RadioGroup';
import { SecaoFormulario } from '../components/ui/form/SecaoFormulario';
import { Select } from '../components/ui/form/Select';
import { Textarea } from '../components/ui/form/Textarea';

describe('Campo', () => {
  it('liga rótulo, dica e erro ao controle', () => {
    render(
      <Campo
        rotulo="Nome completo"
        nome="nome"
        obrigatorio
        dica="Como no documento"
        erro="Informe o nome"
      >
        <Input />
      </Campo>,
    );
    const input = screen.getByRole('textbox', { name: /^Nome completo\s*\(obrigatório\)$/ });
    expect(input).toHaveAttribute('id', 'campo-nome');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAccessibleDescription('Como no documento Informe o nome');
  });

  it('sem erro, não marca inválido e descreve só com a dica', () => {
    render(
      <Campo rotulo="E-mail" dica="Opcional">
        <Input type="email" />
      </Campo>,
    );
    const input = screen.getByRole('textbox', { name: 'E-mail' });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('Opcional');
  });

  it('Select usa o mesmo contexto e mostra a opção vazia', () => {
    render(
      <Campo rotulo="UF" erro="Selecione">
        <Select opcoes={[{ valor: 'SP', rotulo: 'São Paulo' }]} defaultValue="" />
      </Campo>,
    );
    const select = screen.getByRole('combobox', { name: 'UF' });
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('option', { name: 'Selecione…' })).toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('mostra e atualiza o contador', async () => {
    render(
      <Campo rotulo="Observações">
        <Textarea maxLength={20} defaultValue="abc" />
      </Campo>,
    );
    const area = screen.getByRole('textbox', { name: 'Observações' });
    expect(screen.getByText('3 de 20 caracteres')).toBeInTheDocument();
    await userEvent.type(area, 'defg');
    expect(screen.getByText('7 de 20 caracteres')).toBeInTheDocument();
    expect(area).toHaveAccessibleDescription('7 de 20 caracteres');
  });
});

function CpfControlado({ inicial = '' }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <Campo rotulo="CPF">
        <InputMascarado mascara="cpf" value={valor} onChange={setValor} />
      </Campo>
      <output data-testid="limpo">{valor}</output>
    </>
  );
}

describe('InputMascarado', () => {
  it('mostra com máscara e entrega só os dígitos', async () => {
    render(<CpfControlado />);
    const input = screen.getByRole('textbox', { name: 'CPF' });
    await userEvent.type(input, '52998224725999');
    expect(input).toHaveValue('529.982.247-25');
    expect(screen.getByTestId('limpo')).toHaveTextContent(/^52998224725$/);
  });

  it('apagar no meio mantém o cursor no lugar', async () => {
    render(<CpfControlado inicial="52998224725" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'CPF' });
    // "529.9|82.247-25": apaga o 9 do 2º bloco.
    await userEvent.type(input, '{Backspace}', {
      initialSelectionStart: 5,
      initialSelectionEnd: 5,
    });
    expect(input).toHaveValue('529.822.472-5');
    expect(input.selectionStart).toBe(3);
  });

  it('Backspace logo depois de um ponto apaga o dígito anterior', async () => {
    render(<CpfControlado inicial="52998224725" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'CPF' });
    await userEvent.type(input, '{Backspace}', {
      initialSelectionStart: 4,
      initialSelectionEnd: 4,
    });
    expect(screen.getByTestId('limpo')).toHaveTextContent(/^5298224725$/);
    expect(input.selectionStart).toBe(2);
  });

  it('digitar no meio insere no lugar certo', async () => {
    render(<CpfControlado inicial="5298224725" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'CPF' });
    // "529.|822.472-5" → insere 9 depois do ponto.
    await userEvent.type(input, '9', { initialSelectionStart: 4, initialSelectionEnd: 4 });
    expect(input).toHaveValue('529.982.247-25');
    expect(input.selectionStart).toBe(5);
  });

  it('colar com e sem máscara', async () => {
    render(<CpfControlado />);
    const input = screen.getByRole('textbox', { name: 'CPF' });
    await userEvent.click(input);
    await userEvent.paste('529.982.247-25');
    expect(screen.getByTestId('limpo')).toHaveTextContent(/^52998224725$/);
    await userEvent.clear(input);
    await userEvent.paste('52998224725');
    expect(input).toHaveValue('529.982.247-25');
  });
});

describe('Checkbox, RadioGroup e SecaoFormulario', () => {
  it('Checkbox com descrição e erro', async () => {
    render(<Checkbox name="lgpd" rotulo="Aceito" descricao="Termo LGPD" erro="Obrigatório" />);
    const caixa = screen.getByRole('checkbox', { name: 'Aceito' });
    expect(caixa).toHaveAttribute('id', 'campo-lgpd');
    expect(caixa).toHaveAccessibleDescription('Termo LGPD Obrigatório');
    await userEvent.click(screen.getByText('Aceito'));
    expect(caixa).toBeChecked();
  });

  it('RadioGroup: fieldset com legenda, seleção por teclado', async () => {
    function Grupo() {
      const [v, setV] = useState<'a' | 'b' | undefined>();
      return (
        <RadioGroup
          legenda="Convênio"
          nome="convenio.tipo"
          obrigatorio
          valor={v}
          aoMudar={setV}
          erro={v ? undefined : 'Escolha uma opção'}
          opcoes={[
            { valor: 'a', rotulo: 'Particular' },
            { valor: 'b', rotulo: 'Convênio' },
          ]}
        />
      );
    }
    render(<Grupo />);
    const grupo = screen.getByRole('group', { name: /^Convênio\s*\(obrigatório\)$/ });
    expect(grupo).toHaveAccessibleDescription('Escolha uma opção');
    await userEvent.click(screen.getByRole('radio', { name: 'Particular' }));
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Convênio' })).toBeChecked();
    expect(grupo).not.toHaveAttribute('aria-invalid');
  });

  it('SecaoFormulario é uma região com título', () => {
    render(
      <SecaoFormulario titulo="Endereço" descricao="Opcional">
        <span>campos</span>
      </SecaoFormulario>,
    );
    expect(screen.getByRole('region', { name: 'Endereço' })).toBeInTheDocument();
  });
});
