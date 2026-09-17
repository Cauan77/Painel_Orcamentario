// User request: Revise dashboard substantially with polished layout, icon rail + contextual nav, integrated reusable modules, functional filters/pagination, complete ETL and domain views, and strictly demonstrative fictional local data.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"
import MetricCard from "./MetricCard.tsx"
import StatusBadge from "./StatusBadge.tsx"
import SidebarNavigation from "./SidebarNavigation.tsx"
import SecondaryNav from "./SecondaryNav.tsx"
import HeaderFilters from "./HeaderFilters.tsx"
import FinancialChart from "./FinancialChart.tsx"
import DataTable from "./DataTable.tsx"

type ViewKey =
    | "visao-geral"
    | "monitoramento-etl"
    | "estrutura-organizacional"
    | "funcional-programatica"
    | "natureza-despesa"
    | "gestao-credores"

interface TransactionItem {
    id: string
    year: number
    month: number
    unidade: string
    documento: string
    favorecido: string
    objeto: string
    budget: number
    committed: number
    liquidated: number
    paid: number
}

interface MyComponentProps {
    brandBlue: string
    blueLight: string
    financeGreen: string
    greenLight: string
    warningColor: string
    background: string
    surface: string
    borderColor: string
    textColor: string
    mutedColor: string
    radius: number
    spacing: number
    title: string
    initialView: ViewKey
    initialYear: number
    sampleCount: number
    font: any
}

const MONTHS = ["Todos", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const YEARS = [2021, 2022, 2023, 2024, 2025]
const AREA_ITEMS = [
    { key: "execucao", label: "Execução Orçamentária", icon: "etl" },
    { key: "estrutura", label: "Estrutura Organizacional", icon: "org" },
    { key: "funcional", label: "Funcional-Programática", icon: "func" },
    { key: "natureza", label: "Natureza da Despesa", icon: "natureza" },
    { key: "credores", label: "Gestão de Credores", icon: "credores" },
]
const VIEWS: { key: ViewKey; label: string }[] = [
    { key: "visao-geral", label: "Visão geral" },
    { key: "monitoramento-etl", label: "Monitoramento de ETL" },
    { key: "estrutura-organizacional", label: "Estrutura Organizacional" },
    { key: "funcional-programatica", label: "Funcional-Programática" },
    { key: "natureza-despesa", label: "Natureza da Despesa" },
    { key: "gestao-credores", label: "Gestão de Credores" },
]

function brl(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function hashNumber(input: string): number {
    let hash = 0
    for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) % 100000
    return hash
}

function buildTransactions(sampleCount: number, cycle: number): TransactionItem[] {
    const clamped = Math.max(101, Math.floor(sampleCount))
    const unidades = ["org34 SMDHC", "Unidade Demonstrativa A", "Unidade Demonstrativa B"]
    const objetos = ["Material pedagógico", "Serviço socioassistencial", "Apoio logístico", "Capacitação técnica"]
    const favorecidos = ["Empresa Alfa Demonstrativa", "Instituto Beta Demonstrativo", "Cooperativa Gama Ilustrativa"]
    const rows: TransactionItem[] = []
    YEARS.forEach((year) => {
        for (let i = 0; i < clamped; i++) {
            const month = (i % 12) + 1
            const code = `${year}-${i}-${cycle}`
            const base = 70000 + (hashNumber(code) % 50000)
            const committed = base * (0.68 + ((hashNumber(code + "c") % 20) / 100))
            const liquidated = committed * (0.7 + ((hashNumber(code + "l") % 22) / 100))
            const paid = liquidated * (0.66 + ((hashNumber(code + "p") % 20) / 100))
            rows.push({
                id: `DEM-${year}-${String(i + 1).padStart(4, "0")}`,
                year,
                month,
                unidade: unidades[i % unidades.length],
                documento: "CPF ***.***.***-**",
                favorecido: favorecidos[i % favorecidos.length],
                objeto: objetos[i % objetos.length],
                budget: Math.round(base),
                committed: Math.round(committed),
                liquidated: Math.round(liquidated),
                paid: Math.round(paid),
            })
        }
    })
    return rows
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function SMDHCDashboard(props: MyComponentProps) {
    const {
        brandBlue,
        blueLight,
        financeGreen,
        greenLight,
        warningColor,
        background,
        surface,
        borderColor,
        textColor,
        mutedColor,
        radius,
        spacing,
        title,
        initialView,
        initialYear,
        sampleCount,
        font,
    } = props
    const [view, setView] = React.useState<ViewKey>(initialView)
    const [year, setYear] = React.useState<number>(initialYear)
    const [month, setMonth] = React.useState<number>(0)
    const [search, setSearch] = React.useState<string>("")
    const [page, setPage] = React.useState<number>(1)
    const [pageSize, setPageSize] = React.useState<number>(6)
    const [cycle, setCycle] = React.useState<number>(1)
    const [pulse, setPulse] = React.useState<number>(0)
    const [etlSelected, setEtlSelected] = React.useState<number>(0)
    const [credorTab, setCredorTab] = React.useState<number>(0)
    const [credorSearch, setCredorSearch] = React.useState<string>("")

    React.useEffect(() => {
        React.startTransition(() => setView(initialView))
    }, [initialView])

    const transactions = React.useMemo(() => buildTransactions(sampleCount, cycle), [sampleCount, cycle])

    React.useEffect(() => {
        const timer = setTimeout(() => React.startTransition(() => setPulse((p) => p + 1)), 180)
        return () => clearTimeout(timer)
    }, [year, month])

    const filtered = React.useMemo(() => {
        const term = search.toLowerCase().trim()
        return transactions.filter((t) => {
            const period = t.year === year && (month === 0 || t.month === month)
            if (!period) return false
            if (!term) return true
            return (
                t.id.toLowerCase().includes(term) ||
                t.unidade.toLowerCase().includes(term) ||
                t.favorecido.toLowerCase().includes(term) ||
                t.objeto.toLowerCase().includes(term)
            )
        })
    }, [transactions, year, month, search])

    const totals = React.useMemo(() => {
        let budget = 0
        let committed = 0
        let liquidated = 0
        let paid = 0
        filtered.forEach((t) => {
            budget += t.budget
            committed += t.committed
            liquidated += t.liquidated
            paid += t.paid
        })
        return { budget, committed, liquidated, paid }
    }, [filtered])

    const monthly = React.useMemo(() => {
        return Array.from({ length: 12 }).map((_, idx) => {
            const monthNum = idx + 1
            const rows = filtered.filter((r) => r.month === monthNum)
            let budget = 0
            let committed = 0
            let liquidated = 0
            let paid = 0
            rows.forEach((r) => {
                budget += r.budget
                committed += r.committed
                liquidated += r.liquidated
                paid += r.paid
            })
            const saldo = Math.max(0, budget - committed)
            const aLiquidar = Math.max(0, committed - liquidated)
            const aPagar = Math.max(0, liquidated - paid)
            return { m: MONTHS[monthNum], saldo, aLiquidar, aPagar, paid, total: budget }
        })
    }, [filtered])

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
    const safePage = Math.min(page, pageCount)

    const runRefresh = React.useCallback(() => React.startTransition(() => setCycle((c) => c + 1)), [])
    const exportCsv = React.useCallback(() => {
        if (typeof window === "undefined" || view !== "visao-geral") return
        const csv = [
            "id,ano,mes,unidade,favorecido,objeto,orcado,empenhado,liquidado,pago",
            ...filtered.map((r) =>
                [r.id, r.year, r.month, r.unidade, r.favorecido, r.objeto, r.budget, r.committed, r.liquidated, r.paid]
                    .map((v) => `"${String(v).replaceAll('"', '""')}"`)
                    .join(",")
            ),
        ].join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const a = document.createElement("a")
        const objectURL = URL.createObjectURL(blob)
        a.href = objectURL
        a.download = "dados_demonstrativos_smdhc.csv"
        a.click()
        setTimeout(() => URL.revokeObjectURL(objectURL), 0)
    }, [filtered, view])

    const kpi = [
        { label: "Valor Orçado Atualizado", value: totals.budget, color: brandBlue },
        { label: "Valor Empenhado", value: totals.committed, color: brandBlue },
        { label: "Valor Liquidado", value: totals.liquidated, color: financeGreen },
        { label: "Valor Pago", value: totals.paid, color: financeGreen },
    ]

    const activeArea = view === "estrutura-organizacional" ? "estrutura" : view === "funcional-programatica" ? "funcional" : view === "natureza-despesa" ? "natureza" : view === "gestao-credores" ? "credores" : "execucao"
    const contextualItems = activeArea === "execucao" ? ["Visão geral", "Monitoramento de ETL"] : [VIEWS.find((v) => v.key === view)?.label || "Visão"]
    const etlRows = [
        { nome: "Carga mensal de execução orçamentária", status: "Carregado", hora: "08:02", linhas: "12.400", detalhe: "Carga concluída com validações básicas de consistência." },
        { nome: "Consolidação de credores demonstrativos", status: "Pendente", hora: "07:45", linhas: "3.210", detalhe: "Aguardando atualização de 2 registros históricos de validade." },
        { nome: "Classificação funcional ilustrativa", status: "Erro", hora: "07:01", linhas: "0", detalhe: "Coluna de rótulo ilustrativo ausente no lote recebido; sem payload pessoal rejeitado." },
    ]
    const credoresBase = [
        { id: "CRD-001", nome: "Empresa Alfa Demonstrativa", doc: "CPF ***.***.***-**", status: "Ativa", de: "2024-01-01", ate: "9999-12-31" },
        { id: "CRD-001", nome: "Empresa Alfa Demonstrativa", doc: "CPF ***.***.***-**", status: "Histórico", de: "2021-01-01", ate: "2023-12-31" },
        { id: "CRD-002", nome: "Instituto Beta Demonstrativo", doc: "CPF ***.***.***-**", status: "Ativa", de: "2022-07-01", ate: "9999-12-31" },
    ]
    const credoresFiltrados = credoresBase.filter((c) => (credorTab === 1 ? c.status === "Ativa" : credorTab === 2 ? c.status === "Histórico" : true) && `${c.id} ${c.nome}`.toLowerCase().includes(credorSearch.toLowerCase()))
    const composition = [
        { label: "Saldo disponível", amount: Math.max(0, totals.budget - totals.committed), color: "#93b8e0" },
        { label: "A liquidar", amount: Math.max(0, totals.committed - totals.liquidated), color: "#1a4f8a" },
        { label: "A pagar", amount: Math.max(0, totals.liquidated - totals.paid), color: "#2d9e6b" },
        { label: "Pago", amount: totals.paid, color: "#1e7d4f" },
    ]
    const compositionTotal = composition.reduce((acc, item) => acc + item.amount, 0)
    const functionalBucket = React.useMemo(() => {
        const map = new Map<string, number>()
        filtered.forEach((item) => {
            const g = item.id.endsWith("1") || item.id.endsWith("4") || item.id.endsWith("7") ? "Acolhimento institucional" : item.id.endsWith("2") || item.id.endsWith("5") || item.id.endsWith("8") ? "Prevenção e convivência" : "Proteção em rede"
            map.set(g, (map.get(g) ?? 0) + item.paid)
        })
        return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
    }, [filtered])
    const byUnidade = React.useMemo(() => {
        const map = new Map<string, number>()
        filtered.forEach((item) => map.set(item.unidade, (map.get(item.unidade) ?? 0) + item.paid))
        return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
    }, [filtered])
    const byNatureza = React.useMemo(() => {
        const map = new Map<string, number>()
        filtered.forEach((item) => map.set(item.objeto, (map.get(item.objeto) ?? 0) + item.liquidated))
        return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
    }, [filtered])
    const dynamicTitle = React.useMemo(() => {
        const found = VIEWS.find((v) => v.key === view)?.label ?? title
        return found === "Visão geral" ? title : found
    }, [view, title])
    const periodCaption = `${year} • ${month === 0 ? "Todos os meses" : MONTHS[month]}`

    return (
        <div className="smdhc-root" style={{ position: "relative", width: "100%", height: "100%", display: "flex", background, color: textColor, fontFamily: `Instrument Sans, Inter, sans-serif`, ...font }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');
                .smdhc-root, .smdhc-root * { box-sizing: border-box; }
                .smdhc-root .layout { display:flex; width:100%; height:100%; min-height:0; container-type: inline-size; container-name:smdhc; }
                .smdhc-root .rail { width:60px; background:#0f2740; padding:8px 6px; flex-shrink:0; }
                .smdhc-root .context { width:252px; background:#fff; border-right:1px solid ${borderColor}; padding:18px 14px; display:flex; flex-direction:column; flex-shrink:0; }
                .smdhc-root .workspace { flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; background:#f5f7fa; }
                .smdhc-root .mobile-view { display:none; }
                .smdhc-root .header-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
                .smdhc-root .kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:${spacing}px; margin-top:14px; margin-bottom:${spacing}px; }
                .smdhc-root .chart-grid { display:grid; gap:${spacing}px; grid-template-columns:2fr 1fr; margin-bottom:${spacing}px; }
                @container smdhc (max-width: 980px){ .smdhc-root .context{display:none;} .smdhc-root .mobile-view{display:block;} .smdhc-root .kpis{grid-template-columns:repeat(2,minmax(0,1fr));} .smdhc-root .chart-grid{grid-template-columns:1fr;} }
                @container smdhc (max-width: 760px){ .smdhc-root .rail{display:none;} }
                @container smdhc (max-width: 470px){ .smdhc-root .kpis{grid-template-columns:1fr;} }
            `}</style>
            <div className="layout">
                <div className="rail">
                    <SidebarNavigation
                        items={AREA_ITEMS}
                        activeKey={activeArea}
                        railColor="#0f2740"
                        activeColor={brandBlue}
                        textColor="#FFFFFF"
                        radius={10}
                        font={font}
                        onNavigateKey={(key) =>
                            React.startTransition(() =>
                                setView(
                                    key === "estrutura"
                                        ? "estrutura-organizacional"
                                        : key === "funcional"
                                          ? "funcional-programatica"
                                          : key === "natureza"
                                            ? "natureza-despesa"
                                            : key === "credores"
                                              ? "gestao-credores"
                                              : "visao-geral"
                                )
                            )
                        }
                    />
                </div>
                <aside className="context">
                    <div style={{ fontSize: 20, color: "#1a4f8a", fontWeight: 700 }}>SMDHC</div>
                    <div style={{ fontSize: 12, color: mutedColor, marginBottom: 16 }}>Observatório do orçamento</div>
                    <div style={{ fontSize: 11, color: mutedColor, marginBottom: 8 }}>ANÁLISE</div>
                    <SecondaryNav
                        items={contextualItems}
                        activeIndex={view === "monitoramento-etl" ? 1 : 0}
                        background="#fff"
                        borderColor={borderColor}
                        activeBackground={blueLight}
                        textColor={textColor}
                        radius={radius}
                        font={font}
                        onSelectIndex={(idx) => {
                            if (activeArea !== "execucao") return
                            React.startTransition(() => setView(idx === 1 ? "monitoramento-etl" : "visao-geral"))
                        }}
                    />
                    <div style={{ marginTop: "auto", fontSize: 11, color: mutedColor }}>Órgão 34<br />Ambiente demonstrativo</div>
                </aside>
                <main className="workspace">
                <header style={{ minHeight: 76, background: surface, borderBottom: `1px solid ${borderColor}`, padding: "12px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 12, color: mutedColor }}>Dados demonstrativos • {periodCaption}</div>
                        <div style={{ fontSize: 22, fontWeight: 650 }}>{dynamicTitle}</div>
                    </div>
                    <div className="mobile-view">
                        <label style={{ display: "inline-grid", gap: 4, fontSize: 11, color: mutedColor }}>
                            Visualização
                        <select value={view} onChange={(e) => React.startTransition(() => setView(e.target.value as ViewKey))} style={{ padding: 8, borderRadius: radius, border: `1px solid ${borderColor}` }} aria-label="Selecionar visualização">
                            {VIEWS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
                        </select>
                        </label>
                    </div>
                    <div className="header-actions">
                        <StatusBadge label="Recorte temporal simulado" tone={pulse % 2 === 0 ? blueLight : greenLight} textColor={textColor} radius={999} font={font} />
                        <button disabled={view !== "visao-geral"} onClick={runRefresh} style={{ borderRadius: radius, border: `1px solid ${borderColor}`, padding: "8px 10px", background: "#fff", cursor: "pointer", opacity: view === "visao-geral" ? 1 : 0.5 }}>Atualizar simulação</button>
                        <button disabled={view !== "visao-geral"} onClick={exportCsv} style={{ borderRadius: radius, border: `1px solid ${borderColor}`, padding: "8px 10px", background: "#fff", cursor: "pointer", opacity: view === "visao-geral" ? 1 : 0.5 }}>Exportar CSV</button>
                    </div>
                </header>
                <section style={{ flex: 1, minHeight: 0, overflow: "auto", padding: Math.min(28, Math.max(24, spacing)) }}>
                    <div style={{ marginBottom: 12, fontSize: 12, color: mutedColor }}>Dados demonstrativos. Máscara de documento não é criptografia nem autenticação.</div>
                    {(view === "visao-geral" || view === "estrutura-organizacional" || view === "funcional-programatica" || view === "natureza-despesa") && <HeaderFilters years={YEARS} months={MONTHS} year={year} monthIndex={month} search={search} background={surface} borderColor={borderColor} radius={radius} textColor={textColor} mutedColor={mutedColor} font={font} onYearChange={(v) => React.startTransition(() => { setYear(v); setPage(1) })} onMonthChange={(v) => React.startTransition(() => { setMonth(v); setPage(1) })} onSearchChange={(v) => React.startTransition(() => { setSearch(v); setPage(1) })} />}
                    {view === "visao-geral" && (
                        <>
                            <div className="kpis">
                                {kpi.map((item) => (
                                    <MetricCard key={item.label} label={item.label} amount={item.value} total={Math.max(1, totals.budget)} color={item.color} background={surface} borderColor={borderColor} textColor={textColor} mutedColor={mutedColor} radius={10} font={font} />
                                ))}
                            </div>
                            <div className="chart-grid">
                                <FinancialChart data={monthly.map((m) => ({ month: m.m, saldo: m.saldo, aLiquidar: m.aLiquidar, aPagar: m.aPagar, pago: m.paid }))} saldoColor="#93b8e0" liquidarColor="#1a4f8a" pagarColor="#2d9e6b" pagoColor="#1e7d4f" background={surface} borderColor={borderColor} textColor={textColor} mutedColor={mutedColor} radius={10} title="Evolução da execução" subtitle="Distribuição mensal • valores demonstrativos" />
                                <div style={{ background: surface, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Composição do orçamento</div>
                                    <div style={{ display: "grid", gap: 8 }}>
                                        {composition.map((item) => {
                                            const pct = compositionTotal > 0 ? (item.amount / compositionTotal) * 100 : 0
                                            return <div key={item.label}><div style={{ fontSize: 12 }}>{item.label}</div><div style={{ marginTop: 4, height: 6, background: blueLight, borderRadius: 6 }}><div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: item.color, borderRadius: 6 }} /></div><div style={{ marginTop: 2, fontSize: 11, color: mutedColor }}>{pct.toFixed(1)}% • {brl(item.amount)}</div></div>
                                        })}
                                        <div style={{ fontSize: 11, color: mutedColor }}>Órgão 34 • Função 08 • Subfunção 243 • Programa 4019 • Fonte 00</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ background: surface, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 12 }}>
                                <div style={{ fontSize: 12, color: mutedColor, marginBottom: 8 }}>
                                    Nota: os estágios são encadeados; para evitar dupla contagem usa-se Saldo disponível, A liquidar, A pagar e Pago.
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <div style={{ fontSize: 12, color: mutedColor }}>Registros por página</div>
                                        <select aria-label="Registros por página" value={pageSize} onChange={(e) => React.startTransition(() => { setPageSize(Math.min(50, Number(e.target.value))); setPage(1) })} style={{ border: `1px solid ${borderColor}`, borderRadius: radius, padding: 6 }}>
                                            {[6, 12, 24, 50].map((n) => <option key={n}>{n}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <DataTable rows={filtered.map((r) => ({ id: r.id, mes: MONTHS[r.month], unidade: r.unidade, documento: r.documento, favorecido: r.favorecido, valor: brl(r.paid) }))} borderColor={borderColor} background={surface} textColor={textColor} mutedColor={mutedColor} radius={radius} pageSize={pageSize} page={safePage} onPrev={() => React.startTransition(() => setPage((p) => Math.max(1, p - 1)))} onNext={() => React.startTransition(() => setPage((p) => Math.min(pageCount, p + 1)))} />
                            </div>
                        </>
                    )}
                    {view === "monitoramento-etl" && (
                        <div style={{ background: surface, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 16 }}>
                            <h3 style={{ margin: "0 0 8px 0" }}>Monitoramento de ETL</h3>
                            <p style={{ margin: "0 0 12px 0", color: mutedColor }}>Resumo demonstrativo sanitizado (sem payload pessoal).</p>
                            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                                <StatusBadge label="Carregado: 1" tone={greenLight} textColor={textColor} radius={999} font={font} />
                                <StatusBadge label="Pendente: 1" tone="#fff4e5" textColor={textColor} radius={999} font={font} />
                                <StatusBadge label="Erro: 1" tone="#fdecec" textColor={textColor} radius={999} font={font} />
                            </div>
                            <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", minWidth: 700, fontSize: 12, borderCollapse: "collapse" }}>
                                <thead><tr><th align="left">Carga</th><th align="left">Status</th><th align="left">Última execução</th><th align="left">Linhas</th></tr></thead>
                                <tbody>
                                    {etlRows.map((r, i) => (
                                        <tr key={r.nome} style={{ background: etlSelected === i ? blueLight : "transparent" }}>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}><button onClick={() => React.startTransition(() => setEtlSelected(i))} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", color: textColor }}>{r.nome}</button></td>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}><StatusBadge label={r.status} tone={r.status === "Carregado" ? greenLight : r.status === "Pendente" ? "#fff4e5" : "#fdecec"} textColor={textColor} radius={999} font={font} /></td>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{r.hora}</td>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{r.linhas}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                            <div style={{ marginTop: 12, background: "#fff7e8", border: `1px solid ${warningColor}`, padding: 10, borderRadius: radius, fontSize: 12 }}>
                                Detalhe sanitizado: {etlRows[etlSelected].detalhe}
                            </div>
                        </div>
                    )}
                    {view === "estrutura-organizacional" && <div style={{ background: surface, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 16 }}><div style={{ marginBottom: 4, fontWeight: 600 }}>Estrutura Organizacional</div><div style={{ marginBottom: 10, color: mutedColor, fontSize: 12 }}>Órgão 34 • Recorte {periodCaption}</div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 12 }}><thead><tr><th align="left">Órgão</th><th align="left">Unidade</th><th align="left">Pago (dados demonstrativos)</th><th align="left">Participação</th></tr></thead><tbody>{byUnidade.map((n) => { const pct = totals.paid > 0 ? (n.value / totals.paid) * 100 : 0; return <tr key={n.label}><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>Órgão 34</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{n.label}</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{brl(n.value)}</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{pct.toFixed(1)}%</td></tr> })}</tbody></table></div></div>}
                    {view === "funcional-programatica" && <div style={{ background: surface, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 16 }}><div style={{ marginBottom: 4, fontWeight: 600 }}>Funcional-Programática</div><div style={{ marginBottom: 10, color: mutedColor, fontSize: 12 }}>Função 08 • Subfunção 243 • Programa 4019 • Recorte {periodCaption}</div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 12 }}><thead><tr><th align="left">Função</th><th align="left">Subfunção</th><th align="left">Programa</th><th align="left">Categoria ilustrativa</th><th align="left">Pago</th></tr></thead><tbody>{functionalBucket.map((c) => <tr key={c.label}><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>Função 08</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>Subfunção 243</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>Programa 4019</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{c.label}</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{brl(c.value)}</td></tr>)}</tbody></table></div></div>}
                    {view === "natureza-despesa" && <div style={{ background: surface, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 16 }}><div style={{ marginBottom: 4, fontWeight: 600 }}>Natureza da Despesa</div><div style={{ marginBottom: 10, color: mutedColor, fontSize: 12 }}>Fonte 00 • Recorte {periodCaption}</div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 12 }}><thead><tr><th align="left">Fonte</th><th align="left">Categoria ilustrativa</th><th align="left">Valor liquidado</th><th align="left">Participação</th></tr></thead><tbody>{byNatureza.map((c) => { const pct = totals.liquidated > 0 ? (c.value / totals.liquidated) * 100 : 0; return <tr key={c.label}><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>Fonte 00</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{c.label}</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{brl(c.value)}</td><td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{pct.toFixed(1)}%</td></tr> })}</tbody></table></div><div style={{ marginTop: 8, fontSize: 11, color: mutedColor }}>Categorias acima são ilustrativas e não representam classificação oficial.</div></div>}
                    {view === "gestao-credores" && (
                        <div style={{ background: surface, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 16 }}>
                            <h3 style={{ marginTop: 0 }}>Gestão de Credores (SCD2 demonstrativo)</h3>
                            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                                <button onClick={() => React.startTransition(() => setCredorTab(0))} style={{ border: `1px solid ${borderColor}`, borderRadius: radius, padding: "6px 10px", background: credorTab === 0 ? blueLight : "#fff" }}>Todos</button>
                                <button onClick={() => React.startTransition(() => setCredorTab(1))} style={{ border: `1px solid ${borderColor}`, borderRadius: radius, padding: "6px 10px", background: credorTab === 1 ? blueLight : "#fff" }}>Ativos</button>
                                <button onClick={() => React.startTransition(() => setCredorTab(2))} style={{ border: `1px solid ${borderColor}`, borderRadius: radius, padding: "6px 10px", background: credorTab === 2 ? blueLight : "#fff" }}>Histórico</button>
                                <label style={{ marginLeft: "auto", fontSize: 11, color: mutedColor, display: "inline-grid", gap: 4 }}>Buscar credor<input aria-label="Buscar credor" value={credorSearch} onChange={(e) => React.startTransition(() => setCredorSearch(e.target.value))} placeholder="Buscar credor..." style={{ padding: 7, borderRadius: radius, border: `1px solid ${borderColor}` }} /></label>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", minWidth: 820, fontSize: 12, borderCollapse: "collapse" }}>
                                <thead><tr><th align="left">ID</th><th align="left">Credor</th><th align="left">Documento</th><th align="left">Status</th><th align="left">Válido de</th><th align="left">Válido até</th></tr></thead>
                                <tbody>
                                    {credoresFiltrados.map((c) => (
                                        <tr key={`${c.id}-${c.de}`}>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{c.id}</td>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{c.nome}</td>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{c.doc}</td>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}><StatusBadge label={c.status} tone={c.status === "Ativa" ? greenLight : blueLight} textColor={textColor} radius={999} font={font} /></td>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{c.de}</td>
                                            <td style={{ padding: 8, borderTop: `1px solid ${borderColor}` }}>{c.ate}</td>
                                        </tr>
                                    ))}
                                    {credoresFiltrados.length === 0 && <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: mutedColor }}>Nenhum credor encontrado no recorte demonstrativo.</td></tr>}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}
                </section>
            </main>
            </div>
        </div>
    )
}

addPropertyControls(SMDHCDashboard, {
    title: { type: ControlType.String, defaultValue: "Execução orçamentária" },
    initialView: {
        type: ControlType.Enum,
        defaultValue: "visao-geral",
        options: ["visao-geral", "monitoramento-etl", "estrutura-organizacional", "funcional-programatica", "natureza-despesa", "gestao-credores"],
        optionTitles: ["Visão geral", "Monitoramento de ETL", "Estrutura Organizacional", "Funcional-Programática", "Natureza da Despesa", "Gestão de Credores"],
    },
    initialYear: { type: ControlType.Enum, defaultValue: 2025, options: [2021, 2022, 2023, 2024, 2025] },
    sampleCount: { type: ControlType.Number, defaultValue: 126, min: 101, max: 500, step: 1 },
    brandBlue: { type: ControlType.Color, defaultValue: "#1a4f8a" },
    blueLight: { type: ControlType.Color, defaultValue: "#e8f0fa" },
    financeGreen: { type: ControlType.Color, defaultValue: "#1e7d4f" },
    greenLight: { type: ControlType.Color, defaultValue: "#e6f4ed" },
    warningColor: { type: ControlType.Color, defaultValue: "#b45309" },
    background: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    surface: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    borderColor: { type: ControlType.Color, defaultValue: "#EEEEEE" },
    textColor: { type: ControlType.Color, defaultValue: "#182638" },
    mutedColor: { type: ControlType.Color, defaultValue: "#667085" },
    radius: { type: ControlType.Number, defaultValue: 10, min: 4, max: 24, step: 1 },
    spacing: { type: ControlType.Number, defaultValue: 24, min: 16, max: 36, step: 1 },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 14, variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.45em" },
    },
})