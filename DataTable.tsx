// User request: reusable DataTable with search, count, 6-row viewport and pagination controls for demonstrative data.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface RowItem {
    id: string
    mes: string
    unidade: string
    documento: string
    favorecido: string
    valor: string
}

interface MyComponentProps {
    rows: RowItem[]
    borderColor: string
    background: string
    textColor: string
    mutedColor: string
    radius: number
    pageSize: number
    page: number
    onPrev?: () => void
    onNext?: () => void
}

function Chevron({ right = false }: { right?: boolean }) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {right ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
        </svg>
    )
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function DataTable(props: MyComponentProps) {
    const { rows, borderColor, background, textColor, mutedColor, radius, pageSize, page, onPrev, onNext } = props
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
    const safePage = Math.min(page, pageCount)
    const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)
    return (
        <div style={{ position: "relative", width: "100%", background, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 12, color: textColor }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: mutedColor }}>{rows.length} registros demonstrativos</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <button aria-label="Página anterior" disabled={safePage <= 1} onClick={() => onPrev?.()} style={{ border: `1px solid ${borderColor}`, borderRadius: 8, padding: 6, background: "#fff", opacity: safePage <= 1 ? 0.4 : 1 }}>
                        <Chevron />
                    </button>
                    <span style={{ fontSize: 12, color: mutedColor }}>{safePage}/{pageCount}</span>
                    <button aria-label="Próxima página" disabled={safePage >= pageCount} onClick={() => onNext?.()} style={{ border: `1px solid ${borderColor}`, borderRadius: 8, padding: 6, background: "#fff", opacity: safePage >= pageCount ? 0.4 : 1 }}>
                        <Chevron right />
                    </button>
                </div>
            </div>
            <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 980, maxHeight: 270, overflowY: "auto", border: `1px solid ${borderColor}`, borderRadius: radius }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                            <tr>{["ID", "Mês", "Unidade", "Documento", "Favorecido", "Pago"].map((h) => <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${borderColor}` }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: 16, textAlign: "center", color: mutedColor }}>Nenhum resultado para esta busca demonstrativa.</td>
                                </tr>
                            )}
                            {pageRows.map((r) => (
                                <tr key={r.id}>
                                    <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>{r.id}</td>
                                    <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>{r.mes}</td>
                                    <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>{r.unidade}</td>
                                    <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>{r.documento}</td>
                                    <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>{r.favorecido}</td>
                                    <td style={{ padding: 8, borderBottom: `1px solid ${borderColor}` }}>{r.valor}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

addPropertyControls(DataTable, {
    rows: {
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: {
                id: { type: ControlType.String, defaultValue: "DEM-2025-0001" },
                mes: { type: ControlType.String, defaultValue: "Jan" },
                unidade: { type: ControlType.String, defaultValue: "org34 SMDHC" },
                documento: { type: ControlType.String, defaultValue: "CPF ***.***.***-**" },
                favorecido: { type: ControlType.String, defaultValue: "Empresa Alfa Demonstrativa" },
                valor: { type: ControlType.String, defaultValue: "R$ 120.000" },
            },
        },
        defaultValue: [{ id: "DEM-2025-0001", mes: "Jan", unidade: "org34 SMDHC", documento: "CPF ***.***.***-**", favorecido: "Empresa Alfa Demonstrativa", valor: "R$ 120.000" }],
    },
    borderColor: { type: ControlType.Color, defaultValue: "#EEEEEE" },
    background: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    textColor: { type: ControlType.Color, defaultValue: "#182638" },
    mutedColor: { type: ControlType.Color, defaultValue: "#667085" },
    radius: { type: ControlType.Number, defaultValue: 10, min: 2, max: 24, step: 1 },
    pageSize: { type: ControlType.Number, defaultValue: 6, min: 1, max: 50, step: 1 },
    page: { type: ControlType.Number, defaultValue: 1, min: 1, max: 20, step: 1 },
    onPrev: { type: ControlType.EventHandler },
    onNext: { type: ControlType.EventHandler },
})