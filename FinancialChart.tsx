// User request: reusable FinancialChart for demonstrative monthly budget stages with no backend dependency.
import * as React from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

interface Point {
    month: string
    saldo: number
    aLiquidar: number
    aPagar: number
    pago: number
}

interface MyComponentProps {
    data: Point[]
    saldoColor: string
    liquidarColor: string
    pagarColor: string
    pagoColor: string
    background: string
    borderColor: string
    textColor: string
    mutedColor: string
    radius: number
    title: string
    subtitle: string
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function FinancialChart(props: MyComponentProps) {
    const { data, saldoColor, liquidarColor, pagarColor, pagoColor, background, borderColor, textColor, mutedColor, radius, title, subtitle } = props
    const isStatic = useIsStaticRenderer()
    const max = React.useMemo(() => Math.max(1, ...data.map((d) => d.saldo + d.aLiquidar + d.aPagar + d.pago)), [data])
    const ticks = React.useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t)), [max])
    const toM = (value: number) => `${(value / 1000000).toFixed(1)}M`
    return (
        <div style={{ position: "relative", width: "100%", height: 320, background, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 12, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: textColor }}>{title}</div>
            <div style={{ fontSize: 12, color: mutedColor, marginBottom: 6 }}>{subtitle}</div>
            <div style={{ flex: 1, minHeight: 0 }}>
            <svg viewBox="0 0 920 280" width="100%" height="100%" role="img" aria-label="Gráfico empilhado demonstrativo">
                {ticks.map((tick, idx) => {
                    const y = 220 - (tick / max) * 170
                    return (
                        <g key={idx}>
                            <line x1="56" x2="900" y1={y} y2={y} stroke="#e9eef5" />
                            <text x="8" y={y + 4} fontSize="10" fill={mutedColor}>
                                {toM(tick)}
                            </text>
                        </g>
                    )
                })}
                {data.map((d, i) => {
                    const x = 62 + i * 68
                    const hs = (d.saldo / max) * 170
                    const hl = (d.aLiquidar / max) * 170
                    const hp = (d.aPagar / max) * 170
                    const hg = (d.pago / max) * 170
                    let y = 220
                    return (
                        <g key={`${d.month}-${i}`}>
                            <rect x={x} y={y - hs} width={38} height={hs} fill={saldoColor} />
                            {(() => {
                                y -= hs
                                return null
                            })()}
                            <rect x={x} y={y - hl} width={38} height={hl} fill={liquidarColor} />
                            {(() => {
                                y -= hl
                                return null
                            })()}
                            <rect x={x} y={y - hp} width={38} height={hp} fill={pagarColor} />
                            {(() => {
                                y -= hp
                                return null
                            })()}
                            <rect x={x} y={y - hg} width={38} height={hg} fill={pagoColor} />
                            {!isStatic && <title>{`${d.month} (Dados demonstrativos)`}</title>}
                            <text x={x + 19} y={245} textAnchor="middle" fontSize="10" fill={mutedColor}>
                                {d.month}
                            </text>
                        </g>
                    )
                })}
            </svg>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: mutedColor }}>
                {[
                    ["Saldo disponível", saldoColor],
                    ["A liquidar", liquidarColor],
                    ["A pagar", pagarColor],
                    ["Pago", pagoColor],
                ].map(([label, color]) => (
                    <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                        {label}
                    </span>
                ))}
            </div>
        </div>
    )
}

addPropertyControls(FinancialChart, {
    data: {
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: {
                month: { type: ControlType.String, defaultValue: "Jan" },
                saldo: { type: ControlType.Number, defaultValue: 320000, min: 0, max: 999999999 },
                aLiquidar: { type: ControlType.Number, defaultValue: 180000, min: 0, max: 999999999 },
                aPagar: { type: ControlType.Number, defaultValue: 110000, min: 0, max: 999999999 },
                pago: { type: ControlType.Number, defaultValue: 220000, min: 0, max: 999999999 },
            },
        },
        defaultValue: [{ month: "Jan", saldo: 320000, aLiquidar: 180000, aPagar: 110000, pago: 220000 }],
    },
    saldoColor: { type: ControlType.Color, defaultValue: "#93b8e0" },
    liquidarColor: { type: ControlType.Color, defaultValue: "#1a4f8a" },
    pagarColor: { type: ControlType.Color, defaultValue: "#2d9e6b" },
    pagoColor: { type: ControlType.Color, defaultValue: "#1e7d4f" },
    background: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    borderColor: { type: ControlType.Color, defaultValue: "#EEEEEE" },
    textColor: { type: ControlType.Color, defaultValue: "#182638" },
    mutedColor: { type: ControlType.Color, defaultValue: "#667085" },
    radius: { type: ControlType.Number, defaultValue: 10, min: 2, max: 24, step: 1 },
    title: { type: ControlType.String, defaultValue: "Evolução da execução" },
    subtitle: { type: ControlType.String, defaultValue: "Distribuição mensal • valores demonstrativos" },
})