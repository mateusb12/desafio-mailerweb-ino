
# 🧪 Coding Test — Fullstack
## Meeting Room Booking + Async Notification System

---

# 📌 Sobre o Desafio

Você deverá desenvolver uma aplicação **Fullstack** para gerenciamento de reservas de salas com um sistema de notificação assíncrono por e-mail.

O objetivo é avaliar como você:

- Estrutura a aplicação
- Modela os dados
- Implementa regras de negócio
- Trata concorrência
- Organiza processamento assíncrono
- Escreve testes
- Documenta decisões técnicas

Você tem liberdade de arquitetura e implementação, desde que atenda aos requisitos descritos.

---

# ⏳ Prazo

Após receber o link do desafio, você tem **3 dias corridos** para submeter sua solução.

---

# 🚀 Como proceder

1. Faça o **fork** do repositório oficial:
   https://github.com/MailerWeb/desafio-mailerweb-ino

2. Desenvolva sua solução no seu fork.

3. Ao finalizar, envie o link do seu repositório para avaliação.

---

# 🎯 Objetivo do Projeto

Construir uma aplicação que permita:

- Criar e gerenciar salas
- Criar reservas com prevenção de conflito de horário
- Editar e cancelar reservas
- Notificar automaticamente os participantes por e-mail quando houver mudanças

---

# 🧱 Stack

## Backend
- Python 3.10+
- Framework livre (FastAPI, Flask, Django etc.)
- Banco livre (SQLite permitido, PostgreSQL recomendado)

## Frontend
- React ou Next.js

Estrutura de pastas livre (monorepo ou separadas).

---

# 📖 Contexto do Sistema

A empresa precisa organizar reservas de salas e garantir que os participantes sejam notificados automaticamente quando uma reunião for:

- Criada
- Alterada
- Cancelada

As notificações devem ser processadas de forma **assíncrona**, via worker.

---

# 🔧 Requisitos Funcionais

## 1️⃣ Salas

- Criar sala
- Listar salas
- Visualizar detalhes
- Nome único
- Capacidade válida

---

## 2️⃣ Reservas

Uma reserva deve conter:

- Título
- Sala
- Horário de início e fim
- Status (ativa ou cancelada)
- Participantes

### Regras obrigatórias

- Datas em ISO 8601 com timezone
- `start_at < end_at`
- Duração mínima: 15 minutos
- Duração máxima: 8 horas
- Não pode haver sobreposição de reservas ativas na mesma sala
- Reservas canceladas não devem ser removidas

### Overlap

Existe conflito quando:

    new_start < existing_end AND new_end > existing_start

Reservas que apenas encostam no horário são permitidas.

### Concorrência

A aplicação deve impedir que duas requisições simultâneas criem reservas conflitantes.

Documente sua estratégia (transação, lock, constraint etc.).

---

# 🔐 Autenticação

Deve existir mecanismo de autenticação.

Você pode usar:

- JWT
- Token fixo
- Sistema simplificado

Deve existir conceito de usuário.

Usuários autenticados podem:

- Criar reservas
- Editar reservas
- Cancelar reservas

---

# ✉️ Sistema de Mensageria (Obrigatório)

Além das reservas, o sistema deve implementar um mecanismo assíncrono de notificação por e-mail usando padrão **Outbox + Worker**.

## Eventos que devem gerar notificação

- BOOKING_CREATED
- BOOKING_UPDATED
- BOOKING_CANCELED

## Requisitos

Ao criar/alterar/cancelar uma reserva:

1. Persistir alteração da reserva
2. Criar um evento na tabela de Outbox
3. Garantir que ambos ocorram na mesma transação

---

## Worker

Deve existir um worker separado que:

- Busca eventos pendentes
- Processa envio de e-mails
- Marca como processado
- Implementa retry com controle de tentativas
- Evita envio duplicado (idempotência)

O worker pode ser:

- Celery
- RQ
- Processo simples em loop
- Command separado

Documente como executar.

---
## Conteúdo mínimo do e-mail

- Título da reunião
- Sala
- Horário
- Tipo de evento (criada, alterada, cancelada)

Pode ser texto simples.

---

# 🧪 Testes

## Backend

Esperamos testes cobrindo:

- Validação de datas
- Conflito de reserva
- Permissões
- Criação de evento no outbox
- Processamento pelo worker
- Idempotência de envio

## Frontend

Testes mínimos para:

- Criar reserva
- Exibir erro de conflito
- Fluxo básico de login
- Integração com backend

---

# 🖥️ Frontend

Deve permitir:

- Login
- Listar salas
- Criar reserva
- Editar/cancelar reserva

UX deve tratar:

- Loading
- Erros
- Feedback ao usuário

---

# 📦 Entrega

Seu repositório deve conter:

- Backend
- Frontend
- Testes
- README com:
  - Como rodar backend
  - Como rodar frontend
  - Como rodar worker
  - Variáveis de ambiente
  - Decisões técnicas

Boa sorte 🚀
