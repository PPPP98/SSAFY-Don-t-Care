from django.db import models
from django.utils import timezone
from urllib.parse import urlparse


class NewsArticle(models.Model):
    """
    네이버 뉴스 기사 정보를 저장하는 모델
    """

    # 기본 정보
    title = models.CharField(
        max_length=500,
        verbose_name="뉴스 제목",
        help_text="네이버 API에서 가져온 뉴스 제목",
    )

    description = models.TextField(
        verbose_name="뉴스 요약", help_text="네이버 API에서 제공하는 뉴스 요약 내용"
    )

    # 링크 정보
    link = models.URLField(
        max_length=1000, verbose_name="뉴스 링크", help_text="네이버 뉴스 링크"
    )

    original_link = models.URLField(
        max_length=1000,
        verbose_name="원본 링크",
        help_text="원본 언론사 링크",
        blank=True,
        null=True,
    )

    # 발행 정보
    pub_date = models.CharField(
        max_length=100,
        verbose_name="발행일시",
        help_text="네이버 API에서 제공하는 발행일시 (원본 형식)",
    )

    publisher = models.CharField(
        max_length=200,
        verbose_name="발행처",
        help_text="뉴스 발행처/언론사명",
        blank=True,
        null=True,
    )

    # 이미지 정보
    thumbnail_image = models.ImageField(
        upload_to="news_images/thumbnails/%Y/%m/%d/",
        verbose_name="썸네일 이미지",
        help_text="뉴스 기사의 대표 이미지",
        blank=True,
        null=True,
    )

    image_url = models.URLField(
        max_length=1000,
        verbose_name="원본 이미지 URL",
        help_text="뉴스 기사의 원본 이미지 URL",
        blank=True,
        null=True,
    )

    # 메타 정보
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="생성일시", help_text="DB에 저장된 일시"
    )

    updated_at = models.DateTimeField(
        auto_now=True, verbose_name="수정일시", help_text="마지막 수정 일시"
    )

    # 해시값 (중복 방지용)
    content_hash = models.CharField(
        max_length=64,
        unique=True,
        verbose_name="콘텐츠 해시",
        help_text="제목+링크 기반 해시값 (중복 방지용)",
    )

    class Meta:
        verbose_name = "뉴스 기사"
        verbose_name_plural = "뉴스 기사들"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["publisher"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["content_hash"]),
            models.Index(fields=["pub_date"]),
        ]

    def __str__(self):
        return f"[{self.publisher or '미상'}] {self.title[:50]}..."

    def extract_publisher_from_link(self):
        """
        링크에서 발행처 정보를 추출하는 메서드
        """
        if not self.original_link:
            return None

        try:
            parsed_url = urlparse(self.original_link)
            domain = parsed_url.netloc.lower()

            # 주요 언론사 도메인 매핑
            publisher_mapping = {
                "news.chosun.com": "조선일보",
                "www.chosun.com": "조선일보",
                "news.joins.com": "중앙일보",
                "www.joongang.co.kr": "중앙일보",
                "news.donga.com": "동아일보",
                "www.donga.com": "동아일보",
                "news.hankyung.com": "한국경제",
                "www.hankyung.com": "한국경제",
                "biz.chosun.com": "조선비즈",
                "www.mk.co.kr": "매일경제",
                "news.mk.co.kr": "매일경제",
                "www.edaily.co.kr": "이데일리",
                "news.mt.co.kr": "머니투데이",
                "www.mt.co.kr": "머니투데이",
                "www.yonhapnews.co.kr": "연합뉴스",
                "news.yonhapnews.co.kr": "연합뉴스",
                "www.yna.co.kr": "연합뉴스",
                "newsis.com": "뉴시스",
                "www.newsis.com": "뉴시스",
                "news.kbs.co.kr": "KBS",
                "imnews.imbc.com": "MBC",
                "news.sbs.co.kr": "SBS",
                "news.jtbc.joins.com": "JTBC",
                "news.tvchosun.com": "TV조선",
                "news.mbn.co.kr": "MBN",
                "www.etnews.com": "전자신문",
                "biz.newdaily.co.kr": "뉴데일리",
                "www.fnnews.com": "파이낸셜뉴스",
                "fnews.com": "파이낸셜뉴스",
                "www.asiae.co.kr": "아시아경제",
                "view.asiae.co.kr": "아시아경제",
                "www.sedaily.com": "서울경제",
                "news.heraldcorp.com": "헤럴드경제",
                "biz.heraldcorp.com": "헤럴드경제",
                "www.wowtv.co.kr": "한국경제TV",
                "news.wowtv.co.kr": "한국경제TV",
            }

            return publisher_mapping.get(
                domain, domain.replace("www.", "").split(".")[0]
            )

        except Exception:
            return None

    def save(self, *args, **kwargs):
        """
        저장 시 발행처 정보를 자동으로 추출
        """
        if not self.publisher and self.original_link:
            self.publisher = self.extract_publisher_from_link()

        super().save(*args, **kwargs)


class NewsCrawlingLog(models.Model):
    """
    뉴스 크롤링 로그를 저장하는 모델
    """

    # 크롤링 정보
    search_query = models.CharField(
        max_length=200, verbose_name="검색어", help_text="크롤링에 사용된 검색어"
    )

    total_found = models.IntegerField(
        verbose_name="총 검색 결과", help_text="네이버 API에서 반환한 총 결과 개수"
    )

    total_crawled = models.IntegerField(
        verbose_name="크롤링된 개수", help_text="실제로 가져온 뉴스 개수"
    )

    total_saved = models.IntegerField(
        verbose_name="저장된 개수", help_text="중복 제거 후 DB에 저장된 개수"
    )

    # 메타 정보
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="크롤링 일시")

    status = models.CharField(
        max_length=20,
        choices=[
            ("SUCCESS", "성공"),
            ("PARTIAL", "부분 성공"),
            ("FAILED", "실패"),
        ],
        default="SUCCESS",
        verbose_name="크롤링 상태",
    )

    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name="오류 메시지",
        help_text="크롤링 중 발생한 오류 내용",
    )

    class Meta:
        verbose_name = "크롤링 로그"
        verbose_name_plural = "크롤링 로그들"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.search_query} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
