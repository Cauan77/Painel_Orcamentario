import jsPDF from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}
import {
  agrupar,
  fmtNum,
  fmtPct,
  isEmenda,
  pautaDe,
  totalizar,
  type Linha,
  type Parametro,
} from "@/lib/orcamento";
import type { Empenho } from "@/lib/empenhos";

const AZUL: [number, number, number] = [14, 44, 74];
const CINZA: [number, number, number] = [241, 243, 246];

/** Desenha o Brasão e identidade visual oficial da Secretaria no lado direito do cabeçalho */
function desenharBrasaoSMDHC(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // Fundo branco arredondado tipo badge institucional
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "F");
  doc.setDrawColor(220, 226, 235);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "S");

  const cx = x + w / 2;
  const crownY = y + 3.5;

  // Coroa mural dourada no topo
  doc.setFillColor(218, 165, 32);
  doc.rect(cx - 9, crownY, 18, 4.5, "F");
  // Torres da coroa mural
  doc.rect(cx - 8, crownY - 2, 3, 2, "F");
  doc.rect(cx - 1.5, crownY - 2.5, 3, 2.5, "F");
  doc.rect(cx + 5, crownY - 2, 3, 2, "F");

  // Ramos verdes de louro/café ao redor
  doc.setFillColor(34, 139, 34);
  doc.ellipse(cx - 9.5, crownY + 9, 2.2, 5.5, "F");
  doc.ellipse(cx + 9.5, crownY + 9, 2.2, 5.5, "F");

  // Escudo central vermelho
  const escY = crownY + 4.5;
  const escW = 13;
  const escH = 13.5;
  doc.setFillColor(204, 0, 0);
  doc.roundedRect(cx - escW / 2, escY, escW, escH, 1.8, 1.8, "F");

  // Braço com bandeira e cruz vermelha
  doc.setFillColor(255, 255, 255);
  doc.rect(cx - 3.8, escY + 3.5, 7.6, 4.8, "F");
  doc.setFillColor(204, 0, 0);
  doc.rect(cx - 1, escY + 3.5, 2, 4.8, "F");
  doc.rect(cx - 3.8, escY + 4.9, 7.6, 2, "F");

  // Faixa vermelha inferior
  doc.setFillColor(180, 0, 0);
  doc.rect(cx - 10, escY + escH - 0.5, 20, 3, "F");

  // Textos oficiais centralizados
  doc.setTextColor(25, 25, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.text("CIDADE DE", cx, y + 27.5, { align: "center" });
  doc.setFontSize(5.8);
  doc.text("SÃO PAULO", cx, y + 33.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.9);
  doc.text("DIREITOS HUMANOS", cx, y + 38.5, { align: "center" });
  doc.text("E CIDADANIA", cx, y + 43, { align: "center" });
}

/** Adiciona rodapé institucional com informações da Secretaria em todas as páginas */
function adicionarRodapes(doc: jsPDF, subtitulo?: string) {
  const totalPaginas = doc.getNumberOfPages();
  const larg = doc.internal.pageSize.getWidth();
  const alt = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    // Linha divisória
    doc.setDrawColor(210, 215, 225);
    doc.setLineWidth(0.6);
    doc.line(36, alt - 24, larg - 36, alt - 24);

    // Texto da secretaria no rodapé
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(110, 120, 130);
    const textoSecretaria =
      "Secretaria Municipal de Direitos Humanos e Cidadania — SMDHC  •  Rua Líbero Badaró, 119, Centro Histórico de São Paulo  •  Tel: (11) 2833-4150";
    doc.text(textoSecretaria, 36, alt - 13);

    // Numeração de página
    doc.setFont("helvetica", "bold");
    doc.text(`Página ${i} de ${totalPaginas}`, larg - 36, alt - 13, { align: "right" });
  }
}

function colunasExec(parametro: Parametro) {
  if (parametro === "inicial") return ["% Exec. s/ Inicial"];
  if (parametro === "atualizado") return ["% Exec. s/ Atualizado"];
  return ["% Exec. s/ Inicial", "% Exec. s/ Atualizado"];
}

function valoresExec(a: { execInicial: number; execAtualizado: number }, p: Parametro) {
  if (p === "inicial") return [fmtPct(a.execInicial)];
  if (p === "atualizado") return [fmtPct(a.execAtualizado)];
  return [fmtPct(a.execInicial), fmtPct(a.execAtualizado)];
}

export type ReportOptions = {
  rows: Linha[];
  empenhos?: Empenho[];
  parametro: Parametro;
  orgaosSelecionados: string[];
  pautasSelecionadas: string[];
  pasSelecionados?: string[];
  fornecedoresSelecionados?: string[];
  fonteDados: string;
  fonteEmpenhos?: string;
  exercicio: number;
  grafico?: HTMLCanvasElement;
};

export function gerarRelatorioPdf(opts: ReportOptions) {
  const { rows, parametro, orgaosSelecionados, pautasSelecionadas, pasSelecionados } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const larg = doc.internal.pageSize.getWidth();
  const total = totalizar(rows);
  const refTexto =
    parametro === "inicial"
      ? "Orçamento Inicial"
      : parametro === "atualizado"
        ? "Orçamento Atualizado"
        : "Orçamento Inicial e Atualizado";

  // Cabeçalho com faixa azul
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, larg, 74, "F");

  // Brasão da Secretaria ao lado direito do cabeçalho
  desenharBrasaoSMDHC(doc, larg - 68, 12, 46, 48);

  // Informações do cabeçalho centralizadas
  const centroX = larg / 2;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Relatório de Execução Orçamentária", centroX, 27, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    `Exercício ${opts.exercicio}  •  SMDHC, FAASP, FUMCAD e FMID  •  Parâmetro de execução: ${refTexto}`,
    centroX,
    42,
    { align: "center" }
  );
  doc.setFontSize(7.5);
  doc.text(
    `Fonte: ${opts.fonteDados}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
    centroX,
    55,
    { align: "center" }
  );

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8.5);
  const textoPAs = pasSelecionados?.length
    ? `   |   Projetos/Atividades: ${pasSelecionados.join(", ")}`
    : "";
  const textoFornecedores = opts.fornecedoresSelecionados?.length
    ? `   |   Fornecedor: ${opts.fornecedoresSelecionados.join(", ")}`
    : "";
  doc.text(
    `Órgãos: ${orgaosSelecionados.join(", ") || "Todos"}   |   Políticas públicas: ${pautasSelecionadas.length ? pautasSelecionadas.join(", ") : "Todas"
    }${textoPAs}${textoFornecedores}`,
    40,
    94,
  );

  // Resumo executivo
  autoTable(doc, {
    startY: 106,
    head: [
      [
        "Orçamento Inicial",
        "Orçamento Atualizado",
        "Congelado",
        "Descongelado",
        "Empenhado",
        "Pago",
        "Saldo de Dotação",
        ...colunasExec(parametro),
      ],
    ],
    body: [
      [
        fmtNum(total.inicial),
        fmtNum(total.atualizado),
        fmtNum(total.congelado),
        fmtNum(total.descongelado),
        fmtNum(total.empenhado),
        fmtNum(total.pago),
        fmtNum(total.saldo),
        ...valoresExec(total, parametro),
      ],
    ],
    styles: { fontSize: 8, halign: "right" },
    headStyles: { fillColor: AZUL, halign: "center", fontSize: 8 },
    theme: "grid",
  });

  let y = doc.lastAutoTable.finalY + 18;

  if (opts.grafico) {
    const w = larg - 80;
    const h = 150;
    if (y + h > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 40;
    }
    doc.addImage(opts.grafico, "PNG", 40, y, w, h, `grafico-${Date.now()}`, "FAST");
    y += h + 16;
  }

  // Por órgão
  const porOrgao = agrupar(rows, (l) => ({ chave: l.orgao, rotulo: l.orgao, sub: l.orgaoNome }));
  autoTable(doc, {
    startY: y,
    head: [
      [
        "Órgão",
        "Inicial",
        "Atualizado",
        "Congelado",
        "Descongelado",
        "Empenhado",
        "Pago",
        "Saldo",
        ...colunasExec(parametro),
      ],
    ],
    body: porOrgao.map((a) => [
      `${a.rotulo} — ${a.sub ?? ""}`,
      fmtNum(a.inicial),
      fmtNum(a.atualizado),
      fmtNum(a.congelado),
      fmtNum(a.descongelado),
      fmtNum(a.empenhado),
      fmtNum(a.pago),
      fmtNum(a.saldo),
      ...valoresExec(a, parametro),
    ]),
    styles: { fontSize: 7.5, halign: "right" },
    columnStyles: { 0: { halign: "left", cellWidth: 180 } },
    headStyles: { fillColor: AZUL, halign: "center", fontSize: 7.5 },
    alternateRowStyles: { fillColor: CINZA },
    theme: "grid",
    didDrawPage: () => undefined,
    margin: { left: 40, right: 40 },
    willDrawPage: () => undefined,
  });

  y = doc.lastAutoTable.finalY + 18;

  // Por política pública — descrição dos projetos/atividades (rubricas) antecede a coluna Política
  const porPauta = agrupar(rows, (l) => ({ chave: pautaDe(l), rotulo: pautaDe(l) }));
  const projetosPorPauta = new Map<string, Set<string>>();
  for (const l of rows) {
    const p = pautaDe(l);
    if (!projetosPorPauta.has(p)) projetosPorPauta.set(p, new Set());
    projetosPorPauta.get(p)!.add(`${l.pa} - ${l.paNome}`);
  }

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Projetos / Atividades (rubricas)",
        "Política pública para",
        "Inicial",
        "Atualizado",
        "Congelado",
        "Descongelado",
        "Empenhado",
        "Pago",
        "Saldo",
        ...colunasExec(parametro),
      ],
    ],
    body: porPauta.map((a) => [
      [...(projetosPorPauta.get(a.chave) ?? [])].join("\n"),
      a.rotulo,
      fmtNum(a.inicial),
      fmtNum(a.atualizado),
      fmtNum(a.congelado),
      fmtNum(a.descongelado),
      fmtNum(a.empenhado),
      fmtNum(a.pago),
      fmtNum(a.saldo),
      ...valoresExec(a, parametro),
    ]),
    styles: {
      fontSize: 6.5,
      halign: "right",
      valign: "middle",
      cellPadding: 2.5,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 210, fontSize: 5.8 },
      1: { halign: "left", cellWidth: 78, fontStyle: "bold" },
      2: { cellWidth: 58 },
      3: { cellWidth: 58 },
      4: { cellWidth: 52 },
      5: { cellWidth: 52 },
      6: { cellWidth: 58 },
      7: { cellWidth: 58 },
      8: { cellWidth: 52 },
    },
    headStyles: { fillColor: AZUL, halign: "center", fontSize: 6.5 },
    alternateRowStyles: { fillColor: CINZA },
    theme: "grid",
    rowPageBreak: "avoid",
    margin: { left: 20, right: 20 },
  });

  // Detalhamento por projeto/atividade (Separado por Órgão, ordenado por maior recurso inicial, sem emendas parlamentares 9xxx)
  doc.addPage();
  const linhasSemEmenda = rows.filter((l) => !isEmenda(l.pa));
  const porPA = agrupar(linhasSemEmenda, (l) => ({
    chave: `${l.orgao}-${l.pa}`,
    rotulo: `${l.pa} - ${l.paNome}`,
    sub: l.orgao,
  })).sort((a, b) => (a.sub ?? "").localeCompare(b.sub ?? "") || (b.inicial - a.inicial));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...AZUL);
  doc.text("Detalhamento por Projeto / Atividade (Ordenado por Maior Recurso Inicial)", 40, 40);

  autoTable(doc, {
    startY: 52,
    head: [
      [
        "Órgão",
        "Projeto / Atividade",
        "Classificação",
        "Política pública para",
        "Inicial",
        "Atualizado",
        "Empenhado",
        "Pago",
        "Saldo",
        ...colunasExec(parametro),
      ],
    ],
    body: porPA.map((a) => {
      const codigo = a.rotulo.split(" - ")[0] ?? "";
      const linha = linhasSemEmenda.find((l) => `${l.orgao}-${l.pa}` === a.chave)!;
      return [
        a.sub ?? "",
        a.rotulo,
        linha.tipoPA,
        pautaDe(linha),
        fmtNum(a.inicial),
        fmtNum(a.atualizado),
        fmtNum(a.empenhado),
        fmtNum(a.pago),
        fmtNum(a.saldo),
        ...valoresExec(a, parametro),
      ];
    }),
    styles: { fontSize: 6.5, halign: "right", cellPadding: 2.5 },
    columnStyles: {
      0: { halign: "left", cellWidth: 42 },
      1: { halign: "left", cellWidth: 230 },
      2: { halign: "left", cellWidth: 70 },
      3: { halign: "left", cellWidth: 90 },
    },
    headStyles: { fillColor: AZUL, halign: "center", fontSize: 6.5 },
    alternateRowStyles: { fillColor: CINZA },
    theme: "grid",
    margin: { left: 40, right: 40 },
  });

  // Custos por elemento de despesa (execução orçamentária — empenhos)
  const empenhos = opts.empenhos ?? [];
  if (empenhos.length) {
    const porElemento = new Map<
      string,
      {
        orgao: string;
        elemento: string;
        nome: string;
        qtd: number;
        empenhado: number;
        liquidado: number;
        pago: number;
        fornecedores: Set<string>;
      }
    >();
    for (const e of empenhos) {
      const k = `${e.orgao}-${e.elemento}`;
      const a = porElemento.get(k) ?? {
        orgao: e.orgao,
        elemento: e.elemento,
        nome: e.elementoNome,
        qtd: 0,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
        fornecedores: new Set<string>(),
      };
      a.qtd += 1;
      a.empenhado += e.empenhado;
      a.liquidado += e.liquidado;
      a.pago += e.pago;
      a.fornecedores.add(e.fornecedor);
      porElemento.set(k, a);
    }

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...AZUL);
    doc.text("Custos por Elemento de Despesa (execução orçamentária)", 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(`Fonte dos empenhos: ${opts.fonteEmpenhos ?? "—"}`, 40, 54);

    autoTable(doc, {
      startY: 64,
      head: [
        [
          "Órgão",
          "Elemento de despesa",
          "Nº de empenhos",
          "Fornecedores",
          "Empenhado",
          "Liquidado",
          "Pago",
        ],
      ],
      body: [...porElemento.values()]
        .sort((a, b) => b.empenhado - a.empenhado)
        .map((a) => [
          a.orgao,
          `${a.elemento} - ${a.nome}`,
          String(a.qtd),
          String(a.fornecedores.size),
          fmtNum(a.empenhado),
          fmtNum(a.liquidado),
          fmtNum(a.pago),
        ]),
      styles: { fontSize: 6.5, halign: "right", cellPadding: 2.5 },
      columnStyles: {
        0: { halign: "left", cellWidth: 42 },
        1: { halign: "left", cellWidth: 300 },
        2: { halign: "center", cellWidth: 60 },
        3: { halign: "center", cellWidth: 60 },
      },
      headStyles: { fillColor: AZUL, halign: "center", fontSize: 6.5 },
      alternateRowStyles: { fillColor: CINZA },
      theme: "grid",
      margin: { left: 40, right: 40 },
    });

    // Detalhamento dos empenhos — processo, nº empenho, credor e valores
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...AZUL);
    doc.text("Detalhamento dos Empenhos — Processos e Credores", 20, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `${empenhos.length} empenhos listados, ordenados por órgão, elemento de despesa e valor empenhado.`,
      20,
      54,
    );

    const detalhe = [...empenhos].sort(
      (a, b) =>
        a.orgao.localeCompare(b.orgao) ||
        a.elemento.localeCompare(b.elemento) ||
        b.empenhado - a.empenhado,
    );

    autoTable(doc, {
      startY: 64,
      head: [
        [
          "Órgão",
          "Elemento",
          "Nº Processo",
          "Nº Empenho",
          "Data",
          "Credor / Razão Social",
          "Empenhado",
          "Liquidado",
          "Pago",
        ],
      ],
      body: detalhe.map((e) => [
        e.orgao,
        e.elemento,
        e.processo,
        e.empenho,
        e.data,
        e.fornecedor,
        fmtNum(e.empenhado),
        fmtNum(e.liquidado),
        fmtNum(e.pago),
      ]),
      styles: { fontSize: 6, halign: "right", cellPadding: 2, overflow: "linebreak" },
      columnStyles: {
        0: { halign: "left", cellWidth: 40 },
        1: { halign: "left", cellWidth: 55 },
        2: { halign: "left", cellWidth: 95 },
        3: { halign: "left", cellWidth: 48 },
        4: { halign: "center", cellWidth: 48 },
        5: { halign: "left", cellWidth: 235 },
        6: { cellWidth: 62 },
        7: { cellWidth: 62 },
        8: { cellWidth: 62 },
      },
      headStyles: { fillColor: AZUL, halign: "center", fontSize: 6.5 },
      alternateRowStyles: { fillColor: CINZA },
      theme: "grid",
      rowPageBreak: "avoid",
      margin: { left: 20, right: 20 },
    });
  }

  adicionarRodapes(doc);

  doc.save(`execucao-orcamentaria-${opts.exercicio}.pdf`);
}

// ─── Relatório por Órgão ────────────────────────────────────────────────────

const VERDE: [number, number, number] = [22, 101, 52];
const VERDE_CLARO: [number, number, number] = [240, 253, 244];
const AZUL_ROW: [number, number, number] = [219, 234, 254];

function seccaoCabecalho(
  doc: jsPDF,
  larg: number,
  titulo: string,
  subtitulo: string,
  exercicio: number,
  fonteDados: string,
  orgaosSelecionados: string[],
) {
  // ── Faixa azul ────────────────────────────────────────────────────────────
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, larg, 74, "F");



  // ── Título e subtítulo do relatório centralizados ───────────────────────
  const centroX = larg / 2;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(titulo, centroX, 26, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(subtitulo, centroX, 39, { align: "center" });

  doc.setFontSize(7.5);
  doc.text(
    `Relatório de Execução Orçamentária  •  Exercício ${exercicio}  •  Emitido em ${new Date().toLocaleString("pt-BR")}`,
    centroX,
    51,
    { align: "center" }
  );
  doc.text(`Fonte dos dados: ${fonteDados}`, centroX, 63, { align: "center" });

  // ── Linha de órgãos ABAIXO da faixa azul ─────────────
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Órgãos selecionados: ${orgaosSelecionados.join(", ") || "Todos"}`, 36, 94);
  doc.setFont("helvetica", "normal");
}

function tituloSecao(doc: jsPDF, texto: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...AZUL);
  doc.text(texto, 36, y);
  doc.setTextColor(40, 40, 40);
}

export type OrgaoReportOptions = {
  rows: Linha[];
  empenhos?: Empenho[];
  parametro: Parametro;
  orgaosSelecionados: string[];
  fonteDados: string;
  exercicio: number;
};

export function gerarRelatorioOrgaoPdf(opts: OrgaoReportOptions) {
  const { rows, empenhos = [], parametro, orgaosSelecionados, fonteDados, exercicio } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const larg = doc.internal.pageSize.getWidth();
  const altPg = doc.internal.pageSize.getHeight();

  // ── Colunas de exec dependendo do parâmetro ──────────────────────────────
  const colsExec = colunasExec(parametro);
  const valExec = (a: { execInicial: number; execAtualizado: number }) => valoresExec(a, parametro);

  // ── Cabeçalho página 1 ───────────────────────────────────────────────────
  seccaoCabecalho(
    doc,
    larg,
    "Execução Orçamentária por Órgão",
    "SMDHC · FAASP · FUMCAD · FMID — Empenhado, Liquidado e Pago por órgão, política pública e projeto/atividade",
    exercicio,
    fonteDados,
    orgaosSelecionados,
  );

  // ── 1. Resumo total consolidado ──────────────────────────────────────────
  const total = totalizar(rows);
  tituloSecao(doc, "1. Resumo Geral Consolidado", 118);
  autoTable(doc, {
    startY: 126,
    head: [
      [
        "Orçamento Inicial",
        "Orçamento Atualizado",
        "Empenhado",
        "Liquidado",
        "Pago",
        "Saldo",
        ...colsExec,
      ],
    ],
    body: [
      [
        fmtNum(total.inicial),
        fmtNum(total.atualizado),
        fmtNum(total.empenhado),
        fmtNum(
          rows.reduce((s, l) => s + l.liquidado, 0)
        ),
        fmtNum(total.pago),
        fmtNum(total.saldo),
        ...valExec(total),
      ],
    ],
    styles: { fontSize: 8, halign: "right" },
    headStyles: { fillColor: AZUL, halign: "center", fontSize: 8, fontStyle: "bold" },
    theme: "grid",
    margin: { left: 36, right: 36 },
  });

  let y = doc.lastAutoTable.finalY + 22;

  // ── 2. Execução por Órgão ────────────────────────────────────────────────
  tituloSecao(doc, "2. Execução Orçamentária por Órgão", y);
  y += 10;

  // Agrupa por órgão (inclui liquidado via reduce direto)
  const mapaOrgao = new Map<
    string,
    {
      orgao: string;
      orgaoNome: string;
      inicial: number;
      atualizado: number;
      empenhado: number;
      liquidado: number;
      pago: number;
      saldo: number;
    }
  >();
  for (const l of rows) {
    let a = mapaOrgao.get(l.orgao);
    if (!a) {
      a = {
        orgao: l.orgao,
        orgaoNome: l.orgaoNome,
        inicial: 0,
        atualizado: 0,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
        saldo: 0,
      };
      mapaOrgao.set(l.orgao, a);
    }
    a.inicial += l.inicial;
    a.atualizado += l.atualizado;
    a.empenhado += l.empenhado;
    a.liquidado += l.liquidado ?? 0;
    a.pago += l.pago;
    a.saldo += l.saldo;
  }
  const porOrgaoArr = [...mapaOrgao.values()].sort((a, b) => b.atualizado - a.atualizado);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Órgão",
        "Inicial",
        "Atualizado",
        "Empenhado",
        "Liquidado",
        "Pago",
        "Saldo",
        "% Exec. s/ Atualizado",
        "% Pago s/ Emp.",
      ],
    ],
    body: porOrgaoArr.map((a) => [
      `${a.orgao} — ${a.orgaoNome}`,
      fmtNum(a.inicial),
      fmtNum(a.atualizado),
      fmtNum(a.empenhado),
      fmtNum(a.liquidado),
      fmtNum(a.pago),
      fmtNum(a.saldo),
      fmtPct(a.atualizado > 0 ? (a.empenhado / a.atualizado) * 100 : 0),
      fmtPct(a.empenhado > 0 ? (a.pago / a.empenhado) * 100 : 0),
    ]),
    foot: [
      [
        "TOTAL",
        fmtNum(porOrgaoArr.reduce((s, a) => s + a.inicial, 0)),
        fmtNum(porOrgaoArr.reduce((s, a) => s + a.atualizado, 0)),
        fmtNum(porOrgaoArr.reduce((s, a) => s + a.empenhado, 0)),
        fmtNum(porOrgaoArr.reduce((s, a) => s + a.liquidado, 0)),
        fmtNum(porOrgaoArr.reduce((s, a) => s + a.pago, 0)),
        fmtNum(porOrgaoArr.reduce((s, a) => s + a.saldo, 0)),
        "",
        "",
      ],
    ],
    styles: { fontSize: 7.5, halign: "right" },
    columnStyles: { 0: { halign: "left", cellWidth: 190 } },
    headStyles: { fillColor: AZUL, halign: "center", fontSize: 7.5, fontStyle: "bold" },
    footStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "right",
    },
    alternateRowStyles: { fillColor: CINZA },
    theme: "grid",
    margin: { left: 36, right: 36 },
  });

  // ── 3. Execução por Política Pública ─────────────────────────────────────
  doc.addPage();
  seccaoCabecalho(
    doc,
    larg,
    "Execução por Política Pública (Tipo)",
    "Agrupamento temático por política pública — Empenhado, Liquidado e Pago",
    exercicio,
    fonteDados,
    orgaosSelecionados,
  );

  tituloSecao(doc, "3. Execução por Tipo de Política Pública", 118);

  const mapaPauta = new Map<
    string,
    {
      pauta: string;
      inicial: number;
      atualizado: number;
      empenhado: number;
      liquidado: number;
      pago: number;
      saldo: number;
      qtdPAs: Set<string>;
    }
  >();
  for (const l of rows) {
    const p = pautaDe(l);
    let a = mapaPauta.get(p);
    if (!a) {
      a = {
        pauta: p,
        inicial: 0,
        atualizado: 0,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
        saldo: 0,
        qtdPAs: new Set(),
      };
      mapaPauta.set(p, a);
    }
    a.inicial += l.inicial;
    a.atualizado += l.atualizado;
    a.empenhado += l.empenhado;
    a.liquidado += l.liquidado ?? 0;
    a.pago += l.pago;
    a.saldo += l.saldo;
    a.qtdPAs.add(l.pa);
  }
  const porPautaArr = [...mapaPauta.values()].sort((a, b) => b.atualizado - a.atualizado);

  autoTable(doc, {
    startY: 128,
    head: [
      [
        "Política Pública",
        "Projetos/Ativ.",
        "Inicial",
        "Atualizado",
        "Empenhado",
        "Liquidado",
        "Pago",
        "Saldo",
        "% Exec.",
        "% Pago s/ Emp.",
      ],
    ],
    body: porPautaArr.map((a) => [
      a.pauta,
      String(a.qtdPAs.size),
      fmtNum(a.inicial),
      fmtNum(a.atualizado),
      fmtNum(a.empenhado),
      fmtNum(a.liquidado),
      fmtNum(a.pago),
      fmtNum(a.saldo),
      fmtPct(a.atualizado > 0 ? (a.empenhado / a.atualizado) * 100 : 0),
      fmtPct(a.empenhado > 0 ? (a.pago / a.empenhado) * 100 : 0),
    ]),
    foot: [
      [
        "TOTAL",
        "",
        fmtNum(porPautaArr.reduce((s, a) => s + a.inicial, 0)),
        fmtNum(porPautaArr.reduce((s, a) => s + a.atualizado, 0)),
        fmtNum(porPautaArr.reduce((s, a) => s + a.empenhado, 0)),
        fmtNum(porPautaArr.reduce((s, a) => s + a.liquidado, 0)),
        fmtNum(porPautaArr.reduce((s, a) => s + a.pago, 0)),
        fmtNum(porPautaArr.reduce((s, a) => s + a.saldo, 0)),
        "",
        "",
      ],
    ],
    styles: { fontSize: 7.5, halign: "right" },
    columnStyles: {
      0: { halign: "left", cellWidth: 180, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 48 },
    },
    headStyles: { fillColor: VERDE, halign: "center", fontSize: 7.5, fontStyle: "bold" },
    footStyles: {
      fillColor: VERDE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "right",
    },
    alternateRowStyles: { fillColor: VERDE_CLARO },
    theme: "grid",
    margin: { left: 36, right: 36 },
  });

  // ── 4. Execução por Projeto/Atividade (Separado por Órgão e Ordenado por Maior Recurso Inicial) ──────────────
  doc.addPage();
  seccaoCabecalho(
    doc,
    larg,
    "Execução por Projeto / Atividade",
    "Detalhamento por órgão ordenado por maior recurso inicial — Empenhado, Liquidado e Pago",
    exercicio,
    fonteDados,
    orgaosSelecionados,
  );

  tituloSecao(doc, "4. Detalhamento por Projeto / Atividade (Ordenado por Maior Recurso Inicial)", 118);

  // Agrupa: um item por (orgao, pa), ocultando emendas parlamentares (projetos 9xxx)
  const linhasSemEmendaOrgao = rows.filter((l) => !isEmenda(l.pa));
  const mapaPA = new Map<
    string,
    {
      orgao: string;
      pa: string;
      paNome: string;
      pauta: string;
      tipoPA: string;
      isEmenda: boolean;
      inicial: number;
      atualizado: number;
      empenhado: number;
      liquidado: number;
      pago: number;
      saldo: number;
    }
  >();
  for (const l of linhasSemEmendaOrgao) {
    const k = `${l.orgao}||${l.pa}`;
    let a = mapaPA.get(k);
    if (!a) {
      a = {
        orgao: l.orgao,
        pa: l.pa,
        paNome: l.paNome,
        pauta: pautaDe(l),
        tipoPA: l.tipoPA,
        isEmenda: false,
        inicial: 0,
        atualizado: 0,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
        saldo: 0,
      };
      mapaPA.set(k, a);
    }
    a.inicial += l.inicial;
    a.atualizado += l.atualizado;
    a.empenhado += l.empenhado;
    a.liquidado += l.liquidado ?? 0;
    a.pago += l.pago;
    a.saldo += l.saldo;
  }

  // Ordena primeiro por Órgão e depois por maior recurso Inicial (decrescente)
  const programas = [...mapaPA.values()].sort(
    (a, b) => a.orgao.localeCompare(b.orgao) || (b.inicial - a.inicial),
  );

  function tabelaPA(
    rows2: typeof programas,
    startY: number,
    corHead: [number, number, number],
  ) {
    const head = [
      [
        "Órgão",
        "PA",
        "Projeto / Atividade",
        "Política Pública",
        "Tipo",
        "Inicial",
        "Atualizado",
        "Empenhado",
        "Liquidado",
        "Pago",
        "Saldo",
        "% Exec.",
        "% Pago s/ Emp.",
      ],
    ];

    const body = rows2.map((a) => [
      a.orgao,
      a.pa,
      a.paNome,
      a.pauta,
      a.tipoPA,
      fmtNum(a.inicial),
      fmtNum(a.atualizado),
      fmtNum(a.empenhado),
      fmtNum(a.liquidado),
      fmtNum(a.pago),
      fmtNum(a.saldo),
      fmtPct(a.atualizado > 0 ? (a.empenhado / a.atualizado) * 100 : 0),
      fmtPct(a.empenhado > 0 ? (a.pago / a.empenhado) * 100 : 0),
    ]);

    const foot = [
      [
        "TOTAL",
        "",
        "",
        "",
        "",
        fmtNum(rows2.reduce((s, a) => s + a.inicial, 0)),
        fmtNum(rows2.reduce((s, a) => s + a.atualizado, 0)),
        fmtNum(rows2.reduce((s, a) => s + a.empenhado, 0)),
        fmtNum(rows2.reduce((s, a) => s + a.liquidado, 0)),
        fmtNum(rows2.reduce((s, a) => s + a.pago, 0)),
        fmtNum(rows2.reduce((s, a) => s + a.saldo, 0)),
        "",
        "",
      ],
    ];

    const columnStylesConfig: UserOptions["columnStyles"] = {
      0: { halign: "center", cellWidth: 36 },
      1: { halign: "center", cellWidth: 30 },
      2: { halign: "left", cellWidth: "auto" },
      3: { halign: "left", cellWidth: 120 },
      4: { halign: "left", cellWidth: 90 },
      5: { halign: "right", cellWidth: "wrap" },
      6: { halign: "right", cellWidth: "wrap" },
      7: { halign: "right", cellWidth: "wrap" },
      8: { halign: "right", cellWidth: "wrap" },
      9: { halign: "right", cellWidth: "wrap" },
      10: { halign: "right", cellWidth: "wrap" },
      11: { halign: "right", cellWidth: "wrap" },
      12: { halign: "right", cellWidth: "wrap" },
    };

    autoTable(doc, {
      startY,
      head,
      body,
      foot,
      styles: { fontSize: 6.5, halign: "right", cellPadding: 2.5, overflow: "linebreak" },
      columnStyles: columnStylesConfig,
      headStyles: { fillColor: corHead, halign: "center", fontSize: 6.5, fontStyle: "bold" },
      footStyles: {
        fillColor: corHead,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 6.5,
        halign: "right",
      },
      alternateRowStyles: { fillColor: CINZA },
      theme: "grid",
      rowPageBreak: "avoid",
      margin: { left: 20, right: 20 },
    });
  }

  tabelaPA(programas, 128, AZUL);

  // ── 6. Emendas Recebidas por Órgão e Projeto/Atividade ───────────────────
  const linhasEmRecebidas = rows.filter((l) => {
    const tipo = (l.tipoPA ?? "").toLowerCase();
    const nome = (l.paNome ?? "").toLowerCase();
    return tipo.includes("recebida") || nome.includes("emenda recebida");
  });

  const empRecebidos = empenhos.filter((e) => {
    const texto = `${e.objeto || ""} ${e.fornecedor || ""}`.toLowerCase();
    return texto.includes("emenda parlamentar");
  });

  if (linhasEmRecebidas.length > 0 || empRecebidos.length > 0) {
    doc.addPage();
    seccaoCabecalho(
      doc,
      larg,
      "Emendas Recebidas - Detalhamento por Órgão e Projeto/Atividade",
      "Execução das emendas parlamentares recebidas por órgão e projeto/atividade",
      exercicio,
      fonteDados,
      orgaosSelecionados,
    );

    if (linhasEmRecebidas.length > 0) {
      const mapaEmRec = new Map<
        string,
        {
          orgao: string;
          orgaoNome: string;
          pa: string;
          paNome: string;
          pauta: string;
          atualizado: number;
          empenhado: number;
          liquidado: number;
          pago: number;
          saldo: number;
        }
      >();
      for (const l of linhasEmRecebidas) {
        const k = `${l.orgao}||${l.pa}`;
        let a = mapaEmRec.get(k);
        if (!a) {
          a = {
            orgao: l.orgao,
            orgaoNome: l.orgaoNome,
            pa: l.pa,
            paNome: l.paNome,
            pauta: pautaDe(l),
            atualizado: 0,
            empenhado: 0,
            liquidado: 0,
            pago: 0,
            saldo: 0,
          };
          mapaEmRec.set(k, a);
        }
        a.atualizado += l.atualizado;
        a.empenhado += l.empenhado;
        a.liquidado += l.liquidado ?? 0;
        a.pago += l.pago;
        a.saldo += l.saldo;
      }

      const emRecArr = [...mapaEmRec.values()].sort(
        (a, b) => a.orgao.localeCompare(b.orgao) || (b.atualizado - a.atualizado),
      );

      autoTable(doc, {
        startY: 128,
        head: [
          [
            "Órgão",
            "PA",
            "Projeto / Atividade",
            "Política Pública",
            "Atualizado",
            "Empenhado",
            "Liquidado",
            "Pago",
            "Saldo",
            "% Exec.",
          ],
        ],
        body: emRecArr.map((a) => [
          `${a.orgao} - ${a.orgaoNome}`,
          a.pa,
          a.paNome,
          a.pauta,
          fmtNum(a.atualizado),
          fmtNum(a.empenhado),
          fmtNum(a.liquidado),
          fmtNum(a.pago),
          fmtNum(a.saldo),
          fmtPct(a.atualizado > 0 ? (a.empenhado / a.atualizado) * 100 : 0),
        ]),
        foot: [
          [
            "TOTAL",
            "",
            "",
            "",
            fmtNum(emRecArr.reduce((s, a) => s + a.atualizado, 0)),
            fmtNum(emRecArr.reduce((s, a) => s + a.empenhado, 0)),
            fmtNum(emRecArr.reduce((s, a) => s + a.liquidado, 0)),
            fmtNum(emRecArr.reduce((s, a) => s + a.pago, 0)),
            fmtNum(emRecArr.reduce((s, a) => s + a.saldo, 0)),
            "",
          ],
        ],
        styles: { fontSize: 7, halign: "right", overflow: "linebreak" },
        columnStyles: {
          0: { halign: "left", cellWidth: 140 },
          1: { halign: "center", cellWidth: 28 },
          2: { halign: "left", cellWidth: "auto" },
          3: { halign: "left", cellWidth: 120 },
          4: { halign: "right", cellWidth: "wrap" },
          5: { halign: "right", cellWidth: "wrap" },
          6: { halign: "right", cellWidth: "wrap" },
          7: { halign: "right", cellWidth: "wrap" },
          8: { halign: "right", cellWidth: "wrap" },
          9: { halign: "right", cellWidth: "wrap" },
        } as UserOptions["columnStyles"],
        headStyles: { fillColor: [22, 163, 74], halign: "center", fontSize: 7, fontStyle: "bold" },
        footStyles: {
          fillColor: [22, 163, 74],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
          halign: "right",
        },
        alternateRowStyles: { fillColor: VERDE_CLARO },
        theme: "grid",
        margin: { left: 20, right: 20 },
      });
    }

    // Detalhamento de empenhos de emendas recebidas (Tabela 6 - layout otimizado em no máximo 2 linhas)
    if (empRecebidos.length > 0) {
      let yEmpSec = 128;
      if (linhasEmRecebidas.length > 0) {
        yEmpSec = doc.lastAutoTable.finalY + 18;
        if (yEmpSec > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          yEmpSec = 40;
        }
      }

      tituloSecao(doc, "6. Empenhos de Emendas Recebidas - Detalhamento", yEmpSec);
      autoTable(doc, {
        startY: yEmpSec + 10,
        head: [
          [
            "Órgão",
            "Ação",
            "Política Pública",
            "Fornecedor / Favorecido",
            "Objeto da Despesa",
            "Empenhado",
            "Liquidado",
            "Pago",
          ],
        ],
        body: empRecebidos
          .sort((a, b) => a.orgao.localeCompare(b.orgao) || (b.empenhado - a.empenhado))
          .map((e) => [
            e.orgao,
            e.acao,
            (e.politica || "").slice(0, 36),
            (e.fornecedor || "").slice(0, 46),
            (e.objeto ?? "").slice(0, 110),
            fmtNum(e.empenhado),
            fmtNum(e.liquidado),
            fmtNum(e.pago),
          ]),
        foot: [
          [
            "TOTAL",
            "",
            "",
            "",
            "",
            fmtNum(empRecebidos.reduce((s, e) => s + e.empenhado, 0)),
            fmtNum(empRecebidos.reduce((s, e) => s + e.liquidado, 0)),
            fmtNum(empRecebidos.reduce((s, e) => s + e.pago, 0)),
          ],
        ],
        styles: {
          fontSize: 6.5,
          halign: "right",
          overflow: "linebreak",
          cellPadding: 2,
          minCellHeight: 14,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 42 },
          1: { halign: "center", cellWidth: 38 },
          2: { halign: "left", cellWidth: 124 },
          3: { halign: "left", cellWidth: 150 },
          4: { halign: "left", cellWidth: 256 },
          5: { halign: "right", cellWidth: 64 },
          6: { halign: "right", cellWidth: 64 },
          7: { halign: "right", cellWidth: 64 },
        } as UserOptions["columnStyles"],
        headStyles: {
          fillColor: [22, 163, 74],
          halign: "center",
          fontSize: 6.5,
          fontStyle: "bold",
        },
        footStyles: {
          fillColor: [22, 163, 74],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 6.5,
          halign: "right",
        },
        alternateRowStyles: { fillColor: VERDE_CLARO },
        theme: "grid",
        margin: { left: 20, right: 20 },
      });
    }
  }

  // ── Rodapé institucional numerado em todas as páginas ─────────────────────
  adicionarRodapes(doc);

  doc.save(`relatorio-por-orgao-${exercicio}.pdf`);
}
