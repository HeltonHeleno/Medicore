import * as api from '../services/api';

describe('serviço simulado', () => {
  it('devolve cópias, sem expor os dados mockados a mutações', async () => {
    const primeira = await api.getDepartamentos();
    primeira[0].desempenho = 0;
    const segunda = await api.getDepartamentos();
    expect(segunda[0].desempenho).toBe(88);
  });
});
