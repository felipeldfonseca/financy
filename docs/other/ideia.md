# Assistente Financeiro Conversacional

## 1) Visão Conceitual (alto nível)

### Objetivo

Unificar o gerenciamento financeiro **pessoal** e **colaborativo (família/grupos)** em uma experiência conversacional: texto, voz e imagens enviadas por WhatsApp/Telegram se transformam em transações estruturadas, assinaturas/parcelas rastreadas e um painel consolidado com alertas e projeções.

### Principais Elementos

* **Usuários e Grupos**: cada pessoa possui um **Espaço Pessoal** (privado) e pode participar de **Espaços Compartilhados** (família, casal, viagem, projeto).
* **Entrada Natural**: mensagens (texto/áudio/imagem) viram dados financeiros automaticamente.
* **Roteamento por Contexto**: o sistema entende em que contexto a mensagem foi enviada (pessoal vs. grupo) e armazena isoladamente.
* **Classificação Inteligente**: categoria, recorrência (assinaturas), parcelas, moeda, participante responsável, etc.
* **Consolidação e Insights**: dashboards por contexto e visão consolidada; alertas de vencimentos; projeções do fluxo futuro.

### Diagrama Conceitual (Mermaid)

```mermaid
flowchart LR
    subgraph U[Usuários]
      A[Usuário — Espaço Pessoal]
      B[Grupo Família]
      C[Grupo Projeto/Viagem]
    end

    A -->|mensagens| INJ[(Camada de Entrada\nConectores de Mensageria)]
    B -->|mensagens| INJ
    C -->|mensagens| INJ

    INJ --> INTL[Camada de Inteligência\n(NLP/ASR/OCR + Regras)]
    INTL --> ROUTER[Roteador de Contexto\n(Pessoal/Grupo/Carteiras)]

    subgraph D[Armazenamento por Contexto]
      DP[(Dados Pessoais)]
      DG[(Dados Grupo Família)]
      DX[(Dados Grupo Projeto)]
    end

    ROUTER --> DP
    ROUTER --> DG
    ROUTER --> DX

    subgraph AIN[Análise e Insights]
      CLS[Classificação e Enriquecimento\n(categorias, recorrência, parcelas)]
      ALRT[Alertas & Lembretes\n(vencimentos, assinaturas)]
      PRJ[Projeções & Orçamento\n(fluxo futuro)]
    end

    DP --> AIN
    DG --> AIN
    DX --> AIN

    AIN --> DASH[Dashboards & Relatórios\n(Pessoal / Grupo / Consolidado)]
    AIN --> NOTIF[Notificações\n(Resumo Semanal, Pendências)]
```

### Fluxos-Chave (narrativa)

1. **Mensagem → Dado**: “Paguei R$230 de luz BR” (imagem/áudio/texto) → OCR/ASR/NLP → categoria **Moradia** → contexto **Família**.
2. **Assinaturas**: “Renovei Netflix US$ 19,99” → detecta recorrência mensal → adiciona a **Assinaturas (Família)**, agenda próximo ciclo e soma na projeção do mês.
3. **Parcelas**: “iPhone 12x de R$450 (3/12)” → controla quantas faltam, previsões de desembolso até o término e descontinua após fim.
4. **Visões**: **Meu Financeiro** (privado) vs **Família** (compartilhado) vs **Projeto** (temporário) — tudo com gráficos e resumos de fácil leitura.

---

## 2) Visão Técnica (MVP-ready)

### Arquitetura de Referência (componentes)

* **Conectores de Mensageria**: Telegram (MVP), WhatsApp (futuro via Cloud API), e-mail opcional.
* **Webhook/API Gateway**: recebe eventos de mensagem e despacha para processadores.
* **Processamento**:

  * **Parser** de mensagens (texto + comandos leves)
  * **ASR (voz)** para transcrição (ex.: Whisper)
  * **OCR (imagem)** para notas/boletos/contas (ex.: Tesseract/Google Vision)
  * **NLP + Regras** para extrair: valor, moeda, categoria, recorrência, parcelas, data de vencimento, origem.
* **Roteador de Contexto**: mapeia chat → **tenant/contexto** (pessoal vs. grupo).
* **Banco de Dados**: coleções por contexto com separação lógica (multi-tenant). Índices por data, categoria, recorrência.
* **Agendador/Jobs**: geração de alertas de vencimento, resumos semanais, projeções mensais.
* **Painel/BI**: Streamlit/Retool/AppSheet (MVP) ou Next.js + Charting (v1).
* **Autenticação e Permissões**: por contexto (proprietário, edit, viewer), convites por link/código.

### Diagrama Técnico (Mermaid)

```mermaid
flowchart TB
    subgraph MSG[Mensageria]
      TG[Telegram Bot]
      WA[WhatsApp Cloud API\n(futuro)]
    end

    TG --> GW[Webhook/API Gateway]
    WA --> GW

    GW --> P[Message Parser\n(comandos/intenções)]

    subgraph AI[Processamento Inteligente]
      ASR[ASR (Voz→Texto)]
      OCR[OCR (Imagem→Texto)]
      NLP[NLP + Regras\n(extração semântica)]
    end

    P -->|voz| ASR
    P -->|imagem| OCR
    P -->|texto| NLP

    subgraph CTX[Roteamento & Contextos]
      MAP[Mapeador de Chat→Contexto\n(pessoal/grupo)]
      TEN[Isolamento Multi-tenant]
    end

    NLP --> MAP
    MAP --> TEN

    subgraph DB[(Banco de Dados)]
      COLP[(Coleção: Pessoal)]
      COLF[(Coleção: Família)]
      COLG[(Coleção: Outros Grupos)]
      IDX[(Índices: data, categoria, recorrência)]
    end

    TEN --> COLP
    TEN --> COLF
    TEN --> COLG
    TEN --> IDX

    subgraph SCHED[Agendador/Jobs]
      REM[Alertas/Lembretes\n(vencimentos, assinaturas)]
      RSM[Resumos (semanal/mensal)]
      PRJ[Projeções de Fluxo\n(assinaturas+parcelas)]
    end

    DB --> SCHED

    subgraph UI[Visualização]
      DASH[Dashboard Web (MVP: Streamlit/Retool/AppSheet)]
      API[API de Consulta]
    end

    DB --> API --> DASH
    SCHED --> DASH
```

### Modelo de Dados (simplificado)

* **contexts** `{ id, name, type: "personal|group", currency, members[], permissions }`
* **transactions** `{ id, context_id, user_id, ts, amount, currency, category, tags[], source: "text|voice|image", note, linked_contract_id? }`
* **contracts** (assinaturas/parcelas) `{ id, context_id, type: "subscription|installment", vendor, amount, currency, period: "monthly|yearly", next_due, remaining_installments?, end_date?, active }`
* **alerts** `{ id, context_id, contract_id?, due_at, status: "pending|sent|ack" }`

### Fluxo de Mensagem (pseudopipeline)

1. **Receber** mensagem → identificar tipo (texto/áudio/imagem) e **chat_id**.
2. **Resolver contexto** via `chat_id → context_id` (pessoal/grupo) e permissões.
3. **Extrair dados** (ASR/OCR/NLP): valor, moeda, categoria, recorrência/parcelas, vencimento.
4. **Persistir** `transactions` e/ou `contracts` (se recorrente/parcelado).
5. **Agendar** alertas se houver `next_due`.
6. **Emitir** confirmação amigável no chat + atualização no dashboard.

### Segurança/Privacidade (MVP)

* Isolamento por `context_id`; membros e papéis por contexto.
* Criptografia em repouso (DB) e em trânsito (HTTPS).
* Logs mínimos e redação de dados sensíveis em mensagens (ex.: mascarar números).

### Roadmap Técnico

1. **MVP-1 (2–3 semanas)**: Telegram → Sheets/Firestore, categorias básicas, dashboard simples, resumo semanal.
2. **MVP-2**: OCR + detecção de assinaturas/parcelas, lembretes, multi-moeda, dashboards por contexto.
3. **v1**: WhatsApp Cloud API, convites/permits, projeções e orçamento, relatórios compartilháveis.
4. **v1.5**: Integrações (bancos/exchanges) e reconciliação.

---

## Notas Finais

* A separação **Pessoal vs. Grupos** é nativa no desenho — cada mensagem já nasce no contexto certo (chat pessoal ou chat do grupo).
* O sistema oferece **privacidade por padrão** e **colaboração por convite**.
* A detecção de **assinaturas/parcelas** cria o diferencial de projeção do fluxo futuro e alívio da ansiedade financeira.
