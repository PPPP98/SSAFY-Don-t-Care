"""
뉴스 크롤링 관련 유틸리티 함수들
- 이미지 URL 추출 (저장하지 않음)
- 뉴스 데이터 처리
"""

import os
import re
import requests
import hashlib
from urllib.parse import urljoin, urlparse
import logging
# BeautifulSoup으로 HTML 파싱
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class ImageExtractor:
    """뉴스 기사에서 이미지 URL을 추출하는 클래스 (저장하지 않음)"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        )

        # 허용할 이미지 확장자
        self.allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

    def extract_images_from_url(self, news_url, max_images=3):
        """
        뉴스 URL에서 이미지 URL을 추출합니다. (저장하지 않음)

        Args:
            news_url (str): 뉴스 기사 URL
            max_images (int): 최대 추출할 이미지 개수

        Returns:
            list: 추출된 이미지 URL 리스트
        """
        try:
            response = self.session.get(news_url, timeout=10)
            response.raise_for_status()


            soup = BeautifulSoup(response.content, "html.parser")

            # 이미지 URL 수집
            image_urls = []

            # 1. og:image 메타 태그에서 추출
            og_image = soup.find("meta", property="og:image")
            if og_image and og_image.get("content"):
                image_urls.append(og_image["content"])

            # 2. article 태그 내의 img 태그에서 추출
            article_imgs = soup.select(
                "article img, .article img, .news-content img, .content img"
            )
            for img in article_imgs:
                src = img.get("src") or img.get("data-src") or img.get("data-original")
                if src:
                    # 상대 URL을 절대 URL로 변환
                    absolute_url = urljoin(news_url, src)
                    if self._is_valid_image_url(absolute_url):
                        image_urls.append(absolute_url)

            # 3. 일반 img 태그에서 추출 (크기 필터링)
            all_imgs = soup.find_all("img")
            for img in all_imgs:
                src = img.get("src") or img.get("data-src") or img.get("data-original")
                if src:
                    # 크기가 큰 이미지만 선택
                    width = self._extract_number(img.get("width", "0"))
                    height = self._extract_number(img.get("height", "0"))

                    if (width >= 200 and height >= 150) or (width == 0 and height == 0):
                        absolute_url = urljoin(news_url, src)
                        if self._is_valid_image_url(absolute_url):
                            image_urls.append(absolute_url)

            # 중복 제거 및 개수 제한
            unique_urls = list(dict.fromkeys(image_urls))  # 순서 유지하며 중복 제거
            return unique_urls[:max_images]

        except Exception as e:
            logger.error(f"이미지 추출 중 오류 발생: {news_url} - {str(e)}")
            return []

    def _is_valid_image_url(self, url):
        """이미지 URL이 유효한지 확인"""
        if not url:
            return False

        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False

            # 확장자 확인
            path = parsed.path.lower()
            if any(path.endswith(ext) for ext in self.allowed_extensions):
                return True

            # 확장자가 없어도 이미지일 수 있음 (예: CDN URL)
            return True

        except Exception:
            return False

    def _extract_number(self, value):
        """문자열에서 숫자 추출"""
        try:
            if isinstance(value, (int, float)):
                return int(value)

            if isinstance(value, str):
                # 숫자만 추출
                numbers = re.findall(r"\d+", value)
                if numbers:
                    return int(numbers[0])

            return 0
        except Exception:
            return 0


def extract_publisher_from_naver_api(item):
    """
    네이버 API 응답에서 발행처 정보를 추출합니다.

    Args:
        item (dict): 네이버 API 응답 아이템

    Returns:
        str: 발행처명
    """
    try:
        # 1. originallink에서 도메인 추출
        original_link = item.get("originallink", "")
        if original_link:
            parsed_url = urlparse(original_link)
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

            if domain in publisher_mapping:
                return publisher_mapping[domain]
            else:
                # 도메인에서 회사명 추출 시도
                domain_parts = (
                    domain.replace("www.", "").replace("news.", "").split(".")
                )
                if domain_parts:
                    return domain_parts[0].upper()

        # 2. link에서 추출 시도 (네이버 뉴스 URL 분석)
        link = item.get("link", "")
        if "news.naver.com" in link:
            # 네이버 뉴스 URL에서 oid 파라미터 추출
            oid_match = re.search(r"oid=(\d+)", link)
            if oid_match:
                oid = oid_match.group(1)
                # OID 기반 매핑 (주요 언론사만)
                oid_mapping = {
                    "001": "연합뉴스",
                    "003": "뉴시스",
                    "009": "매일경제",
                    "011": "서울경제",
                    "014": "파이낸셜뉴스",
                    "015": "한국경제",
                    "016": "헤럴드경제",
                    "018": "이데일리",
                    "020": "동아일보",
                    "021": "문화일보",
                    "022": "세계일보",
                    "023": "조선일보",
                    "025": "중앙일보",
                }
                if oid in oid_mapping:
                    return oid_mapping[oid]

        return None

    except Exception as e:
        logger.error(f"발행처 추출 중 오류: {str(e)}")
        return None


def generate_content_hash(title, link):
    """뉴스 제목과 링크로 고유 해시 생성"""
    content = f"{title}{link}"
    return hashlib.sha256(content.encode()).hexdigest()
