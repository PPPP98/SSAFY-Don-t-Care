<div align="center">
  <img src="./exec/images/dontcare_logo.png" alt="프로젝트 로고" width="380px" height="250px" />
  <h2> Don’t Care (돈케어) : 투자 결정을 돕는 AI 에이전트 기반 대화형 서비스 </h2>
  <p> 복잡한 투자 정보 분석을 한 서비스 내에서 해결한다 </p>
  <p> 자율 프로젝트 부울경 1반 TEAM 07 - Agent 6 </p>
</div>

---

## 📑 목차
1. [🚀 프로젝트 소개](#intro)
2. [🛠️ 기술 스택](#tech)
3. [💡 주요 기능](#func)
4. [📂 시스템 아키텍처](#arch)
5. [⚙️ 실행 방법](#meth)
6. [🖥️ 서비스 화면](#view)
7. [👨‍👩‍👧‍👦 개발 팀 소개](#team)
8. [🗓️ 개발 일정](#date)
9. [📝 산출물](#output)

---

## 🚀 프로젝트 소개 <a id="intro"></a>
**"[투자 결정을 돕는 AI 에이전트 기반 대화형 서비스]"**

Don’t Care(돈케어)는 복잡하고 번거로운 투자 정보 분석 과정을 하나의 플랫폼에서 해결합니다.  
실시간 금융 데이터와 기업 공시 정보, 뉴스 분석, 기술적 지표, 백테스트 결과를 종합해 **신뢰성 있는 투자 인사이트**를 제공합니다.  

- **LLM 기반 대화형 질의응답** 지원  
- 질문 의도를 분류해 **전문 에이전트 자동 호출**  
- 실시간 데이터 기반 **투자 리포트 제공**  
- **답변 과정과 출처 시각화**로 신뢰성 강화  
- **확장 가능한 에이전트 구조** → 신규 에이전트 쉽게 추가 가능  

---

## 🛠️ 기술 스택 <a id="tech"></a>

### Frontend
- React, TypeScript, Vite
- Tailwind CSS
- Zustand, Jotai
- TanStack Query
- Axios

### Backend
- Python 3.10+
- Django, Django REST Framework
- JWT, dj-rest-auth, django-allauth
- Gunicorn
- Redis, PostgreSQL

### AI / Agents
- FastAPI
- ADK (Agent Development Kit)
- OpenAI GPT-4o mini, Gemini 2.0 Flash
- yfinance, quantstats, vectorbt, TA-Lib
- scikit-learn, pandas

### Infra & DevOps
- AWS EC2
- Docker, Docker Compose
- Jenkins (CI/CD)
- Nginx (Reverse Proxy + SSL)

### Database
- PostgreSQL
- Redis

### Tools
- Git
- GitLab
- Notion
- Jira
- Mattermost

---

## 💡 주요 기능 <a id="func"></a>

| 기능 | 설명 |
|------|------|
| **뉴스 에이전트** | Gemini + 검색 API를 활용, 출처 포함 뉴스 요약 제공 |
| **재무 분석 에이전트** | DART API 기반 기업 재무제표 분석 → 수익성/안정성/성장성 지표 도출 |
| **기술적 분석 에이전트** | yfinance 기반 RSI, MACD, 이동평균선, 볼린저밴드 계산 → 전략 제안 |
| **리스크 분석 에이전트** | 과거 주가 데이터 기반 백테스트 → 전략 리스크 및 수익성 평가 |
| **멀티 에이전트 라우팅** | Root Agent가 질문 의도 분석 후 적절한 전문 에이전트로 라우팅 |
| **투자 리포트 제공** | 종합 뉴스 + 재무 + 기술 + 백테스트 결과를 리포트 형태로 제공 |

---

## 📂 시스템 아키텍처 <a id="arch"></a>

![architecture](./exec/images/dontcare_architecture.png)

- **사용자** → Nginx(443) → Backend(Django) / AI(FastAPI)  
- **Backend** → PostgreSQL, Redis  
- **AI 서버** → ADK 기반 멀티에이전트 → LLM 호출(OpenAI, Gemini)  
- **외부 API** → 한국투자증권 API, DART API, Naver 뉴스 API, yfinance  
- **CI/CD** → GitLab → Jenkins → Docker → EC2 배포  

---

## ⚙️ 실행 방법 <a id="meth"></a>

### 1. 환경 변수 설정
```bash
# frontend/.env
VITE_API_BASE=https://<도메인>/api
VITE_SESSIONS_BASE=https://<도메인>/agent
VITE_APP_NAME=DontCare

# backend/.env
DJANGO_SECRET_KEY=...
DATABASE_URL=postgres://USER:PASS@db:5432/dontcare
REDIS_URL=redis://redis:6379/0
KIS_API_KEY=...
DART_API_KEY=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# ai/.env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
GOOGLE_CLOUD_PROJECT=...
GOOGLE_CLOUD_LOCATION=asia-northeast3
AGENT_ENGINE_ID=...
```

### 2. Docker 실행
```
docker-compose up -d --build
```

---

### 서비스 화면 <a id="view"></a>
- 랜딩 페이지: 서비스 소개 및 투자 보조 기능 안내
![온보딩 페이지](./exec/videos/onboarding.gif)
- 에이전트 시연: 뉴스/재무/기술/리스크 분석 대화 흐름
![메인 페이지](./exec/videos/mainpage.gif)
- 투자 리포트 결과 화면: 데이터·지표 시각화, 출처 포함
![에이전트 호출](./exec/videos/agentcall.gif)
![답변 결과](./exec/videos/result.gif)

---

### 👨‍👩‍👧‍👦 개발 팀 소개 <a id="team"></a>
| 사진                                                       | 이름  | 역할           | GitHub                                   |
| -------------------------------------------------------- | --- | ------------ | ---------------------------------------- |
| <img src="https://github.com/silence102.png" width="120"/>  | 김민석 | `FE` `Leader`         | [@silence102](https://github.com/silence102)   |
| <img src="" width="120"/>       | 김민수  | `Infra`         | [@]()             |
| <img src="" width="120"/>   | 노혜성 | `FE`         | [@]()     |
| <img src="" width="120"/>    | 박진호 | `AI`         | [@]()       |
| <img src="https://github.com/wi4077.png" width="120"/>   | 조민규 | `BE`         | [@wi4077](https://github.com/wi4077)     |
| <img src="" width="120"/> | 임연지 | `AI`        | [@]() |


---

### 🗓️ 개발 일정 <a id="date"></a>

- **1주차 (2025.08.25 ~ 2025.08.31)**: 프로젝트 기획  
- **2주차 (2025.09.01 ~ 2025.09.07)**: 설계 및 구체화  
- **3주차 (2025.09.08 ~ 2025.09.14)**: 프론트/백엔드 기본 구현  
- **4주차 (2025.09.15 ~ 2025.09.21)**: AI/에이전트 연동, 데이터 수집  
- **5주차 (2025.09.22 ~ 2025.09.28)**: 통합 테스트 및 배포  
- **최종 발표 (2025.09.29)**: 최종 마무리 및 발표  

---

### 📝 산출물 <a id="output"></a>

- 요구사항 명세서

- 와이어프레임

- ERD

- API 명세서

- 포팅 매뉴얼

- 외부 서비스 정리