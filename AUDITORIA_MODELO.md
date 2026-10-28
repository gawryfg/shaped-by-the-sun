# Auditoria do modelo térmico

Data: 25 de outubro de 2026.

**Conclusão: o app compartilha a estrutura de balanço térmico do artigo, mas não o reproduz exatamente, mesmo escolhendo Mitchell e desconsiderando os coeficientes extras.** Há diferenças nos parâmetros da convecção e nas condições iniciais. A área projetada diverge literalmente da equação impressa no suplemento, mas a fórmula do código é a geometricamente consistente.

## Fontes e escopo

Foram lidos `app.R`, `app1.R`, `heat_transfer_model.R` e `www/custom_plot.js`. A comparação principal considera `app.R`, que usa o canvas JavaScript. A URL de implantação foi localizada posteriormente nos metadados `rsconnect`: https://felipe-malheiros-gawryszewski.shinyapps.io/thermo_app/. O código de servidor publicado não pode ser certificado apenas pela interface; a comparação numérica usa as funções locais de `app.R`. A página publicada foi consultada: título, canvas e controles coincidem com a interface de `app.R`, incluindo Cₗ inicial de 0,34, limite superior de 0,50 e n inicial de 0,60.

Referências:

- Ferreira-Sousa et al. (2021). *Shaped by the Sun: the effect of exposure to sunlight on the evolution of spider bodies*. [DOI 10.1098/rsbl.2021.0369](https://doi.org/10.1098/rsbl.2021.0369); [texto no PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8580474/).
- [Suplemento oficial: Heat Transfer Model](https://doi.org/10.6084/m9.figshare.16863137), arquivo `rsbl20210369_si_001.pdf`, 14 páginas; especialmente páginas 1–3, equações (1)–(7).

Os dois PDFs originais foram disponibilizados pelo Google Drive durante a sessão e puderam ser lidos: artigo principal de 7 páginas e suplemento de 14 páginas. O suplemento local é idêntico ao PDF obtido do Figshare oficial, por SHA-256: `f13d9bd50117f6992123bc001b8ee46277a3501748c653c40285463fdd336ebf`. Foram inspecionadas visualmente as duas primeiras páginas do suplemento, incluindo a fórmula da área projetada, e a figura 1 e sua legenda no artigo principal (página 3).

## Comparação direta

| Componente | Suplemento | app.R | Resultado |
| --- | --- | --- | --- |
| Estado estacionário | Wconv + WIV + Wsol = 0; eq. (7) | Resolve a mesma soma por `uniroot` | Coincide |
| Corpo | Cilindro; H ≥ D | V = πr²H; A = 2πr² + 2πrH; valida H ≥ D | Coincide |
| Convecção | h A (Ta − Ts); eq. (1) | Mesma expressão | Coincide |
| Comprimento característico de Mitchell | L = V^(1/3) | Mesma definição | Coincide |
| Constante de Mitchell | 0,52; eq. (2) | 0,34 inicialmente; slider limitado a 0,50 | Diverge; a interface não permite atingir 0,52 |
| Expoente de Mitchell | 0,50; eq. (2) | 0,60 inicialmente; ajustável | Diverge inicialmente |
| Condutividade do ar k | 25,6 × 10⁻³ W/(m·K) | 25,7 × 10⁻³ | Diverge, pequena diferença |
| Viscosidade cinemática ν | 15,2 × 10⁻⁶ m²/s | 15,3 × 10⁻⁶ | Diverge, pequena diferença |
| Infravermelho | A εa εs σ (Ta⁴ − Ts⁴); eq. (3) | Mesma expressão, incluindo εa nos dois termos | Coincide |
| Temperatura nas equações | Kelvin | Converte °C em K antes de resolver | Coincide |
| Absorção solar | Ae I p, p = 0,85; eq. (4) | Mesma expressão e p inicial | Coincide |
| Emissividades e σ | εs = 0,95; εa = 0,88; σ = 5,67 × 10⁻⁸ | Mesmos valores iniciais | Coincide |
| Vento do cenário da figura 1 | 0,1 m/s | 0,2 m/s inicialmente | Condição inicial diferente |
| Vento muito baixo | Dados meteorológicos: valores < 0,1 convertidos para 0,1 m/s | Interface já impede valores < 0,1; função isolada não aplica piso | Equivalente no domínio da interface, regra ausente na função |
| Sol e temperatura do ar | 1000 W/m² e 30 °C no cenário da figura 1 | Mesmos valores iniciais | Coincide |
| Proteção solar | 300 W/m² de radiação direcional | Pode ser selecionado no slider | Representável |
| Gates, Lactin, King | Não são o coeficiente adotado na eq. (2) | Alternativas selecionáveis | Extensões; não usadas como motivo para reprovar a equivalência |

O balanço e as hipóteses centrais são os mesmos: corpo isotérmico e suspenso; condução, metabolismo e evaporação desprezados; solução estacionária. As animações do canvas são ilustrativas: não representam uma integração temporal nem o tempo necessário para atingir equilíbrio.

## Área projetada: discrepância no próprio suplemento

A equação (5), na página 2, imprime:

`Ae = 2Hr cos(θ) + 2πr cos(90 − θ)`

O primeiro termo tem unidade de área; o segundo, como impresso, tem unidade de comprimento. Não podem ser somados como áreas. A projeção de uma base circular tem área πr². Portanto, a expressão geometricamente consistente é:

`Ae = 2Hr cos(θ) + πr² sen(θ)`

É essa segunda expressão que os arquivos R usam. No domínio 0–90°, o uso de `abs(cos)` e `abs(sin)` em `app.R` não muda o resultado.

**Interpretação:** há forte evidência de erro tipográfico na equação publicada, mas esta auditoria não equivale a uma errata dos autores. A nova página explicita a correção e não tenta implementar literalmente o termo dimensionalmente inconsistente. Também não foi verificado o código completo arquivado no Dryad para determinar a origem histórica do erro.

## Ângulo: cálculo, desenho e comentários

Para a expressão de área acima e Sol vertical, θ = 0° representa eixo horizontal, expondo a lateral; θ = 90° representa eixo vertical, expondo uma base.

`app.R` transforma o controle usando `angle_for_area_exp_calc = abs(90 - input$cylinder_angle_display)`. O JavaScript gira um retângulo inicialmente horizontal por `controle + 90°`. Assim:

| Controle antigo | θ efetivo | Corpo desenhado | Área projetada |
| --- | --- | --- | --- |
| 0° | 90° | Vertical | πr² |
| 90° | 0° | Horizontal | 2rH |

**O cálculo e o desenho concordam nos dois extremos e nos ângulos intermediários.** O problema é a documentação: comentários em `app.R`, `app1.R` e no JavaScript afirmam em diversos pontos o sentido oposto. O rótulo visível de `app1.R` (0° em pé, 90° deitado) corresponde ao comportamento; em `app.R`, o rótulo é apenas “Ângulo”. Isso torna a interpretação ambígua, mas não demonstra um erro físico entre a área usada e o cilindro desenhado.

Na versão nova, θ é sempre a inclinação acima da horizontal. O preset legado começa em θ = 0°, preservando a postura física inicial do app, cujo controle começa em 90°.

## Impacto numérico isolado

Para H = 8 mm, D = 4 mm, I = 1000 W/m², Ta = 30 °C, p = 0,85, εs = 0,95 e εa = 0,88, mantendo vento de **0,1 m/s nos dois modelos**:

| Formulação | h, W/(m²·K) | T horizontal, °C | T vertical, °C |
| --- | ---: | ---: | ---: |
| Eq. (2) do artigo, com área circular | 15,8345 | 40,1205 | 34,0052 |
| Mitchell inicial de app.R | 14,5755 | 40,7445 | 34,2564 |

A diferença não é apenas estética: os parâmetros da convecção alteram a temperatura prevista. Sua magnitude depende do tamanho e do vento; esses exemplos não são limites gerais.

O estado inicial efetivo de `app.R` (vento 0,2 m/s, controle 90°, corpo horizontal) resulta em **37,8472 °C**. A página nova reproduz esse resultado no preset “Shiny legado”. Já seu preset “Artigo” começa na postura vertical, com vento de 0,1 m/s, e resulta em **34,0052 °C** para a mesma geometria. Comparar esses dois presets diretamente mistura mudanças de postura, vento e convecção; a tabela acima isola a diferença da formulação de h.

Como conferência adicional da escala dos resultados, para volume de 2500 mm³, θ = 90° e os parâmetros publicados, a nova implementação dá 33,23 °C em D/H = 0,25 e 39,57 °C em D/H = 1,00. Esses valores são compatíveis com os valores arredondados de 33 °C e 40 °C apresentados no texto do artigo para corpos grandes. Isso não substitui uma reprodução integral das figuras.

Os 8 × 4 mm são um exemplo do app, não uma espécie identificada nem uma garantia de reproduzir um ponto específico da figura 1 do artigo. O mapa da página conserva volume ao alterar forma; modificar H ou D individualmente pode alterar forma e volume juntos.

## Divergências entre arquivos locais

`app.R` e `app1.R` têm essencialmente o mesmo núcleo térmico; diferem na visualização, nos rótulos e na exposição da emissividade do ar na interface.

O arquivo mais antigo `heat_transfer_model.R` não deve ser usado como referência executável sem revisão:

- `length.out = length` depende de uma variável `length` que não é definida no arquivo; numa sessão limpa, o nome pode resolver para a função base `length` e falhar.
- No ramo King, ele passa `V^(1/3)` como `Length`. `app.R` e `app1.R` passam o comprimento real do cilindro. Isso muda o diâmetro efetivo e o resultado desse modelo adicional.
- O ramo Lactin usa nomes de argumentos diferentes dos argumentos enviados na chamada comum a `uniroot`; não foi tomado como referência de paridade.

Esses problemas do arquivo auxiliar não foram atribuídos ao aplicativo principal.

## Implementação e testes da nova página

Os originais R e JavaScript foram preservados. `github-pages/model.js` contém o modelo independente da interface, em unidades SI. A bisseção tem intervalo superior adaptativo. O domínio físico considerado garante um balanço estritamente decrescente em Ts quando há convecção ou emissão térmica, portanto uma raiz única. Entradas sem equilíbrio único ou dimensões inválidas geram mensagem explícita.

A validação inclui:

- **324 casos** calculados pelas funções reais de `app.R`: 4 coeficientes × 3 comprimentos × 3 razões D/H × 3 ângulos × 3 velocidades de vento.
- **81 casos** de uma implementação R independente das equações térmicas do suplemento e da projeção circular.
- Tolerâncias de 0,00007 °C para `uniroot` do app e de 0,00000001 °C para a referência do artigo.
- Fechamento energético, limites da geometria, aquecimento solar, resposta ao vento, conservação de volume e entradas inválidas.

Os seis testes automatizados passaram. Esses testes verificam implementação numérica, não revalidam o modelo contra os dados empíricos dos autores nem reproduzem as análises evolutivas e meteorológicas do estudo.
