# Prompt para backend: excluir eventos e mensagens

Implemente as rotas autenticadas abaixo para suportar exclusão pelo painel.

## Excluir evento

Rota esperada:

```http
DELETE /personal-events/:id
x-personal-id: <tenantId>
Authorization: Bearer <token>
```

Requisitos:

- Permitir apenas usuário `PERSONAL` dono do tenant.
- Retornar `404` se o evento não existir ou não pertencer ao tenant.
- Remover também participantes/respostas vinculadas ao evento, usando cascade ou transação explícita.
- Retornar `204 No Content` no sucesso.

Observação: o frontend também chama esta rota automaticamente ao carregar a página de eventos para remover eventos cuja data já passou.

## Excluir mensagem

Rota esperada:

```http
DELETE /messages/:id
Authorization: Bearer <token>
```

Requisitos:

- Permitir exclusão apenas por participante da conversa ou pelo `PERSONAL` do tenant.
- Retornar `404` se a mensagem não existir ou não pertencer à conversa autorizada.
- Excluir a mensagem do banco de dados.
- Retornar `204 No Content` no sucesso.
