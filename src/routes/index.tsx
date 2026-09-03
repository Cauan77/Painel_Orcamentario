import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  Calendar,
  Coins,
  Crosshair,
  FileDown,
  HeartHandshake,
  Landmark,
  Layers,
  LayoutGrid,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { getBaseExecucao, getEmpenhos, getContratos } from "@/lib/execucao-source.functions";
import {
  agrupar,
  fmtMoeda,
  fmtNum,
  fmtPct,
  isEmenda,
  pautaDe,
  tipoDespesaDe,
  totalizar,
  ANOS_EXERCICIO,
  MESES_EXERCICIO,
  type Linha,
  type Parametro,
} from "@/lib/orcamento";
import {
  politicaEquivalente,
  isEstagioEmpenho,
  isEmendaRecebidaEmpenho,
  parlamentarDaEmenda,
  type Empenho,
} from "@/lib/empenhos";
import { PainelPaElemento } from "@/components/pa-elemento";
import { gerarRelatorioPdf, gerarRelatorioOrgaoPdf } from "@/lib/pdf-report";
import { ModalImportarExcel } from "@/components/modal-importar-excel";
import { formatarDataBR } from "@/lib/excel-parser";
import { criarBuscadorContratos, semaforo } from "@/lib/contratos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { graficoParaCanvas } from "@/lib/chart-png";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Execução Orçamentária SMDHC 2026 | Painel Executivo" },
      {
        name: "description",
        content:
          "Painel de execução orçamentária da SMDHC, FAASP, FUMCAD e FMID por órgão, política pública e projeto/atividade, com exportação de relatório em PDF.",
      },
      { property: "og:title", content: "Execução Orçamentária SMDHC 2026" },
      {
        property: "og:description",
        content:
          "Orçamento inicial, atualizado, empenhado, pago e saldo de dotação por órgão e política pública, com relatório em PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Visao = "pauta" | "projeto" | "orgao";

type ItemPA = {
  pa: string;
  paNome: string;
  orgao: string;
  pauta: string;
  tipoPA: string;
  isEmenda: boolean;
  totalAtualizado: number;
  totalEmpenhado: number;
};

type ItemPauta = {
  pauta: string;
  qtdPAs: number;
  orgaos: string[];
  totalAtualizado: number;
  totalEmpenhado: number;
};

const CORES = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function Chip({
  ativo,
  onClick,
  children,
  className = "",
  title,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        ativo
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      } ${className}`}
    >
      {children}
    </button>
  );
}


function Kpi({
  rotulo,
  valor,
  detalhe,
  linhasDetalhe,
  despesas,
}: {
  rotulo: string;
  valor: string;
  detalhe?: React.ReactNode;
  linhasDetalhe?: string[];
  despesas?: {
    atividades: number;
    folha: number;
    emendas: number;
    emendasRecebidas?: number;
  };
}) {
  return (
    <Card className="border-border/70 overflow-hidden shadow-xs hover:border-primary/40 transition-colors flex flex-col h-full">
      <CardContent className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 gap-2.5">
        {/* 1. Topo: Rótulo e Valor Principal */}
        <div className="min-h-[44px]">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {rotulo}
          </p>
          <p className="mt-0.5 font-heading text-sm sm:text-base xl:text-[15px] 2xl:text-lg font-bold tracking-tight text-foreground tabular-nums break-words leading-tight">
            {valor}
          </p>
        </div>

        {/* 2. Meio: Bloco de Despesas (Atividades, Folha, Emendas) */}
        {despesas ? (
          <div className="space-y-1 rounded-md bg-muted/40 p-2 border border-border/40 text-[10px] sm:text-[11px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                Atividades:
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {fmtMoeda(despesas.atividades)}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                Folha:
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {fmtMoeda(despesas.folha)}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <span className="size-1.5 rounded-full bg-purple-500 shrink-0" />
                Emendas:
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {fmtMoeda(despesas.emendas)}
              </span>
            </div>
            {despesas.emendasRecebidas !== undefined && despesas.emendasRecebidas > 0 ? (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Emendas Rec.:
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fmtMoeda(despesas.emendasRecebidas)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 3. Rodapé: Informações adicionais com altura mínima consistente para alinhar todos os 6 cards */}
        <div className="min-h-[38px] flex flex-col justify-center pt-1.5 border-t border-border/40 text-[10px] sm:text-[11px] leading-tight text-muted-foreground">
          {linhasDetalhe && linhasDetalhe.length > 0 ? (
            <div className="space-y-1">
              {linhasDetalhe.map((linha, i) => {
                const idxSep = linha.indexOf(":");
                const rot = idxSep !== -1 ? linha.slice(0, idxSep) : linha;
                const val = idxSep !== -1 ? linha.slice(idxSep + 1) : "";
                return (
                  <div key={i} className="flex items-center justify-between gap-1">
                    <span>{rot}:</span>
                    <span className="font-semibold text-foreground tabular-nums">{val}</span>
                  </div>
                );
              })}
            </div>
          ) : detalhe ? (
            <div className="break-words">{detalhe}</div>
          ) : (
            <div className="text-[10px] text-muted-foreground/30 text-center select-none">—</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const fetchBase = useServerFn(getBaseExecucao);
  const fetchEmpenhos = useServerFn(getEmpenhos);
  const fetchContratos = useServerFn(getContratos);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["base-execucao"],
    queryFn: () => fetchBase(),
  });
  const { data: baseEmpenhos, refetch: refetchEmpenhos } = useQuery({
    queryKey: ["empenhos"],
    queryFn: () => fetchEmpenhos(),
  });
  const { data: baseContratos } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => fetchContratos(),
  });

  const contratoDe = useMemo(
    () => criarBuscadorContratos(baseContratos?.rows ?? []),
    [baseContratos],
  );

  const [orgaos, setOrgaos] = useState<string[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  const [meses, setMeses] = useState<number[]>([]);
  const [pas, setPas] = useState<string[]>([]);
  const [pautas, setPautas] = useState<string[]>([]);
  const [fornsSelecionados, setFornsSelecionados] = useState<string[]>([]);
  const [buscaPA, setBuscaPA] = useState("");
  const [mostrarListaCompletaPA, setMostrarListaCompletaPA] = useState(false);
  const [buscaPauta, setBuscaPauta] = useState("");
  const [mostrarListaCompletaPauta, setMostrarListaCompletaPauta] = useState(false);
  const [buscaFornecedor, setBuscaFornecedor] = useState("");
  const [mostrarListaCompletaFornecedor, setMostrarListaCompletaFornecedor] = useState(false);
  const [parametro, setParametro] = useState<Parametro>("ambos");
  const [visao, setVisao] = useState<Visao>("pauta");
  const [somenteEmendas, setSomenteEmendas] = useState(false);
  const [somenteRecebidas, setSomenteRecebidas] = useState(false);

  const [mostrarResumoEmendas, setMostrarResumoEmendas] = useState(false);
  const [mostrarResumoEmendasRecebidas, setMostrarResumoEmendasRecebidas] = useState(false);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);

  const todas = data?.rows ?? [];
  const orgaosDisponiveis = useMemo(
    () => [...new Set(todas.map((l) => l.orgao))].sort(),
    [todas],
  );

  // Identifica quais anos e meses realmente existem na base carregada
  const anosComDados = useMemo(() => {
    const conjunto = new Set<number>();
    for (const l of todas) {
      if (typeof l.ano === "number" && l.ano > 0) conjunto.add(l.ano);
    }
    if (conjunto.size === 0 && data?.exercicio) {
      conjunto.add(data.exercicio);
    }
    return conjunto;
  }, [todas, data?.exercicio]);

  const mesesComDados = useMemo(() => {
    const conjunto = new Set<number>();
    for (const l of todas) {
      const m = typeof l.mes === "number" ? l.mes : Number(l.mes);
      if (!isNaN(m) && m >= 1 && m <= 12) conjunto.add(m);
    }
    return conjunto;
  }, [todas]);

  // Mapeamento completo e único de todos os Projetos / Atividades disponíveis (suporta múltiplos órgãos por PA)
  const todosPAs = useMemo(() => {
    const mapa = new Map<
      string,
      {
        pa: string;
        paNome: string;
        orgaos: Set<string>;
        pauta: string;
        tipoPA: string;
        isEmenda: boolean;
        totalAtualizado: number;
        totalEmpenhado: number;
      }
    >();
    for (const l of todas) {
      let item = mapa.get(l.pa);
      if (!item) {
        item = {
          pa: l.pa,
          paNome: l.paNome,
          orgaos: new Set(),
          pauta: pautaDe(l),
          tipoPA: isEmenda(l.pa) ? "Emenda ao orçamento" : l.tipoPA,
          isEmenda: isEmenda(l.pa),
          totalAtualizado: 0,
          totalEmpenhado: 0,
        };
        mapa.set(l.pa, item);
      }
      item.orgaos.add(l.orgao);
      item.totalAtualizado += l.atualizado;
      item.totalEmpenhado += l.empenhado;
    }
    return [...mapa.values()]
      .map((item) => ({
        ...item,
        orgao: [...item.orgaos].sort().join(", "),
        orgaos: [...item.orgaos].sort(),
      }))
      .sort((a, b) => a.pa.localeCompare(b.pa));
  }, [todas]);

  // Projetos/Atividades filtrados pelo órgão selecionado e opção de emenda
  const pasDisponiveis = useMemo(() => {
    return todosPAs.filter(
      (item) =>
        (orgaos.length === 0 || item.orgaos.some((o) => orgaos.includes(o))) &&
        (!somenteEmendas || item.isEmenda),
    );
  }, [todosPAs, orgaos, somenteEmendas]);

  // Projetos/Atividades filtrados pela busca textual (código ou nome)
  const pasBuscados = useMemo(() => {
    if (!buscaPA.trim()) return pasDisponiveis;
    const termo = buscaPA.toLowerCase().trim();
    return pasDisponiveis.filter(
      (item) =>
        item.pa.toLowerCase().includes(termo) ||
        item.paNome.toLowerCase().includes(termo) ||
        item.pauta.toLowerCase().includes(termo) ||
        item.orgaos.some((o) => o.toLowerCase().includes(termo)),
    );
  }, [pasDisponiveis, buscaPA]);

  // Mapeamento completo e único de todas as Políticas Públicas disponíveis
  const todasPautas = useMemo(() => {
    const mapa = new Map<
      string,
      { pauta: string; pas: Set<string>; orgaos: Set<string>; totalAtualizado: number; totalEmpenhado: number }
    >();
    for (const l of todas) {
      const p = pautaDe(l);
      let item = mapa.get(p);
      if (!item) {
        item = {
          pauta: p,
          pas: new Set(),
          orgaos: new Set(),
          totalAtualizado: 0,
          totalEmpenhado: 0,
        };
        mapa.set(p, item);
      }
      item.pas.add(l.pa);
      item.orgaos.add(l.orgao);
      item.totalAtualizado += l.atualizado;
      item.totalEmpenhado += l.empenhado;
    }
    return [...mapa.values()]
      .map((item) => ({
        pauta: item.pauta,
        qtdPAs: item.pas.size,
        orgaos: [...item.orgaos].sort(),
        totalAtualizado: item.totalAtualizado,
        totalEmpenhado: item.totalEmpenhado,
      }))
      .sort((a, b) => a.pauta.localeCompare(b.pauta, "pt-BR"));
  }, [todas]);

  // Políticas públicas filtradas pelo órgão selecionado
  const pautasDisponiveis = useMemo(() => {
    return todasPautas.filter(
      (item) => orgaos.length === 0 || item.orgaos.some((o) => orgaos.includes(o)),
    );
  }, [todasPautas, orgaos]);

  // Políticas públicas filtradas pela busca textual
  const pautasBuscadas = useMemo(() => {
    if (!buscaPauta.trim()) return pautasDisponiveis;
    const termo = buscaPauta.toLowerCase().trim();
    return pautasDisponiveis.filter(
      (item) =>
        item.pauta.toLowerCase().includes(termo) ||
        item.orgaos.some((o) => o.toLowerCase().includes(termo)),
    );
  }, [pautasDisponiveis, buscaPauta]);

  // Emendas recebidas identificadas na base de execução orçamentária (TXT_VINC_PMSP)
  const recebidasExec = useMemo(
    () => todas.filter((l) => /emendas?\s+parlamentar/i.test(l.vincPmsp || "")),
    [todas],
  );

  // Políticas atendidas por emendas recebidas
  const pautasDasRecebidas = useMemo(
    () => new Set(recebidasExec.map((l) => pautaDe(l))),
    [recebidasExec],
  );

  // Filtragem das linhas da execução orçamentária
  const rows: Linha[] = useMemo(
    () =>
      todas.filter(
        (l) =>
          (orgaos.length === 0 || orgaos.includes(l.orgao)) &&
          (anos.length === 0 ||
            (l.ano !== undefined
              ? anos.includes(l.ano)
              : data?.exercicio
                ? anos.includes(data.exercicio)
                : true)) &&
          (meses.length === 0 ||
            (l.mes !== undefined &&
              l.mes !== null &&
              (typeof l.mes === "number" ? meses.includes(l.mes) : meses.includes(Number(l.mes))))) &&
          (pas.length === 0 || pas.includes(l.pa)) &&
          (pautas.length === 0 || pautas.includes(pautaDe(l))) &&
          (!somenteEmendas || isEmenda(l.pa)) &&
          (!somenteRecebidas || pautasDasRecebidas.has(pautaDe(l))),
      ),
    [todas, orgaos, anos, meses, pas, pautas, somenteEmendas, somenteRecebidas, pautasDasRecebidas, data?.exercicio],
  );


  // Resumo analítico e estatísticas de Emendas Parlamentares (projetos 9xxx)
  // Usa `rows` (já filtradas por órgão/ano/mês) para respeitar os filtros ativos
  const resumoEmendas = useMemo(() => {
    const emendasFiltradas = rows.filter((l) => isEmenda(l.pa));
    const totalInicial = emendasFiltradas.reduce((acc, l) => acc + l.inicial, 0);
    const totalAtualizado = emendasFiltradas.reduce((acc, l) => acc + l.atualizado, 0);
    const totalEmpenhado = emendasFiltradas.reduce((acc, l) => acc + l.empenhado, 0);
    const totalLiquidado = emendasFiltradas.reduce((acc, l) => acc + l.liquidado, 0);
    const totalPago = emendasFiltradas.reduce((acc, l) => acc + l.pago, 0);
    const totalSaldo = emendasFiltradas.reduce((acc, l) => acc + l.saldo, 0);
    const pctExec = totalAtualizado > 0 ? (totalEmpenhado / totalAtualizado) * 100 : 0;
    const pctPago = totalEmpenhado > 0 ? (totalPago / totalEmpenhado) * 100 : 0;

    // Agrupamento por órgão
    const mapaOrgaos = new Map<
      string,
      { orgao: string; qtdPAs: Set<string>; inicial: number; atualizado: number; empenhado: number; liquidado: number; pago: number; saldo: number; detalhes: Map<string, { pa: string; descricao: string; atualizado: number; empenhado: number; pago: number }>; }
    >();
    for (const l of emendasFiltradas) {
      let atual = mapaOrgaos.get(l.orgao);
      if (!atual) { atual = { orgao: l.orgao, qtdPAs: new Set<string>(), inicial: 0, atualizado: 0, empenhado: 0, liquidado: 0, pago: 0, saldo: 0, detalhes: new Map() }; mapaOrgaos.set(l.orgao, atual); }
      atual.qtdPAs.add(l.pa); atual.inicial += l.inicial; atual.atualizado += l.atualizado; atual.empenhado += l.empenhado; atual.liquidado += l.liquidado; atual.pago += l.pago; atual.saldo += l.saldo;
      let det = atual.detalhes.get(l.pa);
      if (!det) { det = { pa: l.pa, descricao: l.paNome ?? "", atualizado: 0, empenhado: 0, pago: 0 }; atual.detalhes.set(l.pa, det); }
      det.atualizado += l.atualizado; det.empenhado += l.empenhado; det.pago += l.pago;
    }
    const porOrgao = [...mapaOrgaos.values()].map((item) => ({ ...item, qtd: item.qtdPAs.size, pas: [...item.qtdPAs].sort(), paDetalhes: [...item.detalhes.values()].sort((a, b) => b.empenhado - a.empenhado || b.atualizado - a.atualizado), pctExec: item.atualizado > 0 ? (item.empenhado / item.atualizado) * 100 : 0, pctPago: item.empenhado > 0 ? (item.pago / item.empenhado) * 100 : 0 })).sort((a, b) => b.atualizado - a.atualizado);


    // Agrupamento por Cd_AnoExecucao (para mostrar separado quando há múltiplos anos)
    const mapaAnos = new Map<
      number,
      { ano: number; qtdPAs: Set<string>; inicial: number; atualizado: number; empenhado: number; liquidado: number; pago: number; saldo: number; }
    >();
    for (const l of emendasFiltradas) {
      const anoKey = typeof l.ano === "number" && l.ano > 0 ? l.ano : (data?.exercicio ?? 0);
      let atualAno = mapaAnos.get(anoKey);
      if (!atualAno) { atualAno = { ano: anoKey, qtdPAs: new Set<string>(), inicial: 0, atualizado: 0, empenhado: 0, liquidado: 0, pago: 0, saldo: 0 }; mapaAnos.set(anoKey, atualAno); }
      atualAno.qtdPAs.add(l.pa); atualAno.inicial += l.inicial; atualAno.atualizado += l.atualizado; atualAno.empenhado += l.empenhado; atualAno.liquidado += l.liquidado; atualAno.pago += l.pago; atualAno.saldo += l.saldo;
    }
    const porAno = [...mapaAnos.values()]
      .map((item) => ({ ...item, qtd: item.qtdPAs.size, pas: [...item.qtdPAs].sort(), pctExec: item.atualizado > 0 ? (item.empenhado / item.atualizado) * 100 : 0, pctPago: item.empenhado > 0 ? (item.pago / item.empenhado) * 100 : 0 }))
      .sort((a, b) => b.ano - a.ano);

    return { qtdTotalPAs: new Set(emendasFiltradas.map((l) => l.pa)).size, totalLinhas: emendasFiltradas.length, inicial: totalInicial, atualizado: totalAtualizado, empenhado: totalEmpenhado, liquidado: totalLiquidado, pago: totalPago, saldo: totalSaldo, pctExec, pctPago, porOrgao, porAno };
  }, [rows, data?.exercicio]);

  // Emendas recebidas convertidas para o formato de detalhamento (uma linha da execução = uma emenda)
  const recebidasDetalhe = useMemo(
    () =>
      recebidasExec.map((l) => {
        const parlamentar =
          (l.vincPmsp || "")
            .replace(/emendas?\s+parlamentar(es)?/gi, "")
            .replace(/^[\s\-–—:/|]+/, "")
            .replace(/[\s\-–—:/|]+$/, "")
            .trim() || "Não identificado";
        return {
          orgao: l.orgao,
          empenho: l.rubrica,
          data: "",
          processo: l.pa,
          coordenacao: "",
          politica: pautaDe(l),
          acao: l.paNome,
          elemento: l.rubrica,
          elementoNome: l.rubricaNome,
          fonte: l.fonte,
          fonteRecurso: l.vincPmsp ?? "",
          situacao: "",
          fornecedor: parlamentar,
          objeto: `${l.pa} — ${l.paNome}`,
          empenhado: l.empenhado,
          liquidado: l.liquidado,
          pago: l.pago,
        } as Empenho;
      }),
    [recebidasExec],
  );

  // Resumo analítico de Emendas Parlamentares Recebidas (base de execução orçamentária)
  const resumoEmendasRecebidas = useMemo(() => {
    const recebidas = recebidasDetalhe;
    const totalEmpenhado = recebidas.reduce((acc, e) => acc + e.empenhado, 0);
    const totalLiquidado = recebidas.reduce((acc, e) => acc + e.liquidado, 0);
    const totalPago = recebidas.reduce((acc, e) => acc + e.pago, 0);
    const pctPago = totalEmpenhado > 0 ? (totalPago / totalEmpenhado) * 100 : 0;

    // Agrupamento por órgão
    const mapaOrgaos = new Map<
      string,
      { orgao: string; qtdEmpenhos: number; processos: Set<string>; fornecedores: Set<string>; empenhado: number; liquidado: number; pago: number; projetos: Map<string, { objeto: string; empenhado: number; liquidado: number; pago: number }>; }
    >();
    for (const e of recebidas) {
      let atual = mapaOrgaos.get(e.orgao);
      if (!atual) { atual = { orgao: e.orgao, qtdEmpenhos: 0, processos: new Set<string>(), fornecedores: new Set<string>(), empenhado: 0, liquidado: 0, pago: 0, projetos: new Map() }; mapaOrgaos.set(e.orgao, atual); }
      atual.qtdEmpenhos++;
      atual.processos.add(e.processo || e.empenho);
      atual.fornecedores.add(e.fornecedor);
      atual.empenhado += e.empenhado;
      atual.liquidado += e.liquidado;
      atual.pago += e.pago;
      // Agrupa por fornecedor dentro do órgão
      const chave = e.fornecedor;
      let proj = atual.projetos.get(chave);
      if (!proj) { proj = { objeto: e.objeto, empenhado: 0, liquidado: 0, pago: 0 }; atual.projetos.set(chave, proj); }
      proj.empenhado += e.empenhado; proj.liquidado += e.liquidado; proj.pago += e.pago;
    }
    const porOrgao = [...mapaOrgaos.values()].map((item) => ({
      ...item,
      qtdProcessos: item.processos.size,
      qtdFornecedores: item.fornecedores.size,
      top5: [...item.projetos.entries()].map(([forn, v]) => ({ forn, ...v })).sort((a, b) => b.empenhado - a.empenhado).slice(0, 5),
      pctPago: item.empenhado > 0 ? (item.pago / item.empenhado) * 100 : 0,
    })).sort((a, b) => b.empenhado - a.empenhado);

    // Cada linha da base é contabilizada como uma emenda (nomes podem repetir)
    const qtdEmendas = recebidas.length;

    return { total: qtdEmendas, qtdEmpenhos: recebidas.length, empenhado: totalEmpenhado, liquidado: totalLiquidado, pago: totalPago, pctPago, porOrgao };

  }, [recebidasDetalhe]);

  // Mapeamento completo de todos os Fornecedores/Credores únicos a partir dos empenhos (com dotação/elemento)
  type ItemFornecedor = {
    fornecedor: string;
    orgaos: string[];
    politicas: string[];
    elementos: string[];
    elementosNomes: string[];
    qtdEmpenhos: number;
    empenhado: number;
    liquidado: number;
    pago: number;
  };

  const todosFornecedores = useMemo<ItemFornecedor[]>(() => {
    const lista = baseEmpenhos?.rows ?? [];
    const mapa = new Map<
      string,
      {
        orgaos: Set<string>;
        politicas: Set<string>;
        elementos: Set<string>;
        elementosNomes: Set<string>;
        qtdEmpenhos: number;
        empenhado: number;
        liquidado: number;
        pago: number;
      }
    >();
    for (const e of lista) {
      const atual = mapa.get(e.fornecedor) ?? {
        orgaos: new Set(),
        politicas: new Set(),
        elementos: new Set(),
        elementosNomes: new Set(),
        qtdEmpenhos: 0,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
      };
      atual.orgaos.add(e.orgao);
      atual.politicas.add(e.politica);
      if (e.elemento) atual.elementos.add(e.elemento);
      if (e.elementoNome) atual.elementosNomes.add(e.elementoNome);
      atual.qtdEmpenhos += 1;
      atual.empenhado += e.empenhado;
      atual.liquidado += e.liquidado;
      atual.pago += e.pago;
      mapa.set(e.fornecedor, atual);
    }
    return [...mapa.entries()]
      .map(([fornecedor, v]) => ({
        fornecedor,
        orgaos: [...v.orgaos].sort(),
        politicas: [...v.politicas].sort(),
        elementos: [...v.elementos].sort(),
        elementosNomes: [...v.elementosNomes].sort(),
        qtdEmpenhos: v.qtdEmpenhos,
        empenhado: v.empenhado,
        liquidado: v.liquidado,
        pago: v.pago,
      }))
      .sort((a, b) => b.empenhado - a.empenhado);
  }, [baseEmpenhos]);


  // Fornecedores filtrados por órgão selecionado
  // (filtragem por política/PA é feita abaixo, após pautasAtivas ser declarado)
  const fornecedoresDisponiveis = useMemo(() => {
    return todosFornecedores.filter(
      (item) => orgaos.length === 0 || item.orgaos.some((o) => orgaos.includes(o)),
    );
  }, [todosFornecedores, orgaos]);




  // Pautas ativas para filtrar os empenhos correspondentes
  const pautasAtivas = useMemo(() => {
    if (pautas.length > 0) return pautas;
    if (pas.length > 0) return [...new Set(rows.map((r) => pautaDe(r)))];
    return [];
  }, [pautas, pas, rows]);

  const empenhos: Empenho[] = useMemo(() => {
    const lista = baseEmpenhos?.rows ?? [];
    return lista.filter((e) => {
      const matchOrgao = orgaos.length === 0 || orgaos.includes(e.orgao);
      const matchPauta =
        pautasAtivas.length === 0 ||
        pautasAtivas.includes(politicaEquivalente(e.politica));
      const matchForn =
        fornsSelecionados.length === 0 || fornsSelecionados.includes(e.fornecedor);

      if (!matchOrgao || !matchPauta || !matchForn) return false;

      if (somenteRecebidas && !isEmendaRecebidaEmpenho(e)) return false;

      // Regra para PA 2106 vs PA 2100:
      // PA 2106: Somente custos de estágio (não há fornecedores de empresas em 33903900 da 2106)
      // PA 2100: Administração da Unidade (contratos da administração)
      if (pas.length > 0) {
        if (pas.includes("2106") && !pas.includes("2100")) {
          if (!isEstagioEmpenho(e)) return false;
        }
        if (pas.includes("2100") && !pas.includes("2106")) {
          if (isEstagioEmpenho(e)) return false;
        }
      }

      return true;
    });
  }, [baseEmpenhos, orgaos, pautasAtivas, fornsSelecionados, pas, somenteRecebidas]);


  // Conjunto de fornecedores que aparecem nos empenhos DEPOIS do filtro de política/PA/órgão
  // Quando o usuário seleciona uma política ou PA, só exibimos fornecedores daquele recorte.
  const fornecedoresDosEmpenhosFiltrados = useMemo(() => {
    const lista = baseEmpenhos?.rows ?? [];
    const temFiltroContextual = orgaos.length > 0 || pas.length > 0 || pautas.length > 0;
    if (!temFiltroContextual) return null; // null = sem restrição
    const nomes = new Set<string>();
    for (const e of lista) {
      const matchOrgao = orgaos.length === 0 || orgaos.includes(e.orgao);
      const matchPauta = pautasAtivas.length === 0 || pautasAtivas.includes(politicaEquivalente(e.politica));
      if (!matchOrgao || !matchPauta) continue;

      if (pas.length > 0) {
        if (pas.includes("2106") && !pas.includes("2100")) {
          if (!isEstagioEmpenho(e)) continue;
        }
        if (pas.includes("2100") && !pas.includes("2106")) {
          if (isEstagioEmpenho(e)) continue;
        }
      }

      nomes.add(e.fornecedor);
    }
    return nomes;
  }, [baseEmpenhos, orgaos, pautasAtivas, pas]);

  // Substitui a lista de fornecedores disponíveis pelo subconjunto filtrado (se houver recorte ativo)
  const fornecedoresDisponiveisComContexto = useMemo(() => {
    if (fornecedoresDosEmpenhosFiltrados === null) return fornecedoresDisponiveis;
    return fornecedoresDisponiveis.filter((item) =>
      fornecedoresDosEmpenhosFiltrados.has(item.fornecedor),
    );
  }, [fornecedoresDisponiveis, fornecedoresDosEmpenhosFiltrados]);

  // Fornecedores filtrados pela busca textual (Nome, Código de Dotação/Elemento ou Tipo de Despesa)
  // Agora declarado após pautasAtivas + fornecedoresDisponiveisComContexto para evitar use-before-define
  const fornecedoresBuscados = useMemo(() => {
    const base = fornecedoresDisponiveisComContexto;
    if (!buscaFornecedor.trim()) return base;
    const termo = buscaFornecedor.toLowerCase().trim();
    const termoNumerico = termo.replace(/\D/g, "");
    return base.filter((item) => {
      const matchNome = item.fornecedor.toLowerCase().includes(termo);
      const matchPolitica = item.politicas.some((p) => p.toLowerCase().includes(termo));
      const matchOrgao = item.orgaos.some((o) => o.toLowerCase().includes(termo));
      const matchElemento = item.elementos.some((el) => {
        const elLimpo = el.toLowerCase();
        if (elLimpo.includes(termo)) return true;
        if (termoNumerico.length >= 3 && el.replace(/\D/g, "").includes(termoNumerico)) return true;
        return false;
      });
      const matchElementoNome = item.elementosNomes.some((eln) => eln.toLowerCase().includes(termo));
      return matchNome || matchPolitica || matchOrgao || matchElemento || matchElementoNome;
    });
  }, [fornecedoresDisponiveisComContexto, buscaFornecedor]);

  const total = useMemo(() => totalizar(rows), [rows]);

  const totaisPorTipo = useMemo(() => {
    const res = {
      atividades: { inicial: 0, atualizado: 0, empenhado: 0, pago: 0, congelado: 0, saldo: 0 },
      folha: { inicial: 0, atualizado: 0, empenhado: 0, pago: 0, congelado: 0, saldo: 0 },
      emendas: { inicial: 0, atualizado: 0, empenhado: 0, pago: 0, congelado: 0, saldo: 0 },
      emendasRecebidas: { inicial: 0, atualizado: 0, empenhado: 0, pago: 0, congelado: 0, saldo: 0 },
    };
    for (const l of rows) {
      const tipo = tipoDespesaDe(l);
      const chave =
        tipo === "Emendas Recebidas"
          ? "emendasRecebidas"
          : tipo === "Emendas"
            ? "emendas"
            : tipo === "Folha de Pagamento"
              ? "folha"
              : "atividades";
      res[chave].inicial += l.inicial;
      res[chave].atualizado += l.atualizado;
      res[chave].empenhado += l.empenhado;
      res[chave].pago += l.pago;
      res[chave].congelado += l.congelado;
      res[chave].saldo += l.saldo;
    }
    return res;
  }, [rows]);

  const agregados = useMemo(() => {
    if (visao === "orgao")
      return agrupar(rows, (l) => ({ chave: l.orgao, rotulo: l.orgao, sub: l.orgaoNome }));
    if (visao === "projeto")
      return agrupar(rows, (l) => ({
        chave: `${l.orgao}-${l.pa}`,
        rotulo: `${l.pa} - ${l.paNome}`,
        sub: isEmenda(l.pa) ? "Emenda ao orçamento" : `${l.orgao} • ${l.tipoPA}`,
      }));
    return agrupar(rows, (l) => ({ chave: pautaDe(l), rotulo: pautaDe(l) }));
  }, [rows, visao]);

  const dadosGrafico = useMemo<Record<string, string | number>[]>(
    () =>
      agregados.slice(0, 12).map((a) => ({
        nome: a.rotulo.length > 34 ? `${a.rotulo.slice(0, 32)}…` : a.rotulo,
        Inicial: Math.round(a.inicial),
        Atualizado: Math.round(a.atualizado),
        Empenhado: Math.round(a.empenhado),
      })),
    [agregados],
  );

  /* ----- Seleção de emendas (parlamentares e/ou recebidas) ----- */
  const emendaSelecionada = somenteEmendas || somenteRecebidas;

  // Emendas parlamentares (dotação 9xxx) já filtradas pelos demais filtros
  const listaEmendasDotacao = useMemo(() => {
    if (!somenteEmendas) return [];
    return agrupar(
      rows.filter((l) => isEmenda(l.pa)),
      (l) => ({ chave: `${l.orgao}-${l.pa}`, rotulo: `${l.pa} — ${l.paNome}`, sub: l.orgao }),
    );
  }, [rows, somenteEmendas]);

  // Emendas recebidas (empenhos com "Emenda Parlamentar" no objeto), já filtradas
  const listaEmendasRecebidas = useMemo(() => {
    if (!somenteRecebidas) return [];
    return recebidasDetalhe
      .filter(
        (e) =>
          (orgaos.length === 0 || orgaos.includes(e.orgao)) &&
          (pautasAtivas.length === 0 || pautasAtivas.includes(politicaEquivalente(e.politica))) &&
          (pas.length === 0 || pas.includes(e.processo)),
      )
      .sort((a, b) => b.empenhado - a.empenhado);
  }, [recebidasDetalhe, somenteRecebidas, orgaos, pautasAtivas, pas]);

  // Gráfico específico para emendas recebidas (top 12 beneficiários)
  const dadosGraficoRecebidas = useMemo<Record<string, string | number>[]>(() => {
    const mapa = new Map<string, { Empenhado: number; Liquidado: number; Pago: number }>();
    for (const e of listaEmendasRecebidas) {
      const atual = mapa.get(e.fornecedor) ?? { Empenhado: 0, Liquidado: 0, Pago: 0 };
      atual.Empenhado += e.empenhado;
      atual.Liquidado += e.liquidado;
      atual.Pago += e.pago;
      mapa.set(e.fornecedor, atual);
    }
    return [...mapa.entries()]
      .map(([nome, v]) => ({
        nome: nome.length > 34 ? `${nome.slice(0, 32)}…` : nome,
        Empenhado: Math.round(v.Empenhado),
        Liquidado: Math.round(v.Liquidado),
        Pago: Math.round(v.Pago),
      }))
      .sort((a, b) => b.Empenhado - a.Empenhado)
      .slice(0, 12);
  }, [listaEmendasRecebidas]);



  const toggle = <T,>(lista: T[], set: (v: T[]) => void, valor: T) =>
    set(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);

  const togglePA = (codigoPA: string) => {
    setPas((atuais) =>
      atuais.includes(codigoPA) ? atuais.filter((p) => p !== codigoPA) : [...atuais, codigoPA],
    );
  };

  const isolarPA = (codigoPA: string) => {
    setPas([codigoPA]);
  };

  const limparPAs = () => {
    setPas([]);
    setBuscaPA("");
  };

  const togglePauta = (nomePauta: string) => {
    setPautas((atuais) =>
      atuais.includes(nomePauta) ? atuais.filter((p) => p !== nomePauta) : [...atuais, nomePauta],
    );
  };

  const isolarPauta = (nomePauta: string) => {
    setPautas([nomePauta]);
    setPas([]); // Limpa PA para focar na política inteira
  };

  const limparPautas = () => {
    setPautas([]);
    setBuscaPauta("");
  };

  function exportar() {
    const grafico = graficoParaCanvas(dadosGrafico);
    const nomesPAsSelecionados = pas.map((codigo) => {
      const item = todosPAs.find((p) => p.pa === codigo);
      return item ? `${codigo} - ${item.paNome}` : codigo;
    });

    gerarRelatorioPdf({
      rows,
      empenhos,
      parametro,
      orgaosSelecionados: orgaos.length ? orgaos : orgaosDisponiveis,
      pautasSelecionadas: pautas,
      pasSelecionados: nomesPAsSelecionados,
      fornecedoresSelecionados: fornsSelecionados,
      fonteDados: data?.fonteDados ?? "—",
      fonteEmpenhos: baseEmpenhos?.fonteDados ?? "—",
      exercicio: data?.exercicio ?? 2026,
      ...(grafico ? { grafico } : {}),
    });
  }

  function exportarOrgao() {
    gerarRelatorioOrgaoPdf({
      rows,
      empenhos,
      parametro,
      orgaosSelecionados: orgaos.length ? orgaos : orgaosDisponiveis,
      fonteDados: data?.fonteDados ?? "—",
      exercicio: data?.exercicio ?? 2026,
    });
  }

  const toggleFornecedor = (nome: string) => {
    setFornsSelecionados((atuais) =>
      atuais.includes(nome) ? atuais.filter((f) => f !== nome) : [...atuais, nome],
    );
  };

  const isolarFornecedor = (nome: string) => {
    setFornsSelecionados([nome]);
  };

  const limparFornecedores = () => {
    setFornsSelecionados([]);
    setBuscaFornecedor("");
  };

  const mostrarInicial = parametro !== "atualizado";
  const mostrarAtualizado = parametro !== "inicial";

  const paIsoladoInfo = pas.length === 1 ? todosPAs.find((p) => p.pa === pas[0]) : null;
  const pautaIsoladaInfo =
    pautas.length === 1 && pas.length === 0
      ? todasPautas.find((p) => p.pauta === pautas[0])
      : null;
  const fornecedorIsoladoInfo =
    fornsSelecionados.length === 1
      ? todosFornecedores.find((f) => f.fornecedor === fornsSelecionados[0])
      : null;
  const empenhosFornecedorIsolado = fornecedorIsoladoInfo
    ? (baseEmpenhos?.rows ?? []).filter((e) => e.fornecedor === fornecedorIsoladoInfo.fornecedor)
    : [];
  const pctPagoFornecedor = fornecedorIsoladoInfo && fornecedorIsoladoInfo.empenhado > 0
    ? (fornecedorIsoladoInfo.pago / fornecedorIsoladoInfo.empenhado) * 100
    : 0;

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto max-w-[1400px] px-6 py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            Prefeitura de São Paulo · Painel Executivo
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold">
            Painel Execução Orçamentária {data?.exercicio ?? 2026}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/80">
            SMDHC · FAASP · FUMCAD · FMID — por órgão, política pública e projeto/atividade
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-primary-foreground/80">
            <Badge variant="secondary">Dotação: {data?.fonteDados ?? "carregando…"}</Badge>
            <Badge variant="secondary">
              Empenhos: {baseEmpenhos?.fonteDados ?? "carregando…"}
            </Badge>
            <span>Extração: {formatarDataBR(data?.extracao)}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                refetch();
                refetchEmpenhos();
              }}
              disabled={isFetching}
              className="h-7"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Recarregar
            </Button>
            <Button size="sm" variant="accent" onClick={exportar} className="h-7">
              <FileDown className="size-3.5" />
              Exportar relatório PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={exportarOrgao} className="h-7 border border-white/30 bg-white/15 text-white hover:bg-white/25">
              <FileDown className="size-3.5" />
              Relatório por Órgão PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
        {/* Banner de Pesquisa Isolada Ativa de PA */}
        {paIsoladoInfo && (
          <div className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/10 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="rounded-full bg-primary p-2 text-primary-foreground">
                <Crosshair className="size-4 shrink-0" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Pesquisa Isolada de Projeto
                  </span>
                  <Badge variant="default" className="text-xs font-mono">
                    PA {paIsoladoInfo.pa}
                  </Badge>
                  {paIsoladoInfo.isEmenda && (
                    <Badge variant="secondary" className="text-xs">
                      Emenda Parlamentar
                    </Badge>
                  )}
                </div>
                <p className="font-heading font-semibold text-foreground">
                  {paIsoladoInfo.paNome}
                </p>
                <p className="text-xs text-muted-foreground">
                  Órgão: <strong className="text-foreground">{paIsoladoInfo.orgao}</strong> ·
                  Política: <strong className="text-foreground">{paIsoladoInfo.pauta}</strong>
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={limparPAs}
              className="h-8 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <X className="size-3.5" />
              Ver todos os projetos
            </Button>
          </div>
        )}

        {/* Banner de Pesquisa Isolada Ativa de Política Pública */}
        {pautaIsoladaInfo && (
          <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="rounded-full bg-emerald-700 p-2 text-white">
                <Crosshair className="size-4 shrink-0" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Pesquisa Isolada de Política Pública
                  </span>
                  <Badge variant="default" className="bg-emerald-700 text-white text-xs">
                    {pautaIsoladaInfo.qtdPAs} projeto(s) vinculados
                  </Badge>
                </div>
                <p className="font-heading font-semibold text-foreground">
                  {pautaIsoladaInfo.pauta}
                </p>
                <p className="text-xs text-muted-foreground">
                  Órgão(s): <strong className="text-foreground">{pautaIsoladaInfo.orgaos.join(", ")}</strong> ·
                  Orçamento atualizado total: <strong className="text-foreground">{fmtMoeda(pautaIsoladaInfo.totalAtualizado)}</strong>
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={limparPautas}
              className="h-8 border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-700 hover:text-white"
            >
              <X className="size-3.5" />
              Ver todas as políticas
            </Button>
          </div>
        )}

        {/* Banner de Pesquisa Isolada Ativa de Fornecedor / Credor */}
        {fornecedorIsoladoInfo && (
          <div className="flex flex-col gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="rounded-full bg-indigo-700 p-2 text-white">
                <Building2 className="size-4 shrink-0" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                    Pesquisa Isolada de Fornecedor / Credor
                  </span>
                  <Badge variant="default" className="bg-indigo-700 text-white text-xs">
                    {fornecedorIsoladoInfo.qtdEmpenhos} empenho(s)
                  </Badge>
                </div>
                <p className="font-heading font-semibold text-foreground">
                  {fornecedorIsoladoInfo.fornecedor}
                </p>
                <p className="text-xs text-muted-foreground">
                  Órgão(s): <strong className="text-foreground">{fornecedorIsoladoInfo.orgaos.join(", ")}</strong> ·
                  Empenhado: <strong className="text-foreground">{fmtMoeda(fornecedorIsoladoInfo.empenhado)}</strong> ·
                  Pago: <strong className="text-foreground">{fmtMoeda(fornecedorIsoladoInfo.pago)}</strong>
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={limparFornecedores}
              className="h-8 border-indigo-600/40 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-700 hover:text-white"
            >
              <X className="size-3.5" />
              Ver todos os fornecedores
            </Button>
          </div>
        )}

        {/* Card de Filtros Principal */}
        <Card className="shadow-sm">
          <CardContent className="space-y-5 p-5">
            {/* 1. Órgãos e Anos Exercícios (na mesma linha) */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Filtro de Órgãos */}
                <div className="lg:col-span-6">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Órgãos (combine livremente)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip ativo={orgaos.length === 0} onClick={() => setOrgaos([])}>
                      Todos
                    </Chip>
                    {orgaosDisponiveis.map((o) => (
                      <Chip
                        key={o}
                        ativo={orgaos.includes(o)}
                        onClick={() => toggle(orgaos, setOrgaos, o)}
                      >
                        {o}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Filtro de Anos Exercícios (2026 a 2020) na mesma linha */}
                <div className="lg:col-span-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ano Exercício (Execução Anual · 2026 a 2020)
                    </p>
                    {anos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAnos([])}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Limpar ano
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Chip ativo={anos.length === 0} onClick={() => setAnos([])}>
                      Todos
                    </Chip>
                    {ANOS_EXERCICIO.map((ano) => {
                      const temDado = anosComDados.has(ano);
                      return (
                        <Chip
                          key={ano}
                          ativo={anos.includes(ano)}
                          onClick={() => toggle(anos, setAnos, ano)}
                          className={!temDado ? "opacity-60 border-dashed" : ""}
                          title={temDado ? `Exercício ${ano} disponível` : `Exercício ${ano} sem registros na planilha carregada`}
                        >
                          {ano}
                          {!temDado && <span className="ml-1 text-[9px] text-muted-foreground">(0)</span>}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mês da Execução do Exercício (Abaixo da linha de Órgãos e Anos) */}
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                      Mês da Execução do Exercício
                    </p>
                  </div>
                  {meses.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setMeses([])}
                    >
                      <X className="mr-1 size-3" /> Limpar mês
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Chip ativo={meses.length === 0} onClick={() => setMeses([])}>
                    Todos os meses
                  </Chip>
                  {MESES_EXERCICIO.map((m) => {
                    const temDado = mesesComDados.has(m.numero);
                    return (
                      <Chip
                        key={m.numero}
                        ativo={meses.includes(m.numero)}
                        onClick={() => toggle(meses, setMeses, m.numero)}
                        className={!temDado && mesesComDados.size > 0 ? "opacity-60 border-dashed" : ""}
                        title={temDado ? `Mês ${m.nome}` : `Mês ${m.nome} sem registros`}
                      >
                        {m.rotulo}
                      </Chip>
                    );
                  })}
                </div>
                {mesesComDados.size === 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground/80">
                    💡 <em>A base atual possui o total acumulado do ano de 2026. Ao importar a planilha de execução com a coluna <strong>Cd_MesExecucao</strong>, cada mês será filtrado individualmente.</em>
                  </p>
                )}
              </div>

              {/* KPIs Executivos — Informações do Orçamento */}
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <Kpi
                  rotulo="Orçamento inicial"
                  valor={fmtMoeda(total.inicial)}
                  despesas={{
                    atividades: totaisPorTipo.atividades.inicial,
                    folha: totaisPorTipo.folha.inicial,
                    emendas: totaisPorTipo.emendas.inicial,
                    emendasRecebidas: totaisPorTipo.emendasRecebidas.inicial,
                  }}
                  detalhe={
                    <div className="flex items-center justify-between font-medium">
                      <span>Proporção base:</span>
                      <span className="font-semibold text-foreground tabular-nums">100%</span>
                    </div>
                  }
                />
                <Kpi
                  rotulo="Orçamento atualizado"
                  valor={fmtMoeda(total.atualizado)}
                  despesas={{
                    atividades: totaisPorTipo.atividades.atualizado,
                    folha: totaisPorTipo.folha.atualizado,
                    emendas: totaisPorTipo.emendas.atualizado,
                    emendasRecebidas: totaisPorTipo.emendasRecebidas.atualizado,
                  }}
                  detalhe={
                    <div className="flex items-center justify-between font-medium">
                      <span>Aumento s/ inicial:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {total.inicial > 0 ? fmtPct((total.atualizado / total.inicial) * 100) : "100%"}
                      </span>
                    </div>
                  }
                />
                <Kpi
                  rotulo="Empenhado"
                  valor={fmtMoeda(total.empenhado)}
                  despesas={{
                    atividades: totaisPorTipo.atividades.empenhado,
                    folha: totaisPorTipo.folha.empenhado,
                    emendas: totaisPorTipo.emendas.empenhado,
                    emendasRecebidas: totaisPorTipo.emendasRecebidas.empenhado,
                  }}
                  detalhe={
                    <div className="flex items-center justify-between font-medium">
                      <span>Executado s/ atualizado:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {total.atualizado > 0 ? fmtPct((total.empenhado / total.atualizado) * 100) : "0,0%"}
                      </span>
                    </div>
                  }
                />
                <Kpi
                  rotulo="Pago"
                  valor={fmtMoeda(total.pago)}
                  despesas={{
                    atividades: totaisPorTipo.atividades.pago,
                    folha: totaisPorTipo.folha.pago,
                    emendas: totaisPorTipo.emendas.pago,
                    emendasRecebidas: totaisPorTipo.emendasRecebidas.pago,
                  }}
                  detalhe={
                    <div className="flex items-center justify-between font-medium">
                      <span>Pago s/ atualizado:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                        {total.atualizado > 0 ? fmtPct((total.pago / total.atualizado) * 100) : "0,0%"}
                      </span>
                    </div>
                  }
                />
                <Kpi
                  rotulo="Congelado / descongelado"
                  valor={fmtMoeda(total.congelado)}
                  despesas={{
                    atividades: totaisPorTipo.atividades.congelado,
                    folha: totaisPorTipo.folha.congelado,
                    emendas: totaisPorTipo.emendas.congelado,
                    emendasRecebidas: totaisPorTipo.emendasRecebidas.congelado,
                  }}
                  linhasDetalhe={[`Descongelado: ${fmtMoeda(total.descongelado)}`]}
                />
                <Kpi
                  rotulo="Saldo de dotação"
                  valor={fmtMoeda(total.saldo)}
                  despesas={{
                    atividades: totaisPorTipo.atividades.saldo,
                    folha: totaisPorTipo.folha.saldo,
                    emendas: totaisPorTipo.emendas.saldo,
                    emendasRecebidas: totaisPorTipo.emendasRecebidas.saldo,
                  }}
                  linhasDetalhe={
                    parametro === "ambos"
                      ? [
                          `Executado s/ inicial: ${fmtPct(total.execInicial)}`,
                          `Executado s/ atualizado: ${fmtPct(total.execAtualizado)}`,
                        ]
                      : parametro === "inicial"
                        ? [`Executado s/ inicial: ${fmtPct(total.execInicial)}`]
                        : [`Executado s/ atualizado: ${fmtPct(total.execAtualizado)}`]
                  }
                />
              </div>
            </div>

            {/* 2. Projetos / Atividades (Categorias de gastos) - ANTES DE POLÍTICAS PÚBLICAS */}
            <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                      Projetos / Atividades (Categorias de gastos · Pesquisa isolada)
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione um projeto específico para uma pesquisa isolada ou combine múltiplas categorias de gastos.
                  </p>
                </div>
                {pas.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {pas.length} {pas.length === 1 ? "projeto selecionado" : "projetos selecionados"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={limparPAs}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                      Limpar seleção
                    </Button>
                  </div>
                )}
              </div>

              {/* Barra de busca rápida de PA */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={buscaPA}
                    onChange={(e) => setBuscaPA(e.target.value)}
                    placeholder="Buscar projeto por código (ex: 4329, 2813, 2033) ou nome da ação..."
                    className="h-9 bg-card pl-9 pr-8 text-xs sm:text-sm"
                  />
                  {buscaPA && (
                    <button
                      type="button"
                      onClick={() => setBuscaPA("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      title="Limpar busca"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMostrarListaCompletaPA(!mostrarListaCompletaPA)}
                  className="h-9 shrink-0 gap-1.5 text-xs"
                >
                  <SlidersHorizontal className="size-3.5" />
                  {mostrarListaCompletaPA ? "Recolher lista" : `Explorar lista (${pasDisponiveis.length})`}
                  {mostrarListaCompletaPA ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </Button>
              </div>

              {/* Chips de PAs selecionados */}
              {pas.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Filtro ativo:</span>
                  {pas.map((codigo) => {
                    const item = todosPAs.find((p) => p.pa === codigo);
                    return (
                      <span
                        key={codigo}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary shadow-xs"
                      >
                        <strong>{codigo}</strong> - {item ? item.paNome.slice(0, 28) + (item.paNome.length > 28 ? "…" : "") : ""}
                        <button
                          type="button"
                          onClick={() => togglePA(codigo)}
                          className="rounded-full p-0.5 hover:bg-primary/20"
                          title="Remover este projeto"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Lista interativa de Projetos / Atividades */}
              {(mostrarListaCompletaPA || buscaPA.trim().length > 0) && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-border bg-card p-2">
                  {pasBuscados.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                      Nenhum projeto/atividade encontrado para "{buscaPA}".
                    </p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {pasBuscados.map((item) => {
                        const estaSelecionado = pas.includes(item.pa);
                        return (
                          <div
                            key={item.pa}
                            className={`flex flex-col justify-between rounded-md border p-2.5 transition-colors ${
                              estaSelecionado
                                ? "border-primary bg-primary/10"
                                : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-xs font-bold text-foreground">
                                  PA {item.pa}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {item.orgao}
                                  </Badge>
                                  {item.isEmenda && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0"
                                    >
                                      Emenda
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground">
                                {item.paNome}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Política: {item.pauta} · Atualizado: {fmtMoeda(item.totalAtualizado)}
                              </p>
                            </div>
                            <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-border/40 pt-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={estaSelecionado ? "default" : "outline"}
                                onClick={() => togglePA(item.pa)}
                                className="h-6 px-2 text-[11px]"
                              >
                                {estaSelecionado ? "✓ Selecionado" : "+ Selecionar"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => isolarPA(item.pa)}
                                title="Filtrar exclusivamente este projeto"
                                className="h-6 gap-1 px-2 text-[11px] hover:bg-primary hover:text-primary-foreground"
                              >
                                <Crosshair className="size-3" />
                                Isolar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Políticas públicas (Pautas temáticas) - COM O MESMO MECANISMO LIMPO */}
            <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                      Políticas Públicas (Pautas temáticas · Pesquisa isolada)
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione uma política pública específica para isolar suas ações ou combine múltiplas pautas.
                  </p>
                </div>
                {pautas.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {pautas.length} {pautas.length === 1 ? "política selecionada" : "políticas selecionadas"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={limparPautas}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                      Limpar seleção
                    </Button>
                  </div>
                )}
              </div>

              {/* Barra de busca rápida de Política Pública */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={buscaPauta}
                    onChange={(e) => setBuscaPauta(e.target.value)}
                    placeholder="Buscar política por nome (ex: Mulheres, Idoso, Alimentar, Juventude)..."
                    className="h-9 bg-card pl-9 pr-8 text-xs sm:text-sm"
                  />
                  {buscaPauta && (
                    <button
                      type="button"
                      onClick={() => setBuscaPauta("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      title="Limpar busca"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMostrarListaCompletaPauta(!mostrarListaCompletaPauta)}
                  className="h-9 shrink-0 gap-1.5 text-xs"
                >
                  <SlidersHorizontal className="size-3.5" />
                  {mostrarListaCompletaPauta ? "Recolher lista" : `Explorar lista (${pautasDisponiveis.length})`}
                  {mostrarListaCompletaPauta ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </Button>
              </div>

              {/* Chips de Políticas selecionadas */}
              {pautas.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Filtro ativo:</span>
                  {pautas.map((p) => {
                    const item = todasPautas.find((itemP) => itemP.pauta === p);
                    return (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300 shadow-xs"
                      >
                        <strong>{p}</strong> {item ? `(${item.qtdPAs} PAs)` : ""}
                        <button
                          type="button"
                          onClick={() => togglePauta(p)}
                          className="rounded-full p-0.5 hover:bg-emerald-500/20"
                          title="Remover esta política"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Lista interativa de Políticas Públicas */}
              {(mostrarListaCompletaPauta || buscaPauta.trim().length > 0) && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-border bg-card p-2">
                  {pautasBuscadas.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                      Nenhuma política pública encontrada para "{buscaPauta}".
                    </p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {pautasBuscadas.map((item) => {
                        const estaSelecionado = pautas.includes(item.pauta);
                        return (
                          <div
                            key={item.pauta}
                            className={`flex flex-col justify-between rounded-md border p-2.5 transition-colors ${
                              estaSelecionado
                                ? "border-emerald-600 bg-emerald-500/10"
                                : "border-border/70 bg-card hover:border-emerald-500/40 hover:bg-muted/30"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-heading text-xs font-bold text-foreground">
                                  {item.pauta}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] px-1.5 py-0"
                                >
                                  {item.qtdPAs} {item.qtdPAs === 1 ? "projeto" : "projetos"}
                                </Badge>
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Órgãos: {item.orgaos.join(", ")} · Atualizado: {fmtMoeda(item.totalAtualizado)}
                              </p>
                            </div>
                            <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-border/40 pt-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={estaSelecionado ? "default" : "outline"}
                                onClick={() => togglePauta(item.pauta)}
                                className={`h-6 px-2 text-[11px] ${
                                  estaSelecionado ? "bg-emerald-700 text-white hover:bg-emerald-800" : ""
                                }`}
                              >
                                {estaSelecionado ? "✓ Selecionada" : "+ Selecionar"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => isolarPauta(item.pauta)}
                                title="Filtrar exclusivamente esta política pública"
                                className="h-6 gap-1 px-2 text-[11px] hover:bg-emerald-700 hover:text-white"
                              >
                                <Crosshair className="size-3" />
                                Isolar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Fornecedor / Credor / Tipo de Dotação */}
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                      Fornecedor / Credor / Tipo de Dotação (busca por nome ou código/elemento de despesa)
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Busque pelo nome do fornecedor (ex: ÁGUA, CENTRO), código de dotação/elemento (ex: 33503900, 339039, 339030) ou tipo de despesa (ex: Sem Fins Lucrativos, Material).
                  </p>
                </div>
                {fornsSelecionados.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {fornsSelecionados.length} {fornsSelecionados.length === 1 ? "fornecedor selecionado" : "fornecedores selecionados"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={limparFornecedores}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                      Limpar seleção
                    </Button>
                  </div>
                )}
              </div>

              {/* Barra de busca rápida de Fornecedor / Dotação */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={buscaFornecedor}
                    onChange={(e) => setBuscaFornecedor(e.target.value)}
                    placeholder="Buscar por fornecedor, dotação (ex: 33503900) ou tipo de despesa..."
                    className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-8 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  {buscaFornecedor && (
                    <button
                      type="button"
                      onClick={() => setBuscaFornecedor("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      title="Limpar busca"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setMostrarListaCompletaFornecedor(!mostrarListaCompletaFornecedor)}
                  className="h-9 shrink-0 gap-1.5 border-indigo-500/30 text-xs hover:border-indigo-500 hover:text-indigo-700"
                >
                  <SlidersHorizontal className="size-3.5" />
                  {mostrarListaCompletaFornecedor ? "Recolher lista" : `Explorar lista (${fornecedoresDisponiveisComContexto.length})`}
                  {mostrarListaCompletaFornecedor ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </Button>
              </div>

              {/* Chips de Fornecedores selecionados */}
              {fornsSelecionados.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Filtro ativo:</span>
                  {fornsSelecionados.map((nome) => (
                    <span
                      key={nome}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/50 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:text-indigo-300 shadow-xs"
                    >
                      <strong className="max-w-[200px] truncate">{nome}</strong>
                      <button
                        type="button"
                        onClick={() => toggleFornecedor(nome)}
                        className="rounded-full p-0.5 hover:bg-indigo-500/20"
                        title="Remover este fornecedor"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Lista interativa de Fornecedores */}
              {(mostrarListaCompletaFornecedor || buscaFornecedor.trim().length > 0) && (
                <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-indigo-200/50 bg-card p-2 dark:border-indigo-800/30">
                  {fornecedoresBuscados.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                      Nenhum fornecedor ou tipo de despesa encontrado para "{buscaFornecedor}".
                    </p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                      {fornecedoresBuscados.map((item) => {
                        const estaSelecionado = fornsSelecionados.includes(item.fornecedor);
                        const pctPago = item.empenhado > 0 ? (item.pago / item.empenhado) * 100 : 0;
                        return (
                          <div
                            key={item.fornecedor}
                            className={`flex flex-col justify-between rounded-md border p-2.5 transition-colors ${
                              estaSelecionado
                                ? "border-indigo-600 bg-indigo-500/10"
                                : "border-border/70 bg-card hover:border-indigo-400/40 hover:bg-muted/30"
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <p className="line-clamp-2 text-xs font-bold text-foreground">
                                  {item.fornecedor}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="ml-1 shrink-0 bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 text-[10px] px-1.5 py-0"
                                >
                                  {item.qtdEmpenhos} emp.
                                </Badge>
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Órgão: {item.orgaos.join(", ")}
                              </p>
                              {(() => {
                                const c = contratoDe(item.fornecedor);
                                if (!c) return null;
                                const numContrato = c.numeroContrato || c.contrato;
                                const processoSEI = c.processo;
                                if (!numContrato && !processoSEI) return null;
                                return (
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                    {numContrato && (
                                      <span className="truncate" title={`Contrato: ${numContrato}${c.objeto ? ` — ${c.objeto}` : ""}`}>
                                        <span className="font-semibold text-foreground/80">Contrato:</span>{" "}
                                        <span className="font-mono text-[10.5px] text-foreground/90">{numContrato}</span>
                                      </span>
                                    )}
                                    {numContrato && processoSEI && <span className="text-border">•</span>}
                                    {processoSEI && (
                                      <span className="truncate" title={`Processo SEI: ${processoSEI}`}>
                                        <span className="font-semibold text-foreground/80">SEI:</span>{" "}
                                        <span className="font-mono text-[10.5px] text-foreground/90">{processoSEI}</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.politicas.slice(0, 2).map((p) => (
                                  <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {p}
                                  </Badge>
                                ))}
                                {item.politicas.length > 2 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    +{item.politicas.length - 2}
                                  </Badge>
                                )}
                                {item.elementos.slice(0, 2).map((el) => (
                                  <Badge
                                    key={el}
                                    variant="secondary"
                                    className="text-[9px] font-mono px-1 py-0 bg-slate-500/10 text-slate-700 dark:text-slate-300"
                                    title={item.elementosNomes.join(" | ")}
                                  >
                                    Dot. {el}
                                  </Badge>
                                ))}
                                {item.elementos.length > 2 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] font-mono px-1 py-0 bg-slate-500/10 text-slate-700 dark:text-slate-300"
                                    title={item.elementosNomes.join(" | ")}
                                  >
                                    +{item.elementos.length - 2} dot.
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
                                <div>
                                  <span className="text-muted-foreground">Empenhado</span>
                                  <p className="font-semibold tabular-nums">{fmtMoeda(item.empenhado)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Liquidado</span>
                                  <p className="font-semibold tabular-nums">{fmtMoeda(item.liquidado)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Pago</span>
                                  <p className={`font-semibold tabular-nums ${pctPago >= 80 ? "text-emerald-700 dark:text-emerald-400" : pctPago >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                                    {fmtMoeda(item.pago)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-border/40 pt-2">
                              {/* Lado esquerdo: Somente o vencimento/vigência */}
                              <div className="flex items-center min-w-0 flex-1 pr-1.5">
                                {(() => {
                                  const c = contratoDe(item.fornecedor);
                                  if (!c) {
                                    return (
                                      <span className="text-[10px] text-muted-foreground/60 italic truncate">
                                        Sem contrato
                                      </span>
                                    );
                                  }
                                  const vigenciaStr = c.dataVigencia || c.fim || "";
                                  const sem = semaforo(vigenciaStr);
                                  return (
                                    <div
                                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold truncate ${sem.classe}`}
                                      title={`Vigência até ${vigenciaStr || "não informada"}${c.objeto ? ` — ${c.objeto}` : ""}`}
                                    >
                                      <span className={`size-1.5 rounded-full shrink-0 ${sem.ponto}`} />
                                      <span className="truncate">{sem.rotulo}</span>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Lado direito: Botões Selecionar e Isolar */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={estaSelecionado ? "default" : "outline"}
                                  onClick={() => toggleFornecedor(item.fornecedor)}
                                  className={`h-6 px-2 text-[11px] ${
                                    estaSelecionado ? "bg-indigo-700 text-white hover:bg-indigo-800" : "border-indigo-400/30 hover:border-indigo-500"
                                  }`}
                                >
                                  {estaSelecionado ? "✓ Selecionado" : "+ Selecionar"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => isolarFornecedor(item.fornecedor)}
                                  title="Ver somente empenhos deste fornecedor"
                                  className="h-6 gap-1 px-2 text-[11px] hover:bg-indigo-700 hover:text-white"
                                >
                                  <Crosshair className="size-3" />
                                  Isolar
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Controles Segmentados: Parâmetro de Execução, Visão e Emendas */}
            <div className="rounded-lg border border-border/80 bg-card p-4 shadow-xs">
              <div className="grid gap-5 md:grid-cols-4 md:divide-x md:divide-border/70">
                {/* Bloco A: Parâmetro de Execução */}
                <div className="space-y-2 md:pr-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Coins className="size-3.5 text-primary" />
                    <span>Parâmetro de Execução</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Base de cálculo dos percentuais de execução
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(
                      [
                        ["inicial", "Orçamento inicial"],
                        ["atualizado", "Orçamento atualizado"],
                        ["ambos", "Ambos"],
                      ] as const
                    ).map(([v, r]) => (
                      <Chip key={v} ativo={parametro === v} onClick={() => setParametro(v)}>
                        {r}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Bloco B: Visão dos Dados */}
                <div className="space-y-2 md:px-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <LayoutGrid className="size-3.5 text-primary" />
                    <span>Visão dos Dados</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Agrupamento nos gráficos e tabela principal
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(
                      [
                        ["pauta", "Por política pública"],
                        ["projeto", "Por projeto/atividade"],
                        ["orgao", "Por órgão"],
                      ] as const
                    ).map(([v, r]) => (
                      <Chip key={v} ativo={visao === v} onClick={() => setVisao(v)}>
                        {r}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Bloco C: Emendas Parlamentares */}
                <div className="flex h-full flex-col space-y-2 md:pl-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Landmark className="size-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Emendas Parlamentares</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Identificadas pela dotação de projeto/atividade de emenda
                  </p>
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    {resumoEmendas.qtdTotalPAs} emenda{resumoEmendas.qtdTotalPAs !== 1 ? 's' : ''} recebida{resumoEmendas.qtdTotalPAs !== 1 ? 's' : ''}
                  </p>
                  {/* KPIs inline */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-md border border-amber-300/40 bg-amber-50/60 p-2.5 dark:border-amber-500/20 dark:bg-amber-900/10">
                    <div>
                      <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">Empenhado</p>
                      <p className="font-mono text-xs font-bold text-foreground">{fmtMoeda(resumoEmendas.empenhado)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">Pago</p>
                      <p className="font-mono text-xs font-bold text-foreground">{fmtMoeda(resumoEmendas.pago)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">% Exec. s/ atualizado</p>
                      <p className="font-mono text-xs font-bold text-foreground">{fmtPct(resumoEmendas.pctExec)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">% Pago s/ empenhado</p>
                      <p className="font-mono text-xs font-bold text-foreground">{fmtPct(resumoEmendas.pctPago)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Chip ativo={somenteEmendas} onClick={() => setSomenteEmendas(!somenteEmendas)}>
                      {somenteEmendas ? "✓ Somente emendas" : "Todas as dotações"}
                    </Chip>
                    {resumoEmendas.qtdTotalPAs > 0 && (
                      <Chip ativo={mostrarResumoEmendas} onClick={() => setMostrarResumoEmendas(!mostrarResumoEmendas)}>
                        {mostrarResumoEmendas ? "✓ Resumo por órgão" : "Resumo por órgão"}
                      </Chip>
                    )}
                  </div>
                </div>

                {/* Bloco D: Emendas Recebidas (por objeto/fornecedor nos empenhos) */}
                <div className="flex h-full flex-col space-y-2 md:pl-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Landmark className="size-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Emendas Recebidas</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Classificadas pela base de execução orçamentária — contagem por processo
                  </p>

                  <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    {resumoEmendasRecebidas.total} emenda{resumoEmendasRecebidas.total !== 1 ? 's' : ''} recebida{resumoEmendasRecebidas.total !== 1 ? 's' : ''} · {resumoEmendasRecebidas.qtdEmpenhos} empenho{resumoEmendasRecebidas.qtdEmpenhos !== 1 ? 's' : ''}
                  </p>

                  {/* KPIs inline */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-md border border-violet-300/40 bg-violet-50/60 p-2.5 dark:border-violet-500/20 dark:bg-violet-900/10">
                    <div>
                      <p className="text-[10px] font-medium text-violet-700 dark:text-violet-400">Empenhado</p>
                      <p className="font-mono text-xs font-bold text-foreground">{fmtMoeda(resumoEmendasRecebidas.empenhado)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-violet-700 dark:text-violet-400">Pago</p>
                      <p className="font-mono text-xs font-bold text-foreground">{fmtMoeda(resumoEmendasRecebidas.pago)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-violet-700 dark:text-violet-400">Liquidado</p>
                      <p className="font-mono text-xs font-bold text-foreground">{fmtMoeda(resumoEmendasRecebidas.liquidado)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-violet-700 dark:text-violet-400">% Pago s/ emp.</p>
                      <p className="font-mono text-xs font-bold text-foreground">{fmtPct(resumoEmendasRecebidas.pctPago)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Chip ativo={somenteRecebidas} onClick={() => setSomenteRecebidas(!somenteRecebidas)}>
                      {somenteRecebidas ? "✓ Somente recebidas" : "Todas as dotações"}
                    </Chip>
                    {resumoEmendasRecebidas.total > 0 && (
                      <Chip ativo={mostrarResumoEmendasRecebidas} onClick={() => setMostrarResumoEmendasRecebidas(!mostrarResumoEmendasRecebidas)}>
                        {mostrarResumoEmendasRecebidas ? "✓ Resumo por órgão" : "Resumo por órgão"}
                      </Chip>
                    )}
                  </div>

                </div>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel de detalhamento de Emendas Parlamentares por Órgão */}
        {resumoEmendas.qtdTotalPAs > 0 && mostrarResumoEmendas && (
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/40 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-900/10">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-amber-500/20 p-1.5">
                  <Landmark className="size-4 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Emendas Parlamentares — Resumo por Órgão</p>
                  <p className="text-[11px] text-muted-foreground">
                    {resumoEmendas.qtdTotalPAs} projetos/emendas · Atualizado: {fmtMoeda(resumoEmendas.atualizado)} · Exec.: {fmtPct(resumoEmendas.pctExec)} · Pago: {fmtPct(resumoEmendas.pctPago)} s/ empenhado
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {resumoEmendas.qtdTotalPAs} emendas
              </Badge>
            </div>

            {/* KPIs totais consolidados */}
            <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Orçamento inicial",    valor: resumoEmendas.inicial },
                { label: "Orçamento atualizado", valor: resumoEmendas.atualizado },
                { label: "Empenhado",             valor: resumoEmendas.empenhado },
                { label: "Liquidado",             valor: resumoEmendas.liquidado },
                { label: "Pago",                  valor: resumoEmendas.pago },
                { label: "Saldo disponível",       valor: resumoEmendas.saldo },
              ].map(({ label, valor }) => (
                <div
                  key={label}
                  className="rounded-lg border border-amber-200/60 bg-white/70 px-3 py-2.5 shadow-xs dark:border-amber-500/20 dark:bg-card/60"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{label}</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-foreground">{fmtMoeda(valor)}</p>
                </div>
              ))}
            </div>

            {/* Breakdown por Ano de Execução (Cd_AnoExecucao) — exibe apenas se houver mais de um ano */}
            {resumoEmendas.porAno.length > 1 && (
              <div className="mb-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Por Ano de Execução (Cd_AnoExecucao)
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {resumoEmendas.porAno.map((anoItem) => (
                    <div
                      key={anoItem.ano}
                      className="flex flex-col gap-2 rounded-lg border border-amber-300/60 bg-amber-50/80 p-3 shadow-xs dark:border-amber-500/30 dark:bg-amber-900/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                          Exercício {anoItem.ano}
                        </span>
                        <Badge variant="outline" className="text-[10px] border-amber-400/60 text-amber-700 dark:text-amber-400">
                          {anoItem.qtd} emenda{anoItem.qtd !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Inicial</p>
                          <p className="font-mono text-[11px] font-semibold text-foreground">{fmtMoeda(anoItem.inicial)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Atualizado</p>
                          <p className="font-mono text-[11px] font-semibold text-foreground">{fmtMoeda(anoItem.atualizado)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Empenhado</p>
                          <p className="font-mono text-[11px] font-semibold text-foreground">{fmtMoeda(anoItem.empenhado)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Pago</p>
                          <p className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{fmtMoeda(anoItem.pago)}</p>
                        </div>
                      </div>
                      <div className="mt-0.5">
                        <div className="mb-0.5 flex justify-between">
                          <span className="text-[10px] text-muted-foreground">Exec. {fmtPct(anoItem.pctExec)}</span>
                          <span className="text-[10px] text-muted-foreground">Pago {fmtPct(anoItem.pctPago)} s/ emp.</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all"
                            style={{ width: `${Math.min(anoItem.pctExec, 100).toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detalhamento por órgão */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Por órgão</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

                {resumoEmendas.porOrgao.flatMap((org) => {
                  const grupos: typeof org.paDetalhes[] = [];
                  for (let i = 0; i < org.paDetalhes.length; i += 5) grupos.push(org.paDetalhes.slice(i, i + 5));
                  if (grupos.length === 0) grupos.push([]);
                  return grupos.map((grupo, gi) => (
                    <div
                      key={`${org.orgao}-${gi}`}
                      className="flex flex-col gap-2 rounded-lg border border-amber-200/60 bg-white/80 p-3 shadow-xs dark:border-amber-500/20 dark:bg-card/70"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {org.orgao}{grupos.length > 1 ? ` (${gi + 1}/${grupos.length})` : ""}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] border-amber-300/60 text-amber-700 dark:text-amber-400">
                            {org.qtd} emenda{org.qtd !== 1 ? 's' : ''}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-amber-300/60 text-amber-700 dark:text-amber-400">
                            Saldo {fmtMoeda(org.saldo)}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Atualizado</p>
                          <p className="font-mono text-[11px] font-semibold text-foreground">{fmtMoeda(org.atualizado)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Empenhado</p>
                          <p className="font-mono text-[11px] font-semibold text-foreground">{fmtMoeda(org.empenhado)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Pago</p>
                          <p className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{fmtMoeda(org.pago)}</p>
                        </div>
                      </div>

                      {/* Barra de execução */}
                      <div>
                        <div className="mb-0.5 flex justify-between">
                          <span className="text-[10px] text-muted-foreground">Exec. {fmtPct(org.pctExec)}</span>
                          <span className="text-[10px] text-muted-foreground">Pago {fmtPct(org.pctPago)} s/ emp.</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all"
                            style={{ width: `${Math.min(org.pctExec, 100).toFixed(1)}%` }}
                          />
                        </div>
                      </div>

                      {/* Emendas do órgão (até 5 por quadro) */}
                      {grupo.length > 0 && (
                        <div className="mt-1 space-y-1 border-t border-amber-100 pt-2 dark:border-amber-800/30">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Emendas{grupos.length > 1 ? ` ${gi * 5 + 1}–${gi * 5 + grupo.length}` : ""}
                          </p>
                          {grupo.map((d) => (
                            <button
                              key={d.pa}
                              type="button"
                              onClick={() => {
                                setSomenteEmendas(true);
                                if (!pas.includes(d.pa)) togglePA(d.pa);
                              }}
                              className="flex w-full items-start justify-between gap-2 text-left hover:opacity-80"
                              title={`Isolar PA ${d.pa} — ${d.descricao}`}
                            >
                              <p className="flex-1 truncate text-[10px] leading-snug text-foreground">
                                <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{d.pa}</span>
                                {d.descricao ? ` · ${d.descricao}` : ""}
                              </p>
                              <span className="shrink-0 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                {fmtMoeda(d.empenhado)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })}

              </div>
            </div>
          </div>
        )}

        {/* Painel de detalhamento de Emendas Recebidas por Órgão */}
        {resumoEmendasRecebidas.total > 0 && mostrarResumoEmendasRecebidas && (
          <div className="rounded-xl border border-violet-300/50 bg-violet-50/40 p-4 shadow-sm dark:border-violet-500/20 dark:bg-violet-900/10">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-violet-500/20 p-1.5">
                  <Landmark className="size-4 text-violet-700 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Emendas Recebidas — Resumo por Órgão</p>
                  <p className="text-[11px] text-muted-foreground">
                    Empenhos com "Emenda Parlamentar" no campo objeto · {resumoEmendasRecebidas.total} emendas ({resumoEmendasRecebidas.qtdEmpenhos} empenhos) · Empenhado: {fmtMoeda(resumoEmendasRecebidas.empenhado)} · Pago: {fmtPct(resumoEmendasRecebidas.pctPago)} s/ empenhado
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                {resumoEmendasRecebidas.total} emendas
              </Badge>

            </div>

            {/* KPIs totais consolidados */}
            <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { label: "Empenhado",  valor: resumoEmendasRecebidas.empenhado },
                { label: "Liquidado",  valor: resumoEmendasRecebidas.liquidado },
                { label: "Pago",       valor: resumoEmendasRecebidas.pago },
                { label: "% Pago s/ Empenhado", valor: null, pct: resumoEmendasRecebidas.pctPago },
              ].map(({ label, valor, pct }) => (
                <div
                  key={label}
                  className="rounded-lg border border-violet-200/60 bg-white/70 px-3 py-2.5 shadow-xs dark:border-violet-500/20 dark:bg-card/60"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">{label}</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                    {pct !== undefined ? fmtPct(pct) : fmtMoeda(valor!)}
                  </p>
                </div>
              ))}
            </div>

            {/* Detalhamento por órgão */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Por órgão — top beneficiários</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {resumoEmendasRecebidas.porOrgao.map((org) => (
                  <div
                    key={org.orgao}
                    className="flex flex-col gap-2 rounded-lg border border-violet-200/60 bg-white/80 p-3 shadow-xs dark:border-violet-500/20 dark:bg-card/70"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{org.orgao}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] border-violet-300/60 text-violet-700 dark:text-violet-400">
                          {org.qtdProcessos} emenda{org.qtdProcessos !== 1 ? 's' : ''} · {org.qtdEmpenhos} emp.
                        </Badge>

                        <Badge variant="outline" className="text-[10px] border-violet-300/60 text-violet-700 dark:text-violet-400">
                          {org.qtdFornecedores} beneficiário{org.qtdFornecedores !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Empenhado</p>
                        <p className="font-mono text-[11px] font-semibold text-foreground">{fmtMoeda(org.empenhado)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Liquidado</p>
                        <p className="font-mono text-[11px] font-semibold text-foreground">{fmtMoeda(org.liquidado)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Pago</p>
                        <p className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{fmtMoeda(org.pago)}</p>
                      </div>
                    </div>
                    {/* Barra de pagamento */}
                    <div>
                      <div className="mb-0.5 flex justify-between">
                        <span className="text-[10px] text-muted-foreground">Pago {fmtPct(org.pctPago)} s/ emp.</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/30">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all"
                          style={{ width: `${Math.min(org.pctPago, 100).toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                    {/* Top beneficiários */}
                    {org.top5.length > 0 && (
                      <div className="mt-1 space-y-1 border-t border-violet-100 pt-2 dark:border-violet-800/30">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Top beneficiários</p>
                        {org.top5.map((t) => (
                          <div key={t.forn} className="flex items-start justify-between gap-2">
                            <p className="flex-1 text-[10px] text-foreground leading-snug truncate" title={t.forn}>
                              {t.forn.length > 30 ? t.forn.slice(0, 30) + "…" : t.forn}
                            </p>
                            <span className="shrink-0 font-mono text-[10px] font-bold text-violet-700 dark:text-violet-300">
                              {fmtMoeda(t.empenhado)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gráfico */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base">
              {somenteRecebidas ? (
                <>Emendas recebidas — beneficiários (top 12)</>
              ) : (
                <>
                  {somenteEmendas ? "Emendas parlamentares" : "Orçamento x execução"} —{" "}
                  {visao === "pauta"
                    ? "políticas públicas"
                    : visao === "projeto"
                      ? "projetos/atividades"
                      : "órgãos"}{" "}
                  (top 12)
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={somenteRecebidas ? dadosGraficoRecebidas : dadosGrafico}
                  margin={{ top: 8, right: 16, bottom: 70, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="nome"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={80}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(v) => fmtNum(Number(v))}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {somenteRecebidas ? (
                    <>
                      <Bar dataKey="Empenhado" fill={CORES[0]} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Liquidado" fill={CORES[1]} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Pago" fill={CORES[2]} radius={[3, 3, 0, 0]} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="Inicial" fill={CORES[0]} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Atualizado" fill={CORES[1]} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Empenhado" fill={CORES[2]} radius={[3, 3, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lista de emendas selecionadas (parlamentares e/ou recebidas) */}
        {emendaSelecionada && (
          <Card className="shadow-sm border-amber-400/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base">
                Detalhamento das emendas selecionadas
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {somenteEmendas && `${listaEmendasDotacao.length} emenda(s) parlamentar(es) na dotação`}
                {somenteEmendas && somenteRecebidas && " · "}
                {somenteRecebidas && `${listaEmendasRecebidas.length} empenho(s) de emendas recebidas`}
              </p>
            </CardHeader>
            <CardContent className="space-y-6 p-0 pb-4">
              {somenteEmendas && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-50/70 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-amber-900/10">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Emenda (projeto/atividade)</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Inicial</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Atualizado</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Empenhado</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Pago</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Saldo</th>
                        <th className="px-4 py-2.5 text-right font-semibold">% exec.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaEmendasDotacao.length === 0 && (
                        <tr>
                          <td className="px-4 py-5 text-center text-muted-foreground" colSpan={7}>
                            Nenhuma emenda parlamentar nos filtros atuais.
                          </td>
                        </tr>
                      )}
                      {listaEmendasDotacao.map((a) => (
                        <tr key={a.chave} className="border-t border-border/70 hover:bg-muted/20">
                          <td className="max-w-[420px] px-4 py-2">
                            <span className="font-medium text-foreground">{a.rotulo}</span>
                            {a.sub && (
                              <span className="block text-xs text-muted-foreground">{a.sub}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(a.inicial)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(a.atualizado)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(a.empenhado)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(a.pago)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(a.saldo)}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums">
                            {fmtPct(a.execAtualizado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {somenteRecebidas && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-violet-50/70 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-violet-900/10">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Órgão</th>
                        <th className="px-4 py-2.5 font-semibold">Processo</th>
                        <th className="px-4 py-2.5 font-semibold">Empenho</th>
                        <th className="px-4 py-2.5 font-semibold">Data</th>
                        <th className="px-4 py-2.5 font-semibold">Parlamentar</th>
                        <th className="px-4 py-2.5 font-semibold">Beneficiário / objeto</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Empenhado</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Liquidado</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaEmendasRecebidas.length === 0 && (
                        <tr>
                          <td className="px-4 py-5 text-center text-muted-foreground" colSpan={9}>
                            Nenhuma emenda recebida nos filtros atuais.
                          </td>
                        </tr>
                      )}
                      {listaEmendasRecebidas.map((e, i) => (
                        <tr
                          key={`${e.empenho}-${i}`}
                          className="border-t border-border/70 hover:bg-muted/20"
                        >
                          <td className="px-4 py-2 text-xs">{e.orgao}</td>
                          <td className="px-4 py-2 font-mono text-xs">{e.processo}</td>
                          <td className="px-4 py-2 font-mono text-xs">{e.empenho}</td>
                          <td className="px-4 py-2 text-xs">{e.data}</td>
                          <td className="px-4 py-2 text-xs">{parlamentarDaEmenda(e)}</td>
                          <td className="max-w-[420px] px-4 py-2">
                            <span className="font-medium text-foreground">{e.fornecedor}</span>
                            <span className="block text-xs text-muted-foreground">{e.objeto}</span>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(e.empenhado)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(e.liquidado)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmtNum(e.pago)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}



        {/* Tabela de Detalhamento Principal */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-heading text-base">Detalhamento</CardTitle>
              <p className="text-xs text-muted-foreground">
                Consolidado de execução orçamentária de acordo com os filtros aplicados.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      {visao === "projeto" ? "Projeto / atividade (rubrica)" : "Descrição"}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">Inicial</th>
                    <th className="px-4 py-3 text-right font-semibold">Atualizado</th>
                    <th className="px-4 py-3 text-right font-semibold">Congelado</th>
                    <th className="px-4 py-3 text-right font-semibold">Descong.</th>
                    <th className="px-4 py-3 text-right font-semibold">Empenhado</th>
                    <th className="px-4 py-3 text-right font-semibold">Pago</th>
                    <th className="px-4 py-3 text-right font-semibold">Saldo dotação</th>
                    {mostrarInicial && (
                      <th className="px-4 py-3 text-right font-semibold">% s/ inicial</th>
                    )}
                    {mostrarAtualizado && (
                      <th className="px-4 py-3 text-right font-semibold">% s/ atualizado</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground text-center" colSpan={10}>
                        Carregando base…
                      </td>
                    </tr>
                  )}
                  {agregados.length === 0 && !isLoading && (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground text-center" colSpan={10}>
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                  {agregados.map((a) => {
                    // Extrair código do PA se a visão for projeto
                    const codigoPA = visao === "projeto" ? a.rotulo.split(" - ")[0]?.trim() : null;
                    const ehPauta = visao === "pauta";
                    return (
                      <tr key={a.chave} className="border-t border-border/70 hover:bg-muted/20">
                        <td className="max-w-[420px] px-4 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{a.rotulo}</span>
                            {codigoPA && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => isolarPA(codigoPA)}
                                title={`Isolar PA ${codigoPA} na pesquisa`}
                                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10"
                              >
                                <Crosshair className="size-3 mr-1" />
                                Isolar
                              </Button>
                            )}
                            {ehPauta && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => isolarPauta(a.rotulo)}
                                title={`Isolar política ${a.rotulo} na pesquisa`}
                                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-emerald-700 hover:bg-emerald-500/10"
                              >
                                <Crosshair className="size-3 mr-1" />
                                Isolar
                              </Button>
                            )}
                          </div>
                          {a.sub ? (
                            <span className="block text-xs text-muted-foreground">{a.sub}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(a.inicial)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(a.atualizado)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(a.congelado)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmtNum(a.descongelado)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(a.empenhado)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(a.pago)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(a.saldo)}</td>
                        {mostrarInicial && (
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                            {fmtPct(a.execInicial)}
                          </td>
                        )}
                        {mostrarAtualizado && (
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                            {fmtPct(a.execAtualizado)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-primary/30 bg-muted/40 font-semibold">
                  <tr>
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(total.inicial)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(total.atualizado)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(total.congelado)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmtNum(total.descongelado)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(total.empenhado)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(total.pago)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(total.saldo)}</td>
                    {mostrarInicial && (
                      <td className="px-4 py-3 text-right tabular-nums">
                        {fmtPct(total.execInicial)}
                      </td>
                    )}
                    {mostrarAtualizado && (
                      <td className="px-4 py-3 text-right tabular-nums">
                        {fmtPct(total.execAtualizado)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Painel de Detalhamento Isolado de Fornecedor/Credor */}
        {fornecedorIsoladoInfo && (
          <Card className="shadow-sm border-indigo-500/30">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-indigo-700 p-1.5 text-white">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-base text-indigo-800 dark:text-indigo-300">
                      Detalhamento do Fornecedor / Credor
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fornecedorIsoladoInfo.fornecedor}
                    </p>
                    {(() => {
                      const c = contratoDe(fornecedorIsoladoInfo.fornecedor);
                      if (!c) return null;
                      const vigenciaStr = c.dataVigencia || c.fim || "";
                      const sem = semaforo(vigenciaStr);
                      const numContrato = c.numeroContrato || c.contrato || "s/nº";
                      return (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${sem.classe}`}
                          >
                            <span className={`size-2 rounded-full ${sem.ponto}`} />
                            Contrato {numContrato} · Vigência até {vigenciaStr || "—"} ({sem.rotulo})
                          </div>
                          {c.processo && (
                            <Badge variant="outline" className="text-xs">
                              Processo: {c.processo}
                            </Badge>
                          )}
                          {c.gestor && (
                            <Badge variant="secondary" className="text-xs">
                              Gestor: {c.gestor}
                            </Badge>
                          )}
                          {c.objeto && (
                            <p className="w-full text-xs text-muted-foreground mt-1">
                              <strong>Objeto:</strong> {c.objeto}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={limparFornecedores}
                  className="h-7 border-indigo-500/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-700 hover:text-white"
                >
                  <X className="size-3.5" />
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* KPIs do Fornecedor */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Nº de Empenhos</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{fornecedorIsoladoInfo.qtdEmpenhos}</p>
                  <p className="text-[11px] text-muted-foreground">registros</p>
                </div>
                <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Total Empenhado</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-foreground">{fmtMoeda(fornecedorIsoladoInfo.empenhado)}</p>
                </div>
                <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Total Liquidado</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-foreground">{fmtMoeda(fornecedorIsoladoInfo.liquidado)}</p>
                </div>
                <div className={`rounded-lg border p-3 ${
                  pctPagoFornecedor >= 80
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : pctPagoFornecedor >= 40
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-rose-500/30 bg-rose-500/5"
                }`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Pago</p>
                  <p className={`mt-1 text-base font-bold tabular-nums ${
                    pctPagoFornecedor >= 80 ? "text-emerald-700 dark:text-emerald-400" : pctPagoFornecedor >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                  }`}>{fmtMoeda(fornecedorIsoladoInfo.pago)}</p>
                  <p className="text-[11px] text-muted-foreground">{pctPagoFornecedor.toFixed(1)}% do empenhado</p>
                </div>
              </div>

              {/* Tabela de empenhos detalhados */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-indigo-700 text-left text-[10px] uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Nº Empenho</th>
                      <th className="px-3 py-2.5 font-semibold">Data</th>
                      <th className="px-3 py-2.5 font-semibold">Processo SEI</th>
                      <th className="px-3 py-2.5 font-semibold">Coordenação</th>
                      <th className="px-3 py-2.5 font-semibold">Política</th>
                      <th className="px-3 py-2.5 font-semibold">Elemento</th>
                      <th className="px-3 py-2.5 font-semibold">Situação</th>
                      <th className="px-3 py-2.5 font-semibold">Objeto</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Empenhado</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Liquidado</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empenhosFornecedorIsolado.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                          Nenhum empenho encontrado para este fornecedor com os filtros atuais.
                        </td>
                      </tr>
                    )}
                    {empenhosFornecedorIsolado
                      .sort((a, b) => b.empenhado - a.empenhado)
                      .map((e, idx) => (
                        <tr
                          key={`${e.empenho}-${idx}`}
                          className="border-t border-border/60 hover:bg-indigo-500/5"
                        >
                          <td className="px-3 py-2 font-mono font-bold text-indigo-700 dark:text-indigo-400">{e.empenho}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.data}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.processo}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{e.coordenacao}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                              {e.politica}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-[10px]">{e.elemento}</span>
                            <br />
                            <span className="text-[10px] text-muted-foreground">{e.elementoNome}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              e.situacao.includes("Normal")
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            }`}>
                              {e.situacao}
                            </span>
                          </td>
                          <td className="max-w-[200px] px-3 py-2 text-[11px] text-muted-foreground" title={e.objeto}>
                            <span className="line-clamp-2">{e.objeto}</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtMoeda(e.empenhado)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtMoeda(e.liquidado)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums font-semibold ${
                            e.pago > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                          }`}>{fmtMoeda(e.pago)}</td>
                        </tr>
                      ))}
                  </tbody>
                  {empenhosFornecedorIsolado.length > 0 && (
                    <tfoot className="border-t-2 border-indigo-500/30 bg-indigo-500/5 font-semibold text-xs">
                      <tr>
                        <td colSpan={8} className="px-3 py-2.5">Total ({empenhosFornecedorIsolado.length} empenhos)</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoeda(fornecedorIsoladoInfo.empenhado)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtMoeda(fornecedorIsoladoInfo.liquidado)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{fmtMoeda(fornecedorIsoladoInfo.pago)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhamento Avançado: PA × Elemento de Despesa e Empenhos */}
        <PainelPaElemento rows={rows} empenhos={empenhos} pas={pas} pautas={pautas} />

        {/* Atualização das bases — fim da página */}
        <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-base font-semibold text-foreground">
                Atualizar bases de dados (Excel)
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Execução/Dotação, Detalhe de Empenhos e Contratos (vigência). O painel e os
                relatórios em PDF passam a usar a nova base imediatamente após a importação.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Contratos: {baseContratos?.rows?.length ?? 0} registro(s) carregado(s).
              </p>
            </div>
            <Button
              onClick={() => setModalImportarAberto(true)}
              className="border-emerald-500/40 bg-emerald-700 text-white hover:bg-emerald-800"
            >
              <Upload className="size-4" />
              Importar Excel (.xlsx)
            </Button>
          </div>
        </div>

        <p className="pb-8 text-xs text-muted-foreground">
          Projetos/atividades com código de 4 dígitos iniciado em 9 são classificados como emendas
          ao orçamento. O percentual de execução considera o empenhado líquido sobre o parâmetro
          selecionado (orçamento inicial e/ou atualizado).
        </p>

        {/* Botão de importação movido para o final da página */}
        <div className="flex items-center justify-center gap-3 border-t border-border/40 pb-10 pt-6">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalImportarAberto(true)}
            className="h-8 gap-2 border-emerald-500/40 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <Upload className="size-3.5" />
            Importar / Atualizar base Excel (.xlsx)
          </Button>
        </div>
      </div>

      <ModalImportarExcel
        aberto={modalImportarAberto}
        onOpenChange={setModalImportarAberto}
      />
    </main>
  );
}

