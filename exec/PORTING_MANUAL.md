# 📑 Don’t Care(돈케어) — GitLab 소스 클론 이후 빌드 및 배포 매뉴얼

## 0) 프로젝트 개요
- 팀/프로젝트: **Agent 6 — Don’t Care(돈케어)**
- 한 줄 소개: *투자 결정을 돕는 AI 에이전트 기반 대화형 서비스*
- 핵심 특징
  - LLM 기반 대화형 Q&A
  - 질문 의도 분석 → 전문 에이전트 자동 라우팅
  - 실시간 데이터(뉴스/재무/기술/백테스트) 종합 분석 + 출처 제공
  - 멀티 에이전트 구조(확장 용이, 예: 할루시네이션 검증 에이전트 추가)
  - 답변 과정·근거 시각화로 투명성 강화

---

## 1) 사용 환경(제품/버전)

### Frontend
- React **19.1.1**, TypeScript **~5.8.3**, Vite **^7.1.2**
- Tailwind CSS **3.4.17**, TanStack Query **5.87.1**, Zustand **5.0.8**, Jotai **2.13.1**
- 기타: Axios **1.12.0**, React Router DOM **7.8.2**, React Markdown **10.1.0**
- Node.js 런타임: **18 LTS 이상 권장**

### Backend (Django API)
- Python **3.10+ 권장**
- Django **5.2.6**, Django REST Framework **3.16.1**
- 인증/계정: **dj-rest-auth 7.0.1**, **django-allauth 65.11.1**, **djangorestframework-simplejwt 5.5.1**
- 설정/유틸: django-environ, django-cors-headers, django-redis, django-filter, django-ratelimit
- 문서화: **drf-spectacular 0.27.2** (OpenAPI/Swagger)
- 정적파일: **whitenoise 6.9.0**
- 데이터/분석: **pandas 2.3.2**, **yfinance 0.2.66**, beautifulsoup4, lxml
- DB 드라이버: **psycopg2-binary 2.9.10**
- 개발보조: django-debug-toolbar, django-extensions

### AI / Agent (FastAPI 서비스)
- **FastAPI 0.116.1**, **Uvicorn 0.35.0**, **Starlette 0.47.3**
- 모델/클라이언트: **openai 1.107.2**, **google-genai 1.36.0**, **litellm 1.77.1**, **google-adk 1.13.0**
- Google Cloud SDK: aiplatform, logging, secret-manager 등(GCP 사용 시)
- 스트리밍/이벤트: **httpx-sse 0.4.1**, **sse-starlette 3.0.2**, websockets
- 시계열/퀀트: **vectorbt 0.28.1**, **quantstats 0.0.77**, **pandas-ta 0.4.71b0**, **ta 0.11.0**, **TA-Lib 0.6.7**
- ML: **scikit-learn 1.7.2**, **scipy 1.16.2**, **numba 0.61.2**
- 작업 스케줄러/분산: **APScheduler 3.6.3**, **Ray 2.49.2**
- 기타 트레이딩/거래소: alpaca-py, ccxt, python-binance

### Database & Cache
- **PostgreSQL** (예: 15-alpine)
- **Redis 7.x**

### Infra / CI
- AWS EC2(Ubuntu), **Nginx**(Reverse Proxy + SSL), **Docker/Compose**, **Jenkins**

### IDE
- VS Code(권장), (선택) PyCharm/IntelliJ

---

## 2) 저장소 구조(예시)
- /frontend # React + Vite
- /backend # Django API
- /ai # FastAPI + Agents
- /docker # Dockerfile/compose 등 (선택)
- /docs # 요구사항/ERD/API 명세 등 문서


---

## 3) 환경변수 명세

### 3.1 Frontend (.env.*)
```env
VITE_API_BASE=https://<도메인>/api
VITE_SESSIONS_BASE=https://<도메인>/agent
VITE_APP_NAME=DontCare
```

### 3.2 Backend (.env)
```env
DJANGO_SECRET_KEY=...
DJANGO_DEBUG=false
ALLOWED_HOSTS=<도메인>,localhost,127.0.0.1

DATABASE_URL=postgres://USER:PASS@db:5432/dontcare
REDIS_URL=redis://redis:6379/0

CORS_ALLOWED_ORIGINS=https://<도메인>,http://localhost:5173

JWT_SIGNING_KEY=...
JWT_ACCESS_LIFETIME=3600
JWT_REFRESH_LIFETIME=1209600

KIS_API_KEY=...
DART_API_KEY=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

SENTRY_DSN=...
```

### 3.3 AI / Agents (.env)

```env
AGENT_BASE_URL=https://<도메인>/agent
PORT=9000

OPENAI_API_KEY=...
GEMINI_API_KEY=...
LITELLM_MODEL=gpt-4o-mini

GOOGLE_CLOUD_PROJECT=...
GOOGLE_CLOUD_LOCATION=asia-northeast3
AGENT_ENGINE_ID=...
GOOGLE_APPLICATION_CREDENTIALS=/secrets/sa.json

YFINANCE_USE=1
KIS_API_KEY=...
DART_API_KEY=...
NEWS_NAVER_CLIENT_ID=...
NEWS_NAVER_CLIENT_SECRET=...

REDIS_URL=redis://redis:6379/1
RAY_ADDRESS=auto

```

⚠️ .env / sa.json은 Git에 커밋 금지. Jenkins Credentials / Secret Manager / K8s Secret 사용.

## 4) 로컬 개발 빌드
### Frontend
```
cd frontend
pnpm i
pnpm dev
pnpm build
pnpm preview
```
### Backend (Django)
```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
python manage.py runserver 0.0.0.0:8000
```
### AI / Agents (FastAPI)
```
cd ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload

```
시스템 의존성: TA-Lib, build-essential, libffi-dev 등 사전 설치 필요.

## 5) Docker/Compose 배포
```
version: "3.9"
services:
  frontend:
    build: ./frontend
    env_file: ./frontend/.env.production
    ports: ["3000:3000"]

  backend:
    build: ./backend
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn config.wsgi:application -b 0.0.0.0:8000 --workers 3"
    depends_on: [db, redis]
    ports: ["8000:8000"]

  ai:
    build: ./ai
    env_file: ./ai/.env
    depends_on: [redis]
    ports: ["9000:9000"]

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dontcare
      POSTGRES_USER: dc
      POSTGRES_PASSWORD: dcpass
    ports: ["5432:5432"]

  redis:
    image: redis:7
    ports: ["6379:6379"]

volumes:
  pgdata:

```

## 6) Nginx 리버스 프록시
```
server {
  listen 80;
  server_name <도메인>;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name <도메인>;

  ssl_certificate     /etc/letsencrypt/live/<도메인>/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/<도메인>/privkey.pem;

  location / { proxy_pass http://frontend:3000; }
  location /api/ { proxy_pass http://backend:8000/api/; }
  location /agent/ {
    proxy_pass http://ai:9000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Cache-Control "no-transform";
  }
}
```

## 7) Jenkins CI/CD

```
FROM jenkins/jenkins:lts
USER root

RUN apt-get update && apt-get install -y lsb-release curl gpg
RUN curl -fsSL https://download.docker.com/linux/debian/gpg \
 | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
 | tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN apt-get update && apt-get install -y docker-ce-cli

USER jenkins
```

실행 예시
```
DOCKER_SOCK_GID=$(stat -c '%g' /var/run/docker.sock)
docker run -d --name jenkins \
  -p 8081:8080 -p 50000:50000 \
  -v /var/jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --group-add ${DOCKER_SOCK_GID} \
  your-registry/jenkins-with-docker:latest
```

Pipeline 예시
```
pipeline {
  agent any
  environment {
    REGISTRY = 'your-registry'
    IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Build Frontend') {
      steps {
        sh 'cd frontend && pnpm i && pnpm build'
        sh 'docker build -t $REGISTRY/dc-frontend:$IMAGE_TAG frontend'
      }
    }
    stage('Build Backend') {
      steps { sh 'docker build -t $REGISTRY/dc-backend:$IMAGE_TAG backend' }
    }
    stage('Build AI') {
      steps { sh 'docker build -t $REGISTRY/dc-ai:$IMAGE_TAG ai' }
    }
    stage('Push Images') {
      steps {
        sh 'docker push $REGISTRY/dc-frontend:$IMAGE_TAG'
        sh 'docker push $REGISTRY/dc-backend:$IMAGE_TAG'
        sh 'docker push $REGISTRY/dc-ai:$IMAGE_TAG'
      }
    }
    stage('Deploy') {
      steps {
        sh 'ssh ubuntu@server "cd /srv/dc && docker compose pull && docker compose up -d --remove-orphans"'
      }
    }
  }
}
```

### 8) 데이터·보안·운영 체크리스트

DB: 운영/개발 분리, 백업 주기
Redis: 인증, 내부망 한정
JWT: 수명/로테이션 정책
로깅: Nginx/Django/AI/LLM 호출 로그
레이트리밋: django-ratelimit 적용
SSE/WS: no-transform 헤더, 타임아웃 조정
스케줄러: APScheduler/Ray
빌드 의존성: TA-Lib/Numba 포함
문서: /docs 폴더 또는 위키

### 9) 에이전트 기능 맵

뉴스: Gemini + 검색 → 출처 포함 요약
재무 분석: GPT + DART → 재무비율(수익성/안정성/성장성)
기술적 분석: GPT + yfinance → RSI/MACD/MA/볼린저밴드 → 전략 제안
리스크/백테스트: GPT + yfinance/quantstats/vectorbt → 종합 평가