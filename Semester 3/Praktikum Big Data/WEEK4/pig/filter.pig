-- filter_students.pig

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

-- Memfilter siswa yang memiliki StudyHoursPerWeek lebih dari 15
high_study_hours = FILTER students BY StudyHoursPerWeek > 15;

-- Menampilkan hasil siswa yang telah difilter
DUMP high_study_hours;

