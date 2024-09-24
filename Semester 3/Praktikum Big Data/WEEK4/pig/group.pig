-- group_students.pig

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

-- Mengelompokkan siswa berdasarkan Gender
grouped_by_gender = GROUP students BY Gender;

-- Menampilkan hasil pengelompokan siswa berdasarkan Gender
DUMP grouped_by_gender;

