# Requisitos de Experiencia do Usuario

## Navegacao principal

- O usuario deve conseguir entrar no sistema por uma tela de login mockada.
- O usuario autenticado deve navegar entre dashboard, salas e reservas.
- A navegacao deve deixar claro em qual area o usuario esta.
- O usuario deve conseguir sair da sessao.

## Fluxos essenciais

- O usuario deve visualizar um resumo do estado atual das reservas no dashboard.
- O usuario deve visualizar todas as salas disponiveis, com nome e capacidade.
- O usuario deve visualizar reservas existentes com titulo, sala, inicio, fim, status e participantes.
- O usuario deve criar uma nova reserva informando titulo, sala, horarios e participantes.
- O usuario deve editar uma reserva ativa existente.
- O usuario deve cancelar uma reserva ativa sem remove-la da listagem.

## Estados vazios

- A listagem de salas deve exibir uma mensagem clara quando nao houver salas.
- A listagem de reservas deve exibir uma mensagem clara quando nao houver reservas.

## Loading

- A tela protegida deve exibir loading ao restaurar a sessao.
- As paginas de salas e reservas devem exibir loading ao carregar os dados.
- Acoes de criar, editar e cancelar reserva devem bloquear repeticao de envio e mostrar andamento.

## Erros

- O usuario deve receber mensagens amigaveis quando uma acao falhar.
- Erros de validacao devem indicar o campo ou regra que precisa ser corrigida.
- Conflitos de horario devem ter mensagem especifica, explicando que ja existe reserva ativa no intervalo.

## Feedback de sucesso

- O usuario deve ver confirmacao visual ao criar reserva.
- O usuario deve ver confirmacao visual ao editar reserva.
- O usuario deve ver confirmacao visual ao cancelar reserva.

## Validacoes de formulario

- O titulo da reserva e obrigatorio.
- A sala da reserva e obrigatoria.
- O horario de inicio deve ser anterior ao horario de fim.
- A duracao minima da reserva e de 15 minutos.
- A duracao maxima da reserva e de 8 horas.
- Reservas ativas da mesma sala nao podem se sobrepor.
- Reservas que apenas encostam no horario de outra reserva devem ser permitidas.

## Status e historico

- Reservas ativas e canceladas devem ter diferenciacao visual.
- Reservas canceladas devem permanecer visiveis para preservar historico.
- Reservas canceladas nao devem exibir acoes de edicao ou cancelamento.

## Preparacao para API real

- Componentes de pagina nao devem acessar dados fake diretamente.
- Regras e simulacao assincrona devem ficar centralizadas nos services.
- Tipos de dominio devem ficar separados da apresentacao.
- A troca futura de mocks por chamadas HTTP deve acontecer nos services, preservando paginas e componentes.
