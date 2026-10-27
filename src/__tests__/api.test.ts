import { dataDoInstante, hojeNoFuso } from '../utils/datas';
import * as api from '../services/api';

describe('serviço simulado', () => {
  it('ordena alertas com prioridade alta primeiro', async () => {
    const alertas = await api.getAlertas();
    expect(alertas.map((a) => a.prioridade)).toEqual(['alta', 'alta', 'media']);
  });

  it('ordena consultas de hoje por horário crescente', async () => {
    const consultas = await api.getConsultasHoje();
    const horarios = consultas.map((c) => c.horario);
    expect(horarios).toEqual([...horarios].sort());
    expect(dataDoInstante(horarios[0])).toBe(hojeNoFuso());
  });

  it('ordena atividades da mais recente para a mais antiga', async () => {
    const atividades = await api.getAtividades();
    const horarios = atividades.map((a) => a.horario);
    expect(horarios).toEqual([...horarios].sort().reverse());
  });

  it('devolve a série do período pedido', async () => {
    expect(await api.getInternacoes('semana')).toHaveLength(7);
    expect(await api.getInternacoes('mes')).toHaveLength(4);
    expect(await api.getInternacoes('ano')).toHaveLength(12);
  });

  it('devolve cópias, sem expor os dados mockados a mutações', async () => {
    const primeira = await api.getDepartamentos();
    primeira[0].desempenho = 0;
    const segunda = await api.getDepartamentos();
    expect(segunda[0].desempenho).toBe(88);
  });
});
