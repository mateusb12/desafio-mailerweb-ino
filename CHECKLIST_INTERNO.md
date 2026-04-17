# Checklist interno do desafio

Atualizado em: 2026-04-17

Use este arquivo como tracker de progresso. Marque `[x]` apenas quando o item estiver realmente implementado no codigo atual. Quando houver teste, documentacao ou robustez faltando, mantenha o item como parcial/pendente e registre a observacao.

Legenda operacional:

- `[x]` feito no codigo atual.
- `[~]` parcialmente feito; existe implementacao, mas falta parte relevante do requisito, teste ou garantia tecnica.
- `[ ]` pendente.

## Leitura do estado atual

O projeto tem monorepo com FastAPI, PostgreSQL, Alembic, React/Vite, Docker Compose, autenticacao JWT, salas listaveis, CRUD principal de reservas, criacao de eventos outbox nas mudancas de reserva, tabela `email_deliveries`, worker simples em loop assicrono e seed/populate de desenvolvimento.

O maior ponto ainda nao atendido de forma plena em relacao ao `DESAFIO.md` e a robustez operacional do sistema assincrono e da concorrencia: o worker existe, mas roda dentro do lifespan da API, nao como processo separado; nao ha lock/constraint contra duas requisicoes simultaneas conflitantes; o "envio de email" e um registro interno em `email_deliveries`, nao integracao SMTP/adapter externo.

Evidencias principais:

- `backend/source/main.py` registra `auth`, `rooms`, `bookings`, `email-deliveries` e `dev`, roda migrations e inicia `worker_loop()` no lifespan.
- `backend/source/features/auth/*` implementa cadastro, login, JWT, `/auth/me`, `get_current_user` e bloqueio de usuario inativo.
- `backend/source/features/rooms/controller.py` implementa apenas `GET /rooms`.
- `backend/source/features/bookings/controller.py` implementa listar, criar, editar e cancelar reservas.
- `backend/source/features/bookings/service.py` valida titulo, sala, janela de horario, duracao, overlap, permissao do criador e cria eventos outbox para created/updated/canceled antes do commit.
- `backend/source/features/outbox/worker_runtime.py` busca eventos pendentes, registra uma entrega em `email_deliveries`, marca processado, incrementa retry em falha e marca failed no limite.
- `backend/source/features/email_deliveries/service.py` evita duplicidade por `source_event_id`, com indice unico parcial em `email_deliveries`.
- `frontend/src/pages/*` tem telas autenticadas para login, cadastro, dashboard, salas, reservas e inbox de entregas.
- `README.md` documenta Outbox/Worker, retry e idempotencia, mas ainda nao documenta variaveis/testes/auth/concorrencia com completude.
- Verificacao executada nesta atualizacao: `cd backend && poetry run pytest` passou com 39 testes; `cd frontend && npm run build` passou.

## Status macro

| Area | Status | Observacao |
| --- | --- | --- |
| Monorepo | Parcial | Estrutura existe; `docker-compose.yml` ainda nao define `JWT_SECRET_KEY`, exigido pelo backend no startup. |
| Backend API | Parcial | Auth, reservas, email_deliveries e listagem de salas existem; faltam criar/detalhar sala, detalhar reserva e concorrencia robusta. |
| Banco/migracoes | Parcial | Tabelas, enums, constraints basicas, outbox e email_deliveries existem; falta garantia real de overlap concorrente no banco. |
| Salas | Parcial | Modelo, seed e listagem existem; criar sala e detalhe nao existem. |
| Reservas | Parcial | CRUD principal, validacoes, overlap e outbox existem; falta endpoint de detalhe e garantia contra corrida concorrente. |
| Autenticacao | Parcial | Cadastro/login/JWT/protecao existem e tem testes; README ainda nao documenta bem fluxo/credenciais. |
| Outbox | Parcial | Eventos sao criados na mesma transacao das reservas; ainda faltam testes explicitos de atomicidade/rollback. |
| Worker | Parcial | Loop existe e tem testes; nao e processo separado nem servico Docker separado como o desafio pede. |
| Email/email_deliveries | Parcial | Registro persistente e idempotente de entrega existe; nao ha SMTP/provider real, status entregue real, ou envio para todos os participantes. |
| Retry/idempotencia | Parcial | Retry e idempotencia por `source_event_id` existem; falta protecao contra duas instancias pegarem o mesmo evento simultaneamente. |
| Frontend | Parcial | Login/cadastro/salas/reservas/email_deliveries funcionam contra API; faltam testes frontend e alguns textos ainda falam em "seriam notificados". |
| Testes | Parcial | Backend cobre bastante coisa e passa; faltam concorrencia/atomicidade e toda a suite frontend. |
| README | Parcial | Documenta setup e worker atual; falta `JWT_SECRET_KEY`, testes, auth, frontend env e estrategia de concorrencia. |
| Seed/populate | Parcial | `/dev/populate-mock-data` existe, idempotente e testado; falta documentacao operacional no README. |

## Checklist por requisito

### 1. Infra e estrutura

- [x] Criar estrutura monorepo com `backend/` e `frontend/`.
- [~] Criar `docker-compose.yml` com PostgreSQL, backend e frontend.
  - Observacao: os servicos existem, mas o backend exige `JWT_SECRET_KEY` e o compose atual nao define essa variavel; sem isso a API falha no lifespan.
- [x] Configurar backend com FastAPI.
- [x] Configurar frontend com React + TypeScript + Vite.
- [x] Configurar Poetry no backend.
- [x] Configurar Alembic no backend.
- [x] Adicionar comandos padronizados para lint/test/build.
  - Evidencia: `Makefile` tem `test-backend`, `lint-backend`, `lint-frontend`, `migrate`, `up/down`; `frontend/package.json` tem `build`, `lint`, `dev`, `preview`.
- [~] Garantir execucao Docker ponta a ponta.
  - Observacao: compose tem DB/backend/frontend, mas falta `JWT_SECRET_KEY`; nao foi validado `docker compose up --build` nesta atualizacao.

### 2. Banco de dados e modelos

- [x] Criar modelo `Room`.
- [x] Criar modelo `User`.
- [x] Criar modelo `Booking`.
- [x] Criar modelo `BookingParticipant`.
- [x] Criar modelo `OutboxEvent`.
- [x] Criar modelo `EmailDelivery`.
- [x] Criar migracoes das tabelas principais.
- [x] Garantir tipo UUID no ORM atual.
- [x] Adicionar constraint/check para `rooms.capacity > 0`.
- [x] Criar teste garantindo que `rooms.capacity <= 0` e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar constraint/check para status valido em reservas.
- [x] Criar teste garantindo que status invalido de reserva e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar constraint/check para status valido em eventos outbox.
- [x] Criar teste garantindo que status invalido de outbox e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar indice unico parcial para idempotencia de `email_deliveries.source_event_id`.
- [x] Adicionar relacionamentos ORM entre booking, creator e participants.
- [~] Adicionar relacionamentos ORM completos entre booking e room.
  - Observacao: `Booking.room` existe, mas `Room` nao tem `bookings` de volta. Nao bloqueia API atual.
- [x] Adicionar campos uteis de auditoria, como `created_at`, `updated_at`, `canceled_at`, `processed_at` e `delivered_at`.
- [ ] Adicionar constraint/indice/lock de banco para impedir overlap concorrente de reservas ativas.

### 3. API de salas

- [x] Criar schema de saida para salas.
  - Evidencia: `RoomResponse`.
- [ ] Criar schema de entrada para salas.
- [ ] Implementar endpoint para criar sala.
- [x] Implementar endpoint para listar salas.
  - Evidencia: `GET /rooms`.
- [ ] Implementar endpoint para visualizar detalhes de sala.
- [~] Validar nome obrigatorio e unico.
  - Observacao: unico existe no modelo/banco; nao ha endpoint de criacao nem tratamento de erro de API.
- [~] Validar capacidade positiva.
  - Observacao: constraint de banco existe; nao ha payload/API de criacao de sala.
- [ ] Retornar erro adequado para nome duplicado via API.
- [~] Cobrir API de salas com testes.
  - Observacao: ha testes de autenticacao e listagem ordenada; faltam create/detalhe porque os endpoints nao existem.

### 4. API de reservas

- [x] Criar schemas de entrada/saida para reservas.
  - Evidencia: `BookingRequest`, `BookingResponse`, `BookingUserResponse`.
- [x] Implementar endpoint para criar reserva.
- [x] Implementar endpoint para editar reserva.
- [x] Implementar endpoint para cancelar reserva.
- [x] Implementar endpoint para listar reservas.
- [ ] Implementar endpoint para visualizar reserva por id.
- [x] Persistir titulo, sala, inicio, fim, status e participantes.
- [x] Manter reservas canceladas no banco, sem delete fisico.
- [~] Validar datas ISO 8601 com timezone.
  - Observacao: Pydantic valida `datetime`, mas o backend aceita datetime sem timezone e assume UTC em `_as_utc`; o requisito estrito de timezone ainda nao esta garantido.
- [x] Validar `start_at < end_at`.
- [x] Validar duracao minima de 15 minutos.
- [x] Validar duracao maxima de 8 horas.
- [x] Validar existencia da sala.
- [x] Definir participantes por e-mail.
  - Observacao: o servico cria usuario participante automaticamente com senha dev fixa quando o email nao existe.
- [x] Retornar erros claros para payload invalido/conflito.
- [x] Cobrir validacoes principais da API de reservas com testes.
  - Evidencia: testes cobrem auth, create, update, cancel, duracoes, overlap, adjacencia, canceladas e permissao do criador.
- [ ] Testar/implementar detalhe de reserva por id.

### 5. Overlap e concorrencia

- [x] Implementar regra de conflito: `new_start < existing_end AND new_end > existing_start`.
  - Evidencia: `_validate_booking_window`.
- [x] Permitir reservas que apenas encostam no horario.
- [x] Ignorar reservas canceladas na checagem de conflito.
- [x] Impedir conflito no create.
- [x] Impedir conflito no update.
- [x] Criar teste para conflito comum.
- [x] Criar teste para reservas adjacentes permitidas.
- [ ] Implementar estrategia real contra duas requisicoes simultaneas conflitantes.
  - Observacao: ha checagem antes do commit, mas nao ha lock, isolation documentado, advisory lock ou constraint de exclusao. Duas transacoes simultaneas ainda podem passar na consulta.
- [ ] Criar teste de concorrencia/simulacao transacional.
- [ ] Documentar a estrategia de concorrencia no README.

Sugestao tecnica para PostgreSQL: usar constraint de exclusao com range temporal por sala para reservas ativas, ou transacao com lock/advisory lock bem documentado. Se escolher constraint, incluir migracao e teste.

### 6. Autenticacao e usuarios

- [x] Criar modelo `User`.
- [x] Implementar cadastro de usuario.
  - Evidencia: `POST /auth/register`.
- [~] Implementar criacao/seed de usuario inicial.
  - Observacao: `/dev/populate-mock-data` cria usuarios mock quando necessario, mas nao ha seed inicial documentado para avaliador.
- [x] Implementar login.
- [x] Implementar endpoint `/auth/me`.
- [x] Implementar geracao e validacao de token JWT.
- [x] Criar dependencia `get_current_user`.
- [x] Proteger rotas de salas, reservas e email_deliveries.
- [x] Definir comportamento para usuario inativo.
- [x] Adicionar testes de permissao sem token.
- [x] Adicionar testes de permissao com token valido.
- [x] Testar login valido/invalido e usuario inativo.
- [~] Documentar credenciais/fluxo de auth no README.
  - Observacao: fluxo existe no codigo, mas README ainda nao explica cadastro/login/JWT nem credenciais mock.

### 7. Outbox transacional

- [x] Criar tabela/modelo `outbox_events`.
- [x] Definir constantes para `BOOKING_CREATED`, `BOOKING_UPDATED` e `BOOKING_CANCELED`.
- [x] Ao criar reserva, persistir booking e evento outbox antes do mesmo commit.
- [x] Ao editar reserva, persistir alteracao e evento outbox antes do mesmo commit.
- [x] Ao cancelar reserva, persistir cancelamento e evento outbox antes do mesmo commit.
- [~] Garantir rollback conjunto booking + outbox quando algo falhar antes do commit.
  - Observacao: o codigo usa a mesma `Session` e commit unico no fluxo normal, mas falta teste explicito de rollback/atomicidade.
- [x] Definir payload contendo dados suficientes para o e-mail.
  - Evidencia: payload inclui booking, titulo, sala, criador, horarios, status e participantes.
- [~] Adicionar teste de criacao de evento no outbox.
  - Observacao: os testes de reserva exercitam o fluxo que cria eventos, mas nao ha asserts diretos para `outbox_events` por create/update/cancel.
- [ ] Adicionar teste comprovando atomicidade booking + outbox.

### 8. Worker assincrono, retry e email

- [~] Criar command/processo separado para worker.
  - Observacao: existe `worker_loop`, mas ele roda dentro do lifespan da API; o desafio pede worker separado, ainda que aceite processo simples em loop.
- [ ] Adicionar servico `worker` no `docker-compose.yml`, ou command manual separado.
- [x] Buscar eventos pendentes.
- [ ] Evitar duas instancias processando o mesmo evento ao mesmo tempo.
  - Observacao: nao ha `SELECT FOR UPDATE SKIP LOCKED`, status intermediario ou claim atomico.
- [~] Implementar envio de e-mail via adapter simples.
  - Observacao: o worker registra uma entrega persistente em `email_deliveries`, mas nao ha adapter SMTP/provider nem status real de entrega.
- [x] Registrar entrega em `email_deliveries`.
- [x] Marcar evento como processado.
- [x] Implementar retry com controle de tentativas.
- [x] Marcar eventos com falha final ao atingir limite de tentativas.
- [x] Implementar idempotencia para evitar entrega duplicada por `source_event_id`.
- [x] Registrar/logar falhas do worker.
- [x] Criar teste de processamento pelo worker.
- [x] Criar teste de retry.
- [x] Criar teste de idempotencia de envio/entrega.
- [~] Documentar como executar o worker.
  - Observacao: README documenta que o worker atual sobe junto com a API, mas nao ha processo separado.

Conteudo minimo do e-mail:

- [x] Titulo da reuniao.
- [x] Sala.
- [x] Horario.
- [x] Tipo do evento: criada, alterada ou cancelada.
- [~] Destinatarios corretos.
  - Observacao: payload guarda participantes, mas o worker registra entrega apenas para o criador da reserva; nao cria uma entrega por participante.

### 9. email_deliveries

- [x] Criar modelo/tabela `email_deliveries`.
- [x] Criar schema de saida.
- [x] Criar service para registrar entrega.
- [x] Criar endpoint autenticado para listar entregas.
- [x] Proteger endpoint com JWT.
- [x] Impedir criacao manual via rota publica.
- [x] Cobrir listagem/protecao com testes.
- [x] Usar `source_event_id` para idempotencia de entregas originadas do outbox.
- [~] Modelar ciclo real de entrega.
  - Observacao: status atual e `processed`/`delivered`, mas o worker sempre registra como `processed`; nao ha entrega externa real.

### 10. Frontend

- [x] Remover tela padrao do Vite.
- [x] Implementar fluxo de login.
- [x] Implementar fluxo de cadastro.
- [x] Armazenar token de forma simples e consistente.
  - Evidencia: `localStorage` key `token`.
- [x] Listar salas.
- [x] Criar reserva.
- [x] Editar reserva.
- [x] Cancelar reserva.
- [x] Listar entregas de email processadas.
- [x] Mostrar loading nas operacoes de API.
- [x] Mostrar erros de validacao.
- [x] Mostrar erro de conflito de horario.
  - Observacao: erro 409 da API vira `BOOKING_CONFLICT` e e exibido como mensagem.
- [x] Mostrar feedback de sucesso.
- [x] Criar camada de client HTTP para o backend.
- [x] Configurar `VITE_API_URL` ou equivalente no client.
- [x] Garantir layout responsivo basico.
- [~] Ajustar mensagens de notificacao no frontend.
  - Observacao: a UI ainda diz "Participantes seriam notificados por email", mas o worker atual registra entrega somente para o criador.
- [ ] Adicionar testes frontend minimos.

### 11. Testes

Backend:

- [x] Corrigir configuracao de import para `poetry run pytest` coletar a suite.
- [x] Criar fixture compartilhada de banco de teste.
- [x] Testar health endpoint.
- [x] Testar constraint/regra de capacidade valida de sala.
- [x] Testar constraint/regra de status valido em reservas.
- [x] Testar constraint/regra de status valido em eventos outbox.
- [x] Testar login valido/invalido e usuario inativo.
- [x] Testar permissao/autenticacao basica.
- [x] Testar rotas reais de reservas protegidas.
- [x] Testar validacao de datas.
- [x] Testar duracao minima.
- [x] Testar duracao maxima.
- [x] Testar conflito de reserva.
- [x] Testar reservas adjacentes sem conflito.
- [x] Testar cancelamento mantendo registro.
- [x] Testar que reserva cancelada nao bloqueia novo horario.
- [x] Testar listagem de salas.
- [x] Testar listagem/protecao de email_deliveries.
- [x] Testar seed/populate idempotente.
- [x] Testar processamento pelo worker.
- [x] Testar retry do worker.
- [x] Testar idempotencia de envio/entrega.
- [~] Testar criacao de evento no outbox.
  - Observacao: ainda falta assert direto em `outbox_events` para create/update/cancel.
- [ ] Testar atomicidade booking + outbox.
- [ ] Testar concorrencia/simulacao transacional.

Frontend:

- [ ] Instalar e configurar Vitest/Testing Library, ou ferramenta equivalente.
- [ ] Testar fluxo basico de login.
- [ ] Testar criacao de reserva.
- [ ] Testar exibicao de erro de conflito.
- [ ] Testar integracao com backend usando mock/fake API.

Verificacao executada nesta atualizacao:

- [x] `cd backend && poetry run pytest` passou: 39 testes.
  - Observacao: houve warnings de `datetime.utcnow()` depreciado e `HTTP_422_UNPROCESSABLE_ENTITY` depreciado.
- [x] `cd frontend && npm run build` passou.
- [ ] `docker compose up --build` nao foi executado nesta atualizacao.

### 12. README e documentacao de decisoes

- [~] Documentar como rodar backend via Docker.
  - Observacao: README mostra `docker compose up --build`, mas nao explica/define `JWT_SECRET_KEY`, que e obrigatoria no startup.
- [x] Documentar como rodar frontend via Docker.
- [x] Documentar execucao manual basica do backend.
- [x] Documentar execucao manual basica do frontend.
- [x] Documentar motivacao do Outbox Pattern.
- [x] Documentar worker atual embutido no lifespan da API.
- [x] Documentar retry do worker atual.
- [x] Documentar idempotencia por `source_event_id`.
- [~] Documentar variaveis de ambiente completas.
  - Observacao: `DATABASE_URL` aparece; `JWT_SECRET_KEY`, `ENVIRONMENT` e `VITE_API_URL` nao estao bem documentadas.
- [ ] Documentar como rodar testes backend.
- [ ] Documentar como rodar testes frontend.
- [ ] Documentar estrategia de concorrencia.
- [ ] Documentar fluxo de autenticacao.
- [ ] Documentar seed/populate e credenciais mock.
- [ ] Documentar exemplos basicos de uso da API ou apontar Swagger de forma mais operacional.

Divergencias importantes:

- [~] `DESAFIO.md` pede worker separado; codigo atual tem worker assicrono, mas embutido na API.
- [~] `DESAFIO.md` pede notificar participantes; worker atual registra uma entrega para o criador e inclui participantes no corpo.
- [~] `README.md` diz que `docker compose up --build` roda o projeto, mas `docker-compose.yml` nao define `JWT_SECRET_KEY`.
- [~] `README.md` fala em suporte robusto a transacoes e concorrencia via PostgreSQL, mas ainda nao existe estrategia implementada/documentada contra overlap concorrente.
- [~] Checklist antigo dizia que outbox/worker/email nao existiam; isso estava desatualizado. Agora existem, mas com as limitacoes acima.

## Ordem sugerida de commits

- [x] Commit 1: higiene do repo, comandos basicos, coleta de pytest e health.
- [~] Commit 2: schemas/repositorios/servicos e CRUD de salas com testes.
  - Observacao: somente listagem de salas e testes de listagem existem; criar/detalhe/testes desses fluxos faltam.
- [x] Commit 3: autenticacao simples, cadastro/login e protecao de rotas.
- [x] Commit 4: CRUD de reservas com validacoes de datas/duracao/overlap e testes principais.
- [~] Commit 5: regra de overlap, estrategia de concorrencia e documentacao tecnica.
  - Observacao: overlap e testes comuns existem; concorrencia real e documentacao ainda faltam.
- [~] Commit 6: outbox transacional nos eventos de reserva com testes.
  - Observacao: implementacao existe; faltam asserts diretos de outbox e atomicidade.
- [~] Commit 7: worker, adapter de e-mail, retry, idempotencia e testes.
  - Observacao: worker/retry/idempotencia/testes existem; falta processo separado, trava de consumo concorrente, envio real/adapter e entrega para participantes.
- [~] Commit 8: frontend funcional com login, salas, reservas, edicao/cancelamento, inbox e feedbacks.
  - Observacao: frontend funcional existe; ainda sem testes.
- [ ] Commit 9: testes frontend e ajustes finais de README.
- [ ] Commit 10: revisao final, docker compose completo com env/worker e smoke test.

## Comandos de verificacao

Use estes comandos como checklist antes de marcar entrega final:

```bash
cd backend
poetry run pytest
```

```bash
cd frontend
npm run build
```

```bash
docker compose up --build
```

```bash
docker compose logs backend
docker compose logs frontend
```

Se for criado um worker separado:

```bash
docker compose logs worker
```
