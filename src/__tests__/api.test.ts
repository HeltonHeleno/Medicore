import * as api from '../services/api';

describe('serviço simulado', () => {
  it('ordena alertas com prioridade alta primeiro', async () => {
    const alertas = await api.getAlertas();
    expect(alertas.map((a) => a.prioridade)).toEqual(['alta', 'alta', 'media']);
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
