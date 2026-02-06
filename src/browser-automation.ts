import { chromium, Browser, Page, BrowserContext } from 'playwright';
import type { DiagnosticoForm, FormSection, FormQuestion, SelectorMap } from './types.js';
import { config } from './config.js';
import fs from 'fs/promises';
import path from 'path';
import ora from 'ora';

export class SebraeAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private selectors: SelectorMap | null = null;
  private programasCache: Array<{ value: string; name: string }> | null = null;

  async init() {
    const spinner = ora('Iniciando navegador...').start();
    
    try {
      this.browser = await chromium.launch({
        headless: config.headless,
        slowMo: config.slowMo,
        args: [
          '--window-position=0,0',  // Posição no canto superior esquerdo da tela primária
        ],
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },  // Tamanho menor e mais controlado
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(config.timeout);

      // Tentar carregar seletores personalizados
      await this.loadSelectors();

      spinner.succeed('Navegador iniciado com sucesso!');
    } catch (error) {
      spinner.fail('Erro ao iniciar navegador');
      throw error;
    }
  }

  private async loadSelectors() {
    try {
      const selectorsPath = path.join(process.cwd(), 'src', 'selectors.json');
      const selectorsContent = await fs.readFile(selectorsPath, 'utf-8');
      this.selectors = JSON.parse(selectorsContent) as SelectorMap;
    } catch {
      // Se não existir, usaremos seletores genéricos
      console.log('⚠️  Seletores personalizados não encontrados. Use o modo "aprender" primeiro.');
    }
  }

  async login() {
    if (!this.page) throw new Error('Navegador não iniciado');

    const spinner = ora('Fazendo login...').start();

    try {
      await this.page.goto(config.url);

      // Aguardar a página de login carregar
      await this.page.waitForLoadState('networkidle');

      // Tentar encontrar campos de login (genérico)
      const usernameSelector = this.selectors?.login.username || 
        'input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"], input[id*="email"]';
      
      const passwordSelector = this.selectors?.login.password || 
        'input[type="password"]';

      await this.page.fill(usernameSelector, config.username);
      await this.page.fill(passwordSelector, config.password);

      const submitSelector = this.selectors?.login.submitButton || 
        'button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")';

      // Clicar e aguardar navegação
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }),
        this.page.click(submitSelector)
      ]);

      // Aguardar chegar na página admin
      await this.page.waitForURL('**/admin/**', { timeout: 10000 }).catch(() => {});
      
      // Verificar se chegou na página admin
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/admin')) {
        throw new Error('Login falhou - não chegou à página admin');
      }

      spinner.succeed('Login realizado com sucesso!');
    } catch (error) {
      spinner.fail('Erro ao fazer login');
      await this.screenshot('erro-login');
      throw error;
    }
  }

  async buscarProgramasDisponiveis(): Promise<Array<{ value: string; name: string }>> {
    if (!this.page) throw new Error('Navegador não iniciado');

    // Retornar cache se já foi buscado
    if (this.programasCache) {
      console.log(`✓ ${this.programasCache.length} programas (cache)`);
      return this.programasCache;
    }

    const spinner = ora('Buscando programas disponíveis...').start();

    try {
      // Navegar diretamente para a página sem clicar nos menus
      const baseUrl = config.url.replace('/admin', '');
      await this.page.goto(`${baseUrl}/admin/avaliacoes`, { waitUntil: 'networkidle' });

      // Clicar em Inserir Avaliação
      await this.page.waitForSelector('a#avaliacao-create', { timeout: 5000 });
      await this.page.click('a#avaliacao-create');
      await this.page.waitForLoadState('networkidle');

      // Aguardar o select de programas estar disponível
      const programaSelector = 'select#avaliacoes-programa_id';
      await this.page.waitForSelector(programaSelector, { timeout: 8000 });

      // Extrair todas as opções do select
      const programas = await this.page.$$eval(
        `${programaSelector} option`,
        (options) => options
          .filter((opt: any) => opt.value !== '')
          .map((opt: any) => ({
            value: opt.value,
            name: opt.textContent?.trim() || opt.value
          }))
      );

      // Salvar no cache
      this.programasCache = programas;

      // Fechar modal para voltar à tela inicial
      try {
        // Tentar múltiplas estratégias para fechar o modal
        // Estratégia 1: Clicar no botão "Fechar" pelo texto
        try {
          await this.page.click('button:has-text("Fechar")', { timeout: 2000 });
          await this.page.waitForTimeout(1000);
        } catch {
          // Estratégia 2: Clicar pelo atributo data-dismiss
          try {
            await this.page.click('button[data-dismiss="modal"]', { timeout: 1000 });
            await this.page.waitForTimeout(1000);
          } catch {
            // Estratégia 3: Usar ESC
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(800);
          }
        }
      } catch (error) {
        console.warn('Não foi possível fechar o modal automaticamente');
      }

      spinner.succeed(`${programas.length} programas carregados!`);
      return programas;
    } catch (error) {
      spinner.fail(`Erro ao buscar programas: ${error}`);
      console.error(error);
      throw error;
    }
  }

  async criarPrograma(dadosPrograma: { nome: string; descricao?: string; ativo?: boolean }) {
    if (!this.page) throw new Error('Navegador não iniciado');

    const spinner = ora(`Criando programa: ${dadosPrograma.nome}...`).start();

    try {
      // Navegar para página de programas
      const baseUrl = config.url.replace('/admin', '');
      await this.page.goto(`${baseUrl}/admin/programas`, { waitUntil: 'networkidle' });

      // Clicar em Inserir Programa
      await this.page.waitForSelector('a#programa-create', { timeout: 5000 });
      await this.page.click('a#programa-create');
      await this.page.waitForLoadState('networkidle');

      // Aguardar formulário carregar
      await this.page.waitForSelector('input#programas-nome', { timeout: 5000 });

      // Preencher nome
      await this.page.fill('input#programas-nome', dadosPrograma.nome);

      // Preencher descrição se houver
      if (dadosPrograma.descricao) {
        const descricaoField = await this.page.$('textarea#programas-descricao, input#programas-descricao');
        if (descricaoField) {
          await descricaoField.fill(dadosPrograma.descricao);
        }
      }

      // Marcar como ativo (se especificado)
      if (dadosPrograma.ativo !== undefined) {
        const ativoCheckbox = await this.page.$('input#programas-ativo');
        if (ativoCheckbox) {
          const isChecked = await ativoCheckbox.isChecked();
          if (isChecked !== dadosPrograma.ativo) {
            await ativoCheckbox.click();
          }
        }
      }

      // Salvar programa
      await this.page.waitForSelector('.modal-footer button[type="submit"].btn.blue-light', { timeout: 5000 });
      await this.page.click('.modal-footer button[type="submit"].btn.blue-light');
      await this.page.waitForLoadState('networkidle');

      // Limpar cache de programas para recarregar
      this.programasCache = null;

      spinner.succeed(`Programa criado: ${dadosPrograma.nome}`);
      
      // Buscar programas novamente para pegar o ID do novo programa
      const programas = await this.buscarProgramasDisponiveis();
      const programaCriado = programas.find(p => p.name.includes(dadosPrograma.nome));
      
      return programaCriado;
    } catch (error) {
      spinner.fail(`Erro ao criar programa: ${error}`);
      await this.screenshot('erro-criar-programa');
      throw error;
    }
  }

  async criarFormulario(formulario: DiagnosticoForm) {
    if (!this.page) throw new Error('Navegador não iniciado');

    console.log('\n📝 Criando avaliação:', formulario.titulo);

    try {
      // Navegar até o formulário de criação
      await this.navegarParaCriacaoAvaliacao();
      
      // Criar avaliação básica
      await this.criarAvaliacaoBasica(formulario);

      // Criar temas (seções) e perguntas
      for (let i = 0; i < formulario.secoes.length; i++) {
        const secao = formulario.secoes[i];
        console.log(`\n  📂 Tema ${i + 1}: ${secao.titulo}`);
        await this.criarTema(secao, i + 1);
      }

      console.log('\n✅ Avaliação criada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar avaliação:', error);
      await this.screenshot('erro-criacao');
      throw error;
    }
  }

  private async navegarParaCriacaoAvaliacao() {
    if (!this.page) return;

    const spinner = ora('Navegando para criação de avaliação...').start();

    try {
      // 1. Clicar no menu Diagnósticos
      await this.page.click('a:has(span:text("Diagnósticos"))');
      await this.page.waitForTimeout(1000);

      // 2. Clicar em Avaliações
      await this.page.click('a[href="/admin/avaliacoes"]');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1000);

      // 3. Clicar em Inserir Avaliação
      await this.page.click('a#avaliacao-create');
      await this.page.waitForTimeout(2000);

      // 4. Aguardar o formulário estar disponível
      await this.page.waitForSelector('select#avaliacoes-programa_id', { timeout: 10000 });

      spinner.succeed('Formulário de criação carregado');
    } catch (error) {
      spinner.fail('Erro ao navegar para criação');
      throw error;
    }
  }

  private async criarAvaliacaoBasica(formulario: DiagnosticoForm) {
    if (!this.page) return;

    const spinner = ora('Criando avaliação básica...').start();

    try {
      // Aguardar o select de programas estar disponível e carregado
      spinner.text = 'Carregando programas disponíveis...';
      const programaSelect = 'select#avaliacoes-programa_id';
      await this.page.waitForSelector(programaSelect, { timeout: 10000 });
      await this.page.waitForTimeout(1000);

      // Extrair programas disponíveis
      const programasDisponiveis = await this.page.$$eval(
        `${programaSelect} option`,
        (options) => options
          .filter((opt: any) => opt.value !== '')
          .map((opt: any) => ({
            value: opt.value,
            text: opt.textContent?.trim() || opt.value
          }))
      );

      console.log(`\n  📋 ${programasDisponiveis.length} programas disponíveis`);
      
      // Selecionar programa
      let programaId = formulario.programaId;
      
      if (!programaId && programasDisponiveis.length > 0) {
        // Se não especificado, usar o primeiro disponível
        programaId = programasDisponiveis[0].value;
        console.log(`  ℹ️  Nenhum programa especificado, usando: ${programasDisponiveis[0].text}`);
      }

      if (programaId) {
        spinner.text = 'Selecionando programa...';
        await this.page.selectOption(programaSelect, programaId);
        await this.page.waitForTimeout(500);
        
        const programaSelecionado = programasDisponiveis.find(p => p.value === programaId);
        console.log(`  ✓ Programa selecionado: ${programaSelecionado?.text || programaId}`);
      }

      // Preencher nome
      spinner.text = 'Preenchendo nome da avaliação...';
      const nomeSelector = this.selectors?.avaliacao.nome || 'input#avaliacoes-nome';
      await this.page.fill(nomeSelector, formulario.titulo);

      // Tipo padrão = 1 (Padrão)
      spinner.text = 'Selecionando tipo...';
      const tipoSelector = this.selectors?.avaliacao.tipoSelect || 'select#avaliacoes-tipo_id';
      await this.page.selectOption(tipoSelector, '1');

      // Clicar em cadastrar
      spinner.text = 'Cadastrando avaliação...';
      const btnCadastrar = this.selectors?.avaliacao.btnCadastrar || 'button[type="submit"]:has-text("Cadastrar nova avaliação")';
      await this.page.click(btnCadastrar);
      await this.page.waitForLoadState('networkidle');
      
      // Aguardar redirecionamento e página de edição carregar
      await this.page.waitForTimeout(2000);
      
      // Verificar se estamos na página de edição
      await this.page.waitForSelector('a[href*="#tabAvaliacao-tab4"]', { timeout: 10000 });

      spinner.succeed('Avaliação básica criada');
    } catch (error) {
      spinner.fail('Erro ao criar avaliação básica');
      throw error;
    }
  }

  private async criarTema(secao: FormSection, ordem: number) {
    if (!this.page) return;

    const spinner = ora(`Criando tema: ${secao.titulo}...`).start();

    try {
      // Ir para aba Temas (aguardar estar visível e clicável)
      spinner.text = 'Navegando para aba Temas...';
      console.log('\n  🔍 Procurando aba Temas...');
      await this.screenshot('antes-aba-temas');
      
      const abaTemas = this.selectors?.avaliacao.abaTemas || 'a[href="#tabAvaliacao-tab4"]';
      
      try {
        await this.page.waitForSelector(abaTemas, { state: 'visible', timeout: 15000 });
        console.log('  ✓ Aba Temas encontrada, clicando...');
        await this.page.click(abaTemas);
        await this.page.waitForTimeout(2000);
        console.log('  ✓ Aba Temas clicada com sucesso');
      } catch (error) {
        console.error(`\n  ❌ Erro ao clicar na aba Temas. Tentando seletor alternativo...`);
        await this.screenshot('erro-aba-temas');
        // Tentar seletor alternativo
        await this.page.click('a:has-text("Temas")');
        await this.page.waitForTimeout(2000);
      }

      // Clicar em Adicionar novo tema
      spinner.text = 'Abrindo formulário de tema...';
      console.log('  🔍 Procurando botão Adicionar novo tema...');
      await this.screenshot('antes-botao-adicionar');
      
      const btnAdicionar = this.selectors?.tema.btnAdicionar || 'a[data-action="adicionar-novo-tema"]';
      
      try {
        await this.page.waitForSelector(btnAdicionar, { state: 'visible', timeout: 10000 });
        console.log('  ✓ Botão Adicionar encontrado, clicando...');
        await this.page.click(btnAdicionar);
        await this.page.waitForTimeout(2000);
        console.log('  ✓ Formulário de tema aberto');
      } catch (error) {
        console.error(`\n  ❌ Botão Adicionar não encontrado. Seletores disponíveis:`);
        await this.screenshot('erro-botao-adicionar-tema');
        
        // Tentar seletor alternativo
        console.log('  🔄 Tentando seletor alternativo: a.btn:has-text("Adicionar")');
        await this.page.click('a.btn:has-text("Adicionar")');
        await this.page.waitForTimeout(2000);
      }

      // Aguardar formulário de tema carregar (pode ser modal ou inline)
      console.log('  🔍 Aguardando formulário de tema carregar...');
      await this.screenshot('apos-clicar-adicionar');
      
      try {
        await this.page.waitForSelector('input#avaliacaotemas-nome', { state: 'visible', timeout: 15000 });
        console.log('  ✓ Formulário de tema carregado');
      } catch (error) {
        console.error('  ❌ Formulário de tema não carregou');
        await this.screenshot('erro-formulario-tema-nao-carregou');
        throw error;
      }

      // Preencher nome do tema
      spinner.text = `Preenchendo nome: ${secao.titulo}`;
      console.log(`  ✏️  Preenchendo nome: ${secao.titulo}`);
      const nomeSelector = this.selectors?.tema.nome || 'input#avaliacaotemas-nome';
      await this.page.fill(nomeSelector, secao.titulo);

      // Preencher ordem
      console.log(`  ✏️  Preenchendo ordem: ${ordem}`);
      const ordemSelector = this.selectors?.tema.ordem || 'input#avaliacaotemas-ordem';
      await this.page.fill(ordemSelector, ordem.toString());

      // Preencher descrição se houver
      if (secao.descricao) {
        console.log(`  ✏️  Preenchendo descrição`);
        const descricaoSelector = this.selectors?.tema.descricao || 'input#avaliacaotemas-descricao';
        await this.page.fill(descricaoSelector, secao.descricao);
      }

      // Salvar tema
      spinner.text = 'Salvando tema...';
      console.log('  💾 Procurando botão Salvar no modal...');
      await this.screenshot('antes-salvar-tema');
      
      // Aguardar modal estar visível
      try {
        await this.page.waitForSelector('.modal-footer', { state: 'visible', timeout: 5000 });
        console.log('  ✓ Modal encontrado');
      } catch (error) {
        console.log('  ⚠️  Modal não encontrado, tentando sem modal');
      }
      
      // Tentar múltiplos seletores para o botão Salvar dentro do modal
      const seletoresSalvar = [
        '.modal-footer button[type="submit"].btn.blue-light',
        '.modal-footer button:has-text("Salvar")',
        '.modal-footer button[type="submit"]',
        'button[type="submit"].btn.blue-light',
        'button.btn.blue-light:has-text("Salvar")',
        'button:has-text("Salvar")'
      ];
      
      let salvou = false;
      for (const seletor of seletoresSalvar) {
        try {
          console.log(`  🔍 Tentando seletor: ${seletor}`);
          const elemento = await this.page.waitForSelector(seletor, { state: 'visible', timeout: 2000 });
          if (elemento) {
            console.log(`  ✓ Botão encontrado com seletor: ${seletor}`);
            await elemento.click();
            await this.page.waitForTimeout(3000);
            console.log('  ✓ Tema salvo com sucesso');
            salvou = true;
            break;
          }
        } catch (error) {
          console.log(`  ⚠️  Seletor ${seletor} não encontrado, tentando próximo...`);
          continue;
        }
      }
      
      if (!salvou) {
        console.error('  ❌ Nenhum botão Salvar encontrado com os seletores conhecidos');
        await this.screenshot('erro-salvar-tema-nenhum-botao');
        throw new Error('Botão Salvar não encontrado');
      }

      spinner.succeed(`Tema criado: ${secao.titulo}`);

      // Criar perguntas do tema
      for (let i = 0; i < secao.perguntas.length; i++) {
        const pergunta = secao.perguntas[i];
        console.log(`    ❓ Pergunta ${i + 1}: ${pergunta.pergunta.substring(0, 50)}...`);
        await this.criarPergunta(pergunta, i + 1);
      }
    } catch (error) {
      spinner.fail(`Erro ao criar tema: ${secao.titulo}`);
      throw error;
    }
  }

  private async criarPergunta(pergunta: FormQuestion, ordem: number) {
    if (!this.page) return;

    try {
      // Clicar em Adicionar Pergunta
      console.log('      🔍 Procurando botão Adicionar Pergunta...');
      await this.screenshot('antes-adicionar-pergunta');
      
      const btnAdicionar = this.selectors?.pergunta.btnAdicionar || 'a.btn.blue-light:has-text("Adicionar Pergunta")';
      
      try {
        await this.page.waitForSelector(btnAdicionar, { state: 'visible', timeout: 10000 });
        console.log('      ✓ Botão Adicionar Pergunta encontrado');
      } catch (error) {
        console.log('      ⚠️  Botão Adicionar Pergunta não encontrado, tirando screenshot...');
        await this.screenshot('erro-botao-adicionar-pergunta-nao-encontrado');
        throw new Error(`Botão Adicionar Pergunta não encontrado. Seletor usado: ${btnAdicionar}`);
      }
      
      await this.page.click(btnAdicionar);
      await this.page.waitForTimeout(3000);
      console.log('      ✓ Clicado em Adicionar Pergunta');
      await this.screenshot('apos-clicar-adicionar-pergunta');

      // Aguardar formulário carregar
      console.log('      🔍 Aguardando formulário de pergunta carregar...');
      await this.page.waitForSelector('select#perguntas-pergunta_tipo_id', { state: 'visible', timeout: 15000 });
      console.log('      ✓ Formulário de pergunta carregado');

      // Mapear tipo de pergunta
      console.log(`      ✏️  Selecionando tipo: ${pergunta.tipo}`);
      const tipoId = this.mapearTipoPergunta(pergunta.tipo);
      const tipoSelector = this.selectors?.pergunta.tipoSelect || 'select#perguntas-pergunta_tipo_id';
      await this.page.selectOption(tipoSelector, tipoId);
      await this.page.waitForTimeout(500);

      // Preencher título
      console.log(`      ✏️  Preenchendo título: ${pergunta.pergunta.substring(0, 30)}...`);
      const tituloSelector = this.selectors?.pergunta.titulo || 'input#perguntas-titulo';
      await this.page.fill(tituloSelector, pergunta.pergunta);

      // Preencher ordem
      const ordemSelector = this.selectors?.pergunta.ordem || 'input#perguntas-ordem';
      await this.page.fill(ordemSelector, ordem.toString());

      // Texto complementar
      if (pergunta.textoComplementar) {
        const textoCompSelector = this.selectors?.pergunta.textoComplementar || 'input#perguntas-texto_complementar';
        await this.page.fill(textoCompSelector, pergunta.textoComplementar);
      }

      // Salvar pergunta (botão dentro de modal)
      console.log('      💾 Procurando botão Salvar no modal...');
      await this.screenshot('antes-salvar-pergunta');
      
      // Aguardar modal footer estar visível
      try {
        await this.page.waitForSelector('.modal-footer', { state: 'visible', timeout: 15000 });
        console.log('      ✓ Modal footer encontrado');
      } catch (error) {
        console.log('      ⚠️  Modal footer não encontrado após 15s');
        await this.screenshot('erro-modal-footer-nao-encontrado');
        console.log('      🔍 Tentando localizar modal ou botão Salvar de qualquer forma...');
      }
      
      // Tentar múltiplos seletores
      const seletoresSalvar = [
        '.modal-footer button[type="submit"].btn.blue-light',
        '.modal-footer button.btn.blue-light',
        'button[type="submit"].btn.blue-light:visible',
        '.modal.show button[type="submit"]',
        '.modal-footer button[type="submit"]',
        'button.btn.blue-light:has-text("Salvar")',
        '.modal button:has-text("Salvar")'
      ];
      
      let salvou = false;
      for (const seletor of seletoresSalvar) {
        try {
          console.log(`      🔍 Tentando salvar com seletor: ${seletor}`);
          const btn = await this.page.waitForSelector(seletor, { state: 'visible', timeout: 5000 });
          if (btn) {
            await btn.click();
            await this.page.waitForTimeout(3000);
            console.log('      ✓ Pergunta salva');
            salvou = true;
            break;
          }
        } catch (error) {
          console.log(`      ⚠️  Seletor ${seletor} não funcionou`);
          continue;
        }
      }
      
      if (!salvou) {
        console.log('      ⚠️  Nenhum botão Salvar encontrado, tentando método alternativo...');
        await this.screenshot('erro-salvar-pergunta');
        // Tentar pressionar Enter como fallback
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(3000);
      }

      // Se tiver opções, adicionar
      if (pergunta.opcoes && pergunta.opcoes.length > 0) {
        await this.adicionarOpcoes(pergunta.opcoes);
      }
    } catch (error) {
      console.log(`      ⚠️  Erro ao criar pergunta: ${error}`);
      await this.screenshot('erro-criar-pergunta');
      throw error;
    }
  }

  private mapearTipoPergunta(tipo: string): string {
    // Usar mapeamento do selectors.json se disponível
    if (this.selectors?.tiposPergunta) {
      const mapaFromSelectors: Record<string, string> = {
        'resposta-unica': this.selectors.tiposPergunta.respostaUnica || '1',
        'texto-curto': this.selectors.tiposPergunta.textoCurto || '3',
        'texto-longo': this.selectors.tiposPergunta.textoLongo || '4',
        'escala-livre': this.selectors.tiposPergunta.escalaLinearLivre || '6',
        'multiplas-respostas': this.selectors.tiposPergunta.multiplasRespostas || '7',
        'sim-nao': this.selectors.tiposPergunta.simNao || '8',
        'escala-1-5': this.selectors.tiposPergunta.escala1a5 || '9',
        'escala-1-10': this.selectors.tiposPergunta.escala1a10 || '10',
        'lista-suspensa': this.selectors.tiposPergunta.listaSuspensa || '13'
      };
      return mapaFromSelectors[tipo] || '1';
    }

    // Fallback hardcoded
    const mapa: Record<string, string> = {
      'resposta-unica': '1',
      'texto-curto': '3',
      'texto-longo': '4',
      'escala-livre': '6',
      'multiplas-respostas': '7',
      'sim-nao': '8',
      'escala-1-5': '9',
      'escala-1-10': '10',
      'lista-suspensa': '13'
    };
    return mapa[tipo] || '1';
  }

  private async adicionarOpcoes(opcoes: NonNullable<FormQuestion['opcoes']>) {
    if (!this.page) return;

    try {
      // Ir para aba Respostas
      const abaRespostas = this.selectors?.pergunta.abaRespostas || 'a[href="#tabAvaliacaoPergunta-tab1"]';
      await this.page.click(abaRespostas);
      await this.page.waitForTimeout(1000);

      for (let i = 0; i < opcoes.length; i++) {
        const opcao = opcoes[i];

        // Clicar em Nova Opção
        const btnNovaOpcao = this.selectors?.opcaoResposta.btnNovaOpcao || 'a#nova-opcao';
        await this.page.click(btnNovaOpcao);
        await this.page.waitForTimeout(800);

        // Preencher pontos (se houver)
        if (opcao.pontos !== undefined) {
          const pontosInputs = await this.page.$$('input[id$="-pontos"]');
          if (pontosInputs.length > 0) {
            await pontosInputs[pontosInputs.length - 1].fill(opcao.pontos.toString());
          }
        }

        // Preencher nome da opção
        const nomeInputs = await this.page.$$('input[id$="-nome"]');
        if (nomeInputs.length > 0) {
          await nomeInputs[nomeInputs.length - 1].fill(typeof opcao === 'string' ? opcao : opcao.nome);
        }
      }

      // Salvar opções
      const btnSalvar = this.selectors?.opcaoResposta.btnSalvar || 'button[type="submit"]:has-text("Salvar")';
      await this.page.click(btnSalvar);
      await this.page.waitForTimeout(1500);
    } catch (error) {
      console.log(`        ⚠️  Erro ao adicionar opções: ${error}`);
    }
  }

  async modoAprendizado() {
    if (!this.page) throw new Error('Navegador não iniciado');

    console.log('\n🎓 MODO APRENDIZADO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Este modo irá ajudá-lo a configurar os seletores corretos.');
    console.log('Siga as instruções no navegador e use as ferramentas de');
    console.log('desenvolvedor (F12) para identificar os seletores.');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🌐 Navegador aberto. Por favor:');
    console.log('1. Navegue manualmente até a área de criação de formulários');
    console.log('2. Identifique os seletores CSS dos elementos importantes');
    console.log('3. Anote-os para configurar no arquivo selectors.json\n');

    console.log('💡 Dica: Clique com botão direito > Inspecionar para ver seletores\n');
    console.log('Pressione ENTER quando terminar...');

    // Manter navegador aberto até o usuário pressionar Enter
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
  }

  private async screenshot(nome: string) {
    if (!this.page) return;
    
    try {
      await this.page.screenshot({ 
        path: `screenshots/${nome}-${Date.now()}.png`,
        fullPage: true 
      });
    } catch {
      // Ignorar erro de screenshot
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.programasCache = null; // Limpar cache ao fechar
    }
  }
}
