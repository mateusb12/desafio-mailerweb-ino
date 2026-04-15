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
2. um evento é salvo na tabela `outbox`
3. a transação é confirmada (commit)
4. um worker consulta periodicamente a tabela `outbox`
5. eventos pendentes são processados
6. e-mails são enviados
7. o evento é marcado como processado

O worker roda continuamente buscando novos eventos.

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