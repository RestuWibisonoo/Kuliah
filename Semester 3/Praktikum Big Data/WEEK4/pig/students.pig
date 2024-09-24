students = LOAD '/user/pertemuan4/input/pertemuan4.txt' USING PigStorage(',') AS (name:chararray, age:int, gpa:float);
filtered_students = FILTER students BY gpa > 3.0;
grouped_by_age = GROUP filtered_students BY age;
DUMP grouped_by_age;
