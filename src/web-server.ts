import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { SebraeAutomation } from './browser-automation.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Instância global da automação
let automation: SebraeAutomation | null = null;

// Iniciar automação
app.post('/api/iniciar', async (req, res) => {
  try {
    if (!automation) {
      automation = new SebraeAutomation();
      await automation.init();
      await automation.login();
    }
    res.json({ success: true, message: 'Navegador iniciado e login realizado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Buscar programas disponíveis
app.get('/api/programas', async (req, res) => {
  try {
    if (!automation) {
      return res.status(400).json({ success: false, message: 'Automação não iniciada' });
    }

    const programas = await automation.buscarProgramasDisponiveis();
    res.json({ success: true, programas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Criar novo programa
app.post('/api/criar-programa', async (req, res) => {
  try {
    if (!automation) {
      return res.status(400).json({ success: false, message: 'Automação não iniciada' });
    }

    const dadosPrograma = req.body;
    const programa = await automation.criarPrograma(dadosPrograma);
    
    res.json({ 
      success: true, 
      message: 'Programa criado com sucesso!',
      programa
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Criar formulário
app.post('/api/criar-formulario', async (req, res) => {
  try {
    if (!automation) {
      return res.status(400).json({ success: false, message: 'Automação não iniciada' });
    }

    const formulario = req.body;
    await automation.criarFormulario(formulario);
    
    res.json({ success: true, message: 'Formulário criado com sucesso!' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fechar automação
app.post('/api/fechar', async (req, res) => {
  try {
    if (automation) {
      await automation.close();
      automation = null;
    }
    res.json({ success: true, message: 'Navegador fechado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Listar templates
app.get('/api/templates', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const templatesDir = path.join(process.cwd(), 'templates');
    const files = await fs.readdir(templatesDir);
    const templates = files.filter(f => f.endsWith('.json'));
    res.json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Carregar template
app.get('/api/templates/:nome', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const templatePath = path.join(process.cwd(), 'templates', req.params.nome);
    const content = await fs.readFile(templatePath, 'utf-8');
    res.json({ success: true, data: JSON.parse(content) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(chalk.blue('\n╔═══════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue('║     SERVIDOR WEB INICIADO - DIAGNÓSTICO SEBRAE           ║'));
  console.log(chalk.blue('╚═══════════════════════════════════════════════════════════╝\n'));
  console.log(chalk.green(`🌐 Abra seu navegador em: ${chalk.bold(`http://localhost:${PORT}`)}\n`));
  console.log(chalk.gray('Pressione Ctrl+C para encerrar o servidor\n'));
});

// Fechar navegador ao encerrar servidor
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⏳ Encerrando servidor...'));
  if (automation) {
    await automation.close();
  }
  process.exit(0);
});
