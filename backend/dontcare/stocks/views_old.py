# -*- coding: utf-8 -*-
"""
주식 시세 조회 API 뷰

yfinance를 활용하여 해외 주식 지수 정보를 제공하는 API 엔드포인트
"""

import logging
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import APIView
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
from django.utils.decorators import method_decorator

from .utils import (
    create_standardized_response,
    get_all_stock_data,
    get_stock_data,
    get_enhanced_stock_data,
    STOCK_SYMBOLS,
    # 한국 주식 관련 imports 추가
    get_all_kr_stock_data,
    get_kr_stock_data,
    get_enhanced_kr_stock_data,
    STOCK_SYMBOLS_KR,
)

logger = logging.getLogger(__name__)


class StockAPIException(APIException):
    """주식 API 관련 커스텀 예외"""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = (
        "주식 데이터 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요."
    )
    default_code = "stock_api_error"


def handle_ratelimit_exception(func):
    """
    Rate limiting 예외를 처리하는 데코레이터 (accounts 앱 패턴과 일치)
    """
    def wrapper(self, request, *args, **kwargs):
        try:
            return func(self, request, *args, **kwargs)
        except Ratelimited:
            logger.warning(f"Rate limit exceeded for IP: {request.META.get('REMOTE_ADDR', 'Unknown')}, endpoint: {request.path}")
            return Response(
                {"detail": "요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요."}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
    return wrapper


# Removed handle_stock_api_exceptions - using standardized error handling pattern instead


@method_decorator(ratelimit(key='ip', rate='60/m', method='GET'), name='get')
class AllMarketsView(APIView):
    """
    GET /stocks/markets/
    모든 해외 지수 일괄 조회 (yfinance 사용)
    Rate limiting: IP당 60회/분
    """
    permission_classes = [permissions.AllowAny]

    @handle_ratelimit_exception
    def get(self, request):
        """S&P 500, NASDAQ, Dow Jones, Nikkei 225 지수 정보"""
        logger.info(f"Market data request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        
        try:
            logger.info("Starting stock data retrieval...")
            results = get_all_stock_data()

            logger.info(f"Retrieved {len(results)} stock data entries")

            # 각 결과 로깅
            for i, result in enumerate(results):
                logger.info(f"Stock {i+1}: {result.get('symbol', 'Unknown')} - {result.get('name', 'Unknown')}")

            # 결과가 하나도 없으면 서비스 불가 상태 반환
            if not results:
                logger.warning("No stock data retrieved")
                raise StockAPIException(detail="현재 주식 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.")

            logger.info("Returning stock data successfully")
            return Response(results, status=status.HTTP_200_OK)

        except StockAPIException:
            raise
        except ValidationError as e:
            logger.warning(f"Validation error in market data: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching market data: {str(e)}")
            # 폴백 데이터 제공
            from .utils import get_default_stock_data
            fallback_results = []
            for symbol in STOCK_SYMBOLS.keys():
                fallback_data = get_default_stock_data(symbol)
                fallback_data["error"] = str(e)
                fallback_results.append(fallback_data)
            return Response(fallback_results, status=status.HTTP_200_OK)


@method_decorator(ratelimit(key='ip', rate='30/m', method='GET'), name='get')
class IndividualStockView(APIView):
    """
    GET /stocks/stock/{symbol}/
    개별 주식 상세 정보 조회 (배당, 분할 정보 포함)
    Rate limiting: IP당 30회/분
    """
    permission_classes = [permissions.AllowAny]

    @handle_ratelimit_exception
    def get(self, request, symbol):
        """개별 주식 심볼의 상세 정보 조회"""
        logger.info(f"Individual stock request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")

        try:
            # 심볼 유효성 검사
            if symbol.upper() not in STOCK_SYMBOLS:
                raise ValidationError(
                    f"Symbol {symbol} not supported. Available symbols: {list(STOCK_SYMBOLS.keys())}"
                )

            # 상세 주식 데이터 조회
            stock_data = get_enhanced_stock_data(symbol.upper())

            if "error" in stock_data:
                logger.warning(f"Failed to get data for {symbol}: {stock_data['error']}")

            return Response(stock_data, status=status.HTTP_200_OK)

        except ValidationError as e:
            logger.warning(f"Validation error for symbol {symbol}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error fetching data for {symbol}: {str(e)}")
            # 폴백 데이터 제공
            from .utils import get_default_stock_data
            fallback_data = get_default_stock_data(symbol.upper())
            fallback_data["error"] = str(e)
            return Response(fallback_data, status=status.HTTP_200_OK)


# 한국 주식 관련 API 뷰들
@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="60/m", method="GET")
@handle_ratelimit_exception

def get_all_kr_markets(request):
    """
    모든 한국 주식 일괄 조회 (yfinance 사용)

    Returns:
        JSON: 삼성전자, SK하이닉스, NAVER 등 주요 한국 주식 정보
    """
    logger.info(
        f"Korean market data request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        logger.info("Starting Korean stock data retrieval...")
        results = get_all_kr_stock_data()

        logger.info(f"Retrieved {len(results)} Korean stock data entries")

        for i, result in enumerate(results):
            logger.info(
                f"Korean Stock {i+1}: {result.get('symbol', 'Unknown')} - {result.get('name', 'Unknown')}"
            )

        return Response(results, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in Korean market data retrieval: {str(e)}")

        # 에러 발생 시 기본값들로 응답
        from .utils import get_default_kr_stock_data

        fallback_results = []

        for symbol in STOCK_SYMBOLS_KR.keys():
            fallback_data = get_default_kr_stock_data(symbol)
            fallback_data["error"] = str(e)
            fallback_results.append(fallback_data)

        return Response(fallback_results, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_individual_kr_stock(request, symbol):
    """
    개별 한국 주식 상세 정보 조회

    Args:
        symbol: 한국 주식 심볼 (005930.KS, 000660.KS 등)

    Returns:
        JSON: 개별 한국 주식 상세 정보
    """
    logger.info(
        f"Individual Korean stock request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    # .KS 접미사가 없으면 자동으로 추가
    if not symbol.endswith(".KS") and not symbol.endswith(".KQ"):
        symbol = f"{symbol}.KS"

    # 심볼 유효성 검사
    if symbol not in STOCK_SYMBOLS_KR:
        return Response(
            {
                "error": f"Korean stock symbol {symbol} not supported. Available symbols: {list(STOCK_SYMBOLS_KR.keys())}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # 상세 한국 주식 데이터 조회
        stock_data = get_enhanced_kr_stock_data(symbol)

        if "error" in stock_data:
            logger.warning(
                f"Failed to get Korean stock data for {symbol}: {stock_data['error']}"
            )

        return Response(stock_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching Korean stock data for {symbol}: {str(e)}")
        from .utils import get_default_kr_stock_data

        fallback_data = get_default_kr_stock_data(symbol)
        fallback_data["error"] = str(e)
        return Response(fallback_data, status=status.HTTP_200_OK)


# === 해외 지수 API 뷰 ===


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_all_us_indexes(request):
    """
    모든 해외 지수 조회 (나스닥, S&P500)

    Returns:
        JSON: 해외 지수 리스트
    """
    logger.info(
        f"All US indexes request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        from .utils import get_all_us_indexes_data, INDEX_SYMBOLS_US

        # 모든 해외 지수 데이터 조회
        indexes_data = get_all_us_indexes_data()

        response_data = {
            "message": "해외 지수 데이터 조회 성공",
            "data": indexes_data,
            "count": len(indexes_data),
            "available_indexes": list(INDEX_SYMBOLS_US.keys()),
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching all US indexes: {str(e)}")

        # Fallback 데이터
        from .utils import get_default_us_index_data, INDEX_SYMBOLS_US

        fallback_results = []

        for symbol in INDEX_SYMBOLS_US.keys():
            fallback_data = get_default_us_index_data(symbol)
            fallback_data["error"] = str(e)
            fallback_results.append(fallback_data)

        return Response(fallback_results, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_individual_us_index(request, symbol):
    """
    개별 해외 지수 상세 정보 조회

    Args:
        symbol: 해외 지수 심볼 (^IXIC, ^GSPC)

    Returns:
        JSON: 개별 해외 지수 상세 정보
    """
    logger.info(
        f"Individual US index request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    from .utils import INDEX_SYMBOLS_US

    # 심볼 유효성 검사
    if symbol not in INDEX_SYMBOLS_US:
        return Response(
            {
                "error": f"US index symbol {symbol} not supported. Available symbols: {list(INDEX_SYMBOLS_US.keys())}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from .utils import get_us_index_data

        # 해외 지수 데이터 조회
        index_data = get_us_index_data(symbol)

        if "error" in index_data:
            logger.warning(
                f"Failed to get US index data for {symbol}: {index_data['error']}"
            )

        return Response(index_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching US index data for {symbol}: {str(e)}")
        from .utils import get_default_us_index_data

        fallback_data = get_default_us_index_data(symbol)
        fallback_data["error"] = str(e)
        return Response(fallback_data, status=status.HTTP_200_OK)


# === 국내 지수 API 뷰 ===


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_all_kr_indexes(request):
    """
    모든 국내 지수 조회 (코스피, 코스닥)

    Returns:
        JSON: 국내 지수 리스트
    """
    logger.info(
        f"All Korean indexes request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        from .utils import get_all_kr_indexes_data, INDEX_SYMBOLS_KR

        # 모든 국내 지수 데이터 조회
        indexes_data = get_all_kr_indexes_data()

        response_data = {
            "message": "국내 지수 데이터 조회 성공",
            "data": indexes_data,
            "count": len(indexes_data),
            "available_indexes": list(INDEX_SYMBOLS_KR.keys()),
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching all Korean indexes: {str(e)}")

        # Fallback 데이터
        from .utils import get_default_kr_index_data, INDEX_SYMBOLS_KR

        fallback_results = []

        for symbol in INDEX_SYMBOLS_KR.keys():
            fallback_data = get_default_kr_index_data(symbol)
            fallback_data["error"] = str(e)
            fallback_results.append(fallback_data)

        return Response(fallback_results, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_individual_kr_index(request, symbol):
    """
    개별 국내 지수 상세 정보 조회

    Args:
        symbol: 국내 지수 심볼 (^KS11, ^KQ11)

    Returns:
        JSON: 개별 국내 지수 상세 정보
    """
    logger.info(
        f"Individual Korean index request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    from .utils import INDEX_SYMBOLS_KR

    # 심볼 유효성 검사
    if symbol not in INDEX_SYMBOLS_KR:
        return Response(
            {
                "error": f"Korean index symbol {symbol} not supported. Available symbols: {list(INDEX_SYMBOLS_KR.keys())}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from .utils import get_kr_index_data

        # 국내 지수 데이터 조회
        index_data = get_kr_index_data(symbol)

        if "error" in index_data:
            logger.warning(
                f"Failed to get Korean index data for {symbol}: {index_data['error']}"
            )

        return Response(index_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching Korean index data for {symbol}: {str(e)}")
        from .utils import get_default_kr_index_data

        fallback_data = get_default_kr_index_data(symbol)
        fallback_data["error"] = str(e)
        return Response(fallback_data, status=status.HTTP_200_OK)


# ===================================================================
# ETF 관련 API 뷰들
# ===================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_all_etfs(request):
    """
    모든 ETF 목록 조회

    Returns:
        JSON: ETF 목록 데이터
    """
    logger.info(
        f"All ETFs request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        from .utils import get_multiple_etfs_parallel, ETF_SYMBOLS

        # 병렬 처리로 ETF 데이터 조회
        symbols = list(ETF_SYMBOLS.keys())
        etf_data = get_multiple_etfs_parallel(symbols)

        response_data = {
            "success": True,
            "count": len(etf_data),
            "data": etf_data,
            "processing_type": "parallel",
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching all ETF data: {str(e)}")

        # 기본값 데이터로 폴백
        from .utils import get_default_etf_data, ETF_SYMBOLS

        fallback_data = []

        for symbol in ETF_SYMBOLS.keys():
            fallback_etf = get_default_etf_data(symbol)
            fallback_etf["error"] = str(e)
            fallback_data.append(fallback_etf)

        response_data = {
            "success": False,
            "count": len(fallback_data),
            "data": fallback_data,
            "processing_type": "fallback",
            "error": str(e),
        }

        return Response(response_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_individual_etf(request, symbol):
    """
    개별 ETF 상세 정보 조회

    Args:
        symbol: ETF 심볼 (QQQ, SPY 등)

    Returns:
        JSON: 개별 ETF 상세 정보
    """
    logger.info(
        f"Individual ETF request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    from .utils import ETF_SYMBOLS

    # 심볼 유효성 검사
    if symbol not in ETF_SYMBOLS:
        return Response(
            {
                "error": f"ETF symbol {symbol} not supported. Available symbols: {list(ETF_SYMBOLS.keys())}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from .utils import get_etf_data

        # ETF 데이터 조회
        etf_data = get_etf_data(symbol)

        if etf_data is None or etf_data.get("data_source") == "default":
            logger.warning(f"Using fallback data for ETF {symbol}")

        return Response(etf_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching ETF data for {symbol}: {str(e)}")
        from .utils import get_default_etf_data

        fallback_data = get_default_etf_data(symbol)
        fallback_data["error"] = str(e)
        return Response(fallback_data, status=status.HTTP_200_OK)


# ===================================================================
# 원자재 관련 API 뷰들
# ===================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_all_commodities(request):
    """
    모든 원자재 목록 조회

    Returns:
        JSON: 원자재 목록 데이터
    """
    logger.info(
        f"All commodities request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        from .utils import get_multiple_commodities_parallel, COMMODITY_SYMBOLS

        # 병렬 처리로 원자재 데이터 조회
        symbols = list(COMMODITY_SYMBOLS.keys())
        commodity_data = get_multiple_commodities_parallel(symbols)

        response_data = {
            "success": True,
            "count": len(commodity_data),
            "data": commodity_data,
            "processing_type": "parallel",
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching all commodity data: {str(e)}")

        # 기본값 데이터로 폴백
        from .utils import get_default_commodity_data, COMMODITY_SYMBOLS

        fallback_data = []

        for symbol in COMMODITY_SYMBOLS.keys():
            fallback_commodity = get_default_commodity_data(symbol)
            fallback_commodity["error"] = str(e)
            fallback_data.append(fallback_commodity)

        response_data = {
            "success": False,
            "count": len(fallback_data),
            "data": fallback_data,
            "processing_type": "fallback",
            "error": str(e),
        }

        return Response(response_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_individual_commodity(request, symbol):
    """
    개별 원자재 상세 정보 조회

    Args:
        symbol: 원자재 심볼 (GC=F, SI=F 등)

    Returns:
        JSON: 개별 원자재 상세 정보
    """
    logger.info(
        f"Individual commodity request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    from .utils import COMMODITY_SYMBOLS

    # 심볼 유효성 검사
    if symbol not in COMMODITY_SYMBOLS:
        return Response(
            {
                "error": f"Commodity symbol {symbol} not supported. Available symbols: {list(COMMODITY_SYMBOLS.keys())}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from .utils import get_commodity_data

        # 원자재 데이터 조회
        commodity_data = get_commodity_data(symbol)

        if commodity_data is None or commodity_data.get("data_source") == "default":
            logger.warning(f"Using fallback data for commodity {symbol}")

        return Response(commodity_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching commodity data for {symbol}: {str(e)}")
        from .utils import get_default_commodity_data

        fallback_data = get_default_commodity_data(symbol)
        fallback_data["error"] = str(e)
        return Response(fallback_data, status=status.HTTP_200_OK)


# ===================================================================
# 환율 관련 API 뷰들
# ===================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_all_currencies(request):
    """
    모든 환율 목록 조회

    Returns:
        JSON: 환율 목록 데이터
    """
    logger.info(
        f"All currencies request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        from .utils import get_multiple_currencies_parallel, CURRENCY_SYMBOLS

        # 병렬 처리로 환율 데이터 조회
        symbols = list(CURRENCY_SYMBOLS.keys())
        currency_data = get_multiple_currencies_parallel(symbols)

        response_data = {
            "success": True,
            "count": len(currency_data),
            "data": currency_data,
            "processing_type": "parallel",
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching all currency data: {str(e)}")

        # 기본값 데이터로 폴백
        from .utils import get_default_currency_data, CURRENCY_SYMBOLS

        fallback_data = []

        for symbol in CURRENCY_SYMBOLS.keys():
            fallback_currency = get_default_currency_data(symbol)
            fallback_currency["error"] = str(e)
            fallback_data.append(fallback_currency)

        response_data = {
            "success": False,
            "count": len(fallback_data),
            "data": fallback_data,
            "processing_type": "fallback",
            "error": str(e),
        }

        return Response(response_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_individual_currency(request, symbol):
    """
    개별 환율 상세 정보 조회

    Args:
        symbol: 환율 심볼 (USDKRW=X, EURUSD=X 등)

    Returns:
        JSON: 개별 환율 상세 정보
    """
    logger.info(
        f"Individual currency request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    from .utils import CURRENCY_SYMBOLS

    # 심볼 유효성 검사
    if symbol not in CURRENCY_SYMBOLS:
        return Response(
            {
                "error": f"Currency symbol {symbol} not supported. Available symbols: {list(CURRENCY_SYMBOLS.keys())}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from .utils import get_currency_data

        # 환율 데이터 조회
        currency_data = get_currency_data(symbol)

        if currency_data is None or currency_data.get("data_source") == "default":
            logger.warning(f"Using fallback data for currency {symbol}")

        return Response(currency_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching currency data for {symbol}: {str(e)}")
        from .utils import get_default_currency_data

        fallback_data = get_default_currency_data(symbol)
        fallback_data["error"] = str(e)
        return Response(fallback_data, status=status.HTTP_200_OK)


# ===================================================================
# 섹터 ETF 관련 API 뷰들
# ===================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_all_sectors(request):
    """
    모든 섹터 ETF 목록 조회

    Returns:
        JSON: 섹터 ETF 목록 데이터
    """
    logger.info(
        f"All sectors request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        from .utils import get_sector_etfs_data, SECTOR_ETF_SYMBOLS

        # 섹터 ETF 데이터 조회
        sector_data = get_sector_etfs_data()

        response_data = {
            "success": True,
            "count": len(sector_data),
            "data": sector_data,
            "processing_type": "sequential",  # 기존 함수 사용
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching all sector data: {str(e)}")

        # 기본값 데이터로 폴백 (간단한 형태)
        from .utils import SECTOR_ETF_SYMBOLS

        fallback_data = []

        for symbol, name in SECTOR_ETF_SYMBOLS.items():
            fallback_sector = {
                "symbol": symbol,
                "name": name,
                "price": 100.00,
                "change": 0.00,
                "change_rate": 0.00,
                "data_source": "default",
            }
            fallback_sector["error"] = str(e)
            fallback_data.append(fallback_sector)

        response_data = {
            "success": False,
            "count": len(fallback_data),
            "data": fallback_data,
            "processing_type": "fallback",
            "error": str(e),
        }

        return Response(response_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="30/m", method="GET")
@handle_ratelimit_exception

def get_individual_sector(request, symbol):
    """
    개별 섹터 ETF 상세 정보 조회

    Args:
        symbol: 섹터 ETF 심볼 (XLK, XLV 등)

    Returns:
        JSON: 개별 섹터 ETF 상세 정보
    """
    logger.info(
        f"Individual sector request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    from .utils import SECTOR_ETF_SYMBOLS

    # 심볼 유효성 검사
    if symbol not in SECTOR_ETF_SYMBOLS:
        return Response(
            {
                "error": f"Sector ETF symbol {symbol} not supported. Available symbols: {list(SECTOR_ETF_SYMBOLS.keys())}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from .utils import get_sector_etf_data

        # 섹터 ETF 데이터 조회
        sector_data = get_sector_etf_data(symbol)

        if sector_data is None or sector_data.get("data_source") == "default":
            logger.warning(f"Using fallback data for sector ETF {symbol}")

        return Response(sector_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching sector ETF data for {symbol}: {str(e)}")

        # 기본값 데이터로 폴백
        sector_name = SECTOR_ETF_SYMBOLS.get(symbol, symbol)
        fallback_data = {
            "symbol": symbol,
            "name": sector_name,
            "price": 100.00,
            "change": 0.00,
            "change_rate": 0.00,
            "data_source": "default",
            "error": str(e),
        }

        return Response(fallback_data, status=status.HTTP_200_OK)


# ===================================================================
# 통합 대시보드 API 뷰들
# ===================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="10/m", method="GET")  # 더 엄격한 rate limit
@handle_ratelimit_exception

def get_dashboard(request):
    """
    통합 대시보드 데이터 조회 (기존 방식)

    Returns:
        JSON: 모든 시장 데이터
    """
    logger.info(
        f"Dashboard request (legacy) from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        from .utils import get_dashboard_data

        # 기존 방식으로 대시보드 데이터 조회
        dashboard_data = get_dashboard_data()

        response_data = {
            "success": True,
            "processing_type": "sequential",
            **dashboard_data,
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching dashboard data: {str(e)}")

        # 최소한의 폴백 데이터
        fallback_data = {
            "success": False,
            "processing_type": "fallback",
            "error": str(e),
            "us_indexes": [],
            "kr_indexes": [],
            "us_stocks": [],
            "kr_stocks": [],
            "etfs": [],
            "commodities": [],
            "currencies": [],
            "last_updated": "N/A",
            "cache_status": "error",
        }

        return Response(fallback_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="10/m", method="GET")  # 더 엄격한 rate limit
@handle_ratelimit_exception

def get_dashboard_parallel(request):
    """
    통합 대시보드 데이터 조회 (병렬 처리 방식)

    Returns:
        JSON: 모든 시장 데이터 (병렬 처리)
    """
    logger.info(
        f"Dashboard request (parallel) from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    try:
        from .utils import get_dashboard_data_parallel

        # 병렬 처리로 대시보드 데이터 조회
        dashboard_data = get_dashboard_data_parallel()

        response_data = {
            "success": True,
            "processing_type": "parallel",
            **dashboard_data,
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching parallel dashboard data: {str(e)}")

        # 최소한의 폴백 데이터
        fallback_data = {
            "success": False,
            "processing_type": "parallel_fallback",
            "error": str(e),
            "us_indexes": [],
            "kr_indexes": [],
            "us_stocks": [],
            "kr_stocks": [],
            "etfs": [],
            "commodities": [],
            "currencies": [],
            "last_updated": "N/A",
            "cache_status": "error",
            "processing_time": "0.00s",
            "total_symbols": 0,
        }

        return Response(fallback_data, status=status.HTTP_200_OK)
