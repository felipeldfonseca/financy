/**
 * Minimal mock of the Pluggy API for offline development and E2E smoke tests.
 *
 * Serves one connected item with two accounts (checking + credit card) and a
 * fixed set of Brazilian-looking transactions. Responses are stable across
 * calls, which is exactly what exercises the sync dedupe: syncing twice must
 * import zero new transactions the second time.
 *
 * Usage:
 *   node backend/test/mock-pluggy-server.js            # listens on :8788
 *   MOCK_PLUGGY_PORT=9000 node backend/test/mock-pluggy-server.js
 *
 * Point the backend at it with:
 *   PLUGGY_BASE_URL=http://127.0.0.1:8788 PLUGGY_CLIENT_ID=mock PLUGGY_CLIENT_SECRET=mock
 *
 * The item id the widget would return is "mock-item-1" — register a
 * connection with: POST /api/v1/open-finance/connections {"itemId": "mock-item-1"}
 */
const http = require('http');
const { URL } = require('url');

const PORT = Number(process.env.MOCK_PLUGGY_PORT || 8788);
// Small page size on purpose: forces the backend's pagination loop to run.
const PAGE_SIZE_CAP = 5;

const ITEM = {
  id: 'mock-item-1',
  status: 'UPDATED',
  executionStatus: 'SUCCESS',
  connector: {
    id: 201,
    name: 'Mock Bank (Pluggy sandbox)',
    imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/201.svg',
    isSandbox: true,
  },
  error: null,
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
};

const ACCOUNTS = [
  {
    id: 'mock-acc-checking',
    itemId: ITEM.id,
    type: 'BANK',
    subtype: 'CHECKING_ACCOUNT',
    name: 'Conta Corrente',
    number: '0001/12345-6',
    balance: 3241.77,
    currencyCode: 'BRL',
  },
  {
    id: 'mock-acc-card',
    itemId: ITEM.id,
    type: 'CREDIT',
    subtype: 'CREDIT_CARD',
    name: 'Cartão Platinum',
    number: '9876',
    balance: -1874.3,
    currencyCode: 'BRL',
  },
];

const TRANSACTIONS = [
  // Checking account
  tx('c1', 'mock-acc-checking', '2026-08-05T09:12:00Z', 'PAGAMENTO DE SALARIO EMPRESA XPTO', 8500.0, 'CREDIT', 'Salary'),
  tx('c2', 'mock-acc-checking', '2026-08-05T13:40:00Z', 'PIX ENVIADO MARIA S', -250.0, 'DEBIT', 'Transfer - PIX'),
  tx('c3', 'mock-acc-checking', '2026-08-06T11:05:00Z', 'SUPERMERCADO PAO DE ACUCAR', -412.88, 'DEBIT', 'Groceries'),
  tx('c4', 'mock-acc-checking', '2026-08-08T20:31:00Z', 'IFOOD *RESTAURANTE', -68.9, 'DEBIT', 'Food delivery'),
  tx('c5', 'mock-acc-checking', '2026-08-10T08:00:00Z', 'ALUGUEL IMOBILIARIA CENTRO', -2200.0, 'DEBIT', 'Rent'),
  tx('c6', 'mock-acc-checking', '2026-08-12T16:22:00Z', 'PAGAMENTO FATURA CARTAO PLATINUM', -1500.0, 'DEBIT', 'Credit card payment'),
  tx('c7', 'mock-acc-checking', '2026-08-15T10:10:00Z', 'RENDIMENTO POUPANCA', 12.34, 'CREDIT', 'Interest income'),
  tx('c8', 'mock-acc-checking', '2026-08-18T14:45:00Z', 'PIX RECEBIDO JOAO P', 120.0, 'CREDIT', 'Transfer - PIX'),
  // Credit card
  tx('k1', 'mock-acc-card', '2026-08-07T19:03:00Z', 'UBER *TRIP SAO PAULO', -32.45, 'DEBIT', 'Taxi and ride-hailing'),
  tx('k2', 'mock-acc-card', '2026-08-09T21:15:00Z', 'NETFLIX.COM ASSINATURA', -55.9, 'DEBIT', 'Video streaming'),
  tx('k3', 'mock-acc-card', '2026-08-11T12:30:00Z', 'DROGARIA SAO PAULO', -89.7, 'DEBIT', 'Pharmacy'),
  tx('k4', 'mock-acc-card', '2026-08-16T18:55:00Z', 'POSTO SHELL COMBUSTIVEL', -180.0, 'DEBIT', 'Gas stations', 'PENDING'),
];

function tx(id, accountId, date, description, amount, type, category, status = 'POSTED') {
  return {
    id: `mock-tx-${id}`,
    accountId,
    date,
    description,
    amount,
    currencyCode: 'BRL',
    category,
    type,
    status,
    merchant: null,
    paymentData: null,
  };
}

function json(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function paginate(results, query) {
  const pageSize = Math.min(Number(query.get('pageSize') || 20), PAGE_SIZE_CAP);
  const page = Number(query.get('page') || 1);
  const start = (page - 1) * pageSize;
  return {
    results: results.slice(start, start + pageSize),
    page,
    totalPages: Math.max(1, Math.ceil(results.length / pageSize)),
    total: results.length,
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  console.log(`[mock-pluggy] ${req.method} ${req.url}`);

  if (req.method === 'POST' && path === '/auth') {
    return json(res, 200, { apiKey: 'mock-api-key' });
  }
  if (req.method === 'POST' && path === '/connect_token') {
    return json(res, 200, { accessToken: 'mock-connect-token' });
  }
  if (req.method === 'GET' && path.startsWith('/items/')) {
    return json(res, 200, { ...ITEM, id: path.split('/')[2] });
  }
  if (req.method === 'DELETE' && path.startsWith('/items/')) {
    return json(res, 200, {});
  }
  if (req.method === 'GET' && path === '/accounts') {
    return json(res, 200, paginate(ACCOUNTS, url.searchParams));
  }
  if (req.method === 'GET' && path === '/transactions') {
    const accountId = url.searchParams.get('accountId');
    const from = url.searchParams.get('from');
    let results = TRANSACTIONS.filter(t => t.accountId === accountId);
    if (from) {
      results = results.filter(t => t.date.slice(0, 10) >= from);
    }
    return json(res, 200, paginate(results, url.searchParams));
  }

  json(res, 404, { message: `mock-pluggy: no route for ${req.method} ${path}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-pluggy] listening on http://127.0.0.1:${PORT}`);
  console.log(`[mock-pluggy] item id: ${ITEM.id} · ${ACCOUNTS.length} accounts · ${TRANSACTIONS.length} transactions`);
});
