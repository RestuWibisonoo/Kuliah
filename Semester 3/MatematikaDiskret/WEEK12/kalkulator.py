import math

# Menghitung nilai 100! / (20! * 20! * 20! * 20! * 20!)
result = math.factorial(100) // (math.factorial(20) ** 5)
print(result)
