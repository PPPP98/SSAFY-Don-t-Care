# -*- coding: utf-8 -*-
"""
주식 시세 조회 API 뷰

yfinance를 활용하여 해외 주식 지수 정보를 제공하는 API 엔드포인트
Refactored to use class-based views and standardized error handling patterns following accounts app
"""

import logging
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
from django.utils.decorators import method_decorator

from .utils import (
    # US Stock data utilities
    get_all_stock_data,
    get_enhanced_stock_data,
    get_default_stock_data,
    STOCK_SYMBOLS,
    # Korean Stock data utilities
    get_all_kr_stock_data,
    get_enhanced_kr_stock_data,
    get_default_kr_stock_data,
    STOCK_SYMBOLS_KR,
    # Index data utilities
    get_all_us_indexes_data,
    get_us_index_data,  # Use existing function
    get_default_us_index_data,
    INDEX_SYMBOLS_US,
    get_all_kr_indexes_data,
    get_kr_index_data,  # Use existing function
    get_default_kr_index_data,
    INDEX_SYMBOLS_KR,
    # ETF data utilities
    get_multiple_etfs_parallel,
    get_etf_data,  # Use existing function
    get_default_etf_data,
    ETF_SYMBOLS,
    # Commodity data utilities
    get_multiple_commodities_parallel,
    get_commodity_data,  # Use existing function
    get_default_commodity_data,
    COMMODITY_SYMBOLS,
    # Currency data utilities
    get_multiple_currencies_parallel,
    get_currency_data,  # Use existing function
    get_default_currency_data,
    CURRENCY_SYMBOLS,
    # Sector data utilities - check if these exist
    # get_multiple_sectors_parallel,
    # get_sector_data,
    # get_default_sector_data,
    # SECTOR_SYMBOLS,
    # Dashboard utilities
    get_dashboard_data_parallel,
)

logger = logging.getLogger(__name__)


def handle_ratelimit_exception(func):
    """
    Rate limiting 예외를 처리하는 데코레이터 (accounts 앱 패턴과 일치)
    """

    def wrapper(self, request, *args, **kwargs):
        try:
            return func(self, request, *args, **kwargs)
        except Ratelimited:
            logger.warning(
                f"Rate limit exceeded for IP: {request.META.get('REMOTE_ADDR', 'Unknown')}, endpoint: {request.path}"
            )
            return Response(
                {"detail": "요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

    return wrapper


class BaseStockView(APIView):
    """
    Base class for stock API views with common error handling patterns
    """

    permission_classes = [permissions.AllowAny]

    def handle_exception_with_fallback(
        self, e, symbol_type, symbol=None, symbols_dict=None, default_func=None
    ):
        """
        Standardized exception handling with fallback data
        """
        if isinstance(e, ValidationError):
            logger.warning(f"Validation error in {symbol_type}: {str(e)}")
            raise

        logger.error(f"Unexpected error in {symbol_type}: {str(e)}")

        if symbol and default_func:
            fallback_data = default_func(symbol.upper())
            fallback_data["error"] = str(e)
            return Response(fallback_data, status=status.HTTP_200_OK)
        elif symbols_dict and default_func:
            fallback_results = []
            for sym in symbols_dict.keys():
                fallback_data = default_func(sym)
                fallback_data["error"] = str(e)
                fallback_results.append(fallback_data)
            return Response(fallback_results, status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": str(e), "detail": "서비스를 일시적으로 사용할 수 없습니다."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


# ================================================================
# US STOCK VIEWS
# ================================================================


@method_decorator(ratelimit(key="ip", rate="60/m", method="GET"), name="get")
class AllMarketsView(BaseStockView):
    """
    GET /stocks/markets/
    모든 해외 지수 일괄 조회 (yfinance 사용)
    Rate limiting: IP당 60회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """S&P 500, NASDAQ, Dow Jones, Nikkei 225 지수 정보"""
        logger.info(
            f"Market data request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            results = get_all_stock_data()

            if not results:
                logger.warning("No stock data retrieved")
                return Response(
                    {
                        "detail": "현재 주식 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            logger.info(f"Retrieved {len(results)} stock data entries")
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "market data",
                symbols_dict=STOCK_SYMBOLS,
                default_func=get_default_stock_data,
            )


@method_decorator(ratelimit(key="ip", rate="30/m", method="GET"), name="get")
class IndividualStockView(BaseStockView):
    """
    GET /stocks/stock/{symbol}/
    개별 주식 상세 정보 조회 (배당, 분할 정보 포함)
    Rate limiting: IP당 30회/분
    """

    @handle_ratelimit_exception
    def get(self, request, symbol):
        """개별 주식 심볼의 상세 정보 조회"""
        logger.info(
            f"Individual stock request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            # 심볼 유효성 검사
            if symbol.upper() not in STOCK_SYMBOLS:
                raise ValidationError(
                    f"Symbol {symbol} not supported. Available symbols: {list(STOCK_SYMBOLS.keys())}"
                )

            stock_data = get_enhanced_stock_data(symbol.upper())
            return Response(stock_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "individual stock",
                symbol=symbol,
                default_func=get_default_stock_data,
            )


# ================================================================
# KOREAN STOCK VIEWS
# ================================================================


@method_decorator(ratelimit(key="ip", rate="60/m", method="GET"), name="get")
class AllKRMarketsView(BaseStockView):
    """
    GET /stocks/kr/markets/
    한국 주식 지수 일괄 조회
    Rate limiting: IP당 60회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """KOSPI, KOSDAQ 등 한국 주식 지수 정보"""
        logger.info(
            f"KR Market data request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            results = get_all_kr_stock_data()

            if not results:
                logger.warning("No KR stock data retrieved")
                return Response(
                    {
                        "detail": "현재 한국 주식 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            logger.info(f"Retrieved {len(results)} KR stock data entries")
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "KR market data",
                symbols_dict=STOCK_SYMBOLS_KR,
                default_func=get_default_kr_stock_data,
            )


@method_decorator(ratelimit(key="ip", rate="30/m", method="GET"), name="get")
class IndividualKRStockView(BaseStockView):
    """
    GET /stocks/kr/stock/{symbol}/
    개별 한국 주식 상세 정보 조회
    Rate limiting: IP당 30회/분
    """

    @handle_ratelimit_exception
    def get(self, request, symbol):
        """개별 한국 주식 심볼의 상세 정보 조회"""
        logger.info(
            f"Individual KR stock request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            # 심볼 유효성 검사
            if symbol.upper() not in STOCK_SYMBOLS_KR:
                raise ValidationError(
                    f"Symbol {symbol} not supported. Available KR symbols: {list(STOCK_SYMBOLS_KR.keys())}"
                )

            stock_data = get_enhanced_kr_stock_data(symbol.upper())
            return Response(stock_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "individual KR stock",
                symbol=symbol,
                default_func=get_default_kr_stock_data,
            )


# ================================================================
# US INDEX VIEWS
# ================================================================


@method_decorator(ratelimit(key="ip", rate="60/m", method="GET"), name="get")
class AllUSIndexesView(BaseStockView):
    """
    GET /stocks/us/indexes/
    미국 지수 일괄 조회
    Rate limiting: IP당 60회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """미국 주요 지수 정보"""
        logger.info(
            f"US indexes request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            results = get_all_us_indexes_data()

            if not results:
                logger.warning("No US index data retrieved")
                return Response(
                    {
                        "detail": "현재 미국 지수 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            logger.info(f"Retrieved {len(results)} US index data entries")
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "US indexes",
                symbols_dict=INDEX_SYMBOLS_US,
                default_func=get_default_us_index_data,
            )


@method_decorator(ratelimit(key="ip", rate="30/m", method="GET"), name="get")
class IndividualUSIndexView(BaseStockView):
    """
    GET /stocks/us/index/{symbol}/
    개별 미국 지수 상세 정보 조회
    Rate limiting: IP당 30회/분
    """

    @handle_ratelimit_exception
    def get(self, request, symbol):
        """개별 미국 지수의 상세 정보 조회"""
        logger.info(
            f"Individual US index request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            # 심볼 유효성 검사
            if symbol.upper() not in INDEX_SYMBOLS_US:
                raise ValidationError(
                    f"Index {symbol} not supported. Available US indexes: {list(INDEX_SYMBOLS_US.keys())}"
                )

            index_data = get_us_index_data(symbol.upper())
            return Response(index_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "individual US index",
                symbol=symbol,
                default_func=get_default_us_index_data,
            )


# ================================================================
# KOREAN INDEX VIEWS
# ================================================================


@method_decorator(ratelimit(key="ip", rate="60/m", method="GET"), name="get")
class AllKRIndexesView(BaseStockView):
    """
    GET /stocks/kr/indexes/
    한국 지수 일괄 조회
    Rate limiting: IP당 60회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """한국 주요 지수 정보"""
        logger.info(
            f"KR indexes request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            results = get_all_kr_indexes_data()

            if not results:
                logger.warning("No KR index data retrieved")
                return Response(
                    {
                        "detail": "현재 한국 지수 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            logger.info(f"Retrieved {len(results)} KR index data entries")
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "KR indexes",
                symbols_dict=INDEX_SYMBOLS_KR,
                default_func=get_default_kr_index_data,
            )


@method_decorator(ratelimit(key="ip", rate="30/m", method="GET"), name="get")
class IndividualKRIndexView(BaseStockView):
    """
    GET /stocks/kr/index/{symbol}/
    개별 한국 지수 상세 정보 조회
    Rate limiting: IP당 30회/분
    """

    @handle_ratelimit_exception
    def get(self, request, symbol):
        """개별 한국 지수의 상세 정보 조회"""
        logger.info(
            f"Individual KR index request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            # 심볼 유효성 검사
            if symbol.upper() not in INDEX_SYMBOLS_KR:
                raise ValidationError(
                    f"Index {symbol} not supported. Available KR indexes: {list(INDEX_SYMBOLS_KR.keys())}"
                )

            index_data = get_kr_index_data(symbol.upper())
            return Response(index_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "individual KR index",
                symbol=symbol,
                default_func=get_default_kr_index_data,
            )


# ================================================================
# ETF VIEWS
# ================================================================


@method_decorator(ratelimit(key="ip", rate="60/m", method="GET"), name="get")
class AllETFsView(BaseStockView):
    """
    GET /stocks/etfs/
    ETF 일괄 조회 (병렬 처리)
    Rate limiting: IP당 60회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """ETF 정보 병렬 조회"""
        logger.info(
            f"ETFs request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            results = get_multiple_etfs_parallel()

            if not results:
                logger.warning("No ETF data retrieved")
                return Response(
                    {
                        "detail": "현재 ETF 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            logger.info(f"Retrieved {len(results)} ETF data entries")
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e, "ETFs", symbols_dict=ETF_SYMBOLS, default_func=get_default_etf_data
            )


@method_decorator(ratelimit(key="ip", rate="30/m", method="GET"), name="get")
class IndividualETFView(BaseStockView):
    """
    GET /stocks/etf/{symbol}/
    개별 ETF 상세 정보 조회
    Rate limiting: IP당 30회/분
    """

    @handle_ratelimit_exception
    def get(self, request, symbol):
        """개별 ETF 상세 정보 조회"""
        logger.info(
            f"Individual ETF request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            # 심볼 유효성 검사
            if symbol.upper() not in ETF_SYMBOLS:
                raise ValidationError(
                    f"ETF {symbol} not supported. Available ETFs: {list(ETF_SYMBOLS.keys())}"
                )

            etf_data = get_etf_data(symbol.upper())
            return Response(etf_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e, "individual ETF", symbol=symbol, default_func=get_default_etf_data
            )


# ================================================================
# COMMODITY VIEWS
# ================================================================


@method_decorator(ratelimit(key="ip", rate="60/m", method="GET"), name="get")
class AllCommoditiesView(BaseStockView):
    """
    GET /stocks/commodities/
    원자재 일괄 조회 (병렬 처리)
    Rate limiting: IP당 60회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """원자재 정보 병렬 조회"""
        logger.info(
            f"Commodities request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            results = get_multiple_commodities_parallel()

            if not results:
                logger.warning("No commodity data retrieved")
                return Response(
                    {
                        "detail": "현재 원자재 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            logger.info(f"Retrieved {len(results)} commodity data entries")
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "commodities",
                symbols_dict=COMMODITY_SYMBOLS,
                default_func=get_default_commodity_data,
            )


@method_decorator(ratelimit(key="ip", rate="30/m", method="GET"), name="get")
class IndividualCommodityView(BaseStockView):
    """
    GET /stocks/commodity/{symbol}/
    개별 원자재 상세 정보 조회
    Rate limiting: IP당 30회/분
    """

    @handle_ratelimit_exception
    def get(self, request, symbol):
        """개별 원자재 상세 정보 조회"""
        logger.info(
            f"Individual commodity request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            # 심볼 유효성 검사
            if symbol.upper() not in COMMODITY_SYMBOLS:
                raise ValidationError(
                    f"Commodity {symbol} not supported. Available commodities: {list(COMMODITY_SYMBOLS.keys())}"
                )

            commodity_data = get_commodity_data(symbol.upper())
            return Response(commodity_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "individual commodity",
                symbol=symbol,
                default_func=get_default_commodity_data,
            )


# ================================================================
# CURRENCY VIEWS
# ================================================================


@method_decorator(ratelimit(key="ip", rate="60/m", method="GET"), name="get")
class AllCurrenciesView(BaseStockView):
    """
    GET /stocks/currencies/
    환율 일괄 조회 (병렬 처리)
    Rate limiting: IP당 60회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """환율 정보 병렬 조회"""
        logger.info(
            f"Currencies request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            results = get_multiple_currencies_parallel()

            if not results:
                logger.warning("No currency data retrieved")
                return Response(
                    {
                        "detail": "현재 환율 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            logger.info(f"Retrieved {len(results)} currency data entries")
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "currencies",
                symbols_dict=CURRENCY_SYMBOLS,
                default_func=get_default_currency_data,
            )


@method_decorator(ratelimit(key="ip", rate="30/m", method="GET"), name="get")
class IndividualCurrencyView(BaseStockView):
    """
    GET /stocks/currency/{symbol}/
    개별 환율 상세 정보 조회
    Rate limiting: IP당 30회/분
    """

    @handle_ratelimit_exception
    def get(self, request, symbol):
        """개별 환율 상세 정보 조회"""
        logger.info(
            f"Individual currency request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            # 심볼 유효성 검사
            if symbol.upper() not in CURRENCY_SYMBOLS:
                raise ValidationError(
                    f"Currency {symbol} not supported. Available currencies: {list(CURRENCY_SYMBOLS.keys())}"
                )

            currency_data = get_currency_data(symbol.upper())
            return Response(currency_data, status=status.HTTP_200_OK)

        except Exception as e:
            return self.handle_exception_with_fallback(
                e,
                "individual currency",
                symbol=symbol,
                default_func=get_default_currency_data,
            )


# ================================================================
# SECTOR VIEWS (COMMENTED OUT - Missing implementation in utils.py)
# ================================================================

# @method_decorator(ratelimit(key='ip', rate='60/m', method='GET'), name='get')
# class AllSectorsView(BaseStockView):
#     """
#     GET /stocks/sectors/
#     섹터 ETF 일괄 조회 (병렬 처리)
#     Rate limiting: IP당 60회/분
#     """

#     @handle_ratelimit_exception
#     def get(self, request):
#         """섹터 ETF 정보 병렬 조회"""
#         logger.info(f"Sectors request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")

#         try:
#             # results = get_multiple_sectors_parallel()
#             results = []  # Placeholder until implementation

#             if not results:
#                 logger.warning("No sector data retrieved")
#                 return Response(
#                     {"detail": "현재 섹터 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."},
#                     status=status.HTTP_503_SERVICE_UNAVAILABLE
#                 )

#             logger.info(f"Retrieved {len(results)} sector data entries")
#             return Response(results, status=status.HTTP_200_OK)

#         except Exception as e:
#             return self.handle_exception_with_fallback(
#                 e, "sectors", symbols_dict={}, default_func=None
#             )


# @method_decorator(ratelimit(key='ip', rate='30/m', method='GET'), name='get')
# class IndividualSectorView(BaseStockView):
#     """
#     GET /stocks/sector/{symbol}/
#     개별 섹터 ETF 상세 정보 조회
#     Rate limiting: IP당 30회/분
#     """

#     @handle_ratelimit_exception
#     def get(self, request, symbol):
#         """개별 섹터 ETF 상세 정보 조회"""
#         logger.info(f"Individual sector request for {symbol} from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")

#         try:
#             # 심볼 유효성 검사
#             # if symbol.upper() not in SECTOR_SYMBOLS:
#             #     raise ValidationError(
#             #         f"Sector {symbol} not supported. Available sectors: {list(SECTOR_SYMBOLS.keys())}"
#             #     )

#             # sector_data = get_enhanced_sector_data(symbol.upper())
#             sector_data = {"error": "Sector functionality not yet implemented"}
#             return Response(sector_data, status=status.HTTP_200_OK)

#         except Exception as e:
#             return self.handle_exception_with_fallback(
#                 e, "individual sector", symbol=symbol, default_func=None
#             )


# ================================================================
# DASHBOARD VIEWS
# ================================================================


@method_decorator(ratelimit(key="ip", rate="30/m", method="GET"), name="get")
class DashboardView(BaseStockView):
    """
    GET /stocks/dashboard/
    통합 대시보드 데이터 조회 (순차 처리)
    Rate limiting: IP당 30회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """통합 대시보드 데이터 조회"""
        logger.info(
            f"Dashboard request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            # Sequential processing for dashboard
            dashboard_data = {
                "success": True,
                "processing_type": "sequential",
                "us_stocks": get_all_stock_data()[:5],  # 상위 5개만
                "kr_stocks": get_all_kr_stock_data()[:5],  # 상위 5개만
                "us_indexes": get_all_us_indexes_data()[:3],  # 상위 3개만
                "kr_indexes": get_all_kr_indexes_data()[:2],  # 상위 2개만
                "etfs": get_multiple_etfs_parallel()[:3],  # 상위 3개만
            }

            return Response(dashboard_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching dashboard data: {str(e)}")
            fallback_data = {
                "success": False,
                "processing_type": "sequential_fallback",
                "error": str(e),
                "us_stocks": [],
                "kr_stocks": [],
                "us_indexes": [],
                "kr_indexes": [],
                "etfs": [],
            }
            return Response(fallback_data, status=status.HTTP_200_OK)


@method_decorator(ratelimit(key="ip", rate="20/m", method="GET"), name="get")
class DashboardParallelView(BaseStockView):
    """
    GET /stocks/dashboard/parallel/
    통합 대시보드 데이터 조회 (병렬 처리)
    Rate limiting: IP당 20회/분
    """

    @handle_ratelimit_exception
    def get(self, request):
        """통합 대시보드 데이터 조회 (병렬 처리)"""
        logger.info(
            f"Dashboard request (parallel) from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
        )

        try:
            dashboard_data = get_dashboard_data_parallel()

            response_data = {
                "success": True,
                "processing_type": "parallel",
                **dashboard_data,
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching parallel dashboard data: {str(e)}")
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


# ================================================================
# KIS API (한국투자증권) 관련 뷰 함수들
# ================================================================

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import APIException
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited

from .utils import (
    KISAPIClient,
    create_standardized_response,
    safe_float_conversion,
    MARKET_INDICES_KIS,
    EXCHANGE_CODES_KIS,
    OVERSEAS_INDICES_KIS,
)

import requests


class StockAPIException(APIException):
    """주식 API 관련 커스텀 예외"""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = (
        "주식 데이터 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요."
    )
    default_code = "stock_api_error"


class KISAPIConnectionError(StockAPIException):
    """KIS API 연결 오류"""

    default_detail = "한국투자증권 API 연결에 실패했습니다. 잠시 후 다시 시도해주세요."
    default_code = "kis_api_connection_error"


class TokenRefreshError(StockAPIException):
    """토큰 갱신 오류"""

    default_detail = "인증 토큰 갱신에 실패했습니다. 잠시 후 다시 시도해주세요."
    default_code = "token_refresh_error"


def handle_ratelimit_exception_kis(func):
    """Rate limiting 예외를 처리하는 데코레이터 (KIS API용)"""

    def wrapper(request, *args, **kwargs):
        try:
            return func(request, *args, **kwargs)
        except Ratelimited:
            logger.warning(
                f"Rate limit exceeded for IP: {request.META.get('REMOTE_ADDR', 'Unknown')}, "
                f"endpoint: {request.path}"
            )
            return Response(
                {"detail": "요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

    return wrapper


def handle_stock_api_exceptions_kis(func):
    """주식 API 예외를 처리하는 데코레이터 (KIS API용)"""

    def wrapper(request, *args, **kwargs):
        try:
            return func(request, *args, **kwargs)
        except (requests.ConnectionError, requests.Timeout) as e:
            logger.error(
                f"KIS API connection error from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}, error: {str(e)}"
            )
            raise KISAPIConnectionError()
        except requests.HTTPError as e:
            logger.error(
                f"KIS API HTTP error from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}, error: {str(e)}"
            )
            if e.response.status_code == 403:
                raise TokenRefreshError()
            raise StockAPIException(detail=f"API 호출 오류: {str(e)}")
        except StockAPIException:
            # 이미 처리된 커스텀 예외는 그대로 전파
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in stock API from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}, error: {str(e)}"
            )
            raise StockAPIException(
                detail="예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            )

    return wrapper


@api_view(["GET"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="60/m", method="GET")
@handle_ratelimit_exception_kis
@handle_stock_api_exceptions_kis
def get_all_markets_kis(request):
    """
    모든 시장 지수 일괄 조회 (KIS API 사용)

    Returns:
        JSON: 코스피, 코스닥, 나스닥 지수 정보
    """
    logger.info(
        f"Market data request from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}"
    )

    # KIS API 클라이언트 초기화
    try:
        client = KISAPIClient()
    except ValueError as e:
        logger.error(f"KIS API client initialization failed: {str(e)}")
        raise StockAPIException(
            detail="API 클라이언트 초기화에 실패했습니다. 환경 설정을 확인해주세요."
        )

    results = []

    # 코스피 지수
    try:
        kospi_data = client.get_market_index(MARKET_INDICES_KIS["kospi"])
        if kospi_data.get("rt_cd") == "0":
            output = kospi_data.get("output", {})
            results.append(
                create_standardized_response(
                    title="코스피",
                    market="KOSPI",
                    price=output.get("bstp_nmix_prpr", "0"),  # 현재가
                    change=output.get("bstp_nmix_prdy_vrss", "0"),  # 전일대비
                    change_rate=output.get("bstp_nmix_prdy_ctrt", "0"),  # 등락률
                    sign=output.get("prdy_vrss_sign", "0"),  # 등락부호
                )
            )
        else:
            logger.warning(
                f"KIS API error for KOSPI: {kospi_data.get('msg1', 'Unknown error')}"
            )
            # API 오류 시 기본값 사용
            results.append(
                create_standardized_response(
                    title="코스피",
                    market="KOSPI",
                    price="2500.00",  # 임시 기본값
                    change="0.00",
                    change_rate="0.00",
                    sign="0",
                )
            )
    except Exception as e:
        logger.warning(f"Failed to fetch KOSPI data: {str(e)}")
        # 개별 지수 조회 실패 시 기본값으로 계속 진행
        results.append(
            create_standardized_response(
                title="코스피",
                market="KOSPI",
                price="2500.00",
                change="0.00",
                change_rate="0.00",
                sign="0",
            )
        )

    # 코스닥 지수
    try:
        kosdaq_data = client.get_market_index(MARKET_INDICES_KIS["kosdaq"])
        if kosdaq_data.get("rt_cd") == "0":
            output = kosdaq_data.get("output", {})
            results.append(
                create_standardized_response(
                    title="코스닥",
                    market="KOSDAQ",
                    price=output.get("bstp_nmix_prpr", "0"),
                    change=output.get("bstp_nmix_prdy_vrss", "0"),
                    change_rate=output.get("bstp_nmix_prdy_ctrt", "0"),
                    sign=output.get("prdy_vrss_sign", "0"),
                )
            )
        else:
            logger.warning(
                f"KIS API error for KOSDAQ: {kosdaq_data.get('msg1', 'Unknown error')}"
            )
            # API 오류 시 기본값 사용
            results.append(
                create_standardized_response(
                    title="코스닥",
                    market="KOSDAQ",
                    price="800.00",
                    change="0.00",
                    change_rate="0.00",
                    sign="0",
                )
            )
    except Exception as e:
        logger.warning(f"Failed to fetch KOSDAQ data: {str(e)}")
        results.append(
            create_standardized_response(
                title="코스닥",
                market="KOSDAQ",
                price="800.00",
                change="0.00",
                change_rate="0.00",
                sign="0",
            )
        )

    # 나스닥 종합지수
    try:
        nasdaq_data = None
        successful_symbol = None
        nasdaq_symbols = OVERSEAS_INDICES_KIS["nasdaq"]
        logger.info(
            f"🔍 NASDAQ COMPOSITE INDEX SEARCH: Testing {len(nasdaq_symbols)} symbols"
        )
        logger.info(f"Symbol list: {nasdaq_symbols[:5]}... (showing first 5)")

        # 여러 심볼 형식 시도
        for i, symbol in enumerate(nasdaq_symbols, 1):
            try:
                logger.info(
                    f"📊 Testing NASDAQ symbol [{i}/{len(nasdaq_symbols)}]: '{symbol}'"
                )
                nasdaq_data = client.get_overseas_index_price(
                    symbol, EXCHANGE_CODES_KIS["nasdaq"]
                )

                if nasdaq_data.get("rt_cd") == "0":
                    output_data = nasdaq_data.get("output", {})
                    last_price = output_data.get("last", "").strip()

                    if last_price:
                        successful_symbol = symbol
                        logger.info(
                            f"🎯 NASDAQ SUCCESS: Symbol '{symbol}' returned price {last_price}"
                        )
                        break
                    else:
                        logger.warning(
                            f"📈 NASDAQ EMPTY: Symbol '{symbol}' - rt_cd=0 but no price data"
                        )
                        logger.debug(f"Output data: {output_data}")
                else:
                    logger.warning(
                        f"❌ NASDAQ FAILED: Symbol '{symbol}' - rt_cd={nasdaq_data.get('rt_cd')}, msg={nasdaq_data.get('msg1')}"
                    )
            except Exception as symbol_error:
                logger.warning(
                    f"💥 NASDAQ EXCEPTION: Symbol '{symbol}' failed with error: {symbol_error}"
                )
                continue

        if nasdaq_data and nasdaq_data.get("rt_cd") == "0":
            output = nasdaq_data.get("output", {})
            last_price = output.get("last", "0")
            diff_value = safe_float_conversion(output.get("diff", "0"))
            rate_value = output.get("rate", "0")

            if last_price and last_price.strip():
                logger.info(
                    f"🎉 NASDAQ DATA RETRIEVED: Using symbol '{successful_symbol}' for Composite Index display"
                )

                results.append(
                    create_standardized_response(
                        title="나스닥 종합지수",  # 항상 "나스닥 종합지수"로 표시
                        market="QQQ (NASDAQ ETF)",
                        price=last_price,
                        change=str(diff_value),
                        change_rate=rate_value,
                        sign="+" if diff_value >= 0 else "-",
                    )
                )
            else:
                # 빈 데이터 시 기본값
                logger.warning(
                    "NASDAQ API returned empty price data, using placeholder"
                )
                results.append(
                    create_standardized_response(
                        title="나스닥 종합지수",
                        market="QQQ (NASDAQ ETF)",
                        price="18000.00",
                        change="0.00",
                        change_rate="0.00",
                        sign="0",
                    )
                )
        else:
            logger.warning(
                f"KIS API error for NASDAQ: {nasdaq_data.get('msg1', 'Unknown error') if nasdaq_data else 'No response'}"
            )
            # API 오류 시 기본값
            results.append(
                create_standardized_response(
                    title="나스닥 종합지수",
                    market="QQQ (NASDAQ ETF)",
                    price="18000.00",
                    change="0.00",
                    change_rate="0.00",
                    sign="0",
                )
            )
    except Exception as e:
        logger.warning(f"Failed to fetch NASDAQ data: {str(e)}")
        results.append(
            create_standardized_response(
                title="나스닥 종합지수",
                market="QQQ (NASDAQ ETF)",
                price="18000.00",
                change="0.00",
                change_rate="0.00",
                sign="0",
            )
        )

    # 결과가 하나도 없으면 서비스 불가 상태 반환
    if not results:
        logger.warning("No market data retrieved from any source")
        raise StockAPIException(
            detail="현재 시장 데이터를 조회할 수 없습니다. 잠시 후 다시 시도해주세요."
        )

    logger.info(f"Successfully retrieved {len(results)} market data entries")
    return Response(results, status=status.HTTP_200_OK)


# ================================================================
# LEGACY FUNCTION-BASED VIEWS (for backward compatibility)
# ================================================================

# Keep these for backward compatibility while transitioning URLs
# These can be removed after URL patterns are updated

get_all_markets = AllMarketsView.as_view()
get_individual_stock = IndividualStockView.as_view()
get_all_kr_markets = AllKRMarketsView.as_view()
get_individual_kr_stock = IndividualKRStockView.as_view()
get_all_us_indexes = AllUSIndexesView.as_view()
get_individual_us_index = IndividualUSIndexView.as_view()
get_all_kr_indexes = AllKRIndexesView.as_view()
get_individual_kr_index = IndividualKRIndexView.as_view()
get_all_etfs = AllETFsView.as_view()
get_individual_etf = IndividualETFView.as_view()
get_all_commodities = AllCommoditiesView.as_view()
get_individual_commodity = IndividualCommodityView.as_view()
get_all_currencies = AllCurrenciesView.as_view()
get_individual_currency = IndividualCurrencyView.as_view()
# get_all_sectors = AllSectorsView.as_view()  # Commented out - not implemented
# get_individual_sector = IndividualSectorView.as_view()  # Commented out - not implemented
get_dashboard = DashboardView.as_view()
get_dashboard_parallel = DashboardParallelView.as_view()
