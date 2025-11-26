from django.urls import path
from . import views

urlpatterns = [
    # 해외 주식 (기존)
    path("us/", views.get_all_markets, name="all_stocks"),
    path("us/<str:symbol>/", views.get_individual_stock, name="individual_stock"),
    # 한국 주식 (신규)
    path("kr/", views.get_all_kr_markets, name="all_kr_stocks"),
    path("kr/<str:symbol>/", views.get_individual_kr_stock, name="individual_kr_stock"),
    # 해외 지수
    path("indexes/us/", views.get_all_us_indexes, name="all_us_indexes"),
    path(
        "indexes/us/<str:symbol>/",
        views.get_individual_us_index,
        name="individual_us_index",
    ),
    # 국내 지수
    path("indexes/kr/", views.get_all_kr_indexes, name="all_kr_indexes"),
    path(
        "indexes/kr/<str:symbol>/",
        views.get_individual_kr_index,
        name="individual_kr_index",
    ),
    # ETF 관련 엔드포인트
    path("etfs/", views.get_all_etfs, name="all_etfs"),
    path("etfs/<str:symbol>/", views.get_individual_etf, name="individual_etf"),
    # 원자재 관련 엔드포인트
    path("commodities/", views.get_all_commodities, name="all_commodities"),
    path(
        "commodities/<str:symbol>/",
        views.get_individual_commodity,
        name="individual_commodity",
    ),
    # 환율 관련 엔드포인트
    path("currencies/", views.get_all_currencies, name="all_currencies"),
    path(
        "currencies/<str:symbol>/",
        views.get_individual_currency,
        name="individual_currency",
    ),
    # 통합 대시보드 엔드포인트
    path(
        "dashboard/parallel/", views.get_dashboard_parallel, name="dashboard_parallel"
    ),
    # ================================================================
    # KIS API (한국투자증권) 전용 엔드포인트
    # ================================================================
    # KIS API를 사용한 시장 지수 조회
    path("", views.get_all_markets_kis, name="kis_all_markets"),
]
