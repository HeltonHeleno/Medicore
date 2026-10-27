import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { repoAtividades, repoConsultas, repoPacientes } from '../services/colecoes';
import { restaurarDadosExemplo } from '../services/demo';
import { criarPaciente } from '../services/pacientes';
import { assinar } from '../services/repositorio';
import { renderizarComRotas } from './utils/renderizarComRotas';
import { prepararServicos } from './utils/servicos';

prepararServicos('2026-11-09T11:30:00-03:00');

const novoPaciente = () =>
  criarPaciente({
    nome: 'Paciente Temporário',
    cpf: '529.982.247-25',
    dataNascimento: '1990-01-01',
    sexo: 'feminino',
    telefone: '(11) 98765-4321',
    convenio: { tipo: 'particular' },
    consentimentoLgpd: true,
  });

describe('Restaurar dados de exemplo (13.5)', () => {
  it('apaga o que foi gravado, semeia de novo, grava no storage e notifica as telas', async () => {
    const p = await novoPaciente();
    repoConsultas.remover('con-hoje-0900');
    const ouvinte = vi.fn();
    const parar = assinar(ouvinte);

    restaurarDadosExemplo();

    expect(ouvinte).toHaveBeenCalled();
    const alteradas = new Set(ouvinte.mock.calls.flatMap(([c]) => [...(c as Set<string>)]));
    expect(alteradas).toEqual(new Set(['pacientes', 'medicos', 'consultas', 'atividades']));
    expect(repoPacientes.obter(p.id)).toBeUndefined();
    expect(repoConsultas.obter('con-hoje-0900')).toBeDefined();
    expect(repoAtividades.todos().some((a) => a.referenciaId === p.id)).toBe(false);
    // Já gravado: outra aba lê os mesmos dados, em vez de semear por conta própria.
    for (const nome of ['pacientes', 'medicos', 'consultas', 'atividades']) {
      expect(localStorage.getItem(`medicore:${nome}:v1`)).not.toBeNull();
    }
    parar();
  });

  it('botão da vitrine pede confirmação de perigo antes de restaurar', async () => {
    const user = userEvent.setup();
    const p = await novoPaciente();
    renderizarComRotas('/ui');
    const botao = await screen.findByRole('button', { name: 'Restaurar dados de exemplo' });

    // Cancelar não muda nada.
    await user.click(botao);
    let dialogo = await screen.findByRole('alertdialog');
    expect(dialogo).toHaveTextContent('Esta ação não pode ser desfeita.');
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(repoPacientes.obter(p.id)).toBeDefined();

    await user.click(botao);
    dialogo = await screen.findByRole('alertdialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Apagar e restaurar' }));
    expect(await screen.findByText('Dados de exemplo restaurados')).toBeInTheDocument();
    expect(repoPacientes.obter(p.id)).toBeUndefined();
  });
});
