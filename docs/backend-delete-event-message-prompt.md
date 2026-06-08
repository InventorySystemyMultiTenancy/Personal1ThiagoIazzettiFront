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
- Ler o tenant pelo header `x-personal-id`. Esse valor é enviado pelo frontend no `DELETE`.
- Considerar autorizado quando:
  - `req.user.role === "PERSONAL"`; e
  - o evento pertence ao mesmo personal/tenant informado em `x-personal-id`; e
  - esse tenant também corresponde ao personal autenticado, quando o backend tiver essa relação no token/usuário.
- Não retornar `403` para o próprio personal tentando excluir evento do próprio tenant.
- Retornar `403` somente se o usuário autenticado não for `PERSONAL` ou tentar excluir evento de outro tenant.
- Retornar `404` se o evento não existir ou não pertencer ao tenant informado.
- Remover também participantes/respostas vinculadas ao evento, usando cascade ou transação explícita.
- Retornar `204 No Content` no sucesso.

Observação: o frontend também chama esta rota automaticamente ao carregar a página de eventos para remover eventos cuja data já passou.

Erro atual observado no frontend:

```http
DELETE /personal-events/e804ce42-6eaf-4349-b4cd-c83e8d7b53a6
403 Forbidden
```

Isso indica que a rota já existe, mas a autorização/validação de tenant está rejeitando o admin. Revise se o backend está lendo `x-personal-id`, se o evento está sendo buscado pelo tenant correto e se o usuário `PERSONAL` autenticado está sendo reconhecido como dono desse tenant.

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
