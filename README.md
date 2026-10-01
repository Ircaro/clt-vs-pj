# CLT x PJ

Calculadora para comparar uma proposta **CLT** com uma proposta **PJ** e ver quanto sobra de verdade em cada uma, com as tabelas oficiais do ano e a possibilidade de editar tudo direto na página.

## O que ela considera

**CLT**
- INSS progressivo e IRRF com a redução da Lei 15.270/2025 (isenção até R$ 5.000)
- Férias com 1/3, 13º salário e PLR (tabela exclusiva)
- FGTS de 8%, com opção de somar a multa de 40%
- Benefícios (VR/VA, plano de saúde, VT) e descontos em folha
- Custo estimado para a empresa, útil para negociar a nota PJ

**PJ**
- MEI (DAS fixo, sem pró-labore, IR só sobre o lucro acima da parcela isenta, limite de R$ 81 mil/ano) comparado com ME no Simples Nacional (Anexo III ou V pelo Fator R) e no Lucro Presumido
- Impostos da empresa calculados ao vivo no painel do PJ
- Pró-labore com INSS de 11% e IRRF, com modo que otimiza o Fator R
- Férias remuneradas ou não, bônus anual e benefícios pagos pelo contratante (ex.: plano de saúde)
- Custos de manter o CNPJ: contabilidade, certificado digital, escritório virtual, taxas municipais, tarifa bancária e o que mais você adicionar, marcando quais também valem para o MEI
- Dividendos isentos até R$ 50 mil/mês e retenção de 10% acima disso

**Três jeitos de comparar**
- **Tenho as duas propostas**: preencha CLT e PJ e veja qual rende mais
- **Hoje sou CLT**: informe sua CLT atual e descubra a nota PJ a pedir para a troca valer a pena
- **Hoje sou PJ**: informe seu PJ atual e descubra o salário CLT a pedir
- Nos dois últimos, você define quanto a mais quer ganhar para mudar (ex.: 10%) e vê uma tabela com o valor necessário para empatar, +10%, +20% e +30%, incluindo o múltiplo nota ÷ salário

**Resultado**
- Quanto cada regime rende por mês e no ano
- Nota PJ que empata com o CLT e salário CLT que empata com o PJ
- Gráfico do pacote anual e para onde ele vai (líquido, FGTS, benefícios, impostos, custos)
- Holerite CLT detalhado e demonstrativo da empresa PJ com todos os cenários avaliados

## Tabelas por ano

As tabelas oficiais ficam em [`src/tabelas`](src/tabelas), um arquivo por ano. Hoje há a de **2026**.

Quando saírem os valores do próximo ano:

1. Copie `src/tabelas/2026.ts` para `src/tabelas/2027.ts` e atualize os números
2. Registre o arquivo em [`src/tabelas/index.ts`](src/tabelas/index.ts)
3. Rode `npm test` para garantir que nada quebrou

Não quer mexer no código? Na aba **Tabelas do ano** dá para criar a tabela de um ano novo a partir da atual, editar faixas e alíquotas, e exportar ou importar em JSON. As tabelas personalizadas ficam salvas só no seu navegador.

## Rodando

```bash
npm install
npm run dev
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm test` | Testes dos cálculos (Vitest) |
| `npm run typecheck` | Checagem de tipos |
| `npm run build` | Gera o site estático em `dist/` |
| `npm run preview` | Serve o build localmente |

## Publicando no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda os testes, gera o build e publica no GitHub Pages a cada push na `main`. Para ativar, vá em **Settings → Pages → Source** e escolha **GitHub Actions**.

## Estrutura

```
src/
  calc/        regras de cálculo (INSS, IRRF, CLT, PJ, equivalência)
  tabelas/     tabelas oficiais por ano, tipos e validação
  ui/          estado, formulários, editor de tabelas e gráfico
  main.ts      montagem da página
tests/         testes dos cálculos
```

## Aviso

É uma estimativa para apoiar decisões, não substitui um contador. Ficam de fora o imposto mínimo para rendas acima de R$ 600 mil/ano, o ajuste anual do IR, a transição da reforma tributária (CBS/IBS) e direitos sem preço fixo como seguro-desemprego e estabilidade.
