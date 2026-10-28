# Shaped by the Sun

Laboratório interativo em português para explorar o equilíbrio térmico de um cilindro suspenso, baseado em Ferreira-Sousa, Rocha, Motta & Gawryszewski (2021), *Biology Letters*, DOI [10.1098/rsbl.2021.0369](https://doi.org/10.1098/rsbl.2021.0369).

Esta pasta é um projeto independente, pronto para virar a raiz de um repositório GitHub. Os arquivos Shiny originais foram preservados na pasta superior.

## Executar localmente

Com Python 3 disponível, abra um terminal nesta pasta:

```sh
python3 -m http.server 8080
```

Abra http://localhost:8080. Use um servidor HTTP: abrir `index.html` diretamente por `file://` pode bloquear os módulos JavaScript.

Sem instalação de pacotes, ferramentas de build, bibliotecas externas ou API. Todos os cálculos acontecem no navegador. Depois de carregada, a simulação não consulta serviços externos; os links bibliográficos abrem as publicações.

## Publicar no GitHub Pages

1. Crie um repositório e coloque **o conteúdo desta pasta na raiz**, incluindo `.github/workflows/pages.yml`, `.nojekyll`, `tests/` e `package.json`.
2. Use o branch `main` (ou ajuste `branches` no workflow).
3. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**.
4. Faça push para `main`. O workflow testa o modelo e publica somente os seis arquivos da página. Consulte **Actions** e a URL mostrada em **Settings → Pages**.

Alternativa sem Actions: publique os arquivos da página na raiz do branch escolhido e selecione **Deploy from a branch → main → /(root)** em Pages. Nesse caso, os testes não são executados automaticamente.

Referência: [documentação oficial do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Esta entrega prepara a publicação. Nenhum repositório remoto foi criado e nenhum site foi publicado.

## Ilustração em primeiro plano

A cena interativa ocupa a área principal. O cilindro pode ser girado por arraste ou pelas setas do teclado; sua cor acompanha a temperatura numa escala fixa de 0 a 60 °C (saturada fora desse intervalo). Raios solares, correntes de ar e ondas térmicas ilustram os fluxos calculados. O botão de pausa e a preferência de movimento reduzido permitem interromper as animações. Elas não representam o aquecimento ao longo do tempo.

Os controles estão agrupados em Ambiente e Corpo. Gráficos, balanço detalhado e comparação de cenários ficam na seção expansível “Gráficos e balanço de energia”.

## O que é possível explorar

- Alterar dimensões, inclinação e condições ambientais.
- Alterar D/H mantendo o volume constante, inclusive pelo teclado.
- Visualizar os três fluxos no equilíbrio, em mW.
- Varrer posturas, com temperatura ou área projetada no eixo vertical.
- Explorar forma × inclinação em um mapa com volume constante.
- Fixar um cenário e comparar curvas e temperatura pontual.
- Copiar um link com os parâmetros e exportar todos os dados dos gráficos em CSV.

O ângulo θ é a inclinação do eixo acima da horizontal: **0° deitado; 90° em pé**, com radiação solar vertical. No app.R antigo, o valor enviado ao cálculo equivale a `90 - controle_do_app`. Assim, o controle original em 90 corresponde a θ = 0 nesta página.

## Convecção do artigo

**Artigo:** usa Mitchell com Cₗ = 0,52, n = 0,50, k = 0,0256 W/(m·K), ν = 15,2 × 10⁻⁶ m²/s, conforme a equação (2) do suplemento. O vento efetivo é no mínimo 0,1 m/s. Valores iniciais de ambiente e propriedades seguem o suplemento; a geometria inicial (8 × 4 mm) é um exemplo herdado do app. A postura inicial é vertical, de exposição mínima para essa geometria. Alterar propriedades ou coeficientes marca o cenário como exploração.


A equação (5) impressa no suplemento contém `2πr` no segundo termo de uma área. A implementação usa **πr²**, a área projetada de uma base circular, como os arquivos R locais. Essa correção dimensional está explícita na página. O modo Artigo reproduz as equações térmicas e os parâmetros publicados com essa correção geométrica; não se apresenta como reprodução literal do erro tipográfico.

A opção padrão de ondas longas mantém a forma publicada, `A εₐ εₛ σ (Tₐ⁴ − Tₛ⁴)`.

### Variação de ondas longas: Céu + entorno

Em **Modelo & propriedades → Trocas de ondas longas**, selecione **Céu + entorno · áreas iguais**. Essa variação mantém a convecção de Mitchell do artigo e usa:

- Emitida: `A σ εₛ Tₛ⁴`.
- Recebida do céu: `(A/2) σ εₛ εsky Tₐ⁴`.
- Recebida do entorno: `(A/2) σ εₛ εamb Tₐ⁴`, com `εamb = 0,95` fixo.
- Saldo infravermelho: recebida do céu + recebida do entorno − emitida.

`A` é a superfície corporal total e todas as temperaturas são convertidas para kelvin. O controle de emissividade do ar passa a representar `εsky` (inicialmente 0,88); a divisão das áreas não muda com a postura. **σ está incluído nos dois termos recebidos para manter a unidade em watts.** A variação é uma extensão do modelo, não a equação original do artigo.

O equilíbrio pode ficar abaixo da temperatura do ar, com entrada de calor por convecção. O solucionador considera esse caso e a interface indica os sinais dos fluxos. O balanço de energia mostra a emissão e as duas parcelas recebidas; gráficos, comparação fixada, links de cenário e CSV incluem a formulação selecionada. Links sem `longwaveModel` continuam usando a equação original. Links que selecionavam uma configuração de convecção removida exibem uma mensagem; use Restaurar para aplicar a configuração do artigo.

## Validação

```sh
npm test
```

Os testes usam `node:test`, sem dependências. São 81 casos de referência calculados por uma implementação R independente das equações do suplemento, com tolerância de 0,00000001 °C. Também são verificados limites geométricos, fechamento energético, monotonicidade do balanço, conservação de volume e entradas inválidas. A variação Céu + entorno tem verificações independentes das parcelas radiativas, da solução analítica sem convecção, do resfriamento abaixo do ar e da conservação de energia nos gráficos.

Para regenerar a referência a partir da pasta superior, com R disponível (o CSV já está incluído e os testes funcionam sem R):

```sh
Rscript github-pages/tests/reference.R
```

O script calcula as referências diretamente pelas equações do suplemento, sem carregar o aplicativo original. A nova página usa bisseção, com delimitação adaptativa da raiz; não exige que o equilíbrio caiba no intervalo fixo de −50 a 150 °C do app.

Estrutura: `model.js` contém a física; `app.js`, controles e gráficos SVG; `style.css`, layout responsivo; `tests/`, validação numérica. `AUDITORIA_MODELO.md` detalha a comparação com o artigo.

## Fontes e alcance

- [Artigo](https://doi.org/10.1098/rsbl.2021.0369).
- [Suplemento oficial, Heat Transfer Model](https://doi.org/10.6084/m9.figshare.16863137).
- [Dados e código do estudo](https://doi.org/10.5061/dryad.70rxwdbz8).

A página trata apenas do equilíbrio térmico. Não reproduz análises filogenéticas, validação empírica, séries meteorológicas ou contagens anuais de dias quentes. O mapa é uma exploração teórica, sem atribuir formas a espécies ou limites universais de temperatura.

Verificação visual: a interface desktop e a atualização dos resultados foram observadas no Safari. O layout inclui regras para celular e tablet; a inspeção visual em dispositivo móvel não foi concluída nesta sessão.
