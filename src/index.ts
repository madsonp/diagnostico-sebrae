#!/usr/bin/env node

// Configurar UTF-8 primeiro
import './setup-encoding.js';

import { CLI } from './cli.js';
import { SebraeAutomation } from './browser-automation.js';
import { validateConfig } from './config.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const comando = process.argv[2];
  const cli = new CLI();

  if (!comando) {
    cli.exibirMenuPrincipal();
    return;
  }

  // Validar configuração
  if (!validateConfig()) {
    console.log(chalk.yellow('\n💡 Configure suas credenciais no arquivo .env'));
    console.log(chalk.gray('   Copie o arquivo .env.example para .env e preencha os dados\n'));
    return;
  }

  const automation = new SebraeAutomation();

  try {
    switch (comando) {
      case 'criar':
        await modoCriacaoInterativo(cli, automation);
        break;

      case 'duplicar':
        console.log(chalk.yellow('🚧 Funcionalidade de duplicação em desenvolvimento...'));
        break;

      case 'aprender':
        await modoAprendizado(automation);
        break;

      default:
        console.log(chalk.red(`❌ Comando desconhecido: ${comando}`));
        cli.exibirMenuPrincipal();
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Erro:'), error);
    console.log(chalk.yellow('\n💡 Verifique as screenshots na pasta do projeto para debug'));
    process.exit(1);
  } finally {
    console.log(chalk.gray('\n⏳ Aguarde, fechando navegador...'));
    await automation.close();
    console.log(chalk.gray('✓ Navegador fechado\n'));
  }
}

async function modoCriacaoInterativo(cli: CLI, automation: SebraeAutomation) {
  // Inicializar automação e fazer login uma única vez
  await automation.init();
  await automation.login();

  let continuar = true;

  while (continuar) {
    console.log(chalk.blue('\n╔═══════════════════════════════════════════╗'));
    console.log(chalk.blue('║        MODO CRIAÇÃO INTERATIVO           ║'));
    console.log(chalk.blue('╚═══════════════════════════════════════════╝\n'));

    // Menu principal
    const acao = await import('@inquirer/prompts').then(m => m.select({
      message: '🎯 O que você deseja fazer?',
      choices: [
        { value: 'novo-formulario', name: '📝 Criar novo formulário completo' },
        { value: 'template', name: '📁 Usar template existente' },
        { value: 'sair', name: '🚪 Sair' }
      ]
    }));

    if (acao === 'sair') {
      continuar = false;
      continue;
    }

    // Criar formulário
    await criarFormulario(cli, automation, acao === 'template');

    // Perguntar se quer continuar
    continuar = await import('@inquirer/prompts').then(m => m.confirm({
      message: '🔄 Deseja criar outro formulário?',
      default: true
    }));
  }

  console.log(chalk.green('\n✨ Sessão finalizada com sucesso!\n'));
}

async function criarFormulario(cli: CLI, automation: SebraeAutomation, usarTemplate: boolean = false) {
  // Perguntar se quer usar template (se não foi especificado)
  let templateNome: string | null = null;
  
  if (usarTemplate) {
    templateNome = await cli.selecionarTemplate();
  }
  
  let formulario;
  let veioDeTemplate = false;

  if (templateNome) {
    try {
      const templatePath = path.join(process.cwd(), 'templates', templateNome);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      formulario = JSON.parse(templateContent);
      veioDeTemplate = true;
      console.log(chalk.green(`✅ Template carregado: ${templateNome}\n`));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Não foi possível carregar o template. Criando do zero...\n`));
      formulario = await cli.criarFormularioInterativo();
    }
  } else {
    formulario = await cli.criarFormularioInterativo();
  }

  // Confirmar antes de executar
  const confirmar = await cli.confirmarExecucao(formulario);
  
  if (!confirmar) {
    console.log(chalk.yellow('\n❌ Operação cancelada pelo usuário'));
    return;
  }

  // Salvar como template (opcional) - apenas se NÃO veio de template
  if (!veioDeTemplate) {
    const salvarTemplate = await import('@inquirer/prompts').then(m => m.confirm({
      message: '💾 Deseja salvar este formulário como template?',
      default: false,
    }));

    if (salvarTemplate) {
      const nomeTemplate = await import('@inquirer/prompts').then(m => m.input({
        message: 'Nome do template:',
        default: formulario.titulo.toLowerCase().replace(/\s+/g, '-') + '.json',
        validate: (input: string) => {
          // Caracteres inválidos no Windows: < > : " / \ | ? *
          const invalidChars = /[<>:"/\\|?*]/g;
          if (invalidChars.test(input)) {
            return '❌ Nome inválido! Não use os caracteres: < > : " / \\ | ? *';
          }
          if (!input.endsWith('.json')) {
            return '❌ O nome deve terminar com .json';
          }
          return true;
        },
      }));

      const templatesDir = path.join(process.cwd(), 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      await fs.writeFile(
        path.join(templatesDir, nomeTemplate),
        JSON.stringify(formulario, null, 2),
        'utf-8'
      );
      console.log(chalk.green(`✅ Template salvo: ${nomeTemplate}\n`));
    }
  }

  // Executar automação
  console.log(chalk.blue('\n🤖 Iniciando automação...\n'));
  
  await automation.criarFormulario(formulario);

  console.log(chalk.green.bold('\n✨ Formulário criado com sucesso! ✨\n'));
}

async function modoAprendizado(automation: SebraeAutomation) {
  await automation.init();
  await automation.login();
  await automation.modoAprendizado();
  
  console.log(chalk.blue('\n📝 Agora crie o arquivo src/selectors.json com os seletores identificados.'));
  console.log(chalk.gray('   Veja o exemplo em selectors.example.json\n'));
}

main();
