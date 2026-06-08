# Prompt para backend: excluir aluno permanentemente

Implemente a rota autenticada `DELETE /alunos/:id` para excluir permanentemente um aluno do banco de dados.

Requisitos:

- Validar autenticação e `tenantId`/personal dono do aluno, usando a mesma regra das rotas `GET /alunos` e `PATCH /alunos/:id`.
- Retornar `404` se o aluno não existir ou não pertencer ao tenant.
- Antes de excluir o aluno, remover ou desvincular dados dependentes que bloqueiem a exclusão por FK, especialmente:
  - eventos de agenda do aluno;
  - treinos/sessões vinculadas ao aluno, conforme regra atual do domínio;
  - mensagens/avaliações/dietas vinculadas, se o banco exigir cascade ou limpeza explícita;
  - assinatura/pagamento recorrente ativo, cancelando/desligando a recorrência no provedor quando houver integração disponível.
- Executar a operação em transação para evitar aluno apagado parcialmente.
- Responder `204 No Content` em caso de sucesso.

Contrato esperado pelo frontend:

```http
DELETE /alunos/:id
x-personal-id: <tenantId>
Authorization: Bearer <token>
```

Sucesso:

```http
204 No Content
```

Erros esperados:

```json
{ "message": "Aluno nao encontrado" }
```

```json
{ "message": "Nao foi possivel excluir o aluno" }
```
