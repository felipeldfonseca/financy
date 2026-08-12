# Robustez de produção

O que existe, como ligar, e o que fazer quando algo quebrar.

## 1. Health check honesto

`GET /api/v1/health` responde **200** só quando o Postgres responde
(`SELECT 1` com timeout de 3s). Banco fora → **503** com `database: "down"`.

### Monitor de uptime (ação sua, ~5 min)

1. Crie conta gratuita no [UptimeRobot](https://uptimerobot.com) (50 monitores grátis).
2. Novo monitor → tipo **HTTP(s)** → URL
   `https://<seu-backend>.railway.app/api/v1/health` → intervalo 5 min.
3. Alerta por e-mail (padrão). Opcional: app do UptimeRobot para push.

Assim, backend fora do ar ou banco caído = e-mail em até 5 minutos.

## 2. Monitoramento de erros (Sentry)

Opt-in por variável de ambiente — sem DSN configurado, nada muda.

- **O que reporta**: erros inesperados e respostas 5xx no backend; crashes de
  renderização no frontend (com uma tela de "recarregar" no lugar da página
  branca). Recusas normais da API (401/403/404/409/validação) **não** viram
  incidente.

### Ligar (ação sua, ~10 min)

1. Conta gratuita em [sentry.io](https://sentry.io) (5k eventos/mês grátis).
2. Crie dois projetos: um **Node.js** e um **React**.
3. Railway → variável `SENTRY_DSN` = DSN do projeto Node.
4. Vercel → variável `REACT_APP_SENTRY_DSN` = DSN do projeto React
   (precisa de um redeploy do frontend para valer).

No boot do backend o log confirma: `🛰️ Sentry error monitoring enabled`.

## 3. Backup diário do banco

Todo dia às **01:00 (Brasília)** o backend roda `pg_dump`, comprime e envia o
arquivo `financy-backup-AAAA-MM-DD.sql.gz` como documento no **chat privado do
Telegram** configurado. A cópia fica fora do Railway — que é a propriedade que
um backup precisa ter.

### Ligar (ação sua, ~2 min)

1. Railway → variável `DATABASE_BACKUP_CHAT_ID` = o **seu** id numérico do
   Telegram (o mesmo `telegramUserId` da sua conta vinculada; se precisar,
   mande `/start` para o bot e pegue o id no campo `from.id` dos logs, ou use
   o @userinfobot).
2. Pronto — o primeiro arquivo chega na próxima 01:00. Sem a variável, o job
   não roda.

> O arquivo contém **todos os dados de todos os usuários**. Aponte para o seu
> chat privado, nunca para um grupo.

### Restaurar

```bash
gunzip -c financy-backup-2026-08-13.sql.gz | psql "$DATABASE_URL"
```

Em um banco novo/vazio (instância nova do Railway): rode o comando acima e
depois suba o backend normalmente — as migrações reconhecem o schema existente.

### Backup do próprio Railway (complementar)

No painel do Railway, o plugin Postgres oferece backups/snapshots conforme o
plano. Vale conferir em *Database → Backups* e ativar o que houver — o backup
via Telegram continua sendo a cópia externa.

## 4. Variáveis de ambiente novas

| Variável | Onde | Efeito |
| --- | --- | --- |
| `SENTRY_DSN` | Railway (backend) | liga o monitoramento de erros do backend |
| `REACT_APP_SENTRY_DSN` | Vercel (frontend) | liga o monitoramento do frontend |
| `DATABASE_BACKUP_CHAT_ID` | Railway (backend) | liga o backup diário via Telegram |

Todas opcionais e independentes: sem elas o comportamento é exatamente o
anterior.
