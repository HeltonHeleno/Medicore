/**
 * Fase 27 (27.T.2, RS-22) — Carga: 50 pessoas ao mesmo tempo nas telas operacionais.
 *
 * Cada pessoa fica numa tela operacional (fila, mapa, estoque ou Painel): a tela carrega o que
 * pede, a pessoa olha (5 a 15 s) e, de vez em quando, grava — chegada na emergência (área
 * `internacao`), bloqueio e desbloqueio de um leito livre (disputa na mesma área) ou a prévia do
 * FEFO. A recarga de 30 s (D26) está dentro do tempo de olhar. Meta: p95 < 300 ms.
 *
 * `-e RITMO=intenso` tira o tempo de olhar (1 a 3 s): mostra até onde uma instância aguenta.
 *
 * Uso (API local com dados de exemplo; ROTINAS=nao):
 *   k6 run -e API=http://localhost:3000 apps/api/carga/telas-operacionais.js
 * Resumo em JSON: acrescente `--summary-export carga.json`.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const API = `${__ENV.API || 'http://localhost:3000'}/api/v1`;
const DURACAO = __ENV.DURACAO || '2m';
const INTENSO = __ENV.RITMO === 'intenso';

export const options = {
  scenarios: {
    telas: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50 },
        { duration: DURACAO, target: 50 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{tipo:leitura}': ['p(95)<300'],
    'http_req_duration{tipo:gravacao}': ['p(95)<300'],
    erros_inesperados: ['rate<0.01'],
  },
};

const errosInesperados = new Rate('erros_inesperados');
const json = { headers: { 'Content-Type': 'application/json' } };

function ler(caminho) {
  const r = http.get(`${API}${caminho}`, {
    tags: { tipo: 'leitura', rota: caminho.split('?')[0] },
  });
  errosInesperados.add(r.status !== 200);
  check(r, { 'leitura 200': (x) => x.status === 200 });
  return r;
}

function gravar(metodo, caminho, corpo, versao, nome) {
  const params = {
    headers: { ...json.headers, ...(versao ? { 'If-Match': `"v${versao}"` } : {}) },
    tags: { tipo: 'gravacao', rota: nome },
  };
  const r = http.request(metodo, `${API}${caminho}`, corpo ? JSON.stringify(corpo) : null, params);
  // 409/412: outra pessoa mudou o leito antes (é a regra funcionando, não erro).
  errosInesperados.add(![200, 201, 409, 412].includes(r.status));
  return r;
}

/** O que cada tela pede ao abrir e a cada recarga. */
const TELAS = {
  fila: ['/emergencia/fila', '/alertas', '/indicadores/emergencia'],
  mapa: ['/leitos', '/solicitacoes', '/indicadores/leitos'],
  estoque: ['/medicamentos?porPagina=20', '/lotes/vencimento', '/indicadores/estoque'],
  painel: ['/indicadores/operacionais', '/indicadores/cadastros', '/atividades?limite=4'],
};
const NOMES = Object.keys(TELAS);

export default function () {
  if (INTENSO) {
    for (const caminho of Object.values(TELAS).flat()) ler(caminho);
  } else {
    for (const caminho of TELAS[NOMES[Math.floor(Math.random() * NOMES.length)]]) ler(caminho);
  }

  const sorteio = Math.random();
  if (sorteio < 0.15) {
    gravar(
      'POST',
      '/atendimentos',
      {
        provisorio: { descricao: 'Teste de carga', sexo: 'masculino', idadeAproximada: 40 },
        modoChegada: 'meios_proprios',
        queixa: 'Dor abdominal',
        chegadaEm: new Date().toISOString(),
      },
      undefined,
      'chegada',
    );
  } else if (sorteio < 0.3) {
    const livres = ler('/leitos?status=livre&setorId=enfermaria').json();
    const leito = livres[Math.floor(Math.random() * livres.length)];
    if (leito) {
      const b = gravar(
        'POST',
        `/leitos/${leito.id}/bloquear`,
        { motivo: 'Manutenção (teste de carga)' },
        leito.versao,
        'bloquear',
      );
      if (b.status === 200) {
        gravar('POST', `/leitos/${leito.id}/desbloquear`, null, b.json().versao, 'desbloquear');
      }
    }
  } else if (sorteio < 0.4) {
    ler('/medicamentos/med-paracetamol-750/fefo?quantidade=10');
  }
  sleep(INTENSO ? 1 + Math.random() * 2 : 5 + Math.random() * 10);
}
