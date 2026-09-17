// User request: reusable HeaderFilters with dynamic year/month/search controls for demonstrative local data.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface MyComponentProps {
    years: number[]
    months: string[]
    year: number
    monthIndex: number
    search: string
    background: string
    borderColor: string
    radius: number
    textColor: string
    mutedColor: string
    font: any
    onYearChange?: (value: number) => void
    onMonthChange?: (value: number) => void
    onSearchChange?: (value: string) => void
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function HeaderFilters(props: MyComponentProps) {
    const { years, months, year, monthIndex, search, background, borderColor, radius, textColor, mutedColor, font, onYearChange, onMonthChange, onSearchChange } = props
    return (
        <div style={{ position: "relative", width: "100%", background, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 10, display: "flex", flexWrap: "wrap", gap: 8, color: textColor, fontFamily: "Instrument Sans, Inter, sans-serif", ...font }}>
            <select aria-label="Ano" value={year} onChange={(e) => onYearChange?.(Number(e.target.value))} style={{ padding: 8, border: `1px solid ${borderColor}`, borderRadius: radius }}>
                {years.map((y) => <option key={y}>{y}</option>)}
            </select>
            <select aria-label="Mês" value={monthIndex} onChange={(e) => onMonthChange?.(Number(e.target.value))} style={{ padding: 8, border: `1px solid ${borderColor}`, borderRadius: radius }}>
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <input aria-label="Buscar" value={search} onChange={(e) => onSearchChange?.(e.target.value)} style={{ flex: 1, minWidth: 180, padding: 8, border: `1px solid ${borderColor}`, borderRadius: radius }} />
            <span style={{ fontSize: 11, color: mutedColor }}>Recorte temporal simulado</span>
        </div>
    )
}

addPropertyControls(HeaderFilters, {
    years: { type: ControlType.Array, control: { type: ControlType.Number, defaultValue: 2025 }, defaultValue: [2021, 2022, 2023, 2024, 2025] },
    months: { type: ControlType.Array, control: { type: ControlType.String, defaultValue: "Jan" }, defaultValue: ["Todos", "Jan", "Fev", "Mar"] },
    year: { type: ControlType.Number, defaultValue: 2025, min: 2021, max: 2030, step: 1 },
    monthIndex: { type: ControlType.Number, defaultValue: 0, min: 0, max: 12, step: 1 },
    search: { type: ControlType.String, defaultValue: "DEM-2025", placeholder: "Buscar..." },
    background: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    borderColor: { type: ControlType.Color, defaultValue: "#EEEEEE" },
    textColor: { type: ControlType.Color, defaultValue: "#000000" },
    mutedColor: { type: ControlType.Color, defaultValue: "#CCCCCC" },
    radius: { type: ControlType.Number, defaultValue: 10, min: 2, max: 24, step: 1 },
    onYearChange: { type: ControlType.EventHandler },
    onMonthChange: { type: ControlType.EventHandler },
    onSearchChange: { type: ControlType.EventHandler },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 13, variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.2em" },
    },
})