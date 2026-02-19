# KR Stock Lab — CLAUDE.md

## 프로젝트 개요

한국 주식시장(KOSPI/KOSDAQ) 스크리닝 및 분석 웹앱.
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS (Firebase Hosting)
- **Backend**: FastAPI + Python 3.11 (Docker, Render.com)
- **데이터 소스**: Naver Finance API (5분 주기 자동 갱신, 인메모리 캐시)

---

## 폴더 구조

```
kiriproductbuild1/
├── frontend/src/
│   ├── pages/          # Next.js 페이지
│   ├── components/     # React 컴포넌트
│   ├── lib/api.ts      # API 클라이언트 + 타입 정의 (단일 파일)
│   └── styles/
├── backend/app/
│   ├── main.py         # FastAPI 앱 진입점, lifespan 훅
│   ├── config.py       # Pydantic Settings
│   ├── routers/        # 엔드포인트별 라우터
│   ├── services/       # 비즈니스 로직
│   ├── models/schemas.py  # Pydantic 스키마
│   └── collector/      # Naver Finance 데이터 수집
├── firebase.json
└── CLAUDE.md
```

---

## 주요 파일

| 역할 | 경로 |
|------|------|
| API 클라이언트 + 타입 | `frontend/src/lib/api.ts` |
| 스크리너 페이지 | `frontend/src/pages/screener.tsx` |
| 리스크 입력 패널 | `frontend/src/components/RiskInputPanel.tsx` |
| 켈리 분석 패널 | `frontend/src/components/KellyPanel.tsx` |
| 필터 패널 | `frontend/src/components/FilterPanel.tsx` |
| Top10 테이블 | `frontend/src/components/Top10Table.tsx` |
| 차트 컴포넌트 | `frontend/src/components/StockChart.tsx` |
| 백엔드 메인 | `backend/app/main.py` |
| 스크리닝 로직 | `backend/app/services/screener.py` |
| 켈리 계산 서비스 | `backend/app/services/kelly.py` |
| 포지션 계산 (기존) | `backend/app/services/risk.py` |
| 인메모리 캐시 | `backend/app/services/memory_store.py` |
| 데이터 수집 | `backend/app/collector/krx_fetcher.py` |
| 스키마 | `backend/app/models/schemas.py` |

---

## 페이지 목록

| 경로 | 설명 |
|------|------|
| `/` | 홈 (Top5 미리보기) |
| `/screener` | 거래대금 Top10 스크리너 + 켈리 리스크 분석 |
| `/chart` | OHLCV 차트 (lightweight-charts, 일/주/월봉) |
| `/indicators` | KOSPI/KOSDAQ 시장 통계 |
| `/news` | Naver 금융 뉴스 |
| `/earnings` | 연간/분기 재무제표 |

---

## API 엔드포인트 (Backend)

```
GET /symbols?query=&market=             종목 검색
GET /quote/{code}                       개별 시세
GET /top10                              스크리닝 (필터 + 리스크 파라미터)
GET /chart/{code}?period=&count=        OHLCV 데이터
GET /risk/kelly/{code}                  켈리 기준 리스크 분석 (신규)
GET /market-summary                     시장 통계
GET /market-index/{code}                지수 상세
GET /news?page=&page_size=              금융 뉴스
GET /news/stock/{code}                  종목별 뉴스
GET /finance/{code}?period=             재무제표
GET /finance/{code}/detail              PER/PBR/배당률 등
GET /health                             헬스 체크
POST /collect                           수동 데이터 수집
```

### Top10 쿼리 파라미터

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `market` | ALL | KOSPI / KOSDAQ / ALL |
| `sort_by` | value | value (거래대금) / weighted (거래대금+등락률) |
| `min_value` | - | 최소 거래대금 (억원) |
| `min_chg_pct` | - | 최소 등락률 (%) |
| `max_chg_pct` | - | 최대 등락률 (%) |
| `min_price` | - | 최소 가격 (원) |
| `max_price` | - | 최대 가격 (원) |
| `account_size` | - | 계좌금액 (원) — 입력 시 리스크 컬럼 활성화 |
| `risk_pct` | 0.01 | 1회 최대 손실률 |
| `stop_pct` | 0.03 | 손절폭 (백엔드 기본값, UI에 미노출) |
| `cap_pct` | 0.10 | 종목당 최대 비중 |

### Kelly 분석 쿼리 파라미터 (`/risk/kelly/{code}`)

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `account_size` | 필수 | 계좌금액 (원) |
| `risk_pct` | 0.01 | 1회 최대 손실률 |
| `cap_pct` | 0.10 | 종목당 최대 비중 |
| `lookback` | 60 | 분석 기간 (거래일, 20~250) |

---

## 켈리 리스크 계산 로직

### Top10 테이블용 (기존 단순 방식, `risk.py`)
```
허용 손실액 = account_size × risk_pct
손절가 = 현재가 × (1 - stop_pct)  ← 기본 3% 고정
최대 주수 = min(허용손실액 / 1주당손실, account_size × cap_pct / 현재가)
최대 투자금액 = 최대주수 × 현재가
```

### Kelly 분석 패널용 (OHLCV 기반 진짜 켈리, `kelly.py`)
```
# 과거 N일 데이터 기반
승률(p) = 상승 마감일 수 / 전체 거래일 수
avg_gain = 상승일 평균 등락률
avg_loss = 하락일 평균 등락률 (절댓값)

# 켈리 공식
Kelly f* = (p × avg_gain - q × avg_loss) / avg_gain
Half Kelly = f* × 0.5  ← 실제 적용값

# ATR 기반 자동 손절폭
ATR(14일) = 14일 평균 True Range
stop_pct = ATR / 현재가 × 2  (1~15% 클램핑)

# 최종 권장 주수 = min(Half Kelly 기준, 손실률 기준, 비중상한 기준)
```

---

## 스크리너 UX 흐름

1. **리스크 설정**: 계좌금액(만원 단위) / 1회 최대 손실률 / 종목당 최대 비중 입력
   - 손절폭은 UI에 없음 (종목 클릭 시 ATR로 자동 계산)
2. **Top10 테이블**: 계좌금액 입력 시 리스크 컬럼(손절가·최대주수·최대투자금액) 표시
   - 모바일: 최대투자금액만 표시, 서브텍스트로 손절가·주수 요약
3. **종목 클릭** (계좌금액 입력된 상태에서): 켈리 분석 패널 표시
   - 역사적 승률·평균수익·평균손실
   - 켈리 비율 (Full → Half Kelly)
   - ATR 기반 손절가
   - 3가지 제약 비교 → 권장 투자금액·주수

---

## 기술 스택 메모

- **차트**: `lightweight-charts` v5 (TradingView 경량 버전)
- **HTTP 클라이언트**: `httpx` (Backend), `fetch` (Frontend)
- **Backend Pydantic**: v2 사용 중
- **Next.js**: Static Export (`output: 'export'`) → Firebase Hosting
- **상태 관리**: React `useState` + `useCallback` (별도 상태 라이브러리 없음)
- **Naver 차트 API**: `?periodType=dayCandle&page=1&pageSize={count}` 형식 사용
  - 응답: `priceInfos[].{localDate, openPrice, highPrice, lowPrice, closePrice}`

---

## 개발 명령어

```bash
# Frontend
cd frontend && npm run dev        # 개발 서버 (localhost:3000)
cd frontend && npm run build      # 프로덕션 빌드

# Backend (Nix 환경 — venv 필요)
cd backend
python -m venv .venv              # 최초 1회
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8080

# 배포
firebase deploy --only hosting    # Frontend 배포
```

> **Nix 환경 주의**: `uvicorn`, `pip` 명령어 직접 사용 불가. 반드시 `.venv/bin/` 경로로 실행.

---

## 작업 이력 (최근)

### 스크리너 리스크 UI 개선
- `RiskInputPanel`: 계좌금액 만원 단위 입력, 리스크 수준 뱃지, 요약 카드 추가
- `Top10Table`: 리스크 컬럼 모바일 최적화, `risk_amount` 서브텍스트 표시

### 켈리 기준 리스크 분석 기능 추가
- `backend/app/services/kelly.py` (신규): ATR, 켈리 계산, 포지션 산출
- `backend/app/routers/risk.py` (신규): `GET /risk/kelly/{code}` 엔드포인트
- `backend/app/models/schemas.py`: `KellyAnalysis` 스키마 추가
- `frontend/src/components/KellyPanel.tsx` (신규): 초보자 친화적 분석 패널
- `frontend/src/components/RiskInputPanel.tsx`: stop_pct 입력 제거 (자동 계산으로 전환)
- `frontend/src/lib/api.ts`: `KellyAnalysis` 타입, `getKellyAnalysis()` 추가
- `frontend/src/pages/screener.tsx`: 종목 클릭 → KellyPanel 연동
