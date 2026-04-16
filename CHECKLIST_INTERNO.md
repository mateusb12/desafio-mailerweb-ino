# Checklist interno do desafio

Atualizado em: 2026-04-16

Use este arquivo como tracker de progresso. Marque `[x]` apenas quando o item estiver realmente implementado no codigo atual. Quando houver teste, documentacao ou robustez faltando, mantenha o item como parcial/pendente e registre a observacao.

Legenda operacional:

- `[x]` feito no codigo atual.
- `[~]` parcialmente feito; existe implementacao, mas falta parte relevante do requisito, teste ou garantia tecnica.
- `[ ]` pendente.

## Leitura do estado atual

O projeto ja tem monorepo, Docker, FastAPI, PostgreSQL, Alembic, modelos, auth JWT, endpoints basicos de salas e fluxo de reservas. O frontend ja saiu do template Vite e tem telas autenticadas para login, cadastro, salas e reservas.

O maior buraco em relacao ao `DESAFIO.md` ainda e o sistema obrigatorio de notificacao assincrona: o modelo/tabela de outbox existe, mas criar/editar/cancelar reserva ainda nao cria eventos outbox, nao ha worker, nao ha envio de email, retry ou idempotencia.

Evidencias principais:

- `backend/source/main.py` registra routers de `auth`, `rooms`, `bookings` e `dev`.
- `backend/source/features/auth/*` implementa cadastro, login, JWT, `/auth/me`, `get_current_user` e regra de usuario inativo.
- `backend/source/features/rooms/controller.py` implementa apenas `GET /rooms`.
- `backend/source/features/bookings/controller.py` implementa listar, criar, editar e cancelar reservas.
- `backend/source/features/bookings/service.py` valida titulo, sala, janela de horario, duracao, overlap e permissao do criador.
- `backend/source/models/outbox_event.py` existe, mas nao e usado pelo fluxo de reservas.
- `backend/source/features/worker`, `notifications` e `outbox` estao vazios.
- `frontend/src/App.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `RoomsPage.tsx` e `BookingsPage.tsx` implementam o fluxo principal de UI.
- `poetry run pytest` passou com 12 testes: auth, health e constraints de modelo.
- `npm run build` passou; houve apenas aviso externo `pyenv: cannot rehash`.

## Status macro

| Area | Status | Observacao |
| --- | --- | --- |
| Monorepo | Parcial | Estrutura existe; `docker-compose.yml` ainda nao define `JWT_SECRET_KEY`, exigido pelo backend. |
| Backend API | Parcial | Auth e reservas existem; salas so lista; falta create/detalhe de sala, detalhe de reserva e outbox transacional. |
| Banco/migracoes | Parcial | Tabelas, enums, constraints basicas e auditoria existem; falta garantia real de concorrencia/overlap no banco. |
| Salas | Parcial | Modelo e listagem existem; criar sala e detalhe nao existem. |
| Reservas | Parcial | CRUD principal existe; falta outbox, concorrencia robusta e testes especificos de reservas. |
| Autenticacao | Parcial | Cadastro/login/JWT/protecao existem e tem testes; falta documentar fluxo e decidir seed/usuario inicial. |
| Outbox | Parcial | Modelo/tabela existem; eventos nao sao criados pelo fluxo de reserva. |
| Worker | Pendente | Nao ha command, loop, servico Docker ou processamento. |
| Email | Pendente | Nao ha sender, template, log de envio ou idempotencia. |
| Frontend | Parcial | Login/cadastro/salas/reservas funcionais contra API; faltam testes frontend e alguns ajustes de contrato/UX. |
| Testes | Parcial | Backend coleta e passa; cobre auth, health e constraints. Faltam testes de salas, reservas, outbox, worker e frontend. |
| README | Parcial | Cobre setup geral; descreve Outbox/Worker como decisao/fluxo, mas isso ainda nao esta implementado. |

## Checklist por requisito

### 1. Infra e estrutura

- [x] Criar estrutura monorepo com `backend/` e `frontend/`.
- [~] Criar `docker-compose.yml` com PostgreSQL, backend e frontend.
  - Observacao: os servicos existem, mas o backend exige `JWT_SECRET_KEY` e o compose atual nao define essa variavel.
- [x] Configurar backend com FastAPI.
- [x] Configurar frontend com React + TypeScript + Vite.
- [x] Configurar Poetry no backend.
- [x] Configurar Alembic no backend.
- [x] Adicionar `.gitignore` cobrindo `.venv`, `__pycache__`, `.pytest_cache`, `node_modules`, builds e artefatos locais.
- [x] Adicionar comandos padronizados para lint/test/build.
  - Evidencia: `Makefile` tem `test-backend`, `lint-backend`, `lint-frontend`, `migrate`, `up/down`; `frontend/package.json` tem `build`, `lint`, `dev`, `preview`.
- [~] Remover do versionamento/working tree arquivos gerados como `__pycache__` e caches locais.
  - Observacao: caches existem no workspace, mas parecem ignorados; conferir antes da entrega final com `git status --ignored` se necessario.

### 2. Banco de dados e modelos

- [x] Criar modelo `Room`.
- [x] Criar modelo `User`.
- [x] Criar modelo `Booking`.
- [x] Criar modelo `BookingParticipant`.
- [x] Criar modelo `OutboxEvent`.
- [x] Criar migracao inicial das tabelas.
- [x] Garantir tipo UUID corretamente no ORM atual.
- [x] Adicionar constraint/check para `rooms.capacity > 0`.
- [x] Criar teste garantindo que `rooms.capacity <= 0` e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar constraint/check para status valido em reservas.
- [x] Criar teste garantindo que status invalido de reserva e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar constraint/check para status valido em eventos outbox.
- [x] Criar teste garantindo que status invalido de outbox e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar relacionamentos ORM entre booking, creator e participants.
- [~] Adicionar relacionamentos ORM completos entre booking e room.
  - Observacao: `Booking.room` existe, mas `Room` nao tem `bookings` de volta. Nao bloqueia API atual, mas nao esta completo.
- [x] Adicionar campos uteis de auditoria quando necessario, como `updated_at` e `canceled_at`.
- [ ] Adicionar constraint/indice de banco para impedir overlap concorrente de reservas ativas.

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
- [ ] Retornar erro adequado para nome duplicado.
- [ ] Cobrir API de salas com testes.

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
  - Observacao: Pydantic valida `datetime`, e o frontend envia `Z` quando falta timezone. Porem o backend aceita datetime sem timezone e converte para UTC em `_as_utc`, entao o requisito estrito de timezone ainda nao esta garantido.
- [x] Validar `start_at < end_at`.
- [x] Validar duracao minima de 15 minutos.
- [x] Validar duracao maxima de 8 horas.
- [x] Validar existencia da sala.
- [x] Definir participantes por e-mail.
  - Observacao: o servico cria usuario participante automaticamente com senha dev fixa quando o email nao existe.
- [x] Retornar erros claros para payload invalido/conflito.
- [ ] Cobrir API de reservas com testes.

### 5. Overlap e concorrencia

- [x] Implementar regra de conflito: `new_start < existing_end AND new_end > existing_start`.
  - Evidencia: `_validate_booking_window`.
- [x] Permitir reservas que apenas encostam no horario.
  - Evidencia: a regra usa `< end_at` e `> start_at`, portanto horarios adjacentes nao conflitam.
- [x] Ignorar reservas canceladas na checagem de conflito.
- [x] Impedir conflito no create.
- [x] Impedir conflito no update.
- [ ] Implementar estrategia real contra duas requisicoes simultaneas conflitantes.
  - Observacao: ha checagem antes do commit, mas nao ha lock, isolation documentado, advisory lock ou constraint de exclusao. Duas transacoes simultaneas ainda podem passar na consulta.
- [ ] Documentar a estrategia de concorrencia no README.
- [ ] Criar teste para conflito comum.
- [ ] Criar teste para reservas adjacentes permitidas.
- [ ] Criar teste de concorrencia/simulacao transacional.

Sugestao tecnica para PostgreSQL: usar constraint de exclusao com range temporal por sala para reservas ativas, ou transacao com lock bem documentado. Se escolher constraint, incluir migracao e teste.

### 6. Autenticacao e usuarios

- [x] Criar modelo `User`.
- [x] Implementar cadastro de usuario.
  - Evidencia: `POST /auth/register`.
- [~] Implementar criacao/seed de usuario inicial.
  - Observacao: existe endpoint dev `/dev/populate-mock-data`, mas nao ha seed inicial documentado para avaliador.
- [x] Implementar login.
- [x] Implementar geracao e validacao de token JWT.
- [x] Criar dependencia `get_current_user`.
- [x] Proteger rotas de listar salas e listar/criar/editar/cancelar reservas.
- [x] Definir comportamento para usuario inativo.
- [x] Adicionar testes de permissao sem token.
- [x] Adicionar testes de permissao com token valido.
- [~] Documentar credenciais/fluxo de auth no README.
  - Observacao: fluxo existe no codigo, mas README ainda nao explica cadastro/login/JWT nem credenciais de mock.

### 7. Outbox transacional

- [x] Criar tabela/modelo `outbox_events`.
- [ ] Definir constantes/enums para `BOOKING_CREATED`, `BOOKING_UPDATED` e `BOOKING_CANCELED`.
  - Observacao: strings aparecem em teste de constraint, mas nao ha enum/constante de dominio.
- [ ] Ao criar reserva, persistir booking e evento outbox na mesma transacao.
- [ ] Ao editar reserva, persistir alteracao e evento outbox na mesma transacao.
- [ ] Ao cancelar reserva, persistir cancelamento e evento outbox na mesma transacao.
- [ ] Garantir rollback conjunto booking + outbox quando algo falhar antes do commit.
- [ ] Definir payload contendo dados suficientes para o e-mail.
- [ ] Adicionar teste de criacao de evento no outbox.
- [ ] Adicionar teste comprovando atomicidade booking + outbox.

### 8. Worker assincrono e email

- [ ] Criar command/processo separado para worker.
- [ ] Adicionar servico `worker` no `docker-compose.yml`, ou documentar comando manual.
- [ ] Buscar eventos pendentes.
- [ ] Evitar duas instancias processando o mesmo evento ao mesmo tempo.
- [ ] Implementar envio de e-mail via adapter simples.
- [ ] Marcar evento como processado.
- [ ] Implementar retry com controle de tentativas.
- [ ] Marcar eventos com falha final, se atingir limite de tentativas.
- [ ] Implementar idempotencia para evitar envio duplicado.
- [ ] Registrar/logar tentativas e falhas.
- [ ] Criar teste de processamento pelo worker.
- [ ] Criar teste de retry.
- [ ] Criar teste de idempotencia de envio.
- [ ] Documentar como executar o worker.

Conteudo minimo do e-mail:

- [ ] Titulo da reuniao.
- [ ] Sala.
- [ ] Horario.
- [ ] Tipo do evento: criada, alterada ou cancelada.

### 9. Frontend

- [x] Remover tela padrao do Vite.
- [x] Implementar fluxo de login.
- [x] Implementar fluxo de cadastro.
- [x] Armazenar token de forma simples e consistente.
  - Evidencia: `localStorage` key `token`.
- [x] Listar salas.
- [x] Criar reserva.
- [x] Editar reserva.
- [x] Cancelar reserva.
- [x] Mostrar loading nas operacoes de API.
- [x] Mostrar erros de validacao.
- [x] Mostrar erro de conflito de horario.
  - Observacao: erro 409 da API vira `BOOKING_CONFLICT` e e exibido como mensagem.
- [x] Mostrar feedback de sucesso.
- [x] Criar camada de client HTTP para o backend.
- [x] Configurar `VITE_API_URL` ou equivalente.
- [x] Garantir layout responsivo basico.
- [~] Ajustar mensagem de notificacao no frontend.
  - Observacao: a UI diz "Participantes seriam notificados por email"; isso e honesto para o estado atual, mas a entrega final precisa trocar quando worker/email existirem.
- [ ] Adicionar testes frontend minimos.

### 10. Testes

Backend:

- [x] Corrigir configuracao de import para `poetry run pytest` coletar a suite.
- [~] Criar fixture de banco de teste.
  - Observacao: ha fixtures em `test_auth.py` e `test_model_constraints.py`, mas duplicadas e apontando para `engine` real configurado por `DATABASE_URL`. Ideal consolidar e isolar melhor.
- [x] Testar health endpoint.
- [x] Testar constraint/regra de capacidade valida de sala.
- [x] Testar constraint/regra de status valido em reservas.
- [x] Testar constraint/regra de status valido em eventos outbox.
- [x] Testar login valido/invalido e usuario inativo.
- [x] Testar permissao/autenticacao basica.
- [ ] Testar validacao de datas.
- [ ] Testar duracao minima.
- [ ] Testar duracao maxima.
- [ ] Testar conflito de reserva.
- [ ] Testar reservas adjacentes sem conflito.
- [ ] Testar protecao das rotas reais de reservas.
- [ ] Testar criacao de evento no outbox.
- [ ] Testar processamento pelo worker.
- [ ] Testar retry do worker.
- [ ] Testar idempotencia de envio.

Frontend:

- [ ] Instalar e configurar Vitest/Testing Library, ou ferramenta equivalente.
- [ ] Testar fluxo basico de login.
- [ ] Testar criacao de reserva.
- [ ] Testar exibicao de erro de conflito.
- [ ] Testar integracao com backend usando mock/fake API.

Verificacao executada nesta atualizacao:

- [x] `cd backend && poetry run pytest` passou: 12 testes.
- [x] `cd frontend && npm run build` passou.
  - Observacao: apareceu aviso `pyenv: cannot rehash: /home/mateus/.pyenv/shims isn't writable`, mas o build concluiu com sucesso.

### 11. README e documentacao de decisoes

- [~] Documentar como rodar backend via Docker.
  - Observacao: README mostra `docker compose up --build`, mas nao explica `JWT_SECRET_KEY`, que e obrigatoria no startup.
- [x] Documentar como rodar frontend via Docker.
- [x] Documentar execucao manual basica do backend.
- [x] Documentar execucao manual basica do frontend.
- [x] Documentar motivacao do Outbox Pattern.
- [ ] Documentar como rodar worker.
- [~] Documentar variaveis de ambiente completas.
  - Observacao: `DATABASE_URL` aparece; `JWT_SECRET_KEY`, `ENVIRONMENT` e `VITE_API_URL` nao estao bem documentadas.
- [ ] Documentar como rodar testes backend.
- [ ] Documentar como rodar testes frontend.
- [ ] Documentar estrategia de concorrencia.
- [ ] Documentar estrategia de idempotencia do worker.
- [ ] Documentar fluxo de autenticacao.
- [ ] Documentar exemplos basicos de uso da API ou apontar Swagger de forma mais operacional.

Inconsistencia importante:

- [ ] README descreve Outbox/Worker como fluxo do sistema, mas o codigo atual ainda nao implementa criacao de eventos, worker, envio de email, retry ou idempotencia.
- [ ] `docker-compose.yml`/README nao definem `JWT_SECRET_KEY`, mas `backend/source/core/config.py` exige essa env no lifespan da API.

## Ordem sugerida de commits

- [~] Commit 1: higiene do repo, `.gitignore`, correcao da coleta do pytest e teste health passando.
  - Observacao: pytest passa e comandos existem, mas ainda ha pendencia de env Docker (`JWT_SECRET_KEY`) e caches locais no workspace.
- [~] Commit 2: schemas/repositorios/servicos e CRUD de salas com testes.
  - Observacao: somente listagem de salas e schema de saida existem; criar/detalhe/testes de API de salas faltam.
- [x] Commit 3: autenticacao simples, cadastro/login e protecao de rotas.
- [~] Commit 4: CRUD de reservas com validacoes de datas/duracao e testes.
  - Observacao: CRUD e validacoes existem; testes de reservas faltam.
- [ ] Commit 5: regra de overlap, estrategia de concorrencia e documentacao tecnica.
  - Observacao: overlap existe; concorrencia/documentacao/testes ainda faltam.
- [ ] Commit 6: outbox transacional nos eventos de reserva com testes.
- [ ] Commit 7: worker, adapter de e-mail, retry, idempotencia e testes.
- [~] Commit 8: frontend funcional com login, salas, reservas, edicao/cancelamento e feedbacks.
  - Observacao: frontend funcional existe; ainda sem testes.
- [ ] Commit 9: testes frontend e ajustes finais de README.
- [ ] Commit 10: revisao final, docker compose completo com worker e smoke test.

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
docker compose logs worker
```
