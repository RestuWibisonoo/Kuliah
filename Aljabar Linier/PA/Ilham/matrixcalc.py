class Matrix:

    def __init__(self, matrix):
        self.matrix = matrix

    def dim(self, dim):
        if dim == "rows":
            return len(self.matrix)
        elif dim == "cols":
            return len(self.matrix[0])
        
    def get_row(self, row):
        return self.matrix[row-1]
    
    def get_col(self, col):
        c = []
        for x in self.matrix:
            c.append(x[col-1])
        return c
    
    def add_row(self, row):
        self.matrix.append(row)

    def add_col(self, col):
        elem = 0
        for x in self.matrix:
            x.append(col[elem])
            elem += 1

    def del_row(self, row):
        a = self.matrix
        del a[row-1]
        return a
    
    def del_col(self, col):
        a = self.matrix
        for row in a:
            del row[col-1]
        return a
    
    def get_element(self, row, column):
        return Matrix(self.matrix).get_row(row)[column-1]
    
    def copy(self):
        import copy
        return copy.deepcopy(self.matrix)
    
    def tranpose(self):
        t_mat = []
        for x in range(1, Matrix(self.matrix).dim("cols")+1):
            t_mat.append(Matrix(self.matrix).get_col(x))
        return t_mat
    
class MatOperators:

    def add_matrices(self, x, y):
        assert Matrix(x).dim("rows") == Matrix(y).dim("rows") and Matrix(x).dim("cols") == Matrix(y).dim("cols"), "Please select two matrices of the same dimensions"
        z =[]
        for row_x, row_y in zip(x, y):
            z.append([a+b for a, b in zip(row_x, row_y)])
        return z
    
    def scalar_mul(self, a, scalar):
        return [[elem *scalar for elem in row] for row in a]
    
    def mul_matrices(self, x, y):
        assert Matrix(x).dim("cols") == Matrix(y).dim("rows"), "Please choose a valid pair of matrices to multiply"
        z = []
        y = Matrix(y.transpose())
        for row_x in x:
            p_row =[]
            for col_y in y:
                product = 0
                for a, b in zip(row_x, col_y):
                    product += a*b
                p_row.append(product)
            z.append(p_row)
        return z
    
def row(*args):
    r = []
    for arg in args:
        r.append(arg)
    return r

def matrix(*args):
    a = []
    for arg in args:
        a.append(arg)
    return a

def print_matrix(a):
    rows = Matrix(a).dim("rows")
    for row in range(rows):
        print(Matrix(a).get_row(row+1))

def sub_matrices(x, y):
    y = MatOperators().scalar_mul(y, -1)
    return MatOperators().add_matrices(x,y)

def slicer(a, m, n):
    b = Matrix(a).copy()
    Matrix(b).del_row(m)
    Matrix(b).del_col(n)
    return b

def cofactor(a, m, n):
    b = slicer(a, m, n)
    return (-1)**(m+n) * determinant(b)

def determinant(a):
    coord = Matrix(a).get_element
    if Matrix(a).dim("rows") == 2 and Matrix(a).dim("cols") == 2:
        return coord(1,1) * coord(2,2) - coord(1,2) * coord(2,1)
    
    total = 0
    for col in range(Matrix(a).dim("cols")):
        total += coord(1, col+1) * cofactor(a, 1, col+1)
    return total

def inverse(a):
    coord = Matrix(a).get_element
    
    def adj():
        adj_matrix = matrix()
        for x in range(1, Matrix(a).dim("rows")+1):
            row = []
            for y in range(1, Matrix(a).dim("cols")+1):
                row.append(cofactor(a, x, y))
            Matrix(adj_matrix).add_row(row)

            return Matrix(adj_matrix).tranpose()

        if Matrix(a).dim("rows") == 2 and Matrix(a).dim("cols") == 2:
            div = 1 / determinant(a)
            pre_inverse = matrix(
                row(coord(2, 2), -1*coord(1, 2)),
                row(-1*coord(2, 1), coord(1, 1))
                )
            return MatOperators().scalar_mul(pre_inverse, div)

        adj_matrix = adj()
        div = 1 / determinant(a)

        return MatOperators().scalar_mul(adj_matrix, div)
