-- count_students.pig

-- Memuat data dari file csv.txt
students = LOAD '/user/pertemuan4/input/pertemuan4.txt' USING PigStorage(',') AS (
    StudentID:int,
    Name:chararray,
    Gender:chararray,
    AttendanceRate:int,
    StudyHoursPerWeek:int,
    PreviousGrade:int,
    ExtracurricularActivities:chararray,
    ParentalSupport:chararray,
    FinalGrade:int
);

-- Mengelompokkan siswa berdasarkan ExtracurricularActivities
grouped_by_extracurricular = GROUP students BY ExtracurricularActivities;

-- Menghitung jumlah siswa di setiap grup ExtracurricularActivities
count_by_extracurricular = FOREACH grouped_by_extracurricular GENERATE 
    group AS ExtracurricularActivities, 
    COUNT(students) AS StudentCount;

-- Menampilkan hasil jumlah siswa berdasarkan ExtracurricularActivities
DUMP count_by_extracurricular;

