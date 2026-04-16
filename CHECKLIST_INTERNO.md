# Checklist interno do desafio

Atualizado em: 2026-04-16

Use este arquivo como tracker de progresso. Marque `[x]` apenas quando o item estiver implementado, coberto por teste quando aplicavel, e com commit feito.

## Leitura do estado atual

O projeto ja tem a base do monorepo, Docker, FastAPI, PostgreSQL, Alembic, modelos iniciais e README. A API ainda expoe apenas `/` e `/health`; as features de salas, reservas, auth, outbox, notificacoes e worker existem como pacotes, mas sem implementacao de regra de negocio. O frontend ainda esta no template inicial do Vite/React.

Evidencias principais:

- `docker-compose.yml` define `db`, `backend` e `frontend`.
- `backend/source/main.py` registra a app FastAPI e apenas os endpoints `/` e `/health`.
- `backend/source/models/room.py`, `booking.py`, `booking_participant.py`, `user.py` e `outbox_event.py` modelam as tabelas iniciais.
- `backend/alembic/versions/edd25d9ba2eb_create_initial_tables.py` cria a migracao inicial.
- `frontend/src/App.tsx` ainda exibe a tela padrao de starter.
- `backend/tests/test_health.py` existe, mas `poetry run pytest` falhou na coleta com `ModuleNotFoundError: No module named 'source'`.

## Status macro

| Area | Status | Observacao |
| --- | --- | --- |
| Monorepo | Parcial | Estrutura criada com backend, frontend e compose. |
| Backend API | Inicial | FastAPI sobe, mas nao ha rotas de dominio. |
| Banco/migracoes | Parcial | Tabelas base existem; faltam constraints e indices de concorrencia. |
| Salas | Pendente | Modelo existe; CRUD e validacoes nao existem. |
| Reservas | Pendente | Modelo existe; CRUD, validacoes, overlap e concorrencia nao existem. |
| Autenticacao | Pendente | Dependencias e modelo de usuario existem; fluxo auth nao existe. |
| Outbox | Parcial | Modelo existe; criacao transacional de eventos nao existe. |
| Worker | Pendente | Pacote existe vazio; nao ha command/loop/processamento. |
| Email | Pendente | Nao ha sender, template ou registro de envio. |
| Frontend | Inicial | Vite/React criado; fluxo do desafio nao existe. |
| Testes | Inicial | Apenas teste de health; suite nao coleta no estado atual; faltam testes unitarios/de integracao para regras, constraints, outbox, worker e frontend. |
| README | Parcial | Cobre setup geral e decisao de Outbox; faltam worker, envs completas, testes e concorrencia. |

## Checklist por requisito

### 1. Infra e estrutura

- [x] Criar estrutura monorepo com `backend/` e `frontend/`.
- [x] Criar `docker-compose.yml` com PostgreSQL, backend e frontend.
- [x] Configurar backend com FastAPI.
- [x] Configurar frontend com React + TypeScript + Vite.
- [x] Configurar Poetry no backend.
- [x] Configurar Alembic no backend.
- [x] Adicionar `.gitignore` cobrindo `.venv`, `__pycache__`, `.pytest_cache`, `node_modules`, builds e artefatos locais.
- [x] Remover do versionamento arquivos gerados como `__pycache__` e caches locais.
- [ ] Adicionar comandos padronizados para lint/test/build.

### 2. Banco de dados e modelos

- [x] Criar modelo `Room`.
- [x] Criar modelo `User`.
- [x] Criar modelo `Booking`.
- [x] Criar modelo `BookingParticipant`.
- [x] Criar modelo `OutboxEvent`.
- [x] Criar migracao inicial das tabelas.
- [x] Garantir tipo UUID corretamente em todos os bancos suportados.
- [x] Adicionar constraint/check para `rooms.capacity > 0`.
- [x] Criar teste garantindo que `rooms.capacity <= 0` e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar constraint/check para status valido em reservas.
- [x] Criar teste garantindo que status invalido de reserva e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar constraint/check para status valido em eventos outbox.
- [x] Criar teste garantindo que status invalido de outbox e rejeitado pela aplicacao e/ou banco.
- [x] Adicionar relacionamentos ORM completos entre booking, room, creator e participants.
- [x] Adicionar campos uteis de auditoria quando necessario, como `updated_at` e `canceled_at`.

Observacao: para constraints e regras de modelo, preferir testes unitarios quando a regra estiver no dominio/schema e testes de integracao com banco quando a garantia depender de constraint, indice ou transacao.

### 3. API de salas

- [ ] Criar schemas de entrada/saida para salas.
- [ ] Implementar endpoint para criar sala.
- [ ] Implementar endpoint para listar salas.
- [ ] Implementar endpoint para visualizar detalhes de sala.
- [ ] Validar nome obrigatorio e unico.
- [ ] Validar capacidade positiva.
- [ ] Retornar erro adequado para nome duplicado.
- [ ] Cobrir API de salas com testes.

### 4. API de reservas

- [ ] Criar schemas de entrada/saida para reservas.
- [ ] Implementar endpoint para criar reserva.
- [ ] Implementar endpoint para editar reserva.
- [ ] Implementar endpoint para cancelar reserva.
- [ ] Implementar endpoint para listar reservas, se necessario para o frontend.
- [ ] Implementar endpoint para visualizar reserva, se necessario para edicao/detalhe.
- [ ] Persistir titulo, sala, inicio, fim, status e participantes.
- [ ] Manter reservas canceladas no banco, sem delete fisico.
- [ ] Validar datas ISO 8601 com timezone.
- [ ] Validar `start_at < end_at`.
- [ ] Validar duracao minima de 15 minutos.
- [ ] Validar duracao maxima de 8 horas.
- [ ] Validar existencia da sala.
- [ ] Validar existencia dos participantes ou definir claramente se participante pode ser so e-mail.
- [ ] Retornar erros claros para payload invalido.

### 5. Overlap e concorrencia

- [ ] Implementar regra de conflito: `new_start < existing_end AND new_end > existing_start`.
- [ ] Permitir reservas que apenas encostam no horario.
- [ ] Ignorar reservas canceladas na checagem de conflito.
- [ ] Impedir conflito no create.
- [ ] Impedir conflito no update.
- [ ] Implementar estrategia real contra duas requisicoes simultaneas conflitantes.
- [ ] Documentar a estrategia de concorrencia no README.
- [ ] Criar teste para conflito comum.
- [ ] Criar teste para reservas adjacentes permitidas.
- [ ] Criar teste de concorrencia/simulacao transacional.

Sugestao tecnica para PostgreSQL: usar transacao com lock adequado ou constraint de exclusao com range temporal por sala para reservas ativas. Se escolher constraint, documentar a extensao/indice e cobrir com migracao.

### 6. Autenticacao e usuarios

- [x] Criar modelo `User`.
- [ ] Implementar criacao/seed de usuario inicial.
- [ ] Implementar login.
- [ ] Implementar geracao e validacao de token, ou token fixo documentado.
- [ ] Criar dependencia `get_current_user`.
- [ ] Proteger rotas de criar/editar/cancelar reservas.
- [ ] Definir comportamento para usuario inativo.
- [ ] Adicionar testes de permissao sem token.
- [ ] Adicionar testes de permissao com token valido.
- [ ] Documentar credenciais/fluxo de auth no README.

### 7. Outbox transacional

- [x] Criar tabela/modelo `outbox_events`.
- [ ] Definir constantes/enums para `BOOKING_CREATED`, `BOOKING_UPDATED` e `BOOKING_CANCELED`.
- [ ] Ao criar reserva, persistir booking e evento outbox na mesma transacao.
- [ ] Ao editar reserva, persistir alteracao e evento outbox na mesma transacao.
- [ ] Ao cancelar reserva, persistir cancelamento e evento outbox na mesma transacao.
- [ ] Garantir rollback conjunto quando algo falhar antes do commit.
- [ ] Definir payload contendo dados suficientes para o e-mail.
- [ ] Adicionar teste de criacao de evento no outbox.
- [ ] Adicionar teste comprovando atomicidade booking + outbox.

### 8. Worker assíncrono e email

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

- [ ] Remover tela padrao do Vite.
- [ ] Implementar fluxo de login.
- [ ] Armazenar token de forma simples e consistente.
- [ ] Listar salas.
- [ ] Criar reserva.
- [ ] Editar reserva.
- [ ] Cancelar reserva.
- [ ] Mostrar loading nas operacoes de API.
- [ ] Mostrar erros de validacao.
- [ ] Mostrar erro de conflito de horario.
- [ ] Mostrar feedback de sucesso.
- [ ] Criar camada de client HTTP para o backend.
- [ ] Configurar `VITE_API_URL` ou equivalente.
- [ ] Garantir layout responsivo basico.

### 10. Testes

Backend:

- [ ] Corrigir configuracao de import para `poetry run pytest` coletar a suite.
- [ ] Criar fixture de banco de teste.
- [ ] Testar health endpoint.
- [ ] Testar constraint/regra de capacidade valida de sala.
- [ ] Testar constraint/regra de status valido em reservas.
- [ ] Testar constraint/regra de status valido em eventos outbox.
- [ ] Testar validacao de datas.
- [ ] Testar duracao minima.
- [ ] Testar duracao maxima.
- [ ] Testar conflito de reserva.
- [ ] Testar reservas adjacentes sem conflito.
- [ ] Testar permissoes/autenticacao.
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

### 11. README e documentacao de decisoes

- [x] Documentar como rodar backend via Docker.
- [x] Documentar como rodar frontend via Docker.
- [x] Documentar execucao manual basica do backend.
- [x] Documentar execucao manual basica do frontend.
- [x] Documentar motivacao do Outbox Pattern.
- [ ] Documentar como rodar worker.
- [ ] Documentar variaveis de ambiente completas.
- [ ] Documentar como rodar testes backend.
- [ ] Documentar como rodar testes frontend.
- [ ] Documentar estrategia de concorrencia.
- [ ] Documentar estrategia de idempotencia do worker.
- [ ] Documentar fluxo de autenticacao.
- [ ] Documentar exemplos basicos de uso da API ou apontar Swagger.

## Ordem sugerida de commits

- [ ] Commit 1: higiene do repo, `.gitignore`, correcao da coleta do pytest e teste health passando.
- [ ] Commit 2: schemas/repositorios/servicos e CRUD de salas com testes.
- [ ] Commit 3: autenticacao simples, seed/usuario inicial e protecao de rotas.
- [ ] Commit 4: CRUD de reservas com validacoes de datas/duracao e testes.
- [ ] Commit 5: regra de overlap, estrategia de concorrencia e documentacao tecnica.
- [ ] Commit 6: outbox transacional nos eventos de reserva com testes.
- [ ] Commit 7: worker, adapter de e-mail, retry, idempotencia e testes.
- [ ] Commit 8: frontend funcional com login, salas, reservas, edicao/cancelamento e feedbacks.
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

## Bloqueios observados agora

- `poetry run pytest` falhou porque `source` nao foi encontrado durante a coleta. Corrigir `PYTHONPATH`, layout de pacote ou configuracao do Pytest.
- A suite tambem tentou escrever em `.pytest_cache` e recebeu `Permission denied`; revisar dono/permissoes da pasta se continuar acontecendo.
- Existem arquivos `__pycache__` aparecendo no status do Git. Eles devem ser ignorados/removidos do versionamento antes da entrega.
- O README diz que o worker roda continuamente, mas ainda nao existe implementacao nem servico de worker.
