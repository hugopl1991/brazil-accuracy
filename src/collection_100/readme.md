

# Avaliação de acurácia - Coleção 10

Esta pasta reúne os arquivos usados para calcular a acurácia da Coleção 10 do MapBiomas Brasil. O fluxo combina dados de referência com a classificação produzida no Google Earth Engine (GEE) e gera métricas de acurácia para a legenda do projeto.

## Conteúdo da pasta

| Arquivo | Descrição |
| --- | --- |
| `1_export_gee_input_edt.js` | Script para exportar os dados de referência e os valores de classificação do GEE. |
| `2_accuracy_estimates.py` | Script em Python para preparar os dados e calcular as métricas de acurácia. |
| `points_strata.csv` | Relaciona cada amostra ao seu estrato amostral. |
| `strata.csv` | Informações de população dos estratos. |
| `ACC/` | Diretório de entrada com os arquivos CSV exportados pelo GEE. |
| `output/` | Diretório de saída para os resultados do processamento. |

## Requisitos

- Python 3.8+;
- bibliotecas: `pandas`, `numpy` e `scikit-learn`;
- acesso ao Google Earth Engine Code Editor para exportar os dados de referência;
- acesso aos assets usados no script `1_export_gee_input_edt.js`.

Você pode instalar as dependências com:

```bash
pip install pandas numpy scikit-learn
```

## Fluxo de uso

### 1. Exportar os dados do GEE

Abra o script `1_export_gee_input_edt.js` no Google Earth Engine Code Editor e execute-o. Ajuste os parâmetros do início do arquivo conforme o projeto e a coleção que estiver sendo processada.

Depois da execução, as exportações geradas devem ficar em uma pasta como:

```text
ACC/
  acc_mapbiomas_1985.csv
  acc_mapbiomas_1986.csv
  ...
```

### 2. Executar o cálculo de acurácia

No terminal, rode:

```bash
python -u "src/collection_100/2_accuracy_estimates.py" "src/collection_100/ACC" "src/collection_100/output" "c10" "accuracy_mapbiomas_col10"
```

### Argumentos

1. `input_dir`: pasta com os arquivos CSV exportados pelo GEE;
2. `output_dir`: pasta para salvar os resultados;
3. `collection`: nome da coleção, por exemplo `c10`;
4. `output_filename`: nome base do arquivo de saída.

## Observações importantes

- O script espera que `input_dir` contenha os CSVs organizados em um diretório único, sem arquivos extras que possam interferir na leitura;
- certifique-se de que os arquivos `points_strata.csv` e `strata.csv` estejam disponíveis no diretório de trabalho ou no caminho esperado pelo processamento;
- o tempo de execução pode variar conforme o número de anos e a quantidade de dados.

## Saída esperada

O processamento gera arquivos em `output/` contendo as métricas e os resultados consolidados da acurácia da coleção selecionada.

> Se quiser, também posso transformar este README em uma versão mais detalhada, com exemplos de estrutura de pastas e instruções para Windows/Linux/macOS.
