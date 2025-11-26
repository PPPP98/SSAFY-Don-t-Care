* fastAPI 도커 실행 명령어  
`cd S13P21E107/ai/dontcare`  
`docker build -t myfastapi:latest .`  
`docker run -d -p 9000:9000 --name fastapi-container myfastapi:latest`  