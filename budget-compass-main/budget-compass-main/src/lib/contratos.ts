import base from "@/data/contratos-2026.json";

export type Contrato = {
  orgao?: string;
  contrato?: string;
  numeroContrato?: string;
  processo?: string;
  fornecedor: string;
  cnpj?: string;
  objeto?: string;
  inicio?: string;
  fim?: string;
  dataVigencia?: string;
  vencendoEm?: string;
  status?: string;
  diasParaVencer?: number | null;
  valor?: number;
  origem?: string;
  gestor?: string;
};

export type BaseContratos = {
  extracao: string;
  exercicio: number;
  rows: Contrato[];
};

export const contratosLocal = base as BaseContratos;

export type SemaforoStatus = "vencido" | "vermelho" | "amarelo" | "verde" | "sem-data";

export type Semaforo = {
  status: SemaforoStatus;
  dias: number | null;
  rotulo: string;
  /** classes utilitárias (tokens semânticos) para badge */
  classe: string;
  ponto: string;
};

/** Converte dd/mm/aaaa, aaaa-mm-dd ou Date em Date (UTC 00:00) */
export function parseData(v: string): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const br = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (br) return new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1])));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function diasParaVencer(fim: string, hoje = new Date()): number | null {
  const d = parseData(fim);
  if (!d) return null;
  const base = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return Math.round((d.getTime() - base) / 86400000);
}

/** Semáforo: vermelho ≤ 30 dias, amarelo 31–90 dias, verde acima de 90 dias. */
export function semaforo(fim: string, hoje = new Date()): Semaforo {
  const dias = diasParaVencer(fim, hoje);
  if (dias === null)
    return {
      status: "sem-data",
      dias: null,
      rotulo: "sem vigência informada",
      classe: "border-border bg-muted text-muted-foreground",
      ponto: "bg-muted-foreground",
    };
  if (dias < 0)
    return {
      status: "vencido",
      dias,
      rotulo: `vencido há ${Math.abs(dias)} dia(s)`,
      classe: "border-destructive/50 bg-destructive/15 text-destructive",
      ponto: "bg-destructive",
    };
  if (dias <= 30)
    return {
      status: "vermelho",
      dias,
      rotulo: `vence em ${dias} dia(s)`,
      classe: "border-destructive/50 bg-destructive/10 text-destructive",
      ponto: "bg-destructive",
    };
  if (dias <= 90)
    return {
      status: "amarelo",
      dias,
      rotulo: `vence em ${dias} dia(s)`,
      classe: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      ponto: "bg-amber-500",
    };
  return {
    status: "verde",
    dias,
    rotulo: `vence em ${dias} dia(s)`,
    classe: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    ponto: "bg-emerald-500",
  };
}

export function normalizarFornecedor(nome: string): string {
  return String(nome ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

/** Limpa sufixos jurídicos e termos comuns para comparação flexível */
export function palavrasChaveFornecedor(nome: string): string[] {
  const limpo = String(nome ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ");

  const ignorar = new Set(["LTDA", "EPP", "ME", "EIRELI", "SA", "S/A", "SERVICOS", "COMERCIO", "DO", "DA", "DE", "E", "EM"]);
  return limpo
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !ignorar.has(w));
}

/** Índice fornecedor normalizado → contrato mais próximo do vencimento (ainda vigente, se houver). */
export function indexarContratosPorFornecedor(rows: Contrato[]): Map<string, Contrato> {
  const mapa = new Map<string, Contrato>();
  for (const c of rows) {
    const k = normalizarFornecedor(c.fornecedor);
    if (!k) continue;
    const atual = mapa.get(k);
    if (!atual) {
      mapa.set(k, c);
      continue;
    }
    const dataFimAtual = atual.fim || atual.dataVigencia || "";
    const dataFimC = c.fim || c.dataVigencia || "";
    const dA = diasParaVencer(dataFimAtual) ?? -99999;
    const dC = diasParaVencer(dataFimC) ?? -99999;
    // Prioriza contrato vigente com menor prazo restante; senão o de vencimento mais recente
    const melhor = dA >= 0 && dC >= 0 ? (dC < dA ? c : atual) : dC > dA ? c : atual;
    mapa.set(k, melhor);
  }
  return mapa;
}

/** Busca inteligente de contrato para um fornecedor de empenho */
export function criarBuscadorContratos(rows: Contrato[]) {
  const mapaExato = indexarContratosPorFornecedor(rows);
  const cache = new Map<string, Contrato | null>();

  return (fornecedorNome: string): Contrato | null => {
    if (!fornecedorNome) return null;
    if (cache.has(fornecedorNome)) return cache.get(fornecedorNome)!;

    const k = normalizarFornecedor(fornecedorNome);
    if (mapaExato.has(k)) {
      const c = mapaExato.get(k)!;
      cache.set(fornecedorNome, c);
      return c;
    }

    // Busca por inclusão de substring normalizada
    for (const [key, c] of mapaExato.entries()) {
      if (key.length >= 6 && (k.includes(key) || key.includes(k))) {
        cache.set(fornecedorNome, c);
        return c;
      }
    }

    // Busca por sobreposição de palavras-chave
    const tokens = palavrasChaveFornecedor(fornecedorNome);
    if (tokens.length > 0) {
      let melhorContrato: Contrato | null = null;
      let maxScore = 0;

      for (const c of rows) {
        const cTokens = new Set(palavrasChaveFornecedor(c.fornecedor));
        let score = 0;
        for (const t of tokens) {
          if (cTokens.has(t)) score++;
        }
        if (score >= 2 && score > maxScore) {
          maxScore = score;
          melhorContrato = c;
        } else if (score === 1 && tokens.length === 1 && cTokens.size <= 2 && score > maxScore) {
          maxScore = score;
          melhorContrato = c;
        }
      }

      if (melhorContrato) {
        cache.set(fornecedorNome, melhorContrato);
        return melhorContrato;
      }
    }

    cache.set(fornecedorNome, null);
    return null;
  };
}
