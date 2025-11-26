## 📑 외부 서비스 사용 내역

| 서비스명                              | 제공처           | 사용 목적                     | 인증 방식                     | 활용 기능 / 비고                       |
| --------------------------------- | ------------- | ------------------------- | ------------------------- | -------------------------------- |
| **한국투자증권 API**                    | KIS           | 실시간 주식 시세, 호가 조회          | API Key / OAuth2          | 종목별 실시간 가격, 투자 분석용 데이터           |
| **DART API**                      | 금융감독원         | 기업 공시/재무제표 데이터 조회         | API Key                   | 손익계산서, 재무비율, 성장성 지표 활용           |
| **네이버 뉴스 검색 API**                 | NAVER         | 최신 뉴스 데이터 수집              | Client ID/Secret          | 키워드 기반 뉴스 검색, 출처 제공              |
| **yfinance**                      | Yahoo Finance | 글로벌 주가·차트 데이터             | 오픈소스 (Key 불필요)            | 과거 주가 조회, RSI·MACD 등 기술적 분석      |
| **OpenAI API**                    | OpenAI        | LLM 호출 (GPT-4o mini)      | API Key                   | 대화형 답변 생성                        |
| **Gemini API**                    | Google        | LLM 호출 (Gemini 2.0 Flash) | API Key                   | 뉴스 요약·분석, 멀티에이전트 활용              |
| **Google Cloud Vertex AI**        | Google Cloud  | AI 모델 실행/호스팅              | Service Account Key(JSON) | ADK 기반 에이전트 관리                   |
| **ADK (Agent Development Kit)**   | Google        | 멀티 에이전트 프레임워크             | Config 파일                 | Root Agent, Tool Agent 오케스트레이션   |
| **AWS EC2**                       | AWS           | 서버 호스팅                    | SSH Key                   | Docker/Compose 실행 환경             |
| **Jenkins**                       | 오픈소스          | CI/CD 자동화                 | Credentials (ID/Token)    | GitLab Webhook → 빌드·배포 파이프라인     |
| **Docker Hub / Private Registry** | Docker        | 컨테이너 이미지 저장/배포            | docker login (ID/Token)   | Jenkins Pipeline에서 이미지 push/pull |

---

### 📌 작성 시 주의사항

- 인증 정보(API Key, Secret) → 문서에 직접 기재 ❌, .env 또는 Secret Manager 관리 방식만 설명