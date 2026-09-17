// User request: reusable SecondaryNav for contextual sections in demonstrative SMDHC budget views.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface MyComponentProps {
    items: string[]
    activeIndex: number
    background: string
    borderColor: string
    activeBackground: string
    textColor: string
    radius: number
    font: any
    onSelect?: () => void
    onSelectIndex?: (index: number) => void
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function SecondaryNav(props: MyComponentProps) {
    const { items, activeIndex, background, borderColor, activeBackground, textColor, radius, font, onSelect, onSelectIndex } = props
    return (
        <div style={{ position: "relative", width: "100%", background, border: `1px solid ${borderColor}`, borderRadius: radius, padding: 10, display: "grid", gap: 8 }}>
            {items.map((item, idx) => (
                <button key={`${item}-${idx}`} onClick={() => { onSelect?.(); onSelectIndex?.(idx) }} style={{ padding: "8px 10px", border: `1px solid ${idx === activeIndex ? activeBackground : borderColor}`, textAlign: "left", borderRadius: radius, background: idx === activeIndex ? activeBackground : "#fff", color: textColor, fontFamily: "Instrument Sans, Inter, sans-serif", ...font }}>
                    {item}
                </button>
            ))}
        </div>
    )
}

addPropertyControls(SecondaryNav, {
    items: {
        type: ControlType.Array,
        control: { type: ControlType.String, defaultValue: "Visão geral" },
        defaultValue: ["Visão geral", "Monitoramento de ETL"],
    },
    activeIndex: { type: ControlType.Number, defaultValue: 0, min: 0, max: 10, step: 1 },
    background: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    borderColor: { type: ControlType.Color, defaultValue: "#EEEEEE" },
    activeBackground: { type: ControlType.Color, defaultValue: "#EAF1FF" },
    textColor: { type: ControlType.Color, defaultValue: "#000000" },
    radius: { type: ControlType.Number, defaultValue: 10, min: 2, max: 24, step: 1 },
    onSelect: { type: ControlType.EventHandler },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 13, variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.1em" },
    },
})