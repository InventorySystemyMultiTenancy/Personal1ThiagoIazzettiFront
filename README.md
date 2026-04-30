# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Pagamento recorrente com Mercado Pago

O fluxo de assinatura recorrente do aluno foi integrado na tela de planos do tenant.

### Dependencia

O projeto usa `@mercadopago/sdk-js` para carregar o checkout seguro no navegador.

### Variaveis de ambiente

Crie um arquivo `.env` local com:

```env
VITE_API_URL=http://localhost:3001
VITE_MERCADO_PAGO_PUBLIC_KEY=SUA_PUBLIC_KEY_DO_MERCADO_PAGO
VITE_DEBUG_PAYMENT=false
```

### Fluxo implementado

1. O aluno faz login e acessa `/cliente/planos` ou `/planos` dentro do tenant.
2. O frontend busca os planos recorrentes publicos em `/payments/recurring/subscriptions/plans/public`.
3. Ao selecionar um plano, o CardForm do Mercado Pago e montado no frontend.
4. O token do cartao e gerado pelo SDK no navegador.
5. O frontend envia apenas `card_token_id`, `payer_email`, `preapproval_plan_id` e `aluno_id` para `/payments/recurring/subscriptions`.
6. Em caso de sucesso, o usuario e redirecionado para a area do aluno.

### Observacoes

- Se o backend ainda nao expuser `preapproval_plan_id` nos planos publicos, o frontend mostra o plano, mas bloqueia a assinatura online.
- Com `VITE_DEBUG_PAYMENT=true`, eventos do CardForm sao enviados ao console do navegador.
- Para testes sandbox, use o cartao Visa `4509953566233576`, CVV `123`, validade `11/25` e titular `APRO`.
