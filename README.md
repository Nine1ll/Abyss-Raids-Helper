# 📘 CTOA: 시즈나이트 강화 시스템 최적 전략 추천기  
**(Cookie Run: Tower of Adventures – Size Knight Upgrade Optimizer)**

> 현재 상태(위치 / 남은 턴 / 사용 아이템)에 따른 **최적 행동**을 실시간으로 추천합니다.

---

## 주요 기능

### 1) 강화 성공 확률 실시간 계산
- 현재 위치 + 남은 턴 + 세공 사용 횟수 + 안정제 사용 횟수 + 모드(상급/최상급) 기반
- 모든 가능한 경로를 DP로 탐색하여 **정확한 성공 확률** 계산
- **완전 탐색 기반** 확률 (가능한 모든 경우의 수를 고려)

### 2) 최적 행동 추천
- A(세게 두드리기), B(세공하기), C(안정제) 중 **성공 확률이 가장 높은 행동**을 자동 강조
- 각 행동의 **정확한 확률 수치**를 숫자로 표시

### 3) 상급 / 최상급 모드 완전 지원
| 모드 | 성공 조건 | 실패 조건 | 던지는 횟수 |
|------|-----------|-----------|-------------|
| 상급 (`super_epic`) | 위치 = 15 | 위치 > 15 | 8회 |
| 최상급 (`unique`) | 위치 = 14 또는 16 | 위치 > 16 | 7회 |

### 4) 강화 과정 상세 로그
- 각 턴별로: **행동 → 이동 위치 → 증가값** 기록
- 로그는 **자동 저장**되며, 후에 확인 가능

### 5) 라이트/다크 모드 지원
- 사용자 설정에 따라 자동 전환
- 시각적 편의성 최적화

### 6) 상태 자동 리셋
- 모드 변경 또는 초기화 버튼 클릭 시  
  → 위치, 턴, 아이템 사용량 모두 **초기값으로 복원**

### 7) 미리 계산된 확률 JSON 로딩
- 모든 상태의 확률을 Python으로 사전 계산 → `culculated_prob.json` 저장
- React는 단순히 **JSON 파일을 로드만** 하므로 **초기 로딩이 매우 빠름**

---

## 기술 스택

### 프론트엔드 (React)
- React 18
- JavaScript (ES6+)

### 백엔드 / 알고리즘
- Python 3
- 동적 계획법(DP) + 메모이제이션
- 모든 상태에 대한 완전 탐색 → JSON 출력

---

## 프로젝트 구조
```
src/
├── components/
│ ├── Board.jsx # 게임 보드 시각화 (위치, 남은 턴, 색상)
│ ├── ActionButtons.jsx # A/B/C 버튼 및 확률 표시
│ ├── LogPanel.jsx # 강화 로그 히스토리
│ ├── HelpBox.jsx # 사용법 안내 팝업
│ └── lacacy/ 
│
├── utils/
│ └── policy.js # JSON 데이터를 기반으로 최적 행동 추출 로직
│
├── data/
│ ├── culculated_prob.json # Python에서 생성된 사전 계산 확률 데이터
│ └── policyLookup.js # (선택) 확률 테이블을 빠르게 조회하는 유틸
│
├── context/
│ └── ThemeContext.jsx # 라이트/다크 모드 상태 관리
│
├── App.js # 주 앱 루트 컴포넌트
├── App.css # 전역 스타일
└── index.js # React 렌더링 진입점
```

> 💡 `culculated_prob.json`은 **수동으로 생성**해야 하며,  
> 이 파일이 없으면 React 앱은 **정확한 추천을 할 수 없습니다**.

---

## 확률 계산 방식 (DP Overview)

강화 행동은 다음 3가지로 구성됩니다:

| 행동 | 증가값 범위 | 설명 |
|------|-------------|------|
| A: 세게 두드리기 | +3 ~ +6 | 고위험 고보상 |
| B: 세공하기 | -3 ~ +2 | 위험성 있음, 위치 하락 가능성 |
| C: 안정제 사용 | 0 ~ +4 | 안정적, 최소 0 이동 |

### DP 알고리즘 로직
각 상태 `(position, turns_left, b_used, c_used)`에 대해:

```python
success_prob_A = 평균( dp(next_position) for next_position in all_outcomes_A )
success_prob_B = 평균( dp(next_position) for next_position in all_outcomes_B )
success_prob_C = 평균( dp(next_position) for next_position in all_outcomes_C )

best_action = argmax([success_prob_A, success_prob_B, success_prob_C])
```
## 설치 및 실행 가이드

### 1. 프론트엔드 패키지 설치
```bash
npm install
```
### 2. 수행
```bash
npm start
```

### 3. 확률 테이블 생성
```python
cd scripts
python generate_policy.py
```
- 이 파일이 존재하지않으면 추천 확률을 제공하지 못합니다.

