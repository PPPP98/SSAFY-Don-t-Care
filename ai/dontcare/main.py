import os

import uvicorn
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app
from pathlib import Path
from dotenv import load_dotenv

CURRENT_DIR = Path(__file__).resolve().parent
load_dotenv(CURRENT_DIR / ".env", override=False)

# main.py가 위치한 디렉토리 경로 가져오기
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
# 세션 서비스 URI 설정
SESSION_SERVICE_URI = f"agentengine://{os.environ['AGENT_ENGINE_ID']}"
# CORS 허용 출처 설정
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS")
if not ALLOWED_ORIGINS_ENV:
    raise RuntimeError("ALLOWED_ORIGINS 환경변수가 설정되지 않았습니다")

ALLOWED_ORIGINS = [
    origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",")
]
# 웹 인터페이스 제공 여부 설정
SERVE_WEB_INTERFACE = True

# FastAPI 앱 인스턴스 생성
adk_app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=SESSION_SERVICE_URI,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

app = FastAPI()
app.mount("/stream", adk_app)

@app.get("/hello")
async def read_root():
    return {"Hello": "World"}

if __name__ == "__main__":
    # Cloud Run에서 제공하는 PORT 환경변수 사용, 기본값 8000
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))