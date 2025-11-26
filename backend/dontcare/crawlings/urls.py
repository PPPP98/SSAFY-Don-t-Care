from django.contrib import admin
from django.urls import path, include
from .views import crawl_news_api

urlpatterns = [
    # "오늘의 증권" 뉴스 크롤링 API
    path("news/", crawl_news_api, name="news"),
]
