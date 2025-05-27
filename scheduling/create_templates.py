import random
from itertools import combinations
import copy
import csv
def all_good(schedule, N):
    player_counts = [0] * N
    for team in schedule:
        for subteam in team:
            for x in subteam:
                player_counts[x] += 1
    if player_counts[0] != 0:
        for i in player_counts:
            if i != player_counts[0]:
                return False
            
    return True
    

def evaluate(schedule, N):
    player_counts = [0] * N
    pairs = get_pairs(schedule, N)
    
    big = -1
    eq = 0
    bad = []
    for i in range(N):
        for j in range(i+1,N):
            if pairs[i][j] > big:
                big = pairs[i][j]
                eq = 1
                bad = [(i,j)]
            elif pairs[i][j] == big:
                eq += 1
                bad.append((i,j))
    
    return (big, eq, bad) # max number of co-occurrences, number of pairs with that value, those specific pairs

def get_pairs(schedule, N):
    pairs = [[0] * N for _ in range(N)]
    
    for team in schedule:
        for subteam in team:
            a,b,c,d = sorted(subteam)
            pairs[a][b] += 1
            pairs[b][a] += 1
            pairs[a][c] += 1
            pairs[c][a] += 1
            pairs[a][d] += 1
            pairs[d][a] += 1
            pairs[b][c] += 1
            pairs[c][b] += 1
            pairs[b][d] += 1
            pairs[d][b] += 1
            pairs[c][d] += 1
            pairs[d][c] += 1
    return pairs

def gen_basic(N, K, W):
    random.seed(12)
    # Initialize counts
    play_counts = [0] * N
    pair_counts = [[0] * N for _ in range(N)]
    schedule = []
    num_subteams = K // 4
    if K % 4 != 0:
        raise ValueError("K must be divisible by 4")
    if (K * W) % N != 0:
        raise ValueError("K*W must be divisible by N")

    # Greedy construction
    for week in range(W):
        # select K players with lowest play count, tie-break randomly
        selected = sorted(range(N), key=lambda i: (play_counts[i], random.random()))[:K]
        remaining = set(selected)
        week_subteams = []

        # assign subteams minimizing pair cost
        for _ in range(num_subteams):
            best_quad = None
            best_cost = float('inf')
            for quad in combinations(remaining, 4):
                cost = sum(pair_counts[i][j] for i, j in combinations(quad, 2))
                if cost < best_cost:
                    best_cost, best_quad = cost, quad
            week_subteams.append(list(best_quad))
            # update counts
            for i, j in combinations(best_quad, 2):
                pair_counts[i][j] += 1
                pair_counts[j][i] += 1
            for i in best_quad:
                play_counts[i] += 1
                remaining.remove(i)

        schedule.append(week_subteams)
    return schedule

def find_pair(a,b, schedule):
    ans = []
    for i, team in enumerate(schedule):
        for j, subteam in enumerate(team):
            if a in subteam and b in subteam:
                ans.append((i,j))
    return ans

def swap(schedule, p1, p2):
    ans = copy.deepcopy(schedule)
    a,b,val1 = p1
    c,d,val2 = p2
    ans[a][b].remove(val1)
    ans[a][b].append(val2)
    ans[c][d].remove(val2)
    ans[c][d].append(val1)
    return ans


def optimize(schedule, N, threshold):
    co, eq, bp = evaluate(schedule, N)
    idx = 0

    while co > threshold and idx < 100:
        #print(idx)
        co, eq, bp = evaluate(schedule, N)
        idx += 1
        for bad_pair in bp:
            a,b = bad_pair # a,b in [0,N-1], player vals, not indices
            locations = find_pair(a,b,schedule) # len(locations) = eq
            for local in locations: # local = (i,j) s.t. sch[i][j] contains (a,b)
                i,j = local
                subteams = len(schedule[i])
                for other_subteam in range(subteams):
                    if other_subteam != j:
                        sub = schedule[i][other_subteam]
                        for alt_player in sub:
                            new_schedule = swap(schedule, (i, j, a), (i, other_subteam, alt_player))
                            new_schedule2 = swap(schedule, (i, j, b), (i, other_subteam, alt_player))
                            if all_good(new_schedule, N):
                                new_co, new_eq, new_bp = evaluate(new_schedule, N)
                                if (new_co < co) or (new_co == co and new_eq < eq):
                                    #print(f"Made progress, {(co, eq)} -> {(new_co, new_eq)}")
                                    schedule = copy.deepcopy(new_schedule)
                                    co, eq, bp = evaluate(schedule, N)
                                    break
                            if all_good(new_schedule2, N):
                                new_co, new_eq, new_bp = evaluate(new_schedule2, N)
                                if (new_co < co) or (new_co == co and new_eq < eq):
                                    #print(f"Made progress, {(co, eq)} -> {(new_co, new_eq)}")
                                    schedule = copy.deepcopy(new_schedule2)
                                    co, eq, bp = evaluate(schedule, N)
                                    break
                            
                        else:
                            continue
                        break
                else:
                    continue
                break
            else:
                continue
            break

    return schedule

def soup2nuts(N,K,W):
    s = gen_basic(N,K,W)
    s_prime = optimize(s, N, 1)
    print((N,K,W), evaluate(s_prime, N))
    return s_prime

for n in range(24,51):
    for k in range(4, n, 4):
        for w in range(2, min(n, 16)):
            if (k * w) % n == 0:
                try:
                    sched = soup2nuts(n,k,w)
                except:
                    print(n,k,w)
                    exit(0)
                with open(f"./tennis_templates/{n}-{k}-{w}.csv", "w") as file:
                    writer = csv.writer(file)
                    for i, week in enumerate(sched, 1):
                        file.write(f"Week {i}\n")
                        for court in week:
                            writer.writerow(court)
