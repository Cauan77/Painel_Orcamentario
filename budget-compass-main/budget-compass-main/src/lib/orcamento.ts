import base from "@/data/execucao-2026.json";

export type Linha = {
  ano?: number;
  mes?: number | string;
  orgao: string;
  orgaoNome: string;
  programa: string;
  tipoPA: string;
  pa: string;
  paNome: string;
  rubrica: string;
  rubricaNome: string;
  fonte: string;
  /** TXT_VINC_PMSP — vinculação de recurso (identifica emendas parlamentares recebidas) */
  vincPmsp?: string;
  inicial: number;
  atualizado: number;
  congelado: number;
  descongelado: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  saldo: number;
};

export type BaseExecucao = {
  extracao: string;
  exercicio: number;
  rows: Linha[];
};

export const baseLocal = base as BaseExecucao;

/** Agrupamento temático (políticas públicas) por código de projeto/atividade. */
const PAUTA_POR_PA: Record<string, string> = {
  // Mulheres
  "4329": "Mulheres",
  "6178": "Mulheres",
  "2053": "Mulheres",
  "9027": "Mulheres",
  "9030": "Mulheres",
  "9044": "Mulheres",
  // Pessoa Idosa
  "2813": "Pessoa Idosa",
  "4320": "Pessoa Idosa",
  "4330": "Pessoa Idosa",
  "9028": "Pessoa Idosa",
  "9038": "Pessoa Idosa",
  "9050": "Pessoa Idosa",
  // Criança e Adolescente
  "2033": "Criança e Adolescente",
  "2157": "Criança e Adolescente",
  "4328": "Criança e Adolescente",
  "6160": "Criança e Adolescente",
  // População em Situação de Rua
  "2431": "População em Situação de Rua",
  "4321": "População em Situação de Rua",
  "9026": "População em Situação de Rua",
  "9040": "População em Situação de Rua",
  "9041": "População em Situação de Rua",
  "9042": "População em Situação de Rua",
  "9043": "População em Situação de Rua",
  "9045": "População em Situação de Rua",
  "9046": "População em Situação de Rua",
  "9051": "População em Situação de Rua",
  "9055": "População em Situação de Rua",
  "9097": "População em Situação de Rua",
  // Segurança Alimentar e Nutricional
  "4426": "Segurança Alimentar e Nutricional",
  "4470": "Segurança Alimentar e Nutricional",
  "7001": "Segurança Alimentar e Nutricional",
  "4302": "Segurança Alimentar e Nutricional",
  // Imigrantes e Trabalho Decente
  "2051": "Imigrantes e Trabalho Decente",
  "4324": "Imigrantes e Trabalho Decente",
  // Demais pautas
  "4318": "Juventude",
  "4334": "Igualdade Racial",
  "4322": "Povos Indígenas",
  "9234": "Povos Indígenas",
  "9025": "Povos Indígenas",
  "4319": "Inclusão e Pessoa com Deficiência",
  "4326": "Inclusão e Pessoa com Deficiência",
  "4325": "Álcool e Drogas",
  "4335": "Egressos do Sistema Prisional",
  "2142": "Direitos Humanos e Cidadania",
  "3406": "Direitos Humanos e Cidadania",
  "4314": "Direitos Humanos e Cidadania",
  "4317": "Direitos Humanos e Cidadania",
  "4327": "Direitos Humanos e Cidadania",
  "4332": "Direitos Humanos e Cidadania",
  "4333": "Direitos Humanos e Cidadania",
  "2803": "Participação e Controle Social",
  // Gestão
  "2100": "Gestão e Suporte Administrativo",
  "2106": "Gestão e Suporte Administrativo",
  "2171": "Gestão e Suporte Administrativo",
  "2180": "Gestão e Suporte Administrativo",
  "2818": "Gestão e Suporte Administrativo",
  "1220": "Gestão e Suporte Administrativo",
  "3002": "Gestão e Suporte Administrativo",
  "3660": "Gestão e Suporte Administrativo",
};

export function pautaDe(l: Pick<Linha, "pa" | "programa">): string {
  return PAUTA_POR_PA[l.pa] ?? l.programa ?? "Outras";
}

/** Projeto/atividade cujo código de 4 dígitos inicia com 9 é emenda parlamentar. */
export function isEmenda(pa: string): boolean {
  return /^9\d{3}$/.test(pa);
}

export type TipoDespesa = "Atividades" | "Folha de Pagamento" | "Emendas" | "Emendas Recebidas";

/** Classifica a linha por tipo de despesa (coluna PA / PA_PA): Atividades, Folha de Pagamento, Emendas ou Emendas Recebidas */
export function tipoDespesaDe(l: Pick<Linha, "pa" | "tipoPA" | "rubrica"> & { paNome?: string }): TipoDespesa {
  const t = (l.tipoPA || "").trim().toLowerCase();
  const nome = (l.paNome || "").trim().toLowerCase();
  if (t.includes("recebida") || nome.includes("emenda recebida")) {
    return "Emendas Recebidas";
  }
  if (isEmenda(l.pa) || t.includes("emenda")) {
    return "Emendas";
  }
  if (t.includes("folha") || t.includes("pessoal") || (l.rubrica && l.rubrica.startsWith("31"))) {
    return "Folha de Pagamento";
  }
  return "Atividades";
}

export type Parametro = "inicial" | "atualizado" | "ambos";

export type Agregado = {
  chave: string;
  rotulo: string;
  sub?: string;
  inicial: number;
  atualizado: number;
  congelado: number;
  descongelado: number;
  empenhado: number;
  pago: number;
  saldo: number;
  execInicial: number;
  execAtualizado: number;
};

const ZERO = {
  inicial: 0,
  atualizado: 0,
  congelado: 0,
  descongelado: 0,
  empenhado: 0,
  pago: 0,
  saldo: 0,
};

export function agrupar(
  rows: Linha[],
  chaveFn: (l: Linha) => { chave: string; rotulo: string; sub?: string },
): Agregado[] {
  const mapa = new Map<string, Agregado>();
  for (const l of rows) {
    const k = chaveFn(l);
    const atual =
      mapa.get(k.chave) ??
      ({ ...k, ...ZERO, execInicial: 0, execAtualizado: 0 } as Agregado);
    atual.inicial += l.inicial;
    atual.atualizado += l.atualizado;
    atual.congelado += l.congelado;
    atual.descongelado += l.descongelado;
    atual.empenhado += l.empenhado;
    atual.pago += l.pago;
    atual.saldo += l.saldo;
    mapa.set(k.chave, atual);
  }
  return [...mapa.values()]
    .map((a) => ({
      ...a,
      execInicial: a.inicial > 0 ? (a.empenhado / a.inicial) * 100 : 0,
      execAtualizado: a.atualizado > 0 ? (a.empenhado / a.atualizado) * 100 : 0,
    }))
    .sort((a, b) => b.atualizado - a.atualizado);
}

export function totalizar(rows: Linha[]): Agregado {
  return (
    agrupar(rows, () => ({ chave: "total", rotulo: "Total" }))[0] ?? {
      chave: "total",
      rotulo: "Total",
      ...ZERO,
      execInicial: 0,
      execAtualizado: 0,
    }
  );
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const brlFull = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const fmtMoeda = (v: number) => brl.format(v || 0);
export const fmtNum = (v: number) => brlFull.format(v || 0);
export const fmtPct = (v: number) => `${(v || 0).toFixed(1).replace(".", ",")}%`;

export const ORGAOS = ["SMDHC", "FAASP", "FUMCAD", "FMID"] as const;

export const ANOS_EXERCICIO = [2026, 2025, 2024, 2023, 2022, 2021, 2020] as const;

export const MESES_EXERCICIO = [
  { numero: 1, rotulo: "Jan", nome: "Janeiro" },
  { numero: 2, rotulo: "Fev", nome: "Fevereiro" },
  { numero: 3, rotulo: "Mar", nome: "Março" },
  { numero: 4, rotulo: "Abr", nome: "Abril" },
  { numero: 5, rotulo: "Mai", nome: "Maio" },
  { numero: 6, rotulo: "Jun", nome: "Junho" },
  { numero: 7, rotulo: "Jul", nome: "Julho" },
  { numero: 8, rotulo: "Ago", nome: "Agosto" },
  { numero: 9, rotulo: "Set", nome: "Setembro" },
  { numero: 10, rotulo: "Out", nome: "Outubro" },
  { numero: 11, rotulo: "Nov", nome: "Novembro" },
  { numero: 12, rotulo: "Dez", nome: "Dezembro" },
] as const;
