from django.contrib import admin
from .models import NewsArticle, NewsCrawlingLog


@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'publisher', 'pub_date', 'created_at')
    list_filter = ('publisher', 'created_at')
    search_fields = ('title', 'description', 'publisher')
    readonly_fields = ('content_hash', 'created_at', 'updated_at')
    list_per_page = 20
    ordering = ('-created_at',)
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('title', 'description')
        }),
        ('링크 정보', {
            'fields': ('link', 'original_link')
        }),
        ('발행 정보', {
            'fields': ('pub_date', 'publisher')
        }),
        ('메타 정보', {
            'fields': ('content_hash', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(NewsCrawlingLog)
class NewsCrawlingLogAdmin(admin.ModelAdmin):
    list_display = ('search_query', 'total_found', 'total_crawled', 'total_saved', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('search_query', 'error_message')
    readonly_fields = ('created_at',)
    list_per_page = 50
    ordering = ('-created_at',)
    
    fieldsets = (
        ('크롤링 정보', {
            'fields': ('search_query', 'total_found', 'total_crawled', 'total_saved', 'status')
        }),
        ('오류 정보', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('메타 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )
