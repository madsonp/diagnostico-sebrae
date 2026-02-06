import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SebraeAutomation } from './browser-automation.js';
import type { DiagnosticoForm } from './types.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Instância global da automação
let automation: SebraeAutomation | null = null;
let operationInProgress = false;

// Middleware para impedir operações concorrentes
function requireAutomation(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!automation) {
    res.status(400).json({ success: false, message: 'Automação não iniciada' });
    return;
  }
  next();
}

function acquireLock(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (operationInProgress) {
    res.status(429).json({ success: false, message: 'Outra operação está em andamento. Aguarde.' });
    return;
  }
  operationInProgress = true;
  res.on('finish', () => { operationInProgress = false; });
  next();
}

// Iniciar automação
app.post('/api/iniciar', acquireLock, async (req, res, next) => {
  try {
    // Fechar automação existente se houver
    if (automation) {
      try {
        await automation.close();
      } catch (e) {
        console.log('Erro ao fechar automação anterior:', e);
      }
      automation = null;
    }
    
    // Criar nova instância
    automation = new SebraeAutomation();
    await automation.init();
    await automation.login();
    
    res.json({ success: true, message: 'Navegador iniciado e login realizado' });
  } catch (error) {
    automation = null;
    next(error);
  }
});

// Buscar programas disponíveis
app.get('/api/programas', requireAutomation, async (req, res, next) => {
  try {
    const programas = await automation!.buscarProgramasDisponiveis();
    res.json({ success: true, programas });
  } catch (error) {
    next(error);
  }
});

// Criar novo programa
app.post('/api/criar-programa', requireAutomation, acquireLock, async (req, res, next) => {
  try {
    const { nome, descricao, ativo } = req.body;
    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      res.status(400).json({ success: false, message: 'Nome do programa é obrigatório' });
      return;
    }

    const programa = await automation!.criarPrograma({
      nome: nome.trim(),
      descricao: typeof descricao === 'string' ? descricao.trim() : undefined,
      ativo: typeof ativo === 'boolean' ? ativo : true,
    });
    
    res.json({ 
      success: true, 
      message: 'Programa criado com sucesso!',
      programa
    });
  } catch (error) {
    next(error);
  }
});

// Criar formulário
app.post('/api/criar-formulario', requireAutomation, acquireLock, async (req, res, next) => {
  try {
    const formulario = req.body as DiagnosticoForm;
    if (!formulario.titulo || typeof formulario.titulo !== 'string' || !formulario.titulo.trim()) {
      res.status(400).json({ success: false, message: 'Título do formulário é obrigatório' });
      return;
    }
    if (!Array.isArray(formulario.secoes) || formulario.secoes.length === 0) {
      res.status(400).json({ success: false, message: 'O formulário deve ter ao menos uma seção' });
      return;
    }

    await automation!.criarFormulario(formulario);
    
    res.json({ success: true, message: 'Formulário criado com sucesso!' });
  } catch (error) {
    next(error);
  }
});

// Fechar automação
app.post('/api/fechar', async (req, res, next) => {
  try {
    if (automation) {
      await automation.close();
      automation = null;
    }
    res.json({ success: true, message: 'Navegador fechado' });
  } catch (error) {
    next(error);
  }
});

// Listar templates
app.get('/api/templates', async (req, res, next) => {
  try {
    const templatesDir = path.join(process.cwd(), 'templates');
    const files = await fs.readdir(templatesDir);
    const templates = files.filter(f => f.endsWith('.json'));
    res.json({ success: true, templates });
  } catch (error) {
    next(error);
  }
});

// Carregar template (com proteção contra path traversal)
app.get('/api/templates/:nome', async (req, res, next) => {
  try {
    const nome = path.basename(req.params.nome);
    if (!nome.endsWith('.json')) {
      res.status(400).json({ success: false, message: 'Apenas arquivos .json são permitidos' });
      return;
    }
    const templatePath = path.join(process.cwd(), 'templates', nome);
    const content = await fs.readFile(templatePath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error) {
    next(error);
  }
});

// Função para iniciar o servidor
export function startServer() {
  app.listen(PORT, () => {
    console.log(chalk.blue('\n╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.blue('║     SERVIDOR WEB INICIADO - DIAGNÓSTICO SEBRAE           ║'));
    console.log(chalk.blue('╚═══════════════════════════════════════════════════════════╝\n'));
    console.log(chalk.green(`🌐 Abra seu navegador em: ${chalk.bold(`http://localhost:${PORT}`)}\n`));
    console.log(chalk.gray('Pressione Ctrl+C para encerrar o servidor\n'));
  });
}

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(chalk.red('Erro na requisição:'), err.message);
  res.status(500).json({ success: false, message: err.message || 'Erro interno do servidor' });
});

// Fechar navegador ao encerrar servidor
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⏳ Encerrando servidor...'));
  if (automation) {
    await automation.close();
  }
  process.exit(0);
});
