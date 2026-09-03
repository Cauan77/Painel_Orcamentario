<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Diretrizes para Agentes de IA (AGENTS.md)

Este documento define as regras e diretrizes operacionais para os agentes que atuam neste repositório. O objetivo é garantir consistência, segurança e qualidade nas modificações do código.

## 1. Comandos de Build e Teste

Antes de realizar qualquer mudança significativa, o agente deve estar ciente de como rodar e validar o projeto localmente.

- **Desenvolvimento**: `npm run dev` (Inicia o servidor Vite localmente).
- **Build**: `npm run build` (Realiza o build de produção via Vite).
- **Build de Dev**: `npm run build:dev` (Realiza o build em modo de desenvolvimento).
- **Lint**: `npm run lint` (Roda o ESLint para verificar e validar as regras e tipagens).
- **Format**: `npm run format` (Roda o Prettier para formatar a base de código).
- **Preview**: `npm run preview` (Visualiza o build de produção).
- **Scripts Nativos**: `npm run data:import` (Script Bun para leitura ou importação de excel se aplicável localmente).
  > **Ação Obrigatória:** Sempre rode ou verifique a tipagem com `npm run lint` após fazer alterações pesadas de TypeScript para confirmar ausência de erros, antes de considerar a tarefa "finalizada".

## 2. Definição de Concluído (Definition of Done)

Para evitar falsos positivos de "acho que terminei", o agente só deve considerar uma instrução concluída quando:

1. Todas as modificações de código exigidas foram aplicadas com precisão.
2. O código não apresenta erros sintáticos (syntax errors) ou erros de tipagem.
3. O comportamento esperado foi completamente atingido.
4. Nenhuma parte preexistente do sistema foi quebrada (Regressão). Especial atenção à lógica de importação Excel e geração de PDF.
5. Se aplicável, a estilização seguiu o padrão visual e de responsividade esperado pelo usuário, sem hardcodes desnecessários.

## 3. Regras de Escalação

Prevenindo soluções destrutivas:

1. **Proibido reescrever histórico Git:** Não faça rebase, squash ou force push. O projeto sincroniza com o Lovable, e alterar histórico passado quebra a edição visual para o usuário.
2. **Pare e pergunte perante ambiguidade crítica:** Se um pedido envolver a reescrita maciça da arquitetura sem clareza, peça confirmação ou escreva um plano de implementação (`implementation_plan.md`) para aprovação do usuário.
3. **Falhas em loop:** Caso o agente entre num ciclo de tenta/erra com um erro de compilação ou biblioteca, pare e peça ajuda ao usuário, detalhando exatamente onde está o problema.

## 4. Seções Organizadas por Tarefa

Para facilitar o foco em áreas de trabalho distintas:

### 4.1 Interface e Estilos

- Utilize o sistema **Tailwind CSS v4** (`src/styles.css`).
- Use preferencialmente as variáveis semânticas globais no formato `oklch` (`--color-primary`, `--color-background`, etc).
- Para componentes padrão, siga a abstração baseada no Radix/Shadcn localizada na pasta `src/components/ui`.

### 4.2 Lógica Orçamentária e de Parsers

- Trabalhos em planilhas Excel devem alterar `src/lib/excel-parser.ts` usando a biblioteca `xlsx`.
- A tipagem de base e constantes (como Órgãos, Pautas Temáticas e agregações) ficam em `src/lib/orcamento.ts` e `empenhos.ts`.

### 4.3 Geração de PDFs

- Utilize `jspdf` e `jspdf-autotable` exclusivamente no módulo centralizado `src/lib/pdf-report.ts`.

## 5. Escopo por Diretório

- `/src/components/`: Componentes UI reutilizáveis focados em visualização. Componentes globais ("dumb components") ficam em `ui/`.
- `/src/lib/`: Lógica central do sistema, constantes, relatórios em PDF, formatadores e processamento de dados puro.
- `/src/routes/`: Telas e fluxo principal da aplicação providos pelo `@tanstack/react-router`.
- `/scripts/`: Ferramentas auxiliares focadas no backend/CLI, muitas vezes rodadas usando Bun (como ferramentas de carga ou formatação automatizada).
