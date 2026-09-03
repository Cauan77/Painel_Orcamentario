import * as XLSX from "xlsx";
import type { Linha, BaseExecucao } from "@/lib/orcamento";
import type { Empenho, BaseEmpenhos } from "@/lib/empenhos";
import type { Contrato, BaseContratos } from "@/lib/contratos";

/** Mapeamento flexível de colunas para Execução Orçamentária / Dotação */
const MAPA_COLUNAS_EXECUCAO: Record<string, keyof Linha> = {
  cd_anoexecucao: "ano",
  cd_ano_execucao: "ano",
  ano_execucao: "ano",
  anoexecucao: "ano",
  cd_ano: "ano",
  ano: "ano",
  exercicio: "ano",
  cd_exercicio: "ano",
  cd_mesexecucao: "mes",
  cd_mes_execucao: "mes",
  mes_execucao: "mes",
  mesexecucao: "mes",
  nr_mesexecucao: "mes",
  nr_mes: "mes",
  cd_mes: "mes",
  mes: "mes",
  ds_mes: "mes",
  nome_mes: "mes",
  sigla_orgao: "orgao",
  orgao: "orgao",
  ds_orgao: "orgaoNome",
  nome_orgao: "orgaoNome",
  ds_programa: "programa",
  programa: "programa",
  pa: "tipoPA",
  tipo_pa: "tipoPA",
  tipopa: "tipoPA",
  papa: "tipoPA",
  pa_pa: "tipoPA",
  tipo_despesa: "tipoPA",
  tipodespesa: "tipoPA",
  tipo_de_despesa: "tipoPA",
  projetoatividade: "pa",
  projeto_atividade: "pa",
  cd_projeto_atividade: "pa",
  cod_pa: "pa",
  ds_projeto_atividade: "paNome",
  nome_projeto_atividade: "paNome",
  cd_despesa: "rubrica",
  rubrica: "rubrica",
  ds_despesa: "rubricaNome",
  nome_despesa: "rubricaNome",
  ds_fonte: "fonte",
  fonte: "fonte",
  txt_vinc_pmsp: "vincPmsp",
  txtvincpmsp: "vincPmsp",
  vinc_pmsp: "vincPmsp",
  vl_orcado_ano: "inicial",
  orcado_inicial: "inicial",
  inicial: "inicial",
  vl_orcado_atualizado: "atualizado",
  orcado_atualizado: "atualizado",
  atualizado: "atualizado",
  vl_congelado: "congelado",
  congelado: "congelado",
  vl_descongelado: "descongelado",
  descongelado: "descongelado",
  vl_empenhadoliquido: "empenhado",
  vl_empenhado_liquido: "empenhado",
  empenhado: "empenhado",
  vl_liquidado: "liquidado",
  liquidado: "liquidado",
  vl_pago: "pago",
  pago: "pago",
  saldo_dotacao: "saldo",
  saldo: "saldo",
};

/** Mapeamento flexível de colunas para Empenhos */
const MAPA_COLUNAS_EMPENHOS: Record<string, keyof Empenho> = {
  orgao: "orgao",
  sigla_orgao: "orgao",
  codempenho: "empenho",
  cod_empenho: "empenho",
  empenho: "empenho",
  numero_empenho: "empenho",
  datempenho: "data",
  data_empenho: "data",
  data: "data",
  codprocesso: "processo",
  cod_processo: "processo",
  processo: "processo",
  coordenacao: "coordenacao",
  politicas_para: "politica",
  politica: "politica",
  acao_programatica: "acao",
  acao: "acao",
  coddespesa: "elemento",
  cod_despesa: "elemento",
  elemento: "elemento",
  rubrica: "elemento",
  nome_elemento: "elementoNome",
  elemento_nome: "elementoNome",
  ds_despesa: "elementoNome",
  fonte_descricao: "fonte",
  fonte: "fonte",
  txdescricaofonterecurso: "fonteRecurso",
  txt_font_rec_rdzd: "fonteRecurso",
  txtfontrecrdzd: "fonteRecurso",
  txt_vinc_pmsp: "fonteRecurso",
  txtvincpmsp: "fonteRecurso",
  vinc_pmsp: "fonteRecurso",
  fonte_recurso: "fonteRecurso",
  descricao_fonte_recurso: "fonteRecurso",
  situacao_empenho: "situacao",
  situacao: "situacao",
  txtrazaosocial: "fornecedor",
  razao_social: "fornecedor",
  fornecedor: "fornecedor",
  anexo_descricaoanexo: "objeto",
  objeto: "objeto",
  descricao_objeto: "objeto",
  valempenhadoliquido: "empenhado",
  val_empenhado_liquido: "empenhado",
  empenhado: "empenhado",
  valliquidado: "liquidado",
  val_liquidado: "liquidado",
  liquidado: "liquidado",
  valpagoexercicio: "pago",
  val_pago_exercicio: "pago",
  pago: "pago",
};

/** Mapeamento flexível de colunas para Contratos */
const MAPA_COLUNAS_CONTRATOS: Record<string, keyof Contrato> = {
  fornecedor: "fornecedor",
  razao_social: "fornecedor",
  txtrazaosocial: "fornecedor",
  credor: "fornecedor",
  contratado: "fornecedor",
  contratada: "fornecedor",
  contratado_a: "fornecedor",
  contratada_a: "fornecedor",
  detentora_da_ata: "fornecedor",
  numero_contrato: "numeroContrato",
  contrato: "numeroContrato",
  n_contrato: "numeroContrato",
  num_contrato: "numeroContrato",
  termo: "numeroContrato",
  data_vigencia: "dataVigencia",
  fim_vigencia: "dataVigencia",
  vencimento: "dataVigencia",
  data_vencimento: "dataVigencia",
  termino: "dataVigencia",
  data_termino: "dataVigencia",
  validade: "dataVigencia",
  vigencia: "dataVigencia",
  vigencia_fim: "dataVigencia",
  fim: "dataVigencia",
  objeto: "objeto",
  descricao_objeto: "objeto",
  descricao: "objeto",
  processo: "processo",
  n_processo: "processo",
  numero_processo: "processo",
  sei: "processo",
  gestor: "gestor",
  origem: "origem",
  status: "status",
  valor: "valor",
  valor_contrato: "valor",
  valor_total: "valor",
  vl_contrato: "valor",
};

const NUMERICAS_EXECUCAO = new Set<keyof Linha>([
  "inicial",
  "atualizado",
  "congelado",
  "descongelado",
  "empenhado",
  "liquidado",
  "pago",
  "saldo",
]);

const NUMERICAS_EMPENHOS = new Set<keyof Empenho>([
  "empenhado",
  "liquidado",
  "pago",
]);

/** Limpa e formata valor monetário/numérico brasileiro ou padrão */
export function limparNumero(val: unknown): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  // Remove R$, espaços, pontos de milhar e substitui vírgula por ponto
  const limpo = str
    .replace(/R\$/g, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = Number(limpo);
  return Number.isFinite(num) ? num : 0;
}

/** Formata data vinda do Excel (seja serial, Date ou string) */
export function formatarDataExcel(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, "0");
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  if (typeof val === "number") {
    // Número serial de data do Excel
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const d = String(date.getUTCDate()).padStart(2, "0");
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const y = date.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  return String(val).trim();
}

/** Normaliza chave de coluna para busca no mapa (sem acento, minúsculo, sem caracteres especiais) */
function normalizarChave(chave: string): string {
  return chave
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type ResultadoParseExecucao = {
  base: BaseExecucao;
  totalLinhas: number;
  totalInicial: number;
  totalAtualizado: number;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  totalSaldo: number;
  colunasDetectadas: string[];
  colunasFaltantes: string[];
};

export type ResultadoParseEmpenhos = {
  base: BaseEmpenhos;
  totalLinhas: number;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  colunasDetectadas: string[];
  colunasFaltantes: string[];
};

export type ResultadoParseContratos = {
  base: BaseContratos;
  totalLinhas: number;
  totalValor: number;
  colunasDetectadas: string[];
  colunasFaltantes: string[];
};

/** Retorna a data de hoje formatada em YYYY-MM-DD no fuso horário de Brasília */
export function getDataExtracaoHoje(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Formata qualquer data (ISO, string, Date) para padrão brasileiro DD/MM/AAAA */
export function formatarDataBR(dataVal?: string | Date | null): string {
  if (!dataVal) return "—";
  if (dataVal instanceof Date) {
    const dia = String(dataVal.getDate()).padStart(2, "0");
    const mes = String(dataVal.getMonth() + 1).padStart(2, "0");
    const ano = dataVal.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  const s = String(dataVal).trim();
  // Se for YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
  const matchIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) {
    const [, ano = "", mes = "", dia = ""] = matchIso;
    return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`;
  }
  // Se já for DD/MM/AAAA ou DD-MM-AAAA
  const matchBr = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchBr) {
    const [, dia = "", mes = "", ano = ""] = matchBr;
    return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`;
  }
  return s;
}

/** Lê arquivo Excel e converte para BaseExecucao */
export async function parseExcelExecucao(file: File, exercicio = 2026): Promise<ResultadoParseExecucao> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("A planilha selecionada está vazia ou não contém abas.");
  }
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error("A aba selecionada está vazia.");
  }
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Nenhuma linha de dados encontrada na planilha.");
  }

  // Identificar cabeçalhos
  const cabecalhosOriginais = Object.keys(rawRows[0] || {});
  const mapaIdx: Record<string, keyof Linha> = {};
  const colunasDetectadas: string[] = [];

  for (const cab of cabecalhosOriginais) {
    const normalizada = normalizarChave(cab);
    const campo = MAPA_COLUNAS_EXECUCAO[normalizada];
    if (campo) {
      mapaIdx[cab] = campo;
      colunasDetectadas.push(`${cab} ➔ ${String(campo)}`);
    }
  }

  const obrigatorias: (keyof Linha)[] = ["orgao", "pa", "empenhado"];
  const camposDetectados = new Set(Object.values(mapaIdx));
  const colunasFaltantes = obrigatorias.filter((c) => !camposDetectados.has(c));

  if (colunasFaltantes.length > 0 && camposDetectados.size < 3) {
    throw new Error(
      `A planilha não parece ser de Execução Orçamentária. Colunas esperadas não encontradas (ex: Sigla_Orgao, PA, Vl_EmpenhadoLiquido).`
    );
  }

  let totalInicial = 0;
  let totalAtualizado = 0;
  let totalEmpenhado = 0;
  let totalLiquidado = 0;
  let totalPago = 0;
  let totalSaldo = 0;

  const rows: Linha[] = rawRows
    .map((r) => {
      const item: Partial<Linha> = {
        orgao: "",
        orgaoNome: "",
        programa: "",
        tipoPA: "Atividades",
        pa: "",
        paNome: "",
        rubrica: "",
        rubricaNome: "",
        fonte: "",
        vincPmsp: "",
        inicial: 0,
        atualizado: 0,
        congelado: 0,
        descongelado: 0,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
        saldo: 0,
      };

      for (const [cabOriginal, campo] of Object.entries(mapaIdx)) {
        const val = r[cabOriginal];
        if (campo === "ano") {
          const anoNum = limparNumero(val);
          if (anoNum >= 2000 && anoNum <= 2100) {
            item.ano = anoNum;
          }
        } else if (campo === "mes") {
          const valStr = String(val ?? "").trim().toLowerCase();
          const mesNum = limparNumero(val);
          const mapMeses: Record<string, number> = {
            janeiro: 1, jan: 1,
            fevereiro: 2, fev: 2,
            "março": 3, marco: 3, mar: 3,
            abril: 4, abr: 4,
            maio: 5, mai: 5,
            junho: 6, jun: 6,
            julho: 7, jul: 7,
            agosto: 8, ago: 8,
            setembro: 9, set: 9,
            outubro: 10, out: 10,
            novembro: 11, nov: 11,
            dezembro: 12, dez: 12
          };
          if (mapMeses[valStr]) {
            item.mes = mapMeses[valStr];
          } else if (mesNum >= 1 && mesNum <= 12) {
            item.mes = mesNum;
          }
        } else if (NUMERICAS_EXECUCAO.has(campo)) {
          (item[campo] as number) = limparNumero(val);
        } else {
          (item[campo] as string) = String(val ?? "").trim();
        }
      }

      if (!item.ano) {
        item.ano = exercicio;
      }

      return item as Linha;
    })
    .filter((l) => l.orgao || l.pa || l.empenhado !== 0 || l.atualizado !== 0);

  for (const r of rows) {
    totalInicial += r.inicial;
    totalAtualizado += r.atualizado;
    totalEmpenhado += r.empenhado;
    totalLiquidado += r.liquidado;
    totalPago += r.pago;
    totalSaldo += r.saldo;
  }

  const base: BaseExecucao = {
    extracao: getDataExtracaoHoje(),
    exercicio,
    rows,
  };

  return {
    base,
    totalLinhas: rows.length,
    totalInicial,
    totalAtualizado,
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    totalSaldo,
    colunasDetectadas,
    colunasFaltantes,
  };
}

/** Lê arquivo Excel e converte para BaseEmpenhos */
export async function parseExcelEmpenhos(file: File, exercicio = 2026): Promise<ResultadoParseEmpenhos> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("A planilha selecionada está vazia ou não contém abas.");
  }
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error("A aba selecionada está vazia.");
  }
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Nenhuma linha de dados encontrada na planilha.");
  }

  // Identificar cabeçalhos
  const cabecalhosOriginais = Object.keys(rawRows[0] || {});
  const mapaIdx: Record<string, keyof Empenho> = {};
  const colunasDetectadas: string[] = [];

  for (const cab of cabecalhosOriginais) {
    const normalizada = normalizarChave(cab);
    const campo = MAPA_COLUNAS_EMPENHOS[normalizada];
    if (campo) {
      mapaIdx[cab] = campo;
      colunasDetectadas.push(`${cab} ➔ ${String(campo)}`);
    }
  }

  const obrigatorias: (keyof Empenho)[] = ["orgao", "empenho", "empenhado"];
  const camposDetectados = new Set(Object.values(mapaIdx));
  const colunasFaltantes = obrigatorias.filter((c) => !camposDetectados.has(c));

  if (colunasFaltantes.length > 0 && camposDetectados.size < 3) {
    throw new Error(
      `A planilha não parece ser de Empenhos. Colunas esperadas não encontradas (ex: codEmpenho, valEmpenhadoLiquido, txtRazaoSocial).`
    );
  }

  let totalEmpenhado = 0;
  let totalLiquidado = 0;
  let totalPago = 0;

  const rows: Empenho[] = rawRows
    .map((r) => {
      const item: Partial<Empenho> = {
        orgao: "",
        empenho: "",
        data: "",
        processo: "",
        coordenacao: "",
        politica: "",
        acao: "",
        elemento: "",
        elementoNome: "",
        fonte: "",
        fonteRecurso: "",
        situacao: "Empenho Normal",
        fornecedor: "",
        objeto: "",
        empenhado: 0,
        liquidado: 0,
        pago: 0,
      };

      for (const [cabOriginal, campo] of Object.entries(mapaIdx)) {
        const val = r[cabOriginal];
        if (NUMERICAS_EMPENHOS.has(campo)) {
          (item[campo] as number) = limparNumero(val);
        } else if (campo === "data") {
          (item[campo] as string) = formatarDataExcel(val);
        } else {
          (item[campo] as string) = String(val ?? "").trim();
        }
      }

      return item as Empenho;
    })
    .filter((l) => l.empenho || l.orgao || l.empenhado !== 0);

  for (const r of rows) {
    totalEmpenhado += r.empenhado;
    totalLiquidado += r.liquidado;
    totalPago += r.pago;
  }

  const base: BaseEmpenhos = {
    extracao: getDataExtracaoHoje(),
    exercicio,
    rows,
  };

  return {
    base,
    totalLinhas: rows.length,
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    colunasDetectadas,
    colunasFaltantes,
  };
}

/** Lê arquivo Excel e converte para BaseContratos */
export async function parseExcelContratos(file: File, exercicio = 2026): Promise<ResultadoParseContratos> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("A planilha selecionada está vazia ou não contém abas.");
  }
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error("A aba selecionada está vazia.");
  }
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Nenhuma linha de dados encontrada na planilha.");
  }

  // Identificar cabeçalhos
  const cabecalhosOriginais = Object.keys(rawRows[0] || {});
  const mapaIdx: Record<string, keyof Contrato> = {};
  const colunasDetectadas: string[] = [];

  for (const cab of cabecalhosOriginais) {
    const normalizada = normalizarChave(cab);
    const campo = MAPA_COLUNAS_CONTRATOS[normalizada];
    if (campo) {
      mapaIdx[cab] = campo;
      colunasDetectadas.push(`${cab} ➔ ${String(campo)}`);
    }
  }

  const camposDetectados = new Set(Object.values(mapaIdx));
  const obrigatorias: (keyof Contrato)[] = ["fornecedor"];
  const colunasFaltantes = obrigatorias.filter((c) => !camposDetectados.has(c));

  if (!camposDetectados.has("fornecedor")) {
    throw new Error(
      `A planilha não parece ser de Contratos. Coluna de fornecedor/contratada não encontrada.`
    );
  }

  let totalValor = 0;
  const rows: Contrato[] = rawRows
    .map((r) => {
      const item: Partial<Contrato> = {
        fornecedor: "",
        numeroContrato: "",
        dataVigencia: "",
        objeto: "",
        processo: "",
        origem: "",
        gestor: "",
        status: "",
        valor: 0,
      };

      for (const [cabOriginal, campo] of Object.entries(mapaIdx)) {
        const val = r[cabOriginal];
        if (campo === "dataVigencia" || campo === "inicio" || campo === "fim") {
          (item[campo] as string) = formatarDataExcel(val);
        } else if (campo === "valor") {
          (item[campo] as number) = limparNumero(val);
        } else {
          (item[campo] as string) = String(val ?? "").trim();
        }
      }

      return item as Contrato;
    })
    .filter((l) => l.fornecedor || l.numeroContrato);

  for (const c of rows) {
    if (c.valor) totalValor += c.valor;
  }

  const base: BaseContratos = {
    extracao: getDataExtracaoHoje(),
    exercicio,
    rows,
  };

  return {
    base,
    totalLinhas: rows.length,
    totalValor,
    colunasDetectadas,
    colunasFaltantes,
  };
}
