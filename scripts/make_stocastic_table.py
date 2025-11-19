import json
from functools import lru_cache

# --- 설정 ---
MODES = ["super_epic", "unique"]
ACTION_A = list(range(3, 7))      # +3~+6
ACTION_B = list(range(-3, 3))     # -3~+2  (프론트 라벨이 -2~+3이면 둘 중 하나 맞춰줘야 함)
ACTION_C = list(range(0, 5))      # 0~+4

def is_success(pos, mode):
    # "최고 등급" 도달 기준
    if mode == "super_epic":
        return pos == 15          # 슈퍼에픽
    if mode == "unique":
        return pos in (14, 16)    # 유니크
    return False

def is_failure(pos, mode):
    # 🔴 목표 초과시 바로 폭발
    if mode == "super_epic":
        return pos > 15           # 15 초과 = 실패
    if mode == "unique":
        return pos > 16           # 16 초과 = 실패 (프론트와 맞춤)
    return False

# --- DP 함수 (성공 확률) ---
@lru_cache(maxsize=None)
def dp(pos, turns_left, b_left, c_left, mode):
    # 위치는 0 미만으로 내려가지 않게 클램프
    pos = max(0, pos)

    # 목표 초과면 더 굴릴 필요 없이 실패
    if is_failure(pos, mode):
        return 0.0

    # 더 던질 수 없으면, 현재 위치 기준으로 성공/실패 판정
    if turns_left == 0:
        return 1.0 if is_success(pos, mode) else 0.0

    best = 0.0

    # A: 항상 사용 가능
    prob_a = sum(
        dp(pos + s, turns_left - 1, b_left, c_left, mode)
        for s in ACTION_A
    ) / len(ACTION_A)
    best = max(best, prob_a)

    # B: b_left > 0
    if b_left > 0:
        prob_b = sum(
            dp(pos + s, turns_left - 1, b_left - 1, c_left, mode)
            for s in ACTION_B
        ) / len(ACTION_B)
        best = max(best, prob_b)

    # C: c_left > 0
    if c_left > 0:
        prob_c = sum(
            dp(pos + s, turns_left - 1, b_left, c_left - 1, mode)
            for s in ACTION_C
        ) / len(ACTION_C)
        best = max(best, prob_c)

    return best

# --- DP 함수 (실패 확률) ---
@lru_cache(maxsize=None)
def dp_fail(pos, turns_left, b_left, c_left, mode):
    pos = max(0, pos)

    # 목표 초과면 실패 확률 100%
    if is_failure(pos, mode):
        return 1.0

    if turns_left == 0:
        return 1.0 if is_failure(pos, mode) else 0.0

    worst = 0.0  # "가장 많이 터질 수 있는 선택" 기준

    # A
    fail_a = sum(
        dp_fail(pos + s, turns_left - 1, b_left, c_left, mode)
        for s in ACTION_A
    ) / len(ACTION_A)
    worst = max(worst, fail_a)

    # B
    if b_left > 0:
        fail_b = sum(
            dp_fail(pos + s, turns_left - 1, b_left - 1, c_left, mode)
            for s in ACTION_B
        ) / len(ACTION_B)
        worst = max(worst, fail_b)

    # C
    if c_left > 0:
        fail_c = sum(
            dp_fail(pos + s, turns_left - 1, b_left, c_left - 1, mode)
            for s in ACTION_C
        ) / len(ACTION_C)
        worst = max(worst, fail_c)

    return worst

# --- 테이블 생성 ---
print("확률 계산 중... (1~3초 정도 걸릴 수 있음)")
policy_table = {}

pos_min, pos_max = 0, 48  # 위치는 넉넉하게 0~48 구간으로 계산

for mode in MODES:
    # 🧮 상급 8턴, 최상급 7턴 규칙 반영
    max_turns = 8 if mode == "super_epic" else 7
    for turns in range(1, max_turns + 1):   # 1~8 또는 1~7
        for b in range(0, 4):              # 세공 횟수 0~3
            for c in range(0, 4):          # 안정제 횟수 0~3
                for pos in range(pos_min, pos_max + 1):
                    cur_pos = max(0, pos)
                    options = {}

                    # A
                    prob_a = sum(
                        dp(cur_pos + s, turns - 1, b, c, mode)
                        for s in ACTION_A
                    ) / len(ACTION_A)
                    fail_a = sum(
                        dp_fail(cur_pos + s, turns - 1, b, c, mode)
                        for s in ACTION_A
                    ) / len(ACTION_A)
                    options["A"] = {"success": prob_a, "failure": fail_a}

                    # B
                    if b > 0:
                        prob_b = sum(
                            dp(cur_pos + s, turns - 1, b - 1, c, mode)
                            for s in ACTION_B
                        ) / len(ACTION_B)
                        fail_b = sum(
                            dp_fail(cur_pos + s, turns - 1, b - 1, c, mode)
                            for s in ACTION_B
                        ) / len(ACTION_B)
                        options["B"] = {"success": prob_b, "failure": fail_b}
                    else:
                        options["B"] = {"success": 0.0, "failure": 0.0}

                    # C
                    if c > 0:
                        prob_c = sum(
                            dp(cur_pos + s, turns - 1, b, c - 1, mode)
                            for s in ACTION_C
                        ) / len(ACTION_C)
                        fail_c = sum(
                            dp_fail(cur_pos + s, turns - 1, b, c - 1, mode)
                            for s in ACTION_C
                        ) / len(ACTION_C)
                        options["C"] = {"success": prob_c, "failure": fail_c}
                    else:
                        options["C"] = {"success": 0.0, "failure": 0.0}

                    key = (cur_pos, turns, b, c, mode)
                    policy_table[key] = options

print("✅ 확률 테이블 생성 완료!")
print(f"총 상태 수: {len(policy_table):,}")

# --- JSON으로 변환 (프론트에서 사용) ---
json_list = []
for (pos, turns, b_left, c_left, mode), options in policy_table.items():
    json_list.append(
        {
            "pos": pos,
            "turns_left": turns,
            "b_left": b_left,
            "c_left": c_left,
            "mode": mode,
            "A": options.get("A", {"success": 0.0, "failure": 0.0}),
            "B": options.get("B", {"success": 0.0, "failure": 0.0}),
            "C": options.get("C", {"success": 0.0, "failure": 0.0}),
        }
    )

with open("../src/data/culculated_prob.json", "w", encoding="utf-8") as f:
    json.dump(json_list, f, ensure_ascii=False, indent=2)

print("✅ 'culculated_prob.json' 생성 완료!")
