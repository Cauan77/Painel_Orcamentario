// User request: reusable MetricCard for SMDHC dashboard demonstrative values.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface MyComponentProps {
    label: string
    amount: number
    total: number
    color: string
    background: string
    borderColor: string
    textColor: string
    mutedColor: string
    radius: number
    font: any
}

function formatBRL(v: number): string {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function MetricCard(props: MyComponentProps) {
    const { label, amount, total, color, background, borderColor, textColor, mutedColor, radius, font } = props
    const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0
    return (
        <div style={{ position: "relative", width: "100%", background, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 14, color: textColor, fontFamily: "Instrument Sans, Inter, sans-serif", fontSize: 14, lineHeight: 1.45, ...font }}>
            <div style={{ fontSize: 12, color: mutedColor, lineHeight: 1.45 }}>{label}</div>
            <div style={{ fontSize: "clamp(18px,1.8cqw,26px)", fontWeight: 700, marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatBRL(amount)}</div>
            <div style={{ marginTop: 8, height: 5, borderRadius: 4, background: "#EEF3FA" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: mutedColor, lineHeight: 1.45 }}>{pct.toFixed(1)}%</div>
        </div>
    )
}

addPropertyControls(MetricCard, {
    label: { type: ControlType.String, defaultValue: "Orçamento" },
    amount: { type: ControlType.Number, defaultValue: 3500000, min: 0, max: 999999999, step: 1000 },
    total: { type: ControlType.Number, defaultValue: 5000000, min: 1, max: 999999999, step: 1000 },
    color: { type: ControlType.Color, defaultValue: "#2B5BA9" },
    background: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    borderColor: { type: ControlType.Color, defaultValue: "#EEEEEE" },
    textColor: { type: ControlType.Color, defaultValue: "#000000" },
    mutedColor: { type: ControlType.Color, defaultValue: "#CCCCCC" },
    radius: { type: ControlType.Number, defaultValue: 10, min: 4, max: 24, step: 1 },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 14, variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.2em" },
    },
})