# Changelog

## [1.1.0] - 2026-02-06

### Segurança
- Corrigida vulnerabilidade de **path traversal** no endpoint `/api/templates/:nome` usando `path.basename()` e validação de extensão `.json`
- Removidas credenciais reais do `.env.example`, substituídas por placeholders genéricos
- URLs hardcoded (`http://localhost:3000`) no frontend substituídas por caminhos relativos (`/api/...`)

### Melhorias
- **Validação de input** nos endpoints `/api/criar-programa` e `/api/criar-formulario` (campos obrigatórios, tipos)
- **Lock de operação** (`acquireLock` middleware) para impedir requests concorrentes que causariam race conditions
- **Middleware `requireAutomation`** centralizado para verificar se a automação está iniciada
- **Global error handler** no Express para tratamento padronizado de erros
- **Templates agora carregam no formulário** para revisão antes de enviar, em vez de criação direta
- **Mapeamento de tipos de pergunta** agora usa `tiposPergunta` do `selectors.json` quando disponível, com fallback hardcoded
- **Tipagem forte** — substituídos parâmetros `any` por `FormSection`, `FormQuestion` e `NonNullable<FormQuestion['opcoes']>` no `browser-automation.ts`
- Adicionado campo `tiposPergunta` opcional à interface `SelectorMap`

### Correções
- Substituído `body-parser` (removido da dependência) por `express.json()` nativo do Express 5
- Imports dinâmicos de `fs/promises` substituídos por import estático
- Corrigido parâmetro `event` global implícito em `switchTab()` — agora recebe `evt` explicitamente
- Corrigidos IDs HTML inválidos (com `.`) nas opções de resposta — agora usa `Math.floor()` para gerar inteiros
- Adicionada confirmação (`confirm()`) antes de remover seções e perguntas
- Substituídos `waitForTimeout` críticos por `waitForLoadState`, `waitForURL` e `waitForSelector`

## [1.0.0] - Versão inicial

- Interface web para criação de formulários de diagnóstico SEBRAE
- Automação de browser com Playwright
- Sistema de templates JSON
- Criação de programas, temas, perguntas e opções de resposta
