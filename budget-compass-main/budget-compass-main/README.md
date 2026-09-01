# Budget Compass

Com base neste arquivo necessitamos criar um dashboard que forneça um relatório em pdf para a alta administração, fornecendo a execução orçamentária dos orgão ( SMDHC, FAASP, FUMCAD e FMID) selecionando os juntos ou separados ou combinados e dos projetos atividades ( juntos ou separados) , levando em conta o orçamento inicial, o atualizado o empenhado, congelado, descongelado, pago e o saldo de dotação. O dashboard traz orçamento inicial, atualizado, empenhado, saldo de dotação e % de execução por órgão e por projeto/atividade, com filtro por órgão e exportação do relatório em PDF para a alta administração. Temos alguns projetos atividades que se relacionam por se tratar de temas iguais com segregações diferentes, nesse caso, seria importante juntarmos esses temas e os tratando como políticas públicas para: no caso de 4329 políticas para mulheres, 6178 , manutenção de equipamentos para mulheres, 2053 casa da mulher brasileira, nesse caso específico temos a pauta de mulheres. Isso seria interessante para todas as pautas discutidas neste documento. A fins de relatório em formato pdf, seria interessante que a descrição do projeto atividade viesse com as rubricas neste caso com 3 linhas , antecedesse a coluna políticas para : Mulheres e as informações sobre o orçamento na sequencia. e informar na execução quem é o parâmetro se é o orçamento inicial ou atualizado ou até mesmo os 2 sobre a referencia de % de execução.as rubricas que comecem a o número 9 em sua composição de 4 digitos nós podemos entender que são emendas ao orçamento, e assim a classificaremos, emendas ao orçamento.
seria necessário também um gráfico que atualize automaticamsnte a partir de cada consulta solicitada, o arquivo que ealimenta essa base de dados pode ser on line, no @connector:google_sheets:"Google Sheets" ou em algum kugar que ele possa ser facilmente substituido quando houver alteração na base. se for on line melhor.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f3594e34-c460-4df1-b702-12548c2cbf1a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
