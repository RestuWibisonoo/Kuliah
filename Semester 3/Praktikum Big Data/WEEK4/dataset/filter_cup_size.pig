models = LOAD '/user/pertemuan4/input/actress.csv' USING PigStorage(',') 
    AS (id:int, name:chararray, imgurl:chararray, birthday:chararray, height:chararray, cup_size:chararray, bust:chararray, waist:chararray, hips:chararray, birthplace:chararray, hobby:chararray);

-- Filter models with cup size larger than D (E, F, G, H, I, J, K)
filtered_models = FILTER models BY (cup_size == 'H' OR cup_size == 'I' OR cup_size == 'J' OR cup_size == 'K');

DUMP filtered_models;
