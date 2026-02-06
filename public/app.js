let secaoCount = 0;
let navegadorIniciado = false;
let programasCarregados = false;

// Carregar programas apenas se necessário
async function carregarProgramasSeNecessario() {
    if (!navegadorIniciado) {
        showNotification('⚠️ Inicie o navegador primeiro', 'error');
        return;
    }
    
    if (!programasCarregados) {
        await carregarProgramas();
    }
}

// Verificar navegador e abrir modal
function verificarEAbrirModal() {
    if (!navegadorIniciado) {
        showNotification('⚠️ Inicie o navegador primeiro', 'error');
        return;
    }
    abrirModalPrograma();
}

// Iniciar automação
async function iniciarAutomacao() {
    showLoading();
    try {
        const response = await fetch('/api/iniciar', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            navegadorIniciado = true;
            updateStatus(true, 'Navegador conectado');
            document.getElementById('btnIniciar').style.display = 'none';
            document.getElementById('btnFechar').classList.remove('btn-hidden');
            showNotification('✅ ' + data.message, 'success');
            
            // Carregar programas disponíveis
            await carregarProgramas();
        } else {
            showNotification('❌ ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('❌ Erro ao conectar com o servidor', 'error');
    } finally {
        hideLoading();
    }
}

// Carregar programas disponíveis
async function carregarProgramas() {
    try {
        const response = await fetch('/api/programas');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('programaId');
            select.innerHTML = '<option value="">Selecione um programa...</option>';
            
            data.programas.forEach(programa => {
                const option = document.createElement('option');
                option.value = programa.value;
                option.textContent = programa.name;
                select.appendChild(option);
            });
            
            select.disabled = false;
            document.getElementById('btnNovoPrograma').disabled = false;
            programasCarregados = true;
            showNotification(`✅ ${data.programas.length} programas carregados`, 'success');
        } else {
            showNotification('⚠️ ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('⚠️ Erro ao carregar programas', 'error');
    }
}

// Abrir modal de novo programa
function abrirModalPrograma() {
    document.getElementById('modalPrograma').style.display = 'flex';
    document.getElementById('modalProgramaNome').value = '';
    document.getElementById('modalProgramaDescricao').value = '';
    document.getElementById('modalProgramaAtivo').checked = true;
}

// Fechar modal de novo programa
function fecharModalPrograma() {
    document.getElementById('modalPrograma').style.display = 'none';
}

// Criar novo programa
async function criarNovoPrograma() {
    const nome = document.getElementById('modalProgramaNome').value;
    
    if (!nome.trim()) {
        showNotification('❌ Nome do programa é obrigatório', 'error');
        return;
    }
    
    showLoading();
    fecharModalPrograma();
    
    try {
        const response = await fetch('/api/criar-programa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                descricao: document.getElementById('modalProgramaDescricao').value || undefined,
                ativo: document.getElementById('modalProgramaAtivo').checked
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ ' + data.message, 'success');
            
            // Recarregar programas
            programasCarregados = false;
            await carregarProgramas();
            
            // Selecionar o programa recém-criado
            if (data.programa) {
                document.getElementById('programaId').value = data.programa.value;
            }
        } else {
            showNotification('❌ ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('❌ Erro ao criar programa', 'error');
    } finally {
        hideLoading();
    }
}

// Fechar automação
async function fecharAutomacao() {
    try {
        await fetch('/api/fechar', { method: 'POST' });
        navegadorIniciado = false;
        updateStatus(false, 'Navegador desconectado');
        document.getElementById('btnIniciar').style.display = 'inline-block';
        document.getElementById('btnFechar').classList.add('btn-hidden');
        showNotification('Navegador fechado', 'success');
    } catch (error) {
        showNotification('❌ Erro ao fechar navegador', 'error');
    }
}

// Atualizar status
function updateStatus(active, text) {
    const dot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (active) {
        dot.classList.add('active');
    } else {
        dot.classList.remove('active');
    }
    statusText.textContent = text;
}

// Trocar aba
function switchTab(tab, evt) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    evt.target.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    
    if (tab === 'templates') {
        carregarTemplates();
    }
}

// Adicionar seção
function adicionarSecao() {
    secaoCount++;
    const secoesDiv = document.getElementById('secoes');
    
    const secaoHtml = `
        <div class="section-card" id="secao-${secaoCount}">
            <div class="section-header">
                <h4>📂 Tema ${secaoCount}</h4>
                <button type="button" class="btn-remove" onclick="removerSecao(${secaoCount})">🗑️ Remover</button>
            </div>
            
            <div class="form-group">
                <label>Título do Tema</label>
                <input type="text" class="secao-titulo" required placeholder="Ex: Gestão Financeira">
            </div>
            
            <div class="form-group">
                <label>Descrição (opcional)</label>
                <textarea class="secao-descricao" placeholder="Descrição do tema"></textarea>
            </div>
            
            <h5 style="margin: 20px 0 10px;">❓ Perguntas</h5>
            <div class="perguntas-container" id="perguntas-${secaoCount}"></div>
            <button type="button" class="btn btn-secondary" onclick="adicionarPergunta(${secaoCount})">➕ Adicionar Pergunta</button>
        </div>
    `;
    
    secoesDiv.insertAdjacentHTML('beforeend', secaoHtml);
}

// Remover seção
function removerSecao(id) {
    if (!confirm('Tem certeza que deseja remover este tema e todas as suas perguntas?')) return;
    document.getElementById(`secao-${id}`).remove();
}

// Adicionar pergunta
function adicionarPergunta(secaoId) {
    const perguntasDiv = document.getElementById(`perguntas-${secaoId}`);
    const perguntaId = Date.now();
    
    const perguntaHtml = `
        <div class="question-card" id="pergunta-${perguntaId}">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h5>❓ Pergunta</h5>
                <button type="button" class="btn-remove" onclick="removerPergunta(${perguntaId})">🗑️</button>
            </div>
            
            <div class="form-group">
                <label>Texto da Pergunta</label>
                <input type="text" class="pergunta-texto" required placeholder="Digite a pergunta">
            </div>
            
            <div class="form-group">
                <label>Tipo de Resposta</label>
                <select class="pergunta-tipo" onchange="toggleOpcoes(${perguntaId})">
                    <option value="resposta-unica">Resposta Única</option>
                    <option value="multiplas-respostas">Múltiplas Respostas</option>
                    <option value="texto-curto">Texto Curto</option>
                    <option value="texto-longo">Texto Longo</option>
                    <option value="sim-nao">Sim/Não</option>
                    <option value="escala-1-5">Escala 1-5</option>
                    <option value="escala-1-10">Escala 1-10</option>
                    <option value="lista-suspensa">Lista Suspensa</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" class="pergunta-obrigatoria"> Pergunta obrigatória
                </label>
            </div>
            
            <div class="opcoes-container" id="opcoes-${perguntaId}" style="display: block;">
                <h6>Opções de Resposta</h6>
                <div class="opcoes-list" id="opcoes-list-${perguntaId}"></div>
                <button type="button" class="btn btn-secondary" style="margin-top: 10px;" onclick="adicionarOpcao(${perguntaId})">➕ Adicionar Opção</button>
            </div>
        </div>
    `;
    
    perguntasDiv.insertAdjacentHTML('beforeend', perguntaHtml);
    adicionarOpcao(perguntaId); // Adicionar primeira opção por padrão
}

// Remover pergunta
function removerPergunta(id) {
    if (!confirm('Tem certeza que deseja remover esta pergunta?')) return;
    document.getElementById(`pergunta-${id}`).remove();
}

// Toggle opções baseado no tipo
function toggleOpcoes(perguntaId) {
    const select = document.querySelector(`#pergunta-${perguntaId} .pergunta-tipo`);
    const opcoesDiv = document.getElementById(`opcoes-${perguntaId}`);
    const tipo = select.value;
    
    const tiposComOpcoes = ['resposta-unica', 'multiplas-respostas', 'lista-suspensa'];
    opcoesDiv.style.display = tiposComOpcoes.includes(tipo) ? 'block' : 'none';
}

// Adicionar opção
function adicionarOpcao(perguntaId) {
    const opcoesListDiv = document.getElementById(`opcoes-list-${perguntaId}`);
    const opcaoId = Date.now().toString() + Math.floor(Math.random() * 100000);
    
    const opcaoHtml = `
        <div class="option-item" id="opcao-${opcaoId}">
            <input type="text" class="opcao-nome" placeholder="Nome da opção" style="flex: 2;">
            <input type="number" class="opcao-pontos" placeholder="Pontos" style="flex: 1;">
            <button type="button" class="btn-remove" onclick="removerOpcao('${opcaoId}')">🗑️</button>
        </div>
    `;
    
    opcoesListDiv.insertAdjacentHTML('beforeend', opcaoHtml);
}

// Remover opção
function removerOpcao(id) {
    document.getElementById(`opcao-${id}`).remove();
}

// Enviar formulário
document.getElementById('formFormulario').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!navegadorIniciado) {
        showNotification('❌ Inicie o navegador primeiro!', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const formulario = coletarDados();
        
        const response = await fetch('/api/criar-formulario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formulario)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ ' + data.message, 'success');
            // Limpar formulário
            document.getElementById('formFormulario').reset();
            document.getElementById('secoes').innerHTML = '';
            secaoCount = 0;
        } else {
            showNotification('❌ ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('❌ Erro ao criar formulário: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
});

// Coletar dados do formulário
function coletarDados() {
    const formulario = {
        titulo: document.getElementById('titulo').value,
        descricao: document.getElementById('descricao').value || undefined,
        programaId: document.getElementById('programaId').value || undefined,
        secoes: [],
        configuracoes: {
            permitirEdicao: false,
            mostrarProgresso: true
        }
    };
    
    // Coletar seções
    document.querySelectorAll('.section-card').forEach(secaoDiv => {
        const secao = {
            titulo: secaoDiv.querySelector('.secao-titulo').value,
            descricao: secaoDiv.querySelector('.secao-descricao').value || undefined,
            perguntas: []
        };
        
        // Coletar perguntas da seção
        secaoDiv.querySelectorAll('.question-card').forEach(perguntaDiv => {
            const tipo = perguntaDiv.querySelector('.pergunta-tipo').value;
            const pergunta = {
                tipo: tipo,
                pergunta: perguntaDiv.querySelector('.pergunta-texto').value,
                obrigatoria: perguntaDiv.querySelector('.pergunta-obrigatoria').checked,
                opcoes: []
            };
            
            // Coletar opções se necessário
            const tiposComOpcoes = ['resposta-unica', 'multiplas-respostas', 'lista-suspensa'];
            if (tiposComOpcoes.includes(tipo)) {
                perguntaDiv.querySelectorAll('.option-item').forEach(opcaoDiv => {
                    const nome = opcaoDiv.querySelector('.opcao-nome').value;
                    const pontos = opcaoDiv.querySelector('.opcao-pontos').value;
                    
                    if (nome) {
                        pergunta.opcoes.push({
                            nome: nome,
                            pontos: pontos ? parseInt(pontos) : undefined
                        });
                    }
                });
            }
            
            secao.perguntas.push(pergunta);
        });
        
        formulario.secoes.push(secao);
    });
    
    return formulario;
}

// Carregar templates
async function carregarTemplates() {
    try {
        const response = await fetch('/api/templates');
        const data = await response.json();
        
        const grid = document.getElementById('templatesGrid');
        grid.innerHTML = '';
        
        data.templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.onclick = () => carregarTemplate(template);
            card.innerHTML = `
                <h3>📄 ${template.replace('.json', '')}</h3>
                <p style="color: #6c757d; font-size: 0.9em;">Clique para carregar</p>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        showNotification('❌ Erro ao carregar templates', 'error');
    }
}

// Carregar template específico
async function carregarTemplate(nome) {
    showLoading();
    
    try {
        const response = await fetch(`/api/templates/${nome}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            
            // Preencher campos básicos
            document.getElementById('titulo').value = data.titulo || '';
            document.getElementById('descricao').value = data.descricao || '';
            if (data.programaId) {
                document.getElementById('programaId').value = data.programaId;
            }
            
            // Limpar seções existentes
            document.getElementById('secoes').innerHTML = '';
            secaoCount = 0;
            
            // Criar seções do template
            if (data.secoes && Array.isArray(data.secoes)) {
                data.secoes.forEach(secao => {
                    adicionarSecao();
                    const secaoDiv = document.getElementById(`secao-${secaoCount}`);
                    secaoDiv.querySelector('.secao-titulo').value = secao.titulo || '';
                    secaoDiv.querySelector('.secao-descricao').value = secao.descricao || '';
                    
                    // Criar perguntas
                    if (secao.perguntas && Array.isArray(secao.perguntas)) {
                        secao.perguntas.forEach(pergunta => {
                            adicionarPergunta(secaoCount);
                            const perguntasDiv = document.getElementById(`perguntas-${secaoCount}`);
                            const perguntaDiv = perguntasDiv.lastElementChild;
                            
                            perguntaDiv.querySelector('.pergunta-texto').value = pergunta.pergunta || '';
                            perguntaDiv.querySelector('.pergunta-tipo').value = pergunta.tipo || 'resposta-unica';
                            perguntaDiv.querySelector('.pergunta-obrigatoria').checked = !!pergunta.obrigatoria;
                            
                            // Atualizar visibilidade das opções
                            const perguntaId = perguntaDiv.id.replace('pergunta-', '');
                            toggleOpcoes(perguntaId);
                            
                            // Preencher opções
                            if (pergunta.opcoes && Array.isArray(pergunta.opcoes)) {
                                const opcoesListDiv = document.getElementById(`opcoes-list-${perguntaId}`);
                                opcoesListDiv.innerHTML = ''; // limpar opção padrão
                                pergunta.opcoes.forEach(opcao => {
                                    adicionarOpcao(perguntaId);
                                    const opcaoDiv = opcoesListDiv.lastElementChild;
                                    opcaoDiv.querySelector('.opcao-nome').value = opcao.nome || '';
                                    if (opcao.pontos !== undefined) {
                                        opcaoDiv.querySelector('.opcao-pontos').value = opcao.pontos;
                                    }
                                });
                            }
                        });
                    }
                });
            }
            
            // Mudar para aba do formulário
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector('.tab').classList.add('active');
            document.getElementById('tab-novo').classList.add('active');
            
            showNotification(`✅ Template "${nome.replace('.json', '')}" carregado no formulário. Revise e clique em Criar.`, 'success');
        }
    } catch (error) {
        showNotification('❌ Erro ao carregar template', 'error');
    } finally {
        hideLoading();
    }
}

// Notificações
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    
    text.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Loading
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

// Inicializar com uma seção
window.addEventListener('load', () => {
    adicionarSecao();
});
