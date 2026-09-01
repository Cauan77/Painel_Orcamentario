import { baseLocal, type BaseExecucao, type Linha } from "@/lib/orcamento";
import { empenhosLocal, type BaseEmpenhos, type Empenho } from "@/lib/empenhos";
import { contratosLocal, type BaseContratos, type Contrato } from "@/lib/contratos";

const COLUNAS: Record<string, keyof Linha> = {
  Cd_AnoExecucao: "ano",
  Ano_Execucao: "ano",
  Ano: "ano",
  Exercicio: "ano",
  Cd_MesExecucao: "mes",
  Mes_Execucao: "mes",
  Mes: "mes",
  Nr_MesExecucao: "mes",
  Sigla_Orgao: "orgao",
  Ds_Orgao: "orgaoNome",
  Ds_Programa: "programa",
  PA: "tipoPA",
  ProjetoAtividade: "pa",
  Ds_Projeto_Atividade: "paNome",
  Cd_Despesa: "rubrica",
  Ds_Despesa: "rubricaNome",
  Ds_Fonte: "fonte",
  Vl_Orcado_Ano: "inicial",
  Vl_Orcado_Atualizado: "atualizado",
  Vl_Congelado: "congelado",
  Vl_Descongelado: "descongelado",
  Vl_EmpenhadoLiquido: "empenhado",
  Vl_Liquidado: "liquidado",
  Vl_Pago: "pago",
  Saldo_Dotacao: "saldo",
};

const COLUNAS_EMPENHO: Record<string, keyof Empenho> = {
  orgao: "orgao",
  codEmpenho: "empenho",
  datEmpenho: "data",
  codProcesso: "processo",
  coordenacao: "coordenacao",
  politicas_para: "politica",
  acao_programatica: "acao",
  codDespesa: "elemento",
  nome_elemento: "elementoNome",
  fonte_descricao: "fonte",
  situacao_empenho: "situacao",
  txtRazaoSocial: "fornecedor",
  anexo_descricaoAnexo: "objeto",
  valEmpenhadoLiquido: "empenhado",
  valLiquidado: "liquidado",
  valPagoExercicio: "pago",
};

const COLUNAS_CONTRATO: Record<string, keyof Contrato> = {
  fornecedor: "fornecedor",
  razao_social: "fornecedor",
  numero_contrato: "numeroContrato",
  contrato: "numeroContrato",
  data_vigencia: "dataVigencia",
  fim_vigencia: "dataVigencia",
  vencimento: "dataVigencia",
  objeto: "objeto",
};

const NUMERICAS = new Set<string>([
  "inicial",
  "atualizado",
  "congelado",
  "descongelado",
  "empenhado",
  "liquidado",
  "pago",
  "saldo",
]);

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const limpo = s.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

function mapear<T>(values: string[][], colunas: Record<string, string>): T[] {
  const [cabecalho = [], ...linhas] = values;
  const idx = new Map<string, number>();
  cabecalho.forEach((c, i) => {
    const campo = colunas[String(c ?? "").trim()];
    if (campo) idx.set(campo, i);
  });
  return linhas
    .filter((l) => l.some((c) => String(c ?? "").trim() !== ""))
    .map((l) => {
      const obj: Record<string, unknown> = {};
      for (const [campo, i] of idx) {
        obj[campo] = NUMERICAS.has(campo) ? num(l[i]) : String(l[i] ?? "").trim();
      }
      return obj as T;
    });
}

async function lerPlanilha(sheetId: string, range: string): Promise<string[][] | null> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !connKey) return null;
  try {
    const res = await fetch(
      `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${sheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey } },
    );
    if (!res.ok) {
      console.error(`Google Sheets [${res.status}]: ${await res.text()}`);
      return null;
    }
    const json = (await res.json()) as { values?: string[][] };
    return json.values?.length ? json.values : null;
  } catch (e) {
    console.error("Erro ao ler Google Sheets", e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Persistência na nuvem (Lovable Cloud) — funciona também no publicado */
/* ------------------------------------------------------------------ */

type ChaveBase = "execucao" | "empenhos" | "contratos";

async function lerBaseNuvem<T>(chave: ChaveBase): Promise<T | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("bases_painel")
      .select("conteudo")
      .eq("chave", chave)
      .maybeSingle();
    if (error) {
      console.error("Erro ao ler base na nuvem", chave, error.message);
      return null;
    }
    return (data?.conteudo as T) ?? null;
  } catch (e) {
    console.error("Falha ao acessar a nuvem", e);
    return null;
  }
}

async function gravarBaseNuvem(
  chave: ChaveBase,
  conteudo: { extracao: string; exercicio?: number; rows: unknown[] },
): Promise<{ ok: boolean; message: string }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("bases_painel").upsert(
      {
        chave,
        extracao: conteudo.extracao,
        exercicio: conteudo.exercicio ?? null,
        conteudo: JSON.parse(JSON.stringify(conteudo)),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "chave" },
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Base atualizada com sucesso (${conteudo.rows.length} registros).` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao gravar base na nuvem." };
  }
}

function hoje(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

export async function carregarBaseExecucao(): Promise<BaseExecucao & { fonteDados: string }> {
  const sheetId = process.env["EXECUCAO_SHEET_ID"];
  const range = process.env["EXECUCAO_SHEET_RANGE"] ?? "A1:BZ100000";
  if (sheetId) {
    const values = await lerPlanilha(sheetId, range);
    if (values) {
      return {
        extracao: new Date().toISOString().slice(0, 10),
        exercicio: 2026,
        rows: mapear<Linha>(values, COLUNAS),
        fonteDados: "Google Sheets (on-line) — dotação",
      };
    }
  }
  const nuvem = await lerBaseNuvem<BaseExecucao>("execucao");
  if (nuvem?.rows?.length) {
    return { ...nuvem, fonteDados: `Base na nuvem — atualizada em ${nuvem.extracao}` };
  }
  return { ...baseLocal, fonteDados: "Arquivo base 2026 (snapshot)" };
}

export async function carregarEmpenhos(): Promise<BaseEmpenhos & { fonteDados: string }> {
  const sheetId = process.env["EMPENHOS_SHEET_ID"];
  const range = process.env["EMPENHOS_SHEET_RANGE"] ?? "A1:Z100000";
  if (sheetId) {
    const values = await lerPlanilha(sheetId, range);
    if (values) {
      return {
        extracao: new Date().toISOString().slice(0, 10),
        exercicio: 2026,
        rows: mapear<Empenho>(values, COLUNAS_EMPENHO),
        fonteDados: "Google Sheets (on-line) — empenhos",
      };
    }
  }
  const nuvem = await lerBaseNuvem<BaseEmpenhos>("empenhos");
  if (nuvem?.rows?.length) {
    return { ...nuvem, fonteDados: `Base na nuvem — atualizada em ${nuvem.extracao}` };
  }
  return { ...empenhosLocal, fonteDados: "Arquivo empenhos 2026 (snapshot)" };
}

export async function salvarBaseExecucao(dados: BaseExecucao): Promise<{ ok: boolean; message: string }> {
  dados.extracao = hoje();
  const res = await gravarBaseNuvem("execucao", dados);
  return res.ok
    ? { ok: true, message: `Base de execução atualizada na nuvem (${dados.rows.length} registros).` }
    : res;
}

export async function salvarEmpenhos(dados: BaseEmpenhos): Promise<{ ok: boolean; message: string }> {
  dados.extracao = hoje();
  const res = await gravarBaseNuvem("empenhos", dados);
  return res.ok
    ? { ok: true, message: `Base de empenhos atualizada na nuvem (${dados.rows.length} registros).` }
    : res;
}

export async function carregarContratos(): Promise<BaseContratos & { fonteDados: string }> {
  const nuvem = await lerBaseNuvem<BaseContratos>("contratos");
  if (nuvem?.rows?.length) {
    return { ...nuvem, fonteDados: `Base na nuvem — atualizada em ${nuvem.extracao}` };
  }
  return { ...contratosLocal, fonteDados: "Arquivo contratos 2026 (snapshot)" };
}

export async function salvarContratos(dados: BaseContratos): Promise<{ ok: boolean; message: string }> {
  dados.extracao = hoje();
  const res = await gravarBaseNuvem("contratos", dados);
  return res.ok
    ? { ok: true, message: `Base de contratos atualizada na nuvem (${dados.rows.length} registros).` }
    : res;
}

