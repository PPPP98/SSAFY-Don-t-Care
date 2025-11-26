# Python 3.12 이미지 사용
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 9000

# Uvicorn을 사용하여 FastAPI 실행, --reload 옵션은 개발용, 실제 운영 시 제거 권장
# CMD ["uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "9000"]
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 9000 && echo '완료---------'"]
