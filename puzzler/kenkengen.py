import random
import numpy as np

difficult = [[1,1,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,4,4],
              [1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4],
              [1,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,5,5]]

def printy(arr):
    for row in arr:
        print(row)

def generate_grid(n):
    grid = [[] for i in range(n)]
    for i in range(1, n+1):
        for j in range(1, n+1):
            grid[i-1].append((i + j) % n + 1)

    random.shuffle(grid)
    grid = list(map(list, np.transpose(grid)))
    random.shuffle(grid)

    return grid

def add_tup(t1, t2):
    return (t1[0] + t2[0], t1[1] + t2[1])

def valid(coord, n):
    return coord[0] >= 0 and coord[0] < n and coord[1] >= 0 and coord[1] < n

def create_puzzle(n, difficulty):
    grid = generate_grid(n)
    cage_grid = [[-1 for j in range(n)] for i in range(n)]
    slots_left = n*n
    curr_cage_id = 0
    cage_cells = {}
    while (slots_left > 0):
        #printy(cage_grid)
        cage_contents = []
        d = difficult[difficulty]
        next_size = d[random.randint(0, len(d) - 1)]
        #print("Next size:", next_size)
        
        
        root = -1
        for i in range(n):
            for j in range(n):
                if cage_grid[i][j] == -1 and root == -1:
                    root = (i, j)

        #print("Root:", root)

        directions = [(-1,0),(0,-1),(1,0),(0,1)]
        queue = [root]
        cells_caged = 0
        while (len(queue) > 0 and cells_caged < next_size):
            curr = queue.pop(0)
            #print(curr, queue)
            cage_contents.append(curr)
            cage_grid[curr[0]][curr[1]] = curr_cage_id
            cells_caged += 1

            up = add_tup(curr, directions[0])
            left = add_tup(curr, directions[1])
            down = add_tup(curr, directions[2])
            right = add_tup(curr, directions[3])
            dir = [up, left, down, right]
            order = [0,1,2,3]
            random.shuffle(order)

            for d in order:
                current_direction = dir[d]
                if valid(current_direction, n):
                    if cage_grid[current_direction[0]][current_direction[1]] == -1:
                        queue.append(current_direction)
                        #cage_grid[current_direction[0]][current_direction[1]] = curr_cage_id
        cage_cells[curr_cage_id] = cage_contents
        curr_cage_id += 1
        slots_left -= cells_caged

        #print("---------------------------")
    #printy(cage_grid)
    #print(cage_cells)
    return [grid, cage_grid, cage_cells]

def find_value(grid, operator, cells):
    if operator == "+":
        ans = 0
        for cell in cells:
            ans += grid[cell[0]][cell[1]]
        return ans

    elif operator == "-":
        c0 = cells[0]
        c1 = cells[1]
        v0 = grid[c0[0]][c0[1]]
        v1 = grid[c1[0]][c1[1]]
        big = max(v0, v1)
        small = min(v0, v1)
        return big - small

    elif operator == "/":
        c0 = cells[0]
        c1 = cells[1]
        v0 = grid[c0[0]][c0[1]]
        v1 = grid[c1[0]][c1[1]]
        big = max(v0, v1)
        small = min(v0, v1)
        if big % small != 0:
            return -1
        return big // small

    else:
        ans = 1
        for cell in cells:
            ans *= grid[cell[0]][cell[1]]
        return ans


def assign_operators(n, difficulty):
    grid, cage_grid, cage_cells = create_puzzle(n, difficulty)
    cage_operators_values = {}
    for id, cells in cage_cells.items():
        op = ["+", "x"]
        if len(cells) == 2:
            op.append("-")
            op.append("/")
        operation = random.choice(op)

        val = find_value(grid, operation, cells)
        if val == -1:
            operation = random.choice(["+", "x", "-"])
            val = find_value(grid, operation, cells)
        
        cage_operators_values[id] = (operation, val)
    return [grid, cage_grid, cage_cells, cage_operators_values]

print("testing")

n = int(input("Enter a grid size: "))
d = int(input("Enter a difficulty: "))

grid, cage_grid, cage_cells, cage_operator_values = assign_operators(n, d)
print("Solution:")
printy(grid)
print("Cages:")
printy(cage_grid)
print("Cage values:")
print(cage_operator_values)

