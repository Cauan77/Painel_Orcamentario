export type SerieGrafico = {
  nome: string;
  Inicial: number;
  Atualizado: number;
  Empenhado: number;
};

const SERIES: Array<{ chave: keyof Omit<SerieGrafico, "nome">; cor: string }> = [
  { chave: "Inicial", cor: "#7c93b8" },
  { chave: "Atualizado", cor: "#123a63" },
  { chave: "Empenhado", cor: "#d98322" },
];

/** Desenha o gráfico de barras agrupadas em canvas e devolve um PNG (data URL) para o PDF. */
export function graficoParaCanvas(dados: SerieGrafico[]): HTMLCanvasElement | undefined {
  if (!dados.length) return undefined;
  const L = 1600;
  const A = 640;
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, L, A);

  const margem = { top: 50, right: 20, bottom: 170, left: 110 };
  const larg = L - margem.left - margem.right;
  const alt = A - margem.top - margem.bottom;
  const max = Math.max(
    1,
    ...dados.flatMap((d) => [d.Inicial, d.Atualizado, d.Empenhado]),
  );

  ctx.strokeStyle = "#dde3ea";
  ctx.fillStyle = "#5b6673";
  ctx.font = "18px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 5; i++) {
    const y = margem.top + alt - (alt * i) / 5;
    ctx.beginPath();
    ctx.moveTo(margem.left, y);
    ctx.lineTo(margem.left + larg, y);
    ctx.stroke();
    ctx.fillText(`${Math.round(((max * i) / 5 / 1_000_000) * 10) / 10}M`, margem.left - 12, y + 6);
  }

  const passo = larg / dados.length;
  const largBarra = Math.min(28, (passo * 0.7) / SERIES.length);

  dados.forEach((d, i) => {
    const base = margem.left + passo * i + passo / 2;
    SERIES.forEach((s, j) => {
      const v = d[s.chave] || 0;
      const h = (v / max) * alt;
      const x = base - (largBarra * SERIES.length) / 2 + j * largBarra;
      ctx.fillStyle = s.cor;
      ctx.fillRect(x, margem.top + alt - h, largBarra - 2, h);
    });
    ctx.save();
    ctx.translate(base, margem.top + alt + 14);
    ctx.rotate(-Math.PI / 5);
    ctx.textAlign = "right";
    ctx.fillStyle = "#3b4654";
    ctx.font = "17px Helvetica, Arial, sans-serif";
    ctx.fillText(d.nome.length > 40 ? `${d.nome.slice(0, 38)}…` : d.nome, 0, 0);
    ctx.restore();
  });

  // Legenda
  let lx = margem.left;
  const ly = 26;
  ctx.textAlign = "left";
  ctx.font = "19px Helvetica, Arial, sans-serif";
  SERIES.forEach((s) => {
    ctx.fillStyle = s.cor;
    ctx.fillRect(lx, ly - 13, 16, 16);
    ctx.fillStyle = "#3b4654";
    ctx.fillText(s.chave, lx + 24, ly);
    lx += 40 + ctx.measureText(s.chave).width * 1.1 + 60;
  });

  return canvas;
}
