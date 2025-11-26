from rest_framework import serializers
from django.utils import timezone
from .models import NewsArticle, NewsCrawlingLog


class NewsArticleSerializer(serializers.ModelSerializer):
    """
    뉴스 기사 정보를 직렬화하는 시리얼라이저
    - API 응답에서 뉴스 기사 데이터를 일관된 형식으로 제공
    """

    class Meta:
        model = NewsArticle
        fields = [
            "id",
            "title",
            "link",
            "original_link",
            "description",
            "pub_date",
            "publisher",
            "thumbnail_image",
            "image_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        """
        출력 형식을 커스터마이즈
        - ISO 형식의 날짜 문자열로 변환
        - 이미지 URL을 절대 경로로 변환
        """
        data = super().to_representation(instance)

        # 날짜 필드를 ISO 형식 문자열로 변환
        if instance.created_at:
            data["created_at"] = instance.created_at.isoformat()
        if instance.updated_at:
            data["updated_at"] = instance.updated_at.isoformat()

        # 이미지 URL을 절대 경로로 변환
        if instance.thumbnail_image:
            request = self.context.get("request")
            if request:
                data["thumbnail_image"] = request.build_absolute_uri(
                    instance.thumbnail_image.url
                )
            else:
                data["thumbnail_image"] = instance.thumbnail_image.url

        return data


class NewsCrawlingLogSerializer(serializers.ModelSerializer):
    """
    뉴스 크롤링 로그 정보를 직렬화하는 시리얼라이저
    - 크롤링 실행 결과 및 통계 정보 제공
    """

    class Meta:
        model = NewsCrawlingLog
        fields = [
            "id",
            "search_query",
            "total_found",
            "total_crawled",
            "total_saved",
            "status",
            "error_message",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class NewsSearchRequestSerializer(serializers.Serializer):
    """
    뉴스 검색 및 크롤링 요청 파라미터를 검증하는 시리얼라이저
    - GET/POST 요청의 파라미터를 통합적으로 검증
    """

    action = serializers.ChoiceField(
        choices=["crawl", "list"],
        default="crawl",
        help_text="수행할 작업 (crawl: 크롤링 실행, list: 저장된 뉴스 조회)",
    )

    # 크롤링 관련 파라미터
    display = serializers.IntegerField(
        default=10,
        min_value=1,
        max_value=100,
        help_text="크롤링 시 가져올 뉴스 개수 (최대 100개)",
    )

    start = serializers.IntegerField(
        default=1, min_value=1, max_value=1000, help_text="크롤링 시 검색 시작 위치"
    )

    sort = serializers.ChoiceField(
        choices=["sim", "date"],
        default="date",
        help_text="크롤링 시 정렬 방식 (sim: 정확도순, date: 날짜순)",
    )

    # 조회 관련 파라미터
    page = serializers.IntegerField(
        default=1, min_value=1, help_text="조회 시 페이지 번호"
    )

    page_size = serializers.IntegerField(
        default=20,
        min_value=1,
        max_value=100,
        help_text="조회 시 페이지당 개수 (최대 100개)",
    )

    def validate(self, data):
        """
        전체 데이터 검증
        - 액션에 따른 필수 파라미터 검증
        """
        action = data.get("action", "crawl")

        if action == "crawl":
            # 크롤링 시 필요한 파라미터들 검증
            if data.get("display", 0) <= 0:
                raise serializers.ValidationError(
                    "크롤링 시 display 값은 1 이상이어야 합니다."
                )

        elif action == "list":
            # 조회 시 필요한 파라미터들 검증
            if data.get("page", 0) <= 0:
                raise serializers.ValidationError("페이지 번호는 1 이상이어야 합니다.")

        return data


class NewsSearchResponseSerializer(serializers.Serializer):
    """
    뉴스 검색/크롤링 응답을 직렬화하는 시리얼라이저
    - 일관된 API 응답 형식 보장
    """

    success = serializers.BooleanField(help_text="요청 성공 여부")
    action = serializers.CharField(help_text="수행된 작업 유형")
    message = serializers.CharField(required=False, help_text="응답 메시지")
    error = serializers.CharField(required=False, help_text="오류 메시지")

    # 크롤링 응답 필드
    total_found = serializers.IntegerField(
        required=False, help_text="검색된 전체 뉴스 개수"
    )
    total_crawled = serializers.IntegerField(
        required=False, help_text="크롤링된 뉴스 개수"
    )
    total_saved = serializers.IntegerField(required=False, help_text="저장된 뉴스 개수")
    duplicate_count = serializers.IntegerField(
        required=False, help_text="중복 제거된 뉴스 개수"
    )
    log_id = serializers.IntegerField(required=False, help_text="크롤링 로그 ID")

    # 조회 응답 필드
    total_count = serializers.IntegerField(
        required=False, help_text="전체 저장된 뉴스 개수"
    )
    page = serializers.IntegerField(required=False, help_text="현재 페이지 번호")
    page_size = serializers.IntegerField(required=False, help_text="페이지당 개수")
    has_next = serializers.BooleanField(
        required=False, help_text="다음 페이지 존재 여부"
    )

    # 뉴스 데이터
    items = NewsArticleSerializer(many=True, required=False, help_text="뉴스 기사 목록")


class NewsArticleCreateSerializer(serializers.ModelSerializer):
    """
    뉴스 기사 생성을 위한 시리얼라이저
    - 크롤링된 데이터의 검증 및 저장
    """

    class Meta:
        model = NewsArticle
        fields = [
            "title",
            "description",
            "link",
            "original_link",
            "pub_date",
            "publisher",
            "thumbnail_image",
            "image_url",
            "content_hash",
        ]

    def validate_title(self, value):
        """제목 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("뉴스 제목은 필수입니다.")

        if len(value.strip()) > 500:
            raise serializers.ValidationError("뉴스 제목은 500자를 초과할 수 없습니다.")

        return value.strip()

    def validate_link(self, value):
        """링크 검증"""
        if not value or not value.strip():
            raise serializers.ValidationError("뉴스 링크는 필수입니다.")

        # 기본적인 URL 형식 검증
        if not value.startswith(("http://", "https://")):
            raise serializers.ValidationError("올바른 URL 형식이 아닙니다.")

        return value.strip()

    def validate_publisher(self, value):
        """발행처 검증"""
        if value and len(value) > 100:
            raise serializers.ValidationError("발행처명은 100자를 초과할 수 없습니다.")

        return value.strip() if value else value


class NewsStatisticsSerializer(serializers.Serializer):
    """
    뉴스 통계 정보를 직렬화하는 시리얼라이저
    - 대시보드나 통계 API에서 사용
    """

    total_articles = serializers.IntegerField(help_text="전체 뉴스 기사 수")
    articles_today = serializers.IntegerField(help_text="오늘 수집된 뉴스 수")
    articles_this_week = serializers.IntegerField(help_text="이번 주 수집된 뉴스 수")
    total_publishers = serializers.IntegerField(help_text="전체 발행처 수")
    last_crawling_time = serializers.DateTimeField(
        required=False, help_text="마지막 크롤링 시간"
    )

    # 발행처별 통계
    top_publishers = serializers.ListField(
        child=serializers.DictField(), required=False, help_text="상위 발행처 목록"
    )
