import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { parseExcelExecucao, parseExcelEmpenhos } from "../src/lib/excel-parser";

/**
 * Script utilitário CLI para importar planilhas Excel diretamente no terminal.
 * Uso:
 *   bun run ./scripts/importar-excel.ts <caminho-do-arquivo.xlsx> [execucao|empenhos]
 */

async function main() {
  const args = process.argv.slice(2);
  const arquivoPath = args[0];
  const tipoEscolhido = args[1] as "execucao" | "empenhos" | undefined;

  if (!arquivoPath) {
    console.log(`
ℹ️  Uso do comando:
  bun run ./scripts/importar-excel.ts <caminho-do-arquivo.xlsx> [execucao|empenhos]

Exemplos:
  bun run ./scripts/importar-excel.ts ./dados/execucao.xlsx execucao
  bun run ./scripts/importar-excel.ts ./dados/empenhos.xlsx empenhos
`);
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), arquivoPath);
  console.log(`📂 Lendo arquivo: ${resolved}`);

  const buffer = await fs.readFile(resolved);
  const fakeFile = new File([buffer], path.basename(resolved), {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const tipo = tipoEscolhido ?? (arquivoPath.toLowerCase().includes("empenho") ? "empenhos" : "execucao");

  if (tipo === "empenhos") {
    console.log("📑 Processando base como DETALHAMENTO DE EMPENHOS...");
    const res = await parseExcelEmpenhos(fakeFile);
    const destino = path.resolve(process.cwd(), "src/data/empenhos-2026.json");
    await fs.writeFile(destino, JSON.stringify(res.base, null, 2), "utf-8");
    console.log(`✅ Sucesso! ${res.totalLinhas} empenhos salvos em: ${destino}`);
    console.log(`💰 Total Empenhado: R$ ${res.totalEmpenhado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  } else {
    console.log("📊 Processando base como EXECUÇÃO ORÇAMENTÁRIA (DOTAÇÃO)...");
    const res = await parseExcelExecucao(fakeFile);
    const destino = path.resolve(process.cwd(), "src/data/execucao-2026.json");
    await fs.writeFile(destino, JSON.stringify(res.base, null, 2), "utf-8");
    console.log(`✅ Sucesso! ${res.totalLinhas} dotações salvas em: ${destino}`);
    console.log(`💰 Total Orçado Atualizado: R$ ${res.totalAtualizado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`💰 Total Empenhado Líquido: R$ ${res.totalEmpenhado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`💰 Total Pago: R$ ${res.totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
}

main().catch((err) => {
  console.error("❌ Erro ao converter arquivo:", err);
  process.exit(1);
});
