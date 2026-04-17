# Meeting Room Booking API

Sistema fullstack para reserva de salas com autenticação, PostgreSQL, FastAPI, React e processamento assíncrono de notificações usando o padrão Outbox.

O projeto está organizado como monorepo:

```text
backend/
frontend/
docker-compose.yml
```

## Stack

- Backend: Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Poetry, Pytest
- Frontend: React, TypeScript, Vite
- Infra local: Docker e Docker Compose

## Execução com Docker

Requisitos:

- Docker
- Docker Compose

Suba tudo com:

```bash
docker compose up --build
```

Serviços:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

O Compose sobe `db`, `backend`, `worker` e `frontend`. O worker usa o mesmo código do backend, aponta para o mesmo PostgreSQL e não expõe porta HTTP.

Para subir só o worker, quando os demais serviços já estiverem disponíveis:

```bash
docker compose up worker
```

## Execução Manual

Requisitos:

- Python 3.12
- Poetry
- PostgreSQL
- Node 20+ para o frontend

Crie o banco:

```bash
createdb meeting_rooms
```

Configure o backend:

```bash
cd backend
poetry install
cp .env.example .env
```

Variáveis de ambiente usadas pelo backend:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/meeting_rooms
JWT_SECRET_KEY=dummy-value
ENVIRONMENT=development
```

`JWT_SECRET_KEY` é obrigatório no startup da API. `ENVIRONMENT` controla endpoints de desenvolvimento, como o seed.

Aplicar migrations manualmente:

```bash
cd backend
poetry run alembic upgrade head
```

A API e o worker também aplicam migrations no startup por meio de `source.core.migrations.run_migrations()`.

Rodar a API:

```bash
cd backend
poetry run uvicorn source.main:app --reload
```

Rodar o worker em outro terminal:

```bash
cd backend
poetry run python -m source.features.outbox.run_worker
```

Rodar o frontend:

```bash
cd frontend
npm install
npm run dev
```

## Autenticação

Endpoints principais:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Criar conta:

```json
{
  "email": "user@example.com",
  "password": "UserPass123!",
  "confirm_password": "UserPass123!"
}
```

Login:

```json
{
  "email": "user@example.com",
  "password": "UserPass123!"
}
```

As respostas de criar conta e login retornam `access_token` com `token_type = bearer`. Para acessar endpoints protegidos, envie no header:

```http
Authorization: Bearer <access_token>
```

Reservas só podem ser alteradas ou canceladas pelo usuário que criou a reserva.

## Seed de Desenvolvimento

O endpoint de seed existe para popular dados de demonstração, para facilitar o uso do sistema:

```http
POST /dev/populate-mock-data
```

Ele só fica disponível quando `ENVIRONMENT` está como `development`, `dev`, `local`, `test` ou `testing`. Qualquer outra configuração fora essas vai retornar `403`.

O seed cria (ou atualiza) dados mockados para salas, usuários, reservas, participantes e entregas de e-mail usadas pelo frontend. Ele também remove dados mockados anteriores ligados ao dataset de desenvolvimento antes de recriar o cenário (ou seja, idempotência)

## Reservas e Concorrência

O service de bookings valida regras de negócio antes de gravar no banco:

- título obrigatório
- horário de início anterior ao horário de fim
- início e fim no mesmo dia
- duração mínima de 15 minutos
- duração máxima de 8 horas
- reserva ativa não pode sobrepor outra reserva ativa da mesma sala
- reservas canceladas não podem ser editadas

Além da validação de aplicação, a proteção real contra concorrência está no PostgreSQL.

A migration `7b9c1d2e3f40_add_booking_overlap_exclusion_constraint.py` cria a extensão `btree_gist` e adiciona uma exclusion constraint parcial:

```sql
EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (status = 'active')
```

Isso impede, na camada do banco, que duas reservas ativas da mesma sala tenham intervalos sobrepostos, mesmo quando requisições simultâneas passam pela validação de overlap ao mesmo tempo. O range usa limite inferior fechado e superior aberto ([)), então reservas adjacentes são permitidas.

Quando o PostgreSQL retorna a `constraint violation`, o service converte o erro em `409 Conflict` com a mesma mensagem usada na validação antecipada. Cancelar uma reserva muda o status para `canceled`, registra `canceled_at` e libera aquele intervalo para nova reserva.

## Outbox

Criar, atualizar ou cancelar uma reserva grava o evento correspondente na tabela `outbox_events` na mesma transação da alteração da reserva.

Eventos usados:

- `BOOKING_CREATED`
- `BOOKING_UPDATED`
- `BOOKING_CANCELED`

Fluxo:

1. A API grava a reserva.
2. A API grava o evento de outbox na mesma transação que gerou a reserva.
3. A transação é confirmada.
4. O worker consulta quais eventos estão marcados como `pending`.
5. O worker processa notificações de booking.
6. As entregas são registradas em `email_deliveries`.
7. O evento é marcado como `processed`.

O worker é propositalmente simples: não usa Celery, Redis, RabbitMQ ou Kafka. Ele roda em processo separado, faz polling periódico e compartilha o mesmo banco com a API.

## Retry

Se o processamento de um evento falhar:

- o worker faz rollback da tentativa
- recarrega o evento
- incrementa `retry_count`
- mantém `pending` enquanto `retry_count < 3`
- marca como `failed` quando `retry_count >= 3`

Eventos marcados como `processed` ou `failed` não são selecionados novamente pelo loop normal.

## Idempotência

Cada entrega de e-mail criada a partir de um evento guarda `source_event_id`.

Como um evento pode notificar vários participantes, a idempotência é garantida por um par X-Y:

```text
source_event_id + recipient_email
```

O código verifica se essa entrega já existe antes de criar outra, e o banco possui índice único parcial para impedir duplicidade quando `source_event_id` não é nulo. 

Dessa forma, conseguimos garantir que reprocessamentos não vão duplicar a entrega para o mesmo participante.

## Testes

Rodar a suíte de testes:

```bash
cd backend
poetry run pytest
```

Coberturas relevantes:

- autenticação
- CRUD básico de salas
- criação, edição e cancelamento de reservas
- conflitos normais de horário
- update gerando conflito
- cancelamento liberando novo agendamento
- constraint real de concorrência com duas sessões simultâneas no PostgreSQL
- outbox, retry e idempotência de entregas
- seed de desenvolvimento

O teste de concorrência 
- usa duas sessões reais contra PostgreSQL
- valida que uma inserção conflitante é aceita
- valida que outra é rejeitada pela exclusion constraint. 

Ele é um teste específico de PostgreSQL. Por exemplo, se a suíte for executada em outro dialeto, esse teste é ignorado.

## Decisões e Limitações

- A solução de concorrência é feita deliberadamente na camada do banco, porque validação de overlap em aplicação nem sempre é capaz de bloquear corrida entre transações simultâneas.
- A API ainda mantém a validação antecipada para retornar conflito rapidamente em casos normais. A constraint do banco é a garantia definitiva.
- O worker usa polling simples e retry fixo. Para produção com maior volume, seria natural evoluir para backoff, observabilidade melhor, múltiplos workers coordenados ou uma fila dedicada. Como o escopo do teste é mais simples, preferi manter o worker com código python mesmo.
- As notificações são registradas como entregas no banco; não há integração SMTP real nesta versão.
- O criador da reserva só recebe notificação se também estiver na lista de participantes.
- A extensão `btree_gist` precisa estar disponível no PostgreSQL para a constraint de concorrência.

Essa escolha mantém o escopo pequeno e minimamente viável para o desafio técnico: 
- PostgreSQL garante consistência
- a API fica simples e fácil de entender
- o worker demonstra processamento assíncrono sem adicionar infraestrutura desnecessária.

## Possíveis melhorias futuras

- backoff exponencial no retry do worker
- envio real de e-mail via SMTP
- paginação de bookings
- múltiplos workers concorrentes
- observabilidade (metrics/logging estruturado)
- UI para status de entregas