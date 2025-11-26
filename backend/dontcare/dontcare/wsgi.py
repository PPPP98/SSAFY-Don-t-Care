"""
dontcare 프로젝트의 WSGI 설정 파일

WSGI 호출 가능한 객체를 ``application``이라는 모듈 레벨 변수로 노출합니다.

이 파일에 대한 자세한 정보는 다음을 참조하세요:
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dontcare.settings')

application = get_wsgi_application()
