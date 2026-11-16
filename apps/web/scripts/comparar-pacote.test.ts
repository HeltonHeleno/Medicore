import { describe, expect, it } from 'vitest';
import { compararPacote, LIMITE_AVISO, MARCA_COMENTARIO, semHash } from './comparar-pacote.ts';
import type { Medicao } from './comparar-pacote.ts';

function medicao(js: number, css: number, arquivos?: Medicao['arquivos']): Medicao {
  return {
    total: js + css,
    js,
    css,
    marcadores: [],
    arquivos: arquivos ?? [
      { caminho: 'assets/index-AbC12345.js', gzip: js },
      { caminho: 'assets/index-Zz9_-x1y.css', gzip: css },
    ],
  };
}

const BASE = medicao(146_739, 10_547); // 153,6 kB, a linha de base da 1.2.0

describe('semHash', () => {
  it('tira o hash do Vite do nome do arquivo', () => {
    expect(semHash('assets/index-AbC12345.js')).toBe('assets/index.js');
    expect(semHash('assets/graficos-a_b-c1d2.js')).toBe('assets/graficos.js');
    expect(semHash('assets/index-Zz9_-x1y.css')).toBe('assets/index.css');
  });

  it('não mexe em nomes sem hash', () => {
    expect(semHash('assets/fonte.woff2')).toBe('assets/fonte.woff2');
  });
});

describe('compararPacote', () => {
  it('sem a medição da main, mostra só o tamanho atual', () => {
    const r = compararPacote(null, BASE);
    expect(r.texto).toContain(MARCA_COMENTARIO);
    expect(r.texto).toContain('**153,6 kB** com gzip');
    expect(r.texto).toContain('Sem medição da `main`');
    expect(r.diferenca).toBeNull();
    expect(r.aviso).toBe(false);
  });

  it('pacote igual: diferença ±0,0 e sem lista de arquivos', () => {
    const r = compararPacote(BASE, medicao(146_739, 10_547));
    expect(r.texto).toContain('**153,6 kB → 153,6 kB (±0,0 kB)**');
    expect(r.texto).not.toContain('Arquivos que mudaram');
    expect(r.aviso).toBe(false);
  });

  it('crescimento pequeno: mostra a diferença e os arquivos, sem aviso', () => {
    const r = compararPacote(BASE, medicao(146_739 + 1_024, 10_547));
    expect(r.texto).toContain('(+1,0 kB)');
    expect(r.texto).toContain('| `assets/index.js` | 143,3 kB | 144,3 kB | +1,0 kB |');
    expect(r.diferenca).toBe(1_024);
    expect(r.aviso).toBe(false);
  });

  it('crescimento acima de 5 kB: aviso no comentário', () => {
    const r = compararPacote(BASE, medicao(146_739 + LIMITE_AVISO + 1, 10_547));
    expect(r.aviso).toBe(true);
    expect(r.texto).toContain('cresceu mais de 5,0 kB');
  });

  it('exatamente 5 kB ainda não avisa', () => {
    expect(compararPacote(BASE, medicao(146_739 + LIMITE_AVISO, 10_547)).aviso).toBe(false);
  });

  it('redução aparece com sinal de menos', () => {
    const r = compararPacote(BASE, medicao(146_739 - 2_048, 10_547));
    expect(r.texto).toContain('(−2,0 kB)');
    expect(r.aviso).toBe(false);
  });

  it('arquivos novos e removidos', () => {
    const atual = medicao(146_739, 10_547, [
      { caminho: 'assets/index-AbC12345.js', gzip: 146_739 - 1_000 },
      { caminho: 'assets/sentry-Qq11Ww22.js', gzip: 1_000 },
      { caminho: 'assets/index-Zz9_-x1y.css', gzip: 10_547 },
    ]);
    const base = medicao(146_739, 10_547, [
      ...BASE.arquivos,
      { caminho: 'assets/antigo-Kk33Ll44.js', gzip: 512 },
    ]);
    const r = compararPacote(base, atual);
    expect(r.texto).toContain('| `assets/sentry.js` | novo | 1,0 kB | +1,0 kB |');
    expect(r.texto).toContain('| `assets/index.js` | 143,3 kB | 142,3 kB | −1,0 kB |');
    expect(r.texto).toContain('| `assets/antigo.js` | 0,5 kB | removido | −0,5 kB |');
  });
});
