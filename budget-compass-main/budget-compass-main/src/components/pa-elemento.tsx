import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";

import { fmtNum, fmtPct, isEmenda, pautaDe, type Linha } from "@/lib/orcamento";
import { isEstagioEmpenho, type Empenho } from "@/lib/empenhos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type NoElemento = {
  elemento: string;
  elementoNome: string;
  atualizado: number;
  inicial: number;
  empenhado: number;
  pago: number;
  saldo: number;
};

export type NoPA = {
  chave: string;
  orgao: string;
  pa: string;
  paNome: string;
  pauta: string;
  classificacao: string;
  inicial: number;
  atualizado: number;
  empenhado: number;
  pago: number;
  saldo: number;
  elementos: NoElemento[];
};

export type NoPauta = {
  chave: string;      // === pauta
  pauta: string;
  inicial: number;
  atualizado: number;
  empenhado: number;
  pago: number;
  saldo: number;
  elementos: NoElemento[];
};

/** Agrupa por Projeto/Atividade → Elemento de Despesa */
export function montarArvore(rows: Linha[]): NoPA[] {
  const mapa = new Map<string, NoPA & { _el: Map<string, NoElemento> }>();
  for (const l of rows) {
    const chave = `${l.orgao}-${l.pa}`;
    let no = mapa.get(chave);
    if (!no) {
      no = {
        chave,
        orgao: l.orgao,
        pa: l.pa,
        paNome: l.paNome,
        pauta: pautaDe(l),
        classificacao: isEmenda(l.pa) ? "Emenda ao orçamento" : l.tipoPA,
        inicial: 0,
        atualizado: 0,
        empenhado: 0,
        pago: 0,
        saldo: 0,
        elementos: [],
        _el: new Map(),
      };
      mapa.set(chave, no);
    }
    no.inicial += l.inicial;
    no.atualizado += l.atualizado;
    no.empenhado += l.empenhado;
    no.pago += l.pago;
    no.saldo += l.saldo;
    const el =
      no._el.get(l.rubrica) ??
      ({
        elemento: l.rubrica,
        elementoNome: l.rubricaNome,
        inicial: 0,
        atualizado: 0,
        empenhado: 0,
        pago: 0,
        saldo: 0,
      } as NoElemento);
    el.inicial += l.inicial;
    el.atualizado += l.atualizado;
    el.empenhado += l.empenhado;
    el.pago += l.pago;
    el.saldo += l.saldo;
    no._el.set(l.rubrica, el);
  }
  return [...mapa.values()]
    .map(({ _el, ...n }) => ({
      ...n,
      elementos: [...(_el as Map<string, NoElemento>).values()].sort(
        (a, b) => b.atualizado - a.atualizado,
      ),
    }))
    .sort((a, b) => b.atualizado - a.atualizado);
}

/** Agrupa por Política Pública → Elemento de Despesa */
function montarArvorePauta(rows: Linha[]): NoPauta[] {
  const mapa = new Map<string, NoPauta & { _el: Map<string, NoElemento> }>();
  for (const l of rows) {
    const pauta = pautaDe(l);
    let no = mapa.get(pauta);
    if (!no) {
      no = {
        chave: pauta,
        pauta,
        inicial: 0,
        atualizado: 0,
        empenhado: 0,
        pago: 0,
        saldo: 0,
        elementos: [],
        _el: new Map(),
      };
      mapa.set(pauta, no);
    }
    no.inicial += l.inicial;
    no.atualizado += l.atualizado;
    no.empenhado += l.empenhado;
    no.pago += l.pago;
    no.saldo += l.saldo;
    const el =
      no._el.get(l.rubrica) ??
      ({
        elemento: l.rubrica,
        elementoNome: l.rubricaNome,
        inicial: 0,
        atualizado: 0,
        empenhado: 0,
        pago: 0,
        saldo: 0,
      } as NoElemento);
    el.inicial += l.inicial;
    el.atualizado += l.atualizado;
    el.empenhado += l.empenhado;
    el.pago += l.pago;
    el.saldo += l.saldo;
    no._el.set(l.rubrica, el);
  }
  return [...mapa.values()]
    .map(({ _el, ...n }) => ({
      ...n,
      elementos: [...(_el as Map<string, NoElemento>).values()].sort(
        (a, b) => b.atualizado - a.atualizado,
      ),
    }))
    .sort((a, b) => b.atualizado - a.atualizado);
}

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

/** Tabela compartilhada de linhas de elemento */
function LinhasElemento({
  elementos,
  chave,
  orgao,
  pa,
  paNome,
  empenhosPorChave,
  detalhe,
  setDetalhe,
}: {
  elementos: NoElemento[];
  chave: string;
  orgao: string;
  pa?: string;
  paNome?: string;
  empenhosPorChave: Map<string, Empenho[]>;
  detalhe: string | null;
  setDetalhe: (k: string | null) => void;
}) {
  return (
    <>
      {elementos.map((el) => {
        const k = `${chave}-${el.elemento}`;
        const listaBruta = empenhosPorChave.get(`${orgao}-${el.elemento}`) ?? [];
        const lista = listaBruta.filter((e) => {
          if (pa === "2106") {
            // PA 2106: Somente custos de estágio (não há fornecedores de empresas em 33903900 da 2106)
            return isEstagioEmpenho(e);
          }
          if (pa === "2100") {
            // PA 2100: Administração da Unidade (contratos da administração)
            const ehAdm = e.politica === "Administração" || e.coordenacao === "ADM" || e.acao === "ADM";
            return ehAdm && !isEstagioEmpenho(e);
          }
          return true;
        });
        return (
          <Fragment key={k}>
            <tr
              className="cursor-pointer border-t border-border/40 bg-muted/20 text-[13px] hover:bg-muted/40"
              onClick={() => setDetalhe(detalhe === k ? null : k)}
            >
              <td className="px-4 py-2 pl-12">
                <span className="text-foreground">
                  {el.elemento} — {el.elementoNome}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {lista.length} empenho(s)
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(el.inicial)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(el.atualizado)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(el.empenhado)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(el.pago)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtNum(el.saldo)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {fmtPct(pct(el.empenhado, el.atualizado))}
              </td>
            </tr>
            {detalhe === k && (
              <tr className="border-t border-border/40 bg-background">
                <td colSpan={7} className="px-4 py-3 pl-12">
                  {lista.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Sem empenhos registrados para este elemento de despesa{pa ? ` no PA ${pa}` : ` no órgão ${orgao}`}.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="py-1 pr-3 font-semibold">Empenho</th>
                          <th className="py-1 pr-3 font-semibold">Data</th>
                          <th className="py-1 pr-3 font-semibold">Fornecedor</th>
                          <th className="py-1 pr-3 font-semibold">Projeto / Atividade</th>
                          <th className="py-1 pr-3 text-right font-semibold">Empenhado</th>
                          <th className="py-1 pr-3 text-right font-semibold">Liquidado</th>
                          <th className="py-1 text-right font-semibold">Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lista.slice(0, 60).map((e, i) => (
                          <tr key={`${e.empenho}-${i}`} className="border-t border-border/30">
                            <td className="py-1 pr-3 tabular-nums">{e.empenho}</td>
                            <td className="py-1 pr-3 tabular-nums">{e.data}</td>
                            <td className="max-w-[320px] py-1 pr-3">
                              {e.fornecedor}
                              <span className="block text-[11px] text-muted-foreground">
                                {e.processo} • {e.objeto.slice(0, 110)}
                              </span>
                            </td>
                            <td className="py-1 pr-3">
                              {pa ? (
                                <>
                                  <span className="font-medium text-foreground">{pa}</span>
                                  {paNome && (
                                    <span className="block text-[11px] text-muted-foreground">
                                      {paNome}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {e.acao}
                                  <span className="block text-[11px] text-muted-foreground">
                                    {e.politica}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="py-1 pr-3 text-right tabular-nums">
                              {fmtNum(e.empenhado)}
                            </td>
                            <td className="py-1 pr-3 text-right tabular-nums">
                              {fmtNum(e.liquidado)}
                            </td>
                            <td className="py-1 text-right tabular-nums">{fmtNum(e.pago)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {lista.length > 60 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Exibindo 60 de {lista.length} empenhos — a lista completa está no relatório PDF.
                    </p>
                  )}
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

export function PainelPaElemento({
  rows = [],
  empenhos = [],
  pas = [],
  pautas = [],
}: {
  rows: Linha[];
  empenhos: Empenho[];
  /** PAs selecionados no filtro */
  pas?: string[];
  /** Políticas selecionadas no filtro */
  pautas?: string[];
}) {
  // Modo de agrupamento: política quando só pautas selecionadas, PA caso contrário
  const modoPauta = (pautas?.length ?? 0) > 0 && (pas?.length ?? 0) === 0;

  const arvorePa = useMemo(() => (modoPauta ? [] : montarArvore(rows)), [rows, modoPauta]);
  const arvorePauta = useMemo(
    () => (modoPauta ? montarArvorePauta(rows) : []),
    [rows, modoPauta],
  );

  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [detalhe, setDetalhe] = useState<string | null>(null);

  const empenhosPorChave = useMemo(() => {
    const m = new Map<string, Empenho[]>();
    for (const e of empenhos) {
      const k = `${e.orgao}-${e.elemento}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return m;
  }, [empenhos]);

  // Sem filtro ativo → exibe orientação ao usuário
  const temFiltro = pas.length > 0 || pautas.length > 0;

  const tituloRelatorio = modoPauta
    ? "Ação política × elemento de despesa"
    : "Projeto / atividade × elemento de despesa";

  const subtitulo = modoPauta
    ? "Orçamento atualizado de cada política pública e o custo por elemento de despesa. Clique em um elemento para ver os empenhos."
    : "Orçamento atualizado de cada projeto/atividade e o custo por elemento de despesa. Clique em um elemento para ver os empenhos (fornecedor, processo, objeto e valores).";

  const cabecalhoLinha = modoPauta ? "Ação política · elemento" : "Projeto / atividade · elemento";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">{tituloRelatorio}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitulo}</p>
      </CardHeader>
      <CardContent className="p-0">
        {!temFiltro ? (
          /* Estado vazio — nenhuma seleção ativa */
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10">
              <Filter className="size-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Selecione um projeto/atividade ou política pública
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Use os filtros acima para escolher um <strong>Projeto/Atividade</strong> (PA) ou uma{" "}
                <strong>Política Pública</strong>. O relatório exibirá apenas as informações daquele
                recorte orçamentário.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">{cabecalhoLinha}</th>
                  <th className="px-3 py-3 text-right font-semibold">Inicial</th>
                  <th className="px-3 py-3 text-right font-semibold">Atualizado</th>
                  <th className="px-3 py-3 text-right font-semibold">Empenhado</th>
                  <th className="px-3 py-3 text-right font-semibold">Pago</th>
                  <th className="px-3 py-3 text-right font-semibold">Saldo dotação</th>
                  <th className="px-3 py-3 text-right font-semibold">% exec.</th>
                </tr>
              </thead>
              <tbody>
                {/* ── Modo PA ── */}
                {!modoPauta &&
                  arvorePa.map((n) => {
                    const aberto = abertos[n.chave];
                    return (
                      <Fragment key={n.chave}>
                        <tr
                          className="cursor-pointer border-t border-border/70 bg-card hover:bg-muted/40"
                          onClick={() =>
                            setAbertos((a) => ({ ...a, [n.chave]: !a[n.chave] }))
                          }
                        >
                          <td className="max-w-[520px] px-4 py-2.5">
                            <span className="flex items-center gap-2 font-medium text-foreground">
                              {aberto ? (
                                <ChevronDown className="size-4 shrink-0" />
                              ) : (
                                <ChevronRight className="size-4 shrink-0" />
                              )}
                              {n.pa} - {n.paNome}
                            </span>
                            <span className="ml-6 block text-xs text-muted-foreground">
                              {n.orgao} • {n.classificacao} • Política: {n.pauta} •{" "}
                              {n.elementos.length} elemento(s)
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtNum(n.inicial)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            {fmtNum(n.atualizado)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtNum(n.empenhado)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtNum(n.pago)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtNum(n.saldo)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            {fmtPct(pct(n.empenhado, n.atualizado))}
                          </td>
                        </tr>
                        {aberto && (
                          <LinhasElemento
                            elementos={n.elementos}
                            chave={n.chave}
                            orgao={n.orgao}
                            pa={n.pa}
                            paNome={n.paNome}
                            empenhosPorChave={empenhosPorChave}
                            detalhe={detalhe}
                            setDetalhe={setDetalhe}
                          />
                        )}
                      </Fragment>
                    );
                  })}

                {/* ── Modo Pauta ── */}
                {modoPauta &&
                  arvorePauta.map((n) => {
                    const aberto = abertos[n.chave];
                    return (
                      <Fragment key={n.chave}>
                        <tr
                          className="cursor-pointer border-t border-border/70 bg-card hover:bg-muted/40"
                          onClick={() =>
                            setAbertos((a) => ({ ...a, [n.chave]: !a[n.chave] }))
                          }
                        >
                          <td className="max-w-[520px] px-4 py-2.5">
                            <span className="flex items-center gap-2 font-medium text-foreground">
                              {aberto ? (
                                <ChevronDown className="size-4 shrink-0" />
                              ) : (
                                <ChevronRight className="size-4 shrink-0" />
                              )}
                              {n.pauta}
                            </span>
                            <span className="ml-6 block text-xs text-muted-foreground">
                              {n.elementos.length} elemento(s) de despesa
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtNum(n.inicial)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            {fmtNum(n.atualizado)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtNum(n.empenhado)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtNum(n.pago)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {fmtNum(n.saldo)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                            {fmtPct(pct(n.empenhado, n.atualizado))}
                          </td>
                        </tr>
                        {aberto && (
                          <LinhasElemento
                            elementos={n.elementos}
                            chave={n.chave}
                            orgao=""
                            empenhosPorChave={empenhosPorChave}
                            detalhe={detalhe}
                            setDetalhe={setDetalhe}
                          />
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
