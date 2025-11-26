"""
dontcare 프로젝트의 URL 구성 파일

`urlpatterns` 목록은 URL을 뷰로 라우팅합니다. 자세한 정보는 다음을 참조하세요:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
예시:
함수 뷰
    1. import 추가:  from my_app import views
    2. urlpatterns에 URL 추가:  path('', views.home, name='home')
클래스 기반 뷰
    1. import 추가:  from other_app.views import Home
    2. urlpatterns에 URL 추가:  path('', Home.as_view(), name='home')
다른 URLconf 포함
    1. include() 함수 import: from django.urls import include, path
    2. urlpatterns에 URL 추가:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    # 인증 관련(로그인/로그아웃/비번/회원가입/OTP) 모두 accounts.urls로 위임
    # dj-rest-auth의 내장 API 사용 (토큰 갱신/검증 포함)
    path("auth/", include("accounts.urls")),
    path("portfolio/", include("portfolio.urls")),
    path("crawlings/", include("crawlings.urls")),
    path("stocks/", include("stocks.urls")),
]

# 개발 환경에서 미디어 파일 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
