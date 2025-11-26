# AI 에이전트 시스템 문서 (Dontcare Project)

## 개요

이 문서는 Dontcare 프로젝트의 AI 에이전트 시스템에 대한 종합적인 문서입니다. 본 시스템은 Google ADK(Agent Development Kit)를 기반으로 한 금융 분석 AI 에이전트들로 구성되어 있습니다.

## 시스템 아키텍처

### 전체 구조

```
ai/dontcare/agents/
├── agent.py                  # Root Agent (메인 조정자)
├── config.py                 # 환경설정 및 모델 설정
├── prompts.py               # Root Agent 프롬프트
├── tools/
│   ├── tools.py             # 공통 도구 (시간, 서브에이전트 호출)
│   └── callback.py          # 콜백 도구
└── sub_agents/              # 서브 에이전트들
    ├── financial_analyst/   # 재무 분석 에이전트
    ├── market_analyst/      # 시장 분석 에이전트
    ├── news_analyst/        # 뉴스 분석 에이전트
    └── risk_analyst/        # 리스크 분석 에이전트
```

## 에이전트 상세 분석

### 1. Root Agent (루트 에이전트)

**파일**: `ai/dontcare/agents/agent.py`

**역할**: 종합적인 금융 분석 에이전트로서 사용자 쿼리를 분석하고 적절한 서브 에이전트들을 조정하여 최종 분석 보고서를 생성합니다.

**주요 기능**:
- 사용자 질문 분석 및 핵심 분석 대상 파악
- 4개 서브 에이전트 조정 및 호출
- 서브 에이전트 결과 종합 분석
- HTML 기반 상세 보고서 생성 (Tailwind CSS 사용)

**사용 모델**: GPT (LiteLlm을 통한 GMS API)

**주요 도구**:
- `tool_now_kst()`: KST 시간 조회
- `financial_analyst_agent`: 재무 분석 서브에이전트
- `market_analyst_agent`: 시장 분석 서브에이전트
- `news_analyst_agent`: 뉴스 분석 서브에이전트
- `risk_analyst_agent`: 리스크 분석 서브에이전트
- `PreloadMemoryTool()`: 메모리 관리

### 2. Financial Analyst (재무 분석 에이전트)

**파일**: `ai/dontcare/agents/sub_agents/financial_analyst/`

**역할**: 기업의 재무제표, 재무비율, 현금흐름 등을 분석하여 재무 상태 평가 보고서를 생성합니다.

**주요 도구**:
- `search_company()`: 기업명/티커로 회사 검색
- `list_filings()`: 공시 목록 조회
- `get_financials()`: 재무제표 데이터 조회
- `compute_basic_ratios()`: 기본 재무비율 계산
- `fetch_and_analyze_financials()`: 종합 재무 분석

**데이터 소스**: DART(한국 전자공시시스템) API

**주요 분석 지표**:
- 성장성: 매출/영업이익 CAGR, YoY 성장률
- 수익성: 영업이익률, ROE, ROA
- 건전성: 부채비율, 이자보상배율, 현금성자산
- 밸류에이션: PER, PBR, EV/EBITDA

### 3. Market Analyst (시장 분석 에이전트)

**파일**: `ai/dontcare/agents/sub_agents/market_analyst/`

**역할**: 주가 차트, 거래량, 기술적 지표를 분석하여 시장 추세 보고서를 생성합니다.

**주요 도구**:
- `technical_analysis_for_agent()`: 종합 기술적 분석

**데이터 소스**: Yahoo Finance (yfinance 라이브러리)

**주요 기술적 지표**:
- **이동평균선**: SMA 10일, 50일, 200일
- **MACD**: MACD Line, Signal Line, Histogram
- **RSI**: 14일 RSI (과매수/과매도 판단)
- **볼린저 밴드**: 상단선, 하단선, 중간선, 밴드폭
- **거래량**: 현재 거래량, 10일 평균 거래량

**분석 기능**:
- 추세 분석 (단/중/장기 이동평균 정배열)
- 모멘텀 분석 (RSI/MACD 시그널)
- 변동성 분석 (볼린저밴드, ATR)
- 지지/저항 레벨 식별

### 4. News Analyst (뉴스 분석 에이전트)

**파일**: `ai/dontcare/agents/sub_agents/news_analyst/`

**역할**: 최신 뉴스, 공시, 이벤트를 수집·요약하고 투자심리 및 모멘텀 해석을 제공합니다.

**주요 도구**:
- `google_search()`: Google 검색 API

**사용 모델**: Gemini (Google의 LLM)

**주요 기능**:
- 실시간 뉴스 검색 및 수집
- 뉴스 내용 요약 및 중요도 평가
- 투자심리 분석 (긍정/중립/부정)
- URL 링크가 포함된 뉴스 아이템 제공

### 5. Risk Analyst (리스크 분석 에이전트)

**파일**: `ai/dontcare/agents/sub_agents/risk_analyst/`

**역할**: 최대 낙폭, 변동성, VaR 등 리스크 지표를 평가하고 리스크 관리 방안을 제시합니다.

**주요 도구**:
- `run_strategy_backtest()`: 전략 백테스팅 실행

**백테스팅 엔진**: VectorBT 라이브러리 기반

**지원 전략**:
- **EMA Cross**: 지수이동평균 교차 전략
- **MACD Cross**: MACD 시그널 교차 전략
- **Golden Cross**: 골든크로스/데드크로스 전략

**주요 리스크 지표**:
- Total Return: 총 수익률
- CAGR: 연평균 복합성장률
- Annual Volatility: 연간 변동성
- Maximum Drawdown: 최대 낙폭
- Sharpe Ratio: 위험조정 수익률
- Win Rate: 승률

**백테스팅 기능**:
- 사용자 정의 파라미터 지원
- 거래 수수료 및 슬리피지 반영
- 다양한 기간 및 데이터 간격 지원
- 리스크프리 레이트 기반 샤프비율 계산

## 공통 도구 및 설정

### 시간 관리 도구

**`tool_now_kst()`**:
- KST(한국표준시) 기준 현재 시간 반환
- 오늘 날짜, ISO 시간, 연/월/일, 전년도 정보 제공

### 환경 설정 (`config.py`)

**필수 환경변수**:
- `GOOGLE_API_KEY`: Google 서비스 인증
- `DART_API_KEY`: DART API 인증
- `GMS_API_KEY`: GMS API 인증

**모델 설정**:
- GPT 모델: LiteLlm을 통한 OpenAI 호환 API
- Gemini 모델: Google의 생성형 AI 모델

### 메모리 관리

**PreloadMemoryTool**: 이전 대화 기록 참조를 통한 일관된 답변 제공

## 워크플로우

### 1. 쿼리 분석 단계
- 사용자 질문에서 핵심 분석 대상(기업명/티커) 추출
- 필요한 정보 유형(재무, 기술적 지표, 뉴스, 리스크) 식별
- 시간적 제약 조건('오늘', '최근', '지난 분기' 등) 파악

### 2. 리소스 활용 단계
- KST 시간 기준 현재 날짜/시간 획득
- 필요에 따라 서브 에이전트들을 순차적/병렬적으로 호출
- 각 서브 에이전트에 명확한 입력 파라미터 제공

### 3. 정보 종합 단계
- 서브 에이전트 결과들의 상충/일치 여부 판별
- 신뢰도, 최신성, 영향도를 기준으로 가중 해석
- 재무, 기술적, 뉴스, 리스크 정보의 유기적 연결

### 4. 보고서 생성 단계
- 간단한 질의: 핵심 정보만 평문으로 응답
- 상세 보고서: Tailwind CSS 기반 HTML 보고서 생성
- 투자 의견(매수/보유/매도)과 근거 제시
- 조건부 변경 트리거 명시

## 보고서 출력 형식

### HTML 보고서 구조

1. **보고서 개요**: 분석 범위 및 목적
2. **투자 의견**: 명확한 매매 의견과 핵심 근거
3. **재무 분석**: financial_analyst 결과 기반
4. **기술적 분석**: market_analyst 결과 기반
5. **리스크 분석**: risk_analyst 결과 기반
6. **최신 동향**: news_analyst 결과 기반 (URL 링크 포함)
7. **회사/시장 개요**: 선택적 섹션
8. **근거 매핑**: 각 주장의 데이터 출처 및 기준일
9. **종합 의견**: 최종 결론 및 시나리오별 가이드

### 품질 보장 원칙

- **객관성**: 데이터 기반 분석, 과도한 확신 표현 금지
- **투명성**: 데이터 출처, 기준일, 한계사항 명시
- **정량화**: 수치와 지표의 정확한 제시
- **조건부 의견**: 변경 트리거 및 시나리오 제시
- **최신성**: tool_now_kst() 기준 시점 표기

## API 및 데이터 소스

### 1. DART API (재무 데이터)
- **용도**: 한국 상장기업 재무제표 및 공시 정보
- **주요 엔드포인트**:
  - `/corpCode.xml`: 기업 코드 목록
  - `/fnlttSinglAcntAll.json`: 재무제표 데이터
  - `/list.json`: 공시 목록
- **캐싱**: 24시간 기업 코드 캐시 적용
- **에러 처리**: Rate limit 및 서버 다운 대응

### 2. Yahoo Finance API
- **용도**: 주가 데이터 및 기술적 지표 계산
- **라이브러리**: yfinance, ta (technical analysis)
- **지원 데이터**: OHLCV, 다양한 시간대 및 기간

### 3. Google Search API
- **용도**: 실시간 뉴스 및 정보 검색
- **모델**: Gemini를 통한 검색 결과 분석

## 확장성 및 유지보수

### 모듈러 설계
- 각 서브 에이전트는 독립적으로 개발 및 테스트 가능
- 새로운 분석 에이전트 추가 시 기존 구조 유지
- 도구(tools) 레벨에서의 기능 확장 가능

### 설정 관리
- 환경변수를 통한 API 키 및 모델 설정
- 중앙화된 config.py에서 모든 설정 관리

### 에러 처리
- 각 도구별 독립적인 에러 처리
- 데이터 부족 시 명확한 "데이터 없음" 표기
- API 장애 시 적절한 폴백 메커니즘

## 보안 고려사항

### API 키 관리
- `.env` 파일을 통한 민감 정보 분리
- 환경변수 부재 시 런타임 에러로 조기 감지

### 데이터 검증
- 외부 API 응답 데이터의 유효성 검증
- 악의적 입력에 대한 기본적인 필터링

이 문서는 Dontcare 프로젝트의 AI 에이전트 시스템에 대한 종합적인 개요를 제공하며, 개발자들이 시스템을 이해하고 확장할 수 있도록 돕는 것을 목적으로 합니다.