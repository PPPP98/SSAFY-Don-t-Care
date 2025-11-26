import os
import sys
import urllib.request
import json
import requests
import re
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, APIException
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django_ratelimit.exceptions import Ratelimited
from .utils import (
    ImageExtractor,
    extract_publisher_from_naver_api,
)
import logging

logger = logging.getLogger(__name__)

client_id = os.getenv("CLIENT_ID")
client_secret = os.getenv("CLIENT_SECRET")


def handle_ratelimit_exception(func):
    """
    Rate limiting 예외를 처리하는 데코레이터
    """

    def wrapper(request, *args, **kwargs):
        try:
            return func(request, *args, **kwargs)
        except Ratelimited:
            logger.warning(
                f"Rate limit exceeded for IP: {request.META.get('REMOTE_ADDR', 'Unknown')}, endpoint: {request.path}"
            )
            return Response(
                {"detail": "요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

    return wrapper


def crawl_news(query, display=10, start=1, sort="date", end=None, extract_images=True):
    """
    네이버 뉴스 검색 API를 사용해 뉴스 데이터를 리스트로 반환합니다.

    Args:
        query (str): 검색어
        display (int): 한 번에 가져올 뉴스 개수 (최대 100)
        start (int): 검색 시작 위치
        sort (str): 정렬 방식("sim", "date")
        end (int): 검색 종료 인덱스 (None이면 start+display 범위만)
        extract_images (bool): 이미지 추출 여부

    Returns:
        list: 뉴스 데이터 리스트
    """
    if end is None:
        end = start + display

    news_list = []

    # HTML 태그 제거를 위한 정규식
    remove_tag = re.compile(r"<.*?>")

    # 이미지 추출기 초기화
    image_extractor = ImageExtractor() if extract_images else None

    for start_index in range(start, end, display):
        # URL 인코딩
        encoded_query = urllib.parse.quote(query)

        url = (
            "https://openapi.naver.com/v1/search/news.json?"
            + "query="
            + encoded_query
            + "&display="
            + str(display)
            + "&start="
            + str(start_index)
            + "&sort="
            + sort
        )

        try:
            # 요청 객체 생성 및 헤더 추가
            request = urllib.request.Request(url)
            request.add_header("X-Naver-Client-Id", client_id)
            request.add_header("X-Naver-Client-Secret", client_secret)

            # API 호출
            response = urllib.request.urlopen(request)
            rescode = response.getcode()

            if rescode == 200:
                response_body = response.read()
                response_dict = json.loads(response_body.decode("utf-8"))
                items = response_dict.get("items", [])

                for item in items:
                    title = re.sub(remove_tag, "", item.get("title", ""))
                    original_link = item.get("originallink", "")
                    link = item.get("link", "")
                    description = re.sub(remove_tag, "", item.get("description", ""))
                    pub_date = re.sub(remove_tag, "", item.get("pubDate", ""))

                    # 발행처 정보 추출
                    publisher = extract_publisher_from_naver_api(item)

                    # 이미지 관련 변수 초기화
                    image_url = ""

                    # 이미지 추출 (저장은 하지 않고 URL만 반환)
                    if extract_images and image_extractor and original_link:
                        try:
                            logger.info(f"이미지 추출 시작: {title[:30]}...")
                            image_urls = image_extractor.extract_images_from_url(
                                original_link, max_images=1
                            )

                            if image_urls:
                                image_url = image_urls[0]
                                logger.info(f"이미지 URL 추출 완료: {image_url}")
                            else:
                                logger.info(f"추출된 이미지 없음: {original_link}")

                        except Exception as e:
                            logger.error(f"이미지 처리 중 오류: {str(e)}")

                    news_item = {
                        "title": title,
                        "original_link": original_link,
                        "link": link,
                        "description": description,
                        "publication_date": pub_date,
                        "publisher": publisher or "",
                        "image_url": image_url,
                    }
                    news_list.append(news_item)
            else:
                logger.error(f"네이버 API 오류: {rescode}")
                break

        except urllib.error.HTTPError as e:
            logger.error(f"네이버 API HTTP 오류: {e.code}")
            raise APIException(f"네이버 API 요청 실패: {e.code}")
        except Exception as e:
            logger.error(f"뉴스 크롤링 중 오류: {str(e)}")
            raise APIException(f"뉴스 크롤링 중 오류가 발생했습니다: {str(e)}")

    return news_list


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method=["GET", "POST"])
@handle_ratelimit_exception
def crawl_news_api(request):
    """
    네이버 뉴스 크롤링 API 엔드포인트
    GET/POST 요청을 통해 "오늘의 증시" 뉴스를 크롤링하고 이미지도 추출합니다.
    이미지는 조회만 가능하며 DB에 저장하지 않습니다.
    """
    try:
        # 클라이언트 IP 로깅
        client_ip = request.META.get("REMOTE_ADDR", "Unknown")
        logger.info(
            f"뉴스 크롤링 요청 시작 - IP: {client_ip}, Method: {request.method}"
        )

        # 파라미터 가져오기 (GET과 POST 모두 지원)
        if request.method == "GET":
            display = int(request.GET.get("display", 10))
            start = int(request.GET.get("start", 1))
            sort_param = request.GET.get("sort", "date")
            extract_images = request.GET.get("extract_images", "true").lower() == "true"
        else:  # POST
            try:
                data = request.data if hasattr(request, "data") else {}
                display = int(data.get("display", 10))
                start = int(data.get("start", 1))
                sort_param = data.get("sort", "date")
                extract_images = data.get("extract_images", True)
            except (ValueError, TypeError) as e:
                logger.warning(
                    f"잘못된 요청 파라미터 - IP: {client_ip}, Error: {str(e)}"
                )
                raise ValidationError("요청 파라미터가 올바르지 않습니다.")

        # 파라미터 검증
        if not isinstance(display, int) or display < 1 or display > 100:
            raise ValidationError("display는 1부터 100 사이의 정수여야 합니다.")

        if not isinstance(start, int) or start < 1:
            raise ValidationError("start는 1 이상의 정수여야 합니다.")

        if sort_param not in ["sim", "date"]:
            raise ValidationError("sort는 'sim' 또는 'date'여야 합니다.")

        # 네이버 API 키 확인
        if not client_id or not client_secret:
            logger.error("네이버 API 키가 설정되지 않음")
            raise APIException(
                "네이버 API 키가 설정되지 않았습니다. 관리자에게 문의하세요."
            )

        logger.info(
            f"크롤링 시작 - display: {display}, start: {start}, sort: {sort_param}, extract_images: {extract_images}"
        )

        # 크롤링 실행
        query = "오늘의 증시"
        news_list = crawl_news(
            query, display, start, sort_param, extract_images=extract_images
        )

        # 결과 검증
        if not news_list:
            logger.warning(f"크롤링 결과 없음 - IP: {client_ip}")
            return Response(
                {"detail": "검색 결과가 없습니다. 검색어나 파라미터를 확인해주세요."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 성공 응답
        logger.info(f"크롤링 완료 - IP: {client_ip}, 결과 수: {len(news_list)}")
        return Response(
            {
                "success": True,
                "total_count": len(news_list),
                "display": display,
                "start": start,
                "sort": sort_param,
                "extract_images": extract_images,
                "items": news_list,
            },
            status=status.HTTP_200_OK,
        )

    except ValidationError as e:
        logger.warning(f"유효성 검증 실패 - IP: {client_ip}, Error: {str(e)}")
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except urllib.error.HTTPError as e:
        error_response = e.read().decode("utf-8") if hasattr(e, "read") else str(e)
        logger.error(
            f"네이버 API 오류 - IP: {client_ip}, Code: {e.code}, Response: {error_response}"
        )

        if e.code == 401:
            return Response(
                {"detail": "네이버 API 인증에 실패했습니다. API 키를 확인해주세요."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        elif e.code == 429:
            return Response(
                {
                    "detail": "네이버 API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        else:
            return Response(
                {"detail": f"네이버 API 요청에 실패했습니다. (오류 코드: {e.code})"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    except APIException:
        # APIException은 이미 적절한 응답을 가지고 있으므로 재발생
        raise

    except Exception as e:
        logger.error(
            f"예상치 못한 오류 - IP: {client_ip}, Error: {str(e)}", exc_info=True
        )
        return Response(
            {"detail": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
