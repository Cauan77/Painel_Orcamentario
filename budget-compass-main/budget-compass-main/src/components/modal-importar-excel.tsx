import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  FileCheck2,
  Trash2,
} from "lucide-react";
import {
  parseExcelExecucao,
  parseExcelEmpenhos,
  parseExcelContratos,
  formatarDataBR,
  type ResultadoParseExecucao,
  type ResultadoParseEmpenhos,
  type ResultadoParseContratos,
} from "@/lib/excel-parser";
import { fmtMoeda, fmtNum } from "@/lib/orcamento";
import { useServerFn } from "@tanstack/react-start";
import { postSalvarBaseExecucao, postSalvarEmpenhos, postSalvarContratos } from "@/lib/execucao-source.functions";
import { useQueryClient } from "@tanstack/react-query";

type Tipo = "execucao" | "empenhos" | "contratos";

interface ModalImportarExcelProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}

export function ModalImportarExcel({ aberto, onOpenChange }: ModalImportarExcelProps) {
  const [tipo, setTipo] = useState<Tipo>("execucao");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const [resultadoExecucao, setResultadoExecucao] = useState<ResultadoParseExecucao | null>(null);
  const [resultadoEmpenhos, setResultadoEmpenhos] = useState<ResultadoParseEmpenhos | null>(null);
  const [resultadoContratos, setResultadoContratos] = useState<ResultadoParseContratos | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const fnSalvarExecucao = useServerFn(postSalvarBaseExecucao);
  const fnSalvarEmpenhos = useServerFn(postSalvarEmpenhos);
  const fnSalvarContratos = useServerFn(postSalvarContratos);

  const limparEstado = () => {
    setArquivo(null);
    setResultadoExecucao(null);
    setResultadoEmpenhos(null);
    setResultadoContratos(null);
    setErro(null);
    setSucesso(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const processarArquivo = async (file: File, tipoAtual: Tipo) => {
    setCarregando(true);
    setErro(null);
    setSucesso(null);
    setArquivo(file);

    try {
      if (tipoAtual === "execucao") {
        const res = await parseExcelExecucao(file);
        setResultadoExecucao(res);
        setResultadoEmpenhos(null);
        setResultadoContratos(null);
      } else if (tipoAtual === "empenhos") {
        const res = await parseExcelEmpenhos(file);
        setResultadoEmpenhos(res);
        setResultadoExecucao(null);
        setResultadoContratos(null);
      } else {
        const res = await parseExcelContratos(file);
        setResultadoContratos(res);
        setResultadoExecucao(null);
        setResultadoEmpenhos(null);
      }
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : "Erro ao processar arquivo Excel.");
      setResultadoExecucao(null);
      setResultadoEmpenhos(null);
      setResultadoContratos(null);
    } finally {
      setCarregando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processarArquivo(file, tipo);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processarArquivo(file, tipo);
    }
  };

  const handleSalvar = async () => {
    setSalvando(true);
    setErro(null);
    setSucesso(null);

    try {
      if (tipo === "execucao" && resultadoExecucao) {
        // 1. Salva no servidor / disco
        const res = await fnSalvarExecucao({ data: resultadoExecucao.base });
        
        // 2. Atualiza o cache do React Query em tempo real
        queryClient.setQueryData(["base-execucao"], {
          ...resultadoExecucao.base,
          fonteDados: "Arquivo base 2026 (atualizado via painel)",
        });
        await queryClient.invalidateQueries({ queryKey: ["base-execucao"] });

        setSucesso(res.message || "Base de Execução Orçamentária atualizada com sucesso!");
      } else if (tipo === "empenhos" && resultadoEmpenhos) {
        // 1. Salva no servidor / disco
        const res = await fnSalvarEmpenhos({ data: resultadoEmpenhos.base });

        // 2. Atualiza o cache do React Query em tempo real
        queryClient.setQueryData(["empenhos"], {
          ...resultadoEmpenhos.base,
          fonteDados: "Arquivo empenhos 2026 (atualizado via painel)",
        });
        await queryClient.invalidateQueries({ queryKey: ["empenhos"] });

        setSucesso(res.message || "Base de Empenhos atualizada com sucesso!");
      } else if (tipo === "contratos" && resultadoContratos) {
        const res = await fnSalvarContratos({ data: resultadoContratos.base });
        queryClient.setQueryData(["contratos"], {
          ...resultadoContratos.base,
          fonteDados: "Arquivo contratos 2026 (atualizado via painel)",
        });
        await queryClient.invalidateQueries({ queryKey: ["contratos"] });
        setSucesso(res.message || "Base de Contratos atualizada com sucesso!");
      }
    } catch (err) {
      console.error(err);
      // Se houver erro de escrita no disco (ex: em ambiente read-only), aplicamos na sessão do cliente mesmo assim
      if (tipo === "execucao" && resultadoExecucao) {
        queryClient.setQueryData(["base-execucao"], {
          ...resultadoExecucao.base,
          fonteDados: "Arquivo base 2026 (sessão do navegador)",
        });
        setSucesso("Base aplicada com sucesso na sua sessão atual!");
      } else if (tipo === "empenhos" && resultadoEmpenhos) {
        queryClient.setQueryData(["empenhos"], {
          ...resultadoEmpenhos.base,
          fonteDados: "Arquivo empenhos 2026 (sessão do navegador)",
        });
        setSucesso("Base aplicada com sucesso na sua sessão atual!");
      } else if (tipo === "contratos" && resultadoContratos) {
        queryClient.setQueryData(["contratos"], {
          ...resultadoContratos.base,
          fonteDados: "Arquivo contratos 2026 (sessão do navegador)",
        });
        setSucesso("Base de contratos aplicada na sua sessão atual!");
      } else {
        setErro(err instanceof Error ? err.message : "Erro ao aplicar nova base.");
      }
    } finally {
      setSalvando(false);
    }
  };

  const baixarJson = () => {
    let dadosJson: unknown = null;
    let nomeArquivo = "base.json";

    if (tipo === "execucao" && resultadoExecucao) {
      dadosJson = resultadoExecucao.base;
      nomeArquivo = `execucao-2026-extracao-${resultadoExecucao.base.extracao}.json`;
    } else if (tipo === "empenhos" && resultadoEmpenhos) {
      dadosJson = resultadoEmpenhos.base;
      nomeArquivo = `empenhos-2026-extracao-${resultadoEmpenhos.base.extracao}.json`;
    } else if (tipo === "contratos" && resultadoContratos) {
      dadosJson = resultadoContratos.base;
      nomeArquivo = `contratos-2026-extracao-${resultadoContratos.base.extracao}.json`;
    }

    if (!dadosJson) return;

    const blob = new Blob([JSON.stringify(dadosJson, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(open) => {
        if (!open) limparEstado();
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Atualizar Base de Dados via Excel
          </DialogTitle>
          <DialogDescription>
            Importe a planilha oficial (.xlsx ou .xls) do SOF/SIGEF. O sistema converterá automaticamente
            para JSON e atualizará os dados do painel.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tipo}
          onValueChange={(v) => {
            setTipo(v as Tipo);
            limparEstado();
          }}
          className="w-full mt-2"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="execucao" className="text-xs sm:text-sm">
              📊 1. Execução / Dotação
            </TabsTrigger>
            <TabsTrigger value="empenhos" className="text-xs sm:text-sm">
              📑 2. Detalhe de Empenhos
            </TabsTrigger>
            <TabsTrigger value="contratos" className="text-xs sm:text-sm">
              📅 3. Contratos / Vigência
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Área de Upload / Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                arrastando
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 bg-primary/10 text-primary rounded-full">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Clique para selecionar ou arraste o arquivo Excel aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Formatos suportados: .xlsx, .xls ou .csv (com cabeçalhos padrão)
                  </p>
                </div>
              </div>
            </div>

            {/* Status do Arquivo Selecionado */}
            {arquivo && (
              <div className="flex items-center justify-between p-3 bg-muted/60 rounded-lg border text-sm">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileCheck2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium truncate">{arquivo.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {(arquivo.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    limparEstado();
                  }}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Loading */}
            {carregando && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Lendo planilha e convertendo dados...
              </div>
            )}

            {/* Mensagem de Erro */}
            {erro && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Falha na leitura da planilha</AlertTitle>
                <AlertDescription className="text-xs">{erro}</AlertDescription>
              </Alert>
            )}

            {/* Mensagem de Sucesso */}
            {sucesso && (
              <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertTitle className="font-semibold">Sucesso!</AlertTitle>
                <AlertDescription className="text-xs">{sucesso}</AlertDescription>
              </Alert>
            )}

            {/* Pré-visualização de Contratos */}
            {resultadoContratos && !carregando && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pré-visualização dos Contratos
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Extração: {formatarDataBR(resultadoContratos.base.extracao)}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {fmtNum(resultadoContratos.totalLinhas)} contratos lidos
                    </Badge>
                  </div>
                </div>
                {resultadoContratos.totalValor > 0 && (
                  <Card className="p-3 bg-card/70">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Valor total dos contratos</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {fmtMoeda(resultadoContratos.totalValor)}
                    </p>
                  </Card>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Colunas reconhecidas: {resultadoContratos.colunasDetectadas.join(" · ") || "—"}
                </p>
              </div>
            )}

            {/* Pré-visualização dos Dados de Execução Orçamentária */}
            {resultadoExecucao && !carregando && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pré-visualização da Execução Orçamentária
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Extração: {formatarDataBR(resultadoExecucao.base.extracao)}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {fmtNum(resultadoExecucao.totalLinhas)} dotações lidas
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <Card className="p-3 bg-card/70">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Orçado Atualizado</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {fmtMoeda(resultadoExecucao.totalAtualizado)}
                    </p>
                  </Card>
                  <Card className="p-3 bg-card/70 border-primary/30">
                    <p className="text-[10px] uppercase font-bold text-primary">Empenhado Líquido</p>
                    <p className="text-sm font-bold text-primary mt-0.5">
                      {fmtMoeda(resultadoExecucao.totalEmpenhado)}
                    </p>
                  </Card>
                  <Card className="p-3 bg-card/70">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Liquidado</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {fmtMoeda(resultadoExecucao.totalLiquidado)}
                    </p>
                  </Card>
                  <Card className="p-3 bg-card/70">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Pago</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {fmtMoeda(resultadoExecucao.totalPago)}
                    </p>
                  </Card>
                  <Card className="p-3 bg-card/70 col-span-2 sm:col-span-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Saldo de Dotação</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {fmtMoeda(resultadoExecucao.totalSaldo)}
                    </p>
                  </Card>
                </div>
              </div>
            )}

            {/* Pré-visualização dos Dados de Empenhos */}
            {resultadoEmpenhos && !carregando && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pré-visualização dos Empenhos
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Extração: {formatarDataBR(resultadoEmpenhos.base.extracao)}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {fmtNum(resultadoEmpenhos.totalLinhas)} empenhos lidos
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <Card className="p-3 bg-card/70 border-primary/30">
                    <p className="text-[10px] uppercase font-bold text-primary">Total Empenhado</p>
                    <p className="text-sm font-bold text-primary mt-0.5">
                      {fmtMoeda(resultadoEmpenhos.totalEmpenhado)}
                    </p>
                  </Card>
                  <Card className="p-3 bg-card/70">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Liquidado</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {fmtMoeda(resultadoEmpenhos.totalLiquidado)}
                    </p>
                  </Card>
                  <Card className="p-3 bg-card/70">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Pago</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {fmtMoeda(resultadoEmpenhos.totalPago)}
                    </p>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </Tabs>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4 pt-2 border-t">
          {(resultadoExecucao || resultadoEmpenhos || resultadoContratos) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={baixarJson}
              className="flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              Baixar JSON
            </Button>
          )}

          <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={(!resultadoExecucao && !resultadoEmpenhos && !resultadoContratos) || salvando}
              onClick={handleSalvar}
              className="flex items-center gap-1.5"
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar e Atualizar Painel
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
