// A dictionary to map biome numeric codes to their names.
var bioDict = {1:'Amazônia', 2:'Mata Atlântica', 3:'Pantanal', 4:'Cerrado', 5:'Caatinga', 6:'Pampa'};

// An array of years to process, from 1985 to 2024.
var anos = ['1985', '1986', '1987','1988', '1989', '1990','1991', '1992', '1993','1994', '1995', '1996',
'1997', '1998', '1999','2000', '2001', '2002','2003', '2004', '2005','2006', '2007', '2008','2009', '2010',
'2011','2012', '2013', '2014','2015', '2016', '2017', '2018','2019','2020','2021','2022','2023','2024'];

// A list of reference class labels to be excluded from the analysis.
var excludedClasses = [
    "NÃO OBSERVADO",
    "ERRO",
    "DESMATAMENTO",
    'REGENERAÇÃO',
    'NÃO CONSOLIDADO',
    'Não consolidado',
];

// A dictionary to map string-based reference class names to their official MapBiomas numeric IDs.
var classes = ee.Dictionary({
  'AFLORAMENTO ROCHOSO':29,
  "APICUM": 32,
  "AQUICULTURA": 31,
  "CAMPO ALAGADO E ÁREA PANTANOSA": 11,
  "LAVOURA TEMPORÁRIA": 19,
  "LAVOURA PERENE": 36,
  "CANA": 20,
  "FLORESTA PLANTADA": 9,
  "FORMAÇÃO CAMPESTRE": 12,
  "FORMAÇÃO FLORESTAL": 3,
  'FORMAÇO FLORESTAL':3,
  'FORMAÇ??O FLORESTAL':3,
  "FORMAÇÃO SAVÂNICA": 4,
  "INFRAESTRUTURA URBANA": 24,
  "MANGUE": 5,
  "MINERAÇÃO": 30,
  "NÃO OBSERVADO": 27,
  "OUTRA FORMAÇÃO NÃO FLORESTAL": 13,
  "OUTRA ÁREA NÃO VEGETADA": 25,
  "PASTAGEM": 15,
  "PRAIA E DUNA": 23,
  'RESTINGA HERBÁCEA':50,
  "RIO, LAGO E OCEANO": 33,
  'VEGETAÇÃO URBANA': 24,
  'FLORESTA INUNDÁVEL':6,
});

// A dictionary mapping short collection names to their full GEE asset paths.
var cols = {
  'c31':'projects/mapbiomas-public/assets/brazil/lulc/collection3_1/mapbiomas_collection31_integration_v1',
  'c4':'projects/mapbiomas-public/assets/brazil/lulc/collection4/mapbiomas_collection40_integration_v1',
  'c41':'projects/mapbiomas-public/assets/brazil/lulc/collection4_1/mapbiomas_collection41_integration_v1',
  'c5':'projects/mapbiomas-public/assets/brazil/lulc/collection5/mapbiomas_collection50_integration_v1',
  'c6':'projects/mapbiomas-public/assets/brazil/lulc/collection6/mapbiomas_collection60_integration_v1',
  'c7':'projects/mapbiomas-public/assets/brazil/lulc/collection7/mapbiomas_collection70_integration_v2',
  'c71':'projects/mapbiomas-public/assets/brazil/lulc/collection7_1/mapbiomas_collection71_integration_v1',
  'c8':'projects/mapbiomas-public/assets/brazil/lulc/collection8/mapbiomas_collection80_integration_v1',
  'c9':'projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1',
  'c10':'projects/mapbiomas-public/assets/brazil/lulc/collection10/mapbiomas_brazil_collection10_integration_v2',
};

var col_list = Object.keys(cols);

col_list.forEach(function(col_id){
  
  var assetSamples = 'projects/steel-ace-464818-n7/assets/mapbiomas_85k_col5_points_w_edge_and_edited_v2';
  var assetMapBiomas = cols[col_id];
  var folder = 'ACC_'+col_id+'_v5_no_EDGE_github';
  
  for (var Year in anos){
    var year = anos[Year];
    var ano = anos[Year]; 
    
    var samples = ee.FeatureCollection(assetSamples);
    
    if (year > 2022){
      samples = samples.map(function(feat){
        var year_class = ee.String(feat.get('CLASS_' + ano));
        var new_class = ee.Algorithms.If(year_class.match(''), feat.get('CLASS_2022'), feat.get('CLASS_' + ano));

        return feat
          .set('CLASS_' + ano, new_class)
          .set('BORDA_' + ano, feat.get('BORDA_2022'))
          .set('COUNT_' + ano, feat.get('COUNT_2022'));
      });
    }
    
    var cartas_unique = samples.aggregate_histogram('CARTA_2').keys();
    var declividade_strats = samples.aggregate_histogram('DECLIVIDAD').keys();
    
    var carta_stratsize_total = ee.Dictionary(cartas_unique.iterate(function(carta, cartas_remade){
      return ee.Dictionary(cartas_remade).set(carta, samples.filter(ee.Filter.eq('CARTA_2', carta)).aggregate_histogram('DECLIVIDAD'));
    }, ee.Dictionary()));
    
    samples = samples.filter(ee.Filter.inList('CLASS_' + ano, excludedClasses).not())
                     .map(function (feature) {
                         return feature.set('year', year)
                                       .set('reference', classes.get(feature.get('CLASS_' + ano)));
                     })
                     .filter(ee.Filter.neq('BORDA_' + ano, 1));
    
    var carta_stratsize_filtered = ee.Dictionary(cartas_unique.iterate(function(carta, cartas_remade){
      return ee.Dictionary(cartas_remade).set(carta, samples.filter(ee.Filter.eq('CARTA_2', carta)).aggregate_histogram('DECLIVIDAD'));
    }, ee.Dictionary()));
    
    samples = samples.map(function(feat){
      feat = ee.Feature(feat);
      
      var carta = feat.get('CARTA_2');
      var strat = feat.get('DECLIVIDAD');

      var amos_weitgh = ee.Number.parse(ee.String(feat.get('PESO_AMOS')).replace(',', '.'));
      var amos_prob = ee.Number(1).divide(amos_weitgh);
      
      var vote_count = ee.Number.parse(feat.get(ee.String('COUNT_').cat(ano)));
  
      var strat_total_size = ee.Number.parse(ee.Dictionary(carta_stratsize_total.get(carta)).get(strat));
      var strat_filtered_size = ee.Number(ee.Dictionary(carta_stratsize_filtered.get(carta)).get(strat));
      
      var new_prob = ee.Number(amos_prob.multiply(strat_filtered_size.divide(strat_total_size)));
      var new_weight = ee.Number(amos_weitgh.multiply(strat_filtered_size.divide(strat_total_size)));
      
      var vote_weight = ee.Algorithms.If(ee.Number(vote_count).eq(1), 1,
        ee.Algorithms.If(ee.Number(vote_count).eq(2), 0.5,
          ee.Algorithms.If(vote_count.eq(3), ee.Number(1).divide(3), 1)
        )
      );
      
      var value_peso = ee.Number.parse(vote_weight);
      var peso_voto = ee.Number.parse(amos_prob).multiply(ee.Number.parse(value_peso));
      
      return feat.set({'PROB_AMOS2':amos_prob,'NEW_PROB':new_prob,'NEW_WEIGHT':new_weight,'PESO_VOT':peso_voto, 'VAL_PESO':value_peso, 'COUNT':vote_count});
    });
    
    var classification = ee.Image(assetMapBiomas);
  
    // Seleciona apenas a banda do ano, sem tentar adicionar biomas/estados via raster privado
    var mapbiomas = classification.select('classification_'+year).rename('classification');
    
    var result = mapbiomas
        .sampleRegions({
            collection: samples, 
            properties: ['CLASS_' + ano,'reference','year','BIOMA','CARTA_2','DECLIVIDAD','TARGETID', 'LON', 'LAT','PROB_AMOS','PROB_AMOS2','NEW_WEIGHT','AMOSTRAS','AMOSTRA_AM','REINSP','NEW_PROB','PESO_VOT','VAL_PESO','VOTOS'], 
            scale: 30, 
            geometries: false
        });
        
    Export.table.toDrive({
      collection: result, 
      description: 'acc_mapbiomas2_' + year, 
      folder: folder,
      fileFormat: 'csv'
    });
    
  } 

});