// User request: reusable StatusBadge for demonstrative SMDHC dashboard states, with clear non-sensitive labels.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface MyComponentProps {
    label: string
    tone: string
    textColor: string
    radius: number
    font: any
}

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function StatusBadge(props: MyComponentProps) {
    const { label, tone, textColor, radius, font } = props
    return (
        <span
            style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: radius,
                padding: "4px 10px",
                background: tone,
                color: textColor,
                fontFamily: "Instrument Sans, Inter, sans-serif",
                ...font,
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor", opacity: 0.75 }} />
            {label}
        </span>
    )
}

addPropertyControls(StatusBadge, {
    label: { type: ControlType.String, defaultValue: "Ativa" },
    tone: { type: ControlType.Color, defaultValue: "#E7F7F0" },
    textColor: { type: ControlType.Color, defaultValue: "#000000" },
    radius: { type: ControlType.Number, defaultValue: 999, min: 2, max: 999, step: 1 },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 11, variant: "Semibold", letterSpacing: "-0.01em", lineHeight: "1em" },
    },
})