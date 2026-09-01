import { createServerFn } from "@tanstack/react-start";
import {
  carregarBaseExecucao,
  carregarEmpenhos,
  carregarContratos,
  salvarBaseExecucao,
  salvarEmpenhos,
  salvarContratos,
} from "@/lib/execucao-source.server";
import type { BaseExecucao } from "@/lib/orcamento";
import type { BaseEmpenhos } from "@/lib/empenhos";
import type { BaseContratos } from "@/lib/contratos";

/**
 * Fontes de dados:
 * - Dotação (execução financeira): EXECUCAO_SHEET_ID / EXECUCAO_SHEET_RANGE
 * - Empenhos (execução orçamentária): EMPENHOS_SHEET_ID / EMPENHOS_SHEET_RANGE
 * Sem essas variáveis, usa os snapshots embarcados em src/data.
 */

export const getBaseExecucao = createServerFn({ method: "GET" }).handler(carregarBaseExecucao);

export const getEmpenhos = createServerFn({ method: "GET" }).handler(carregarEmpenhos);

export const postSalvarBaseExecucao = createServerFn({ method: "POST" })
  .inputValidator((data: BaseExecucao) => data)
  .handler(async ({ data }) => {
    return salvarBaseExecucao(data);
  });

export const postSalvarEmpenhos = createServerFn({ method: "POST" })
  .inputValidator((data: BaseEmpenhos) => data)
  .handler(async ({ data }) => {
    return salvarEmpenhos(data);
  });

export const getContratos = createServerFn({ method: "GET" }).handler(carregarContratos);

export const postSalvarContratos = createServerFn({ method: "POST" })
  .inputValidator((data: BaseContratos) => data)
  .handler(async ({ data }) => {
    return salvarContratos(data);
  });
