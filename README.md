# 🧪 Coding Test — Fullstack
## Meeting Room Booking + Async Notification System

Sistema fullstack para gerenciamento de reservas de salas físicas com envio assíncrono de notificações por e-mail utilizando o padrão **Outbox + Worker**.

---

# 🏗️ Arquitetura

O projeto segue uma abordagem **monorepo**, contendo:

backend/
frontend/
docker-compose.yml

Principais conceitos aplicados:

- Arquitetura vertical por feature no backend
- Separação entre fluxo síncrono (API) e assíncrono (worker)
- Persistência de eventos com padrão Outbox
- Garantia de consistência via transação de banco
- Live reload em ambiente Docker para produtividade

---

# 🧱 Stack utilizada

## Backend
- Python 3.12
- FastAPI
- SQLAlchemy
- PostgreSQL
- Poetry
- Pytest

## Frontend
- React
- TypeScript
- Vite

## Infra
- Docker
- Docker Compose

---

# 🐳 Como executar o projeto (recomendado)

Requisitos:

- Docker
- Docker Compose

**Executar**:
```
docker compose up --build
```

**Serviços disponíveis**:

Frontend:
```
http://localhost:5173
```

**Backend API**:
```
http://localhost:8000
```

**Swagger**:
```
http://localhost:8000/docs
```

**PostgreSQL**:
```
localhost:5432
```

**Worker de outbox**:
```
docker compose up worker
```

Ao executar `docker compose up --build`, o Compose sobe `backend`, `worker`, `db` e `frontend`.
O worker usa o mesmo código do backend, aponta para o mesmo PostgreSQL e não expõe porta HTTP.
---


# 💻 Execução manual (sem Docker)

## Backend

Requisitos:
- Python 3.12
- Poetry
- PostgreSQL

**Instalar dependências**:
```
cd backend
poetry install
```

**Configurar variável de ambiente**:
```
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meeting_rooms
```
**Executar API**:
```
poetry run uvicorn source.main:app --reload
```

**Executar worker em outro terminal**:
```
cd backend
poetry run python -m source.features.outbox.run_worker
```

**API**:
```
http://localhost:8000
```
**Docs**:
```
http://localhost:8000/docs
```
---

## Frontend

**Requisitos**:
- Node 20+

**Instalar dependências**:
```
cd frontend
npm install
```

**Executar**:
```
npm run dev
```

**Frontend**:
```
http://localhost:5173
```

---

## Banco de dados

**Criar database**:
```
createdb meeting_rooms
```
ou:
```
CREATE DATABASE meeting_rooms;
```

# 🔁 Live Reload

O ambiente de desenvolvimento suporta live reload automático:

- alterações no backend reiniciam a API automaticamente
- alterações no frontend atualizam o navegador automaticamente

Não é necessário rebuild de container.

---

# 📬 Outbox Pattern

Enviar e-mail diretamente dentro da transação da reserva pode gerar inconsistências.

Exemplo de problema:

1. a reserva é salva no banco
2. tentativa de enviar e-mail
3. ocorre falha no envio (timeout, SMTP fora, erro de rede)
4. a reserva foi criada, mas ninguém foi notificado

ou o contrário:

1. e-mail enviado
2. falha antes do commit da transação
3. usuário recebe notificação de uma reserva que não existe

Para evitar esse tipo de inconsistência, o sistema utiliza o padrão **Outbox**.

A ideia é salvar o evento de notificação na mesma transação da reserva.

Fluxo:

1. a reserva é salva
2. um evento é salvo na tabela `outbox_events`
3. a transação é confirmada (commit)
4. um worker consulta periodicamente a tabela `outbox_events`
5. eventos pendentes são processados
6. entregas são registradas em `email_deliveries` para os participantes da reserva
7. o evento é marcado como processado

## Worker

O worker é propositalmente simples e roda como processo separado da API.
A API continua responsável por subir o FastAPI, aplicar migrations no startup e expor endpoints.
O worker possui um entrypoint próprio em `source/features/outbox/run_worker.py`, aplica migrations no startup e executa o `worker_loop`.
O runtime do worker fica responsável por buscar eventos pendentes, controlar retry/falha e despachar o processamento.
A montagem de notificações de reserva fica separada em `source/features/bookings/notifications.py`.

Para eventos `BOOKING_CREATED`, `BOOKING_UPDATED` e `BOOKING_CANCELED`, o handler de booking:

- resolve os destinatários a partir dos participantes da reserva
- normaliza os e-mails para minúsculas
- remove destinatários duplicados
- monta assunto e corpo da notificação
- registra um `email_delivery` por participante

O criador da reserva só recebe notificação se também estiver na lista de participantes.
Essa escolha segue o foco do desafio: notificar os participantes da reserva.

Em desenvolvimento, isso significa que basta subir o ambiente normalmente:

```
docker compose up --build
```

ou, manualmente, em dois terminais:

```
cd backend
poetry run uvicorn source.main:app --reload
```

```
cd backend
poetry run python -m source.features.outbox.run_worker
```

Não existe Celery, Redis, RabbitMQ ou Kafka nesta versão. A separação é apenas de processo:
API e worker compartilham o mesmo banco e o mesmo código de domínio, mas executam de forma independente.

## Retry

Falhas no processamento de um evento são tratadas de forma explícita:

- o worker incrementa `retry_count`
- enquanto `retry_count < 3`, o evento continua com status `pending`
- ao atingir `retry_count == 3`, o evento é marcado como `failed`
- eventos `processed` ou `failed` não são selecionados novamente pelo loop normal

Essa estratégia mantém o comportamento previsível sem introduzir scheduler complexo ou infraestrutura adicional.

## Idempotência

Cada entrega criada a partir do outbox guarda o `source_event_id`.
Como um evento de reserva pode notificar vários participantes, um mesmo `source_event_id` pode aparecer em múltiplas linhas de `email_deliveries`.
Para evitar duplicidade:

- o serviço de email delivery verifica se já existe uma entrega para o mesmo par `source_event_id` + `recipient_email` antes de criar outra
- o banco possui um índice único parcial em `email_deliveries(source_event_id, recipient_email)` quando `source_event_id` não é nulo

Assim, se o worker tentar processar o mesmo evento novamente, o mesmo participante não recebe entregas duplicadas para aquele evento, mas outros participantes do mesmo evento continuam podendo ter suas próprias entregas.

## Por que não usar Celery ou serviços terceirizados?

Celery, Redis ou RabbitMQ seriam opções naturais em um sistema com maior volume, múltiplos workers distribuídos, filas com prioridade, backoff avançado, agendamento, observabilidade mais profunda e isolamento operacional entre API e processamento assíncrono.

Neste desafio, a escolha foi manter uma solução proporcional ao escopo:

- menos serviços para configurar
- menos moving parts para avaliar
- consistência garantida pelo PostgreSQL
- comportamento assíncrono suficiente para demonstrar o padrão Outbox
- separação real entre processo web e processo de worker
- caminho claro para evolução futura

Uma evolução futura poderia substituir o polling simples por Celery ou outra fila, mantendo a tabela de outbox como fonte transacional dos eventos. A API continuaria criando reservas e eventos na mesma transação; o mecanismo de consumo é que passaria a ter uma infraestrutura dedicada.

Benefícios:

- garante consistência entre banco e notificação
- permite retry em caso de falha no envio
- evita envio duplicado (idempotência)
- desacopla processamento assíncrono da API

---


# 📌 Decisões técnicas

**FastAPI:**
simples, performático e adequado para APIs REST

**PostgreSQL:**
suporte robusto a transações e concorrência

**Outbox Pattern:**
garante consistência entre operações síncronas e assíncronas

**Arquitetura vertical:**
organiza o código por domínio, facilitando manutenção

**Docker:**
ambiente reproduzível com setup simplificado

---
