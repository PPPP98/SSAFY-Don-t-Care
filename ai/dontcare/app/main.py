import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints

app = FastAPI()

# CORS 설정을 환경변수에서 로딩
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS")
if not ALLOWED_ORIGINS_ENV:
    raise RuntimeError("ALLOWED_ORIGINS 환경변수가 설정되지 않았습니다")

origins = [
    origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router)
