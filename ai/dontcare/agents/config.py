import os
from pathlib import Path
from dotenv import load_dotenv
from google.adk.models.lite_llm import LiteLlm

# 환경변수 설정 및 .env 파일 로딩
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env", override=False)

# 필수 API 키 검증
if not os.getenv("DART_API_KEY"):
    raise RuntimeError("DART_API_KEY가 없습니다. .env 에 넣어주세요.")
if not os.getenv("GMS_API_KEY"):
    raise RuntimeError("GMS_API_KEY가 없습니다. .env 에 넣어주세요.")
if not os.getenv("GEMINI_API_KEY"):
    raise RuntimeError("GEMINI_API_KEY가 없습니다.")

GEMINI = os.getenv("GEMINI_MODEL")

GPT_MODEL = os.getenv("GPT_MODEL")
GMS_API_BASE_URL = os.getenv("GMS_API_BASE_URL")

if not GMS_API_BASE_URL:
    raise RuntimeError("GMS_API_BASE_URL 환경변수가 설정되지 않았습니다")

GPT = LiteLlm(
    model=GPT_MODEL,
    api_key=os.getenv("GMS_API_KEY"),
    api_base=GMS_API_BASE_URL,
)

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
AGENT_ENGINE_NAME = os.getenv("AGENT_ENGINE_NAME")

