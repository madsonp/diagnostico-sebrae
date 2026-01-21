# 🤖 Automação de Formulários - Diagnóstico Sebrae

Sistema web automatizado para criação de formulários de diagnóstico no **diagnostico.sebrae.com.br** usando **Playwright** para automação de browser.

## 🚀 Funcionalidades

- ✅ **Interface Web moderna e intuitiva** - Crie formulários através de uma interface visual
- ✅ **Criação de programas** - Cadastre novos programas diretamente pela interface
- ✅ **Criação de formulários completos** - Temas (seções), perguntas e opções com pontuação
- ✅ **9 tipos de perguntas** - Resposta única, múltiplas respostas, texto, escalas, sim/não e mais
- ✅ **Sistema de templates** - Salve e reutilize formulários em JSON
- ✅ **Cache inteligente** - Carregamento rápido de programas
- ✅ **Navegação otimizada** - Acesso direto às páginas sem cliques em menus
- ✅ **Screenshots de debug** - Capturas automáticas em caso de erro

## 📋 Pré-requisitos

- **Node.js 18 ou superior**
- **Acesso administrativo** ao diagnostico.sebrae.com.br
- **Navegador Chromium** (instalado automaticamente pelo Playwright)
- **Windows** com PowerShell (testado no Windows 11)

## 🔧 Instalação

1. **Clone o repositório e acesse a pasta:**
```bash
cd diagnostico-sebrae
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Instale o navegador Chromium:**
```bash
npx playwright install chromium
```

4. **Configure as credenciais:**
```bash
# Copiar arquivo de exemplo
copy .env.example .env

# Editar .env com suas credenciais
notepad .env
```

No arquivo `.env`, configure:
```env
SEBRAE_URL=https://diagnostico.sebrae.com.br
SEBRAE_USERNAME=seu_usuario_admin
SEBRAE_PASSWORD=sua_senha
```

5. **Compile o projeto:**
```bash
npm run build
```

## 📖 Como Usar

### 🌐 Iniciar a Interface Web

```bash
npm run web
```

O servidor será iniciado em **http://localhost:3000**

### 📝 Fluxo de Trabalho

1. **Abra o navegador** em http://localhost:3000
2. **Clique em "▶️ Iniciar Navegador"** - O sistema abrirá o Chromium e fará login automaticamente
3. **Aguarde o carregamento dos programas** - Os programas disponíveis serão listados automaticamente
4. **Crie um novo programa (opcional):**
   - Clique em "➕ Novo Programa"
   - Preencha nome, descrição e status
   - O programa será criado e selecionado automaticamente
5. **Preencha o formulário:**
   - Título da avaliação
   - Descrição (opcional)
   - Selecione o programa
   - Adicione temas (seções)
   - Para cada tema, adicione perguntas
   - Para cada pergunta, adicione opções (se aplicável)
6. **Clique em "🚀 Criar Formulário"** - O sistema criará automaticamente no Sebrae
7. **Acompanhe o progresso** - Notificações aparecerão no canto superior direito

### 📁 Usar Templates

1. Acesse a aba **"📁 Templates"**
2. Clique em um template disponível
3. O formulário será criado automaticamente

**Templates incluídos:**
- `logomarca.json` - Exemplo simples de diagnóstico de logomarca
- `exemplo-diagnostico-financeiro.json` - Diagnóstico financeiro completo

## 📁 Estrutura do Projeto

```
diagnostico-sebrae/
├── src/
│   ├── index.ts              # Ponto de entrada principal
│   ├── browser-automation.ts # Automação Playwright (core)
│   ├── web-server.ts         # Servidor Express REST API
│   ├── types.ts              # Definições TypeScript
│   ├── config.ts             # Configurações e variáveis de ambiente
│   └── selectors.json        # Seletores CSS do sistema Sebrae
├── public/
│   ├── index.html            # Interface web
│   ├── styles.css            # Estilos CSS
│   └── app.js                # Lógica frontend
├── templates/                # Templates de formulários JSON
│   ├── logomarca.json
│   └── exemplo-diagnostico-financeiro.json
├── screenshots/              # Screenshots de debug (gerados automaticamente)
├── dist/                     # Código compilado (gerado automaticamente)
├── .env                      # Credenciais (não versionado)
├── .env.example             # Exemplo de configuração
├── package.json             # Dependências e scripts
├── tsconfig.json            # Configuração TypeScript
└── README.md                # Este arquivo
```

## 🎯 Tipos de Perguntas Suportados

| ID | Tipo | Descrição | Opções |
|----|------|-----------|--------|
| `1` | Resposta Única | Uma única opção de resposta | ✅ Com pontos |
| `2` | Múltiplas Respostas | Múltiplas opções (checkboxes) | ✅ Com pontos |
| `3` | Texto Curto | Resposta em texto curto | ❌ |
| `4` | Texto Longo | Resposta em texto longo (textarea) | ❌ |
| `5` | Escala 1-5 | Escala de 1 a 5 | ❌ |
| `6` | Escala 1-10 | Escala de 1 a 10 | ❌ |
| `7` | Escala Livre | Escala personalizada (min/max) | ❌ |
| `8` | Sim/Não | Resposta binária | ❌ |
| `9` | Lista Suspensa | Dropdown com opções | ✅ Com pontos |

## 💡 Exemplo de Template JSON

```json
{
  "programaId": "611",
  "titulo": "Diagnóstico de Logomarca",
  "descricao": "Avaliação da identidade visual da empresa",
  "tipo": "Autodiagnóstico",
  "temas": [
    {
      "nome": "Identidade Visual",
      "descricao": "Avaliação da logomarca atual",
      "ordem": 1,
      "perguntas": [
        {
          "texto": "Sua empresa possui uma logomarca?",
          "tipo": "8",
          "obrigatoria": true,
          "ordem": 1
        },
        {
          "texto": "Como você avalia a qualidade da sua logomarca?",
          "tipo": "1",
          "obrigatoria": true,
          "ordem": 2,
          "opcoes": [
            { "nome": "Excelente", "pontos": 5 },
            { "nome": "Boa", "pontos": 4 },
            { "nome": "Regular", "pontos": 3 },
            { "nome": "Ruim", "pontos": 2 },
            { "nome": "Não possui", "pontos": 1 }
          ]
        }
      ]
    }
  ]
}
```

## 🔌 API REST

O servidor Express expõe as seguintes rotas:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/iniciar` | Inicia o navegador e faz login |
| `GET` | `/api/programas` | Lista programas disponíveis (com cache) |
| `POST` | `/api/criar-programa` | Cria um novo programa |
| `POST` | `/api/criar-formulario` | Cria um formulário completo |
| `POST` | `/api/fechar` | Fecha o navegador |
| `GET` | `/api/templates` | Lista templates disponíveis |
| `GET` | `/api/templates/:nome` | Carrega um template específico |

## 🛠️ Scripts Disponíveis

```bash
npm run build     # Compila TypeScript para JavaScript
npm run web       # Inicia o servidor web (localhost:3000)
npm run dev       # Modo desenvolvimento com watch
```

## ⚙️ Configurações Avançadas

### Variáveis de Ambiente (.env)

```env
# URL do sistema Sebrae
SEBRAE_URL=https://diagnostico.sebrae.com.br

# Credenciais de acesso
SEBRAE_USERNAME=seu_usuario_admin
SEBRAE_PASSWORD=sua_senha

# Porta do servidor web (opcional, padrão: 3000)
PORT=3000
```

### Ajustes de Performance

No arquivo [src/browser-automation.ts](src/browser-automation.ts), você pode ajustar:

```typescript
// Dimensões da janela
await this.page.setViewportSize({ width: 1280, height: 720 });

// Timeouts
await this.page.waitForTimeout(2000); // 2 segundos

// Cache de programas (já implementado)
private programasCache: Programa[] | null = null;
```

## 🐛 Troubleshooting

### ❌ Erro de login

1. Verifique as credenciais no arquivo `.env`
2. Confirme que o usuário tem permissões de administrador
3. Teste o login manualmente no navegador
4. Verifique se há atualizações nos seletores CSS em [src/selectors.json](src/selectors.json)

### ❌ Navegador não abre

```bash
# Reinstalar o Chromium
npx playwright install chromium --force
```

### ❌ Erro ao criar formulário

1. Verifique os **screenshots** na pasta `screenshots/` para ver onde parou
2. Confirme que o programa selecionado existe
3. Verifique se todos os campos obrigatórios estão preenchidos
4. Teste manualmente a criação no sistema Sebrae

### ❌ Programas não carregam

1. Aguarde alguns segundos - o carregamento inicial pode demorar
2. Feche e reabra o navegador pelo botão "⏹️ Fechar"
3. Verifique a conexão com o servidor em http://localhost:3000
4. Veja o console do navegador (F12) para erros JavaScript

### ❌ Porta 3000 já em uso

```bash
# No PowerShell, encontre o processo usando a porta 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object -Property OwningProcess

# Finalize o processo (substitua PID pelo número retornado)
Stop-Process -Id PID -Force

# Ou configure outra porta no .env
PORT=3001
```

## 🚀 Melhorias Futuras

- [ ] Edição de formulários existentes
- [ ] Duplicação de formulários
- [ ] Importação de formulários do Sebrae
- [ ] Exportação em múltiplos formatos (Excel, PDF)
- [ ] Validação prévia dos dados antes da criação
- [ ] Dashboard de formulários criados
- [ ] Logs detalhados de operações
- [ ] Testes automatizados (Jest/Vitest)
- [ ] Deploy em servidor (Docker)
- [ ] Autenticação de usuários na interface web

## 🎨 Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **TypeScript** - Superset tipado do JavaScript
- **Playwright** - Automação de navegador
- **Express** - Framework web para API REST
- **HTML5/CSS3** - Interface web moderna
- **Vanilla JavaScript** - Frontend sem frameworks
- **dotenv** - Gerenciamento de variáveis de ambiente

## 📊 Fluxo de Dados

```
┌─────────────┐         ┌─────────────┐         ┌─────────────────┐
│   Browser   │ ◄─────► │  Express    │ ◄─────► │   Playwright    │
│  (Frontend) │   API   │   Server    │  Control│   Automation    │
└─────────────┘         └─────────────┘         └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Sebrae System  │
                                                │  (Chromium)     │
                                                └─────────────────┘
```

## 🤝 Contribuindo

Este é um projeto desenvolvido para automatizar processos internos do Sebrae. Para sugestões ou melhorias:

1. Documente o problema ou melhoria desejada
2. Se possível, forneça exemplos ou screenshots
3. Entre em contato com a equipe de desenvolvimento

## 📄 Licença

Uso interno **Sebrae** - Todos os direitos reservados

## 📞 Suporte

Para dúvidas ou problemas:
- Consulte a seção [Troubleshooting](#-troubleshooting)
- Verifique os logs no console do servidor
- Analise os screenshots em `screenshots/` para erros visuais

---

**🚀 Desenvolvido para automatizar e otimizar processos do Sebrae**

*Última atualização: Janeiro de 2026*
