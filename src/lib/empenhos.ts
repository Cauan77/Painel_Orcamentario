import base from "@/data/empenhos-2026.json";

export type Empenho = {
  orgao: string;
  empenho: string;
  data: string;
  processo: string;
  coordenacao: string;
  politica: string;
  acao: string;
  elemento: string;
  elementoNome: string;
  fonte: string;
  /** TXT_VINC_PMSP — vinculação de recurso usada para classificar emendas */
  fonteRecurso?: string;
  situacao: string;
  fornecedor: string;
  objeto: string;
  empenhado: number;
  liquidado: number;
  pago: number;
};

export type BaseEmpenhos = {
  extracao: string;
  exercicio: number;
  rows: Empenho[];
};

export const empenhosLocal = base as BaseEmpenhos;

/** Harmoniza os rótulos de política da execução orçamentária com as pautas do orçamento. */
const POLITICA_EQUIV: Record<string, string> = {
  Idoso: "Pessoa Idosa",
  "Povos Originários": "Povos Indígenas",
  "Segurança Alimentar": "Segurança Alimentar e Nutricional",
  Administração: "Gestão e Suporte Administrativo",
  Tecnologia: "Gestão e Suporte Administrativo",
  "Conselho Tutelar": "Criança e Adolescente",
  Ouvidoria: "Direitos Humanos e Cidadania",
  "Educação em Direitos Humanos": "Direitos Humanos e Cidadania",
  "Centro Público": "Imigrantes e Trabalho Decente",
  Imigrantes: "Imigrantes e Trabalho Decente",
  LGBTI: "Direitos Humanos e Cidadania",
};

export function politicaEquivalente(p: string): string {
  return POLITICA_EQUIV[p] ?? p ?? "Outras";
}

/** Verifica se um empenho é relativo a estágio (CIEE, bolsas, estagiários) */
export function isEstagioEmpenho(e: Empenho): boolean {
  const texto = `${e.objeto || ""} ${e.fornecedor || ""} ${e.acao || ""} ${e.coordenacao || ""}`.toLowerCase();
  return (
    texto.includes("estág") ||
    texto.includes("estag") ||
    texto.includes("ciee") ||
    texto.includes("bolsa-estágio") ||
    texto.includes("bolsa estagio") ||
    texto.includes("estagiár") ||
    texto.includes("estagiar")
  );
}

/** Verifica se um empenho é uma emenda parlamentar recebida.
 * Critério: campo TXT_VINC_PMSP (fonteRecurso) contém "Emenda(s) Parlamentar(es)"
 * E traz o nome do parlamentar após o rótulo. */
export function isEmendaRecebidaEmpenho(e: Empenho): boolean {
  const fonte = (e.fonteRecurso || "").trim();
  if (!/emendas?\s+parlamentar(es)?/i.test(fonte)) return false;
  return parlamentarDaEmenda(e) !== "Não identificado";
}


/** Nome do parlamentar autor da emenda, extraído de TXT_VINC_PMSP
 * (remove o prefixo "Emendas Parlamentares" e separadores, deixando só o nome) */
export function parlamentarDaEmenda(e: Empenho): string {
  const fonte = (e.fonteRecurso || "").trim();
  if (!fonte) return "Não identificado";
  const nome = fonte
    .replace(/emendas?\s+parlamentar(es)?/gi, "")
    .replace(/^[\s\-–—:/|]+/, "")
    .replace(/[\s\-–—:/|]+$/, "")
    .trim();
  return nome || "Não identificado";
}

export type AgregadoEmpenho = {
  chave: string;
  rotulo: string;
  sub?: string;
  empenhado: number;
  liquidado: number;
  pago: number;
  qtd: number;
  fornecedores: number;
};

export function agruparEmpenhos(
  rows: Empenho[],
  chaveFn: (e: Empenho) => { chave: string; rotulo: string; sub?: string },
): AgregadoEmpenho[] {
  const mapa = new Map<string, AgregadoEmpenho & { _forn: Set<string> }>();
  for (const e of rows) {
    const k = chaveFn(e);
    const atual =
      mapa.get(k.chave) ??
      ({
        ...k,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
        qtd: 0,
        fornecedores: 0,
        _forn: new Set<string>(),
      } as AgregadoEmpenho & { _forn: Set<string> });
    atual.empenhado += e.empenhado;
    atual.liquidado += e.liquidado;
    atual.pago += e.pago;
    atual.qtd += 1;
    atual._forn.add(e.fornecedor);
    mapa.set(k.chave, atual);
  }
  return [...mapa.values()]
    .map(({ _forn, ...a }) => ({ ...a, fornecedores: _forn.size }))
    .sort((a, b) => b.empenhado - a.empenhado);
}
