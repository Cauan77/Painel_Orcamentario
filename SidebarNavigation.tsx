// User request: reusable SidebarNavigation for SMDHC demonstrative dashboard with 6 views.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface MyComponentProps {
    items: { label: string; key: string; icon: string }[]
    activeKey: string
    railColor: string
    activeColor: string
    textColor: string
    radius: number
    font: any
    onNavigate?: () => void
    onNavigateKey?: (key: string) => void
}

function Icon({ name }: { name: string }) {
    const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    if (name === "etl") return <svg {...common}><path d="M4 4h16v6H4z" /><path d="M4 14h10v6H4z" /><path d="M17 15v4" /><path d="M15 17h4" /></svg>
    if (name === "org") return <svg {...common}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="8.5" y="14" width="7" height="7" /><path d="M6.5 10v3h5" /><path d="M17.5 10v3h-5" /></svg>
    if (name === "func") return <svg {...common}><path d="M4 19V5" /><path d="M4 12h16" /><path d="M9 19v-7" /><path d="M15 19v-7" /><path d="M20 19v-7" /></svg>
    if (name === "natureza") return <svg {...common}><path d="M12 3v18" /><path d="M3 8h18" /><path d="M6 13h12" /><path d="M9 18h6" /></svg>
    if (name === "credores") return <svg {...common}><circle cx="8" cy="8" r="3.5" /><circle cx="16.5" cy="9" r="2.5" /><path d="M2.5 20c.8-3.2 3.2-5 5.5-5s4.8 1.8 5.5 5" /><path d="M13.5 20c.4-2 1.8-3.2 3.7-3.2 1.2 0 2.3.5 3 1.4" /></svg>
    return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function SidebarNavigation(props: MyComponentProps) {
    const { items, activeKey, railColor, activeColor, textColor, radius, font, onNavigate, onNavigateKey } = props
    return (
        <nav style={{ position: "relative", width: "100%", background: railColor, borderRadius: radius, padding: 8, display: "grid", gap: 8 }} aria-label="Navegação principal">
            {items.map((item) => (
                <button
                    key={item.key}
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => {
                        onNavigate?.()
                        onNavigateKey?.(item.key)
                    }}
                    style={{
                        padding: "9px 0",
                        border: "none",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: radius,
                        background: item.key === activeKey ? activeColor : "transparent",
                        color: textColor,
                        cursor: "pointer",
                        fontFamily: "Instrument Sans, Inter, sans-serif",
                        ...font,
                    }}
                >
                    <Icon name={item.icon} />
                </button>
            ))}
        </nav>
    )
}

addPropertyControls(SidebarNavigation, {
    items: {
        type: ControlType.Array,
        control: {
            type: ControlType.Object,
            controls: {
                label: { type: ControlType.String, defaultValue: "Visão geral" },
                key: { type: ControlType.String, defaultValue: "visao-geral" },
                icon: { type: ControlType.String, defaultValue: "etl" },
            },
        },
        defaultValue: [
            { label: "Execução Orçamentária", key: "visao-geral", icon: "etl" },
            { label: "Estrutura Organizacional", key: "estrutura-organizacional", icon: "org" },
        ],
    },
    activeKey: { type: ControlType.String, defaultValue: "visao-geral" },
    railColor: { type: ControlType.Color, defaultValue: "#0D1B2A" },
    activeColor: { type: ControlType.Color, defaultValue: "#2B5BA9" },
    textColor: { type: ControlType.Color, defaultValue: "#FFFFFF" },
    radius: { type: ControlType.Number, defaultValue: 8, min: 2, max: 24, step: 1 },
    onNavigate: { type: ControlType.EventHandler },
    font: {
        type: ControlType.Font,
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 12, variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.1em" },
    },
})