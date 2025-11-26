"""
dontcare 프로젝트의 ASGI 설정 파일

ASGI 호출 가능한 객체를 ``application``이라는 모듈 레벨 변수로 노출합니다.

이 파일에 대한 자세한 정보는 다음을 참조하세요:
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dontcare.settings')

application = get_asgi_application()
