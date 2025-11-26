from django.urls import path
from . import views

app_name = 'portfolio'

urlpatterns = [
		# ─────────────────────────────────────────────────────────────────────────────
		# 클래스 기반 뷰 (권장)
		# ─────────────────────────────────────────────────────────────────────────────
		
		# 포트폴리오 생성
		path('create/', views.PortfolioCreateView.as_view(), name='portfolio_create'),
		
		# 포트폴리오 목록 조회
		path('list/', views.PortfolioListView.as_view(), name='portfolio_list'),
		
		# 포트폴리오 상세 조회
		path('<int:pk>/', views.PortfolioDetailView.as_view(), name='portfolio_detail'),
		
		# 포트폴리오 수정
		path('<int:pk>/update/', views.PortfolioUpdateView.as_view(), name='portfolio_update'),
		
		# 포트폴리오 삭제
		path('<int:pk>/delete/', views.PortfolioDeleteView.as_view(), name='portfolio_delete'),
		
		# 포트폴리오 통계
		path('stats/', views.get_portfolio_stats, name='portfolio_stats'),
		
]