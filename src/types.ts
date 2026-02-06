export interface FormQuestion {
  id?: string;
  tipo: 'resposta-unica' | 'texto-curto' | 'texto-longo' | 'escala-livre' | 'multiplas-respostas' | 'sim-nao' | 'escala-1-5' | 'escala-1-10' | 'lista-suspensa';
  pergunta: string;
  textoComplementar?: string;
  assunto?: string;
  obrigatoria: boolean;
  opcoes?: Array<{
    nome: string;
    pontos?: number;
  }>;
}

export interface FormSection {
  titulo: string;
  descricao?: string;
  perguntas: FormQuestion[];
}

export interface DiagnosticoForm {
  titulo: string;
  descricao: string;
  programaId?: string;
  programaNome?: string;
  categoria?: string;
  secoes: FormSection[];
  configuracoes?: {
    permitirEdicao?: boolean;
    mostrarProgresso?: boolean;
    emailNotificacao?: string;
  };
}

export interface AutomationConfig {
  url: string;
  username: string;
  password: string;
  headless: boolean;
  timeout: number;
  slowMo: number;
}

export interface SelectorMap {
  login: {
    username: string;
    password: string;
    submitButton: string;
  };
  menu: {
    diagnosticos: string;
    avaliacoes: string;
  };
  avaliacao: {
    btnInserir: string;
    programaSelect: string;
    nome: string;
    tipoSelect: string;
    btnCadastrar: string;
    abaTemas: string;
    btnSalvar: string;
  };
  tema: {
    btnAdicionar: string;
    nome: string;
    ativo: string;
    ordem: string;
    descricao: string;
    btnSalvar: string;
  };
  pergunta: {
    btnAdicionar: string;
    tipoSelect: string;
    titulo: string;
    ordem: string;
    textoComplementar: string;
    assunto: string;
    ativo: string;
    btnSalvar: string;
    abaRespostas: string;
  };
  opcaoResposta: {
    btnNovaOpcao: string;
    pontos: string;
    nome: string;
    btnSalvar: string;
  };
  tiposPergunta?: Record<string, string>;
}
