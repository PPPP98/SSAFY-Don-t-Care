# -*- coding: utf-8 -*-
"""
주식 시세 조회 유틸리티

yfinance를 활용하여 해외 주식 지수 정보를 제공하는 유틸리티
"""

import logging
import time
import random
from typing import Dict
from functools import wraps
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# 외부 라이브러리 imports
try:
    import yfinance as yf
    import pandas as pd
    import requests

    YF_AVAILABLE = True
except ImportError as e:
    logger.warning(f"yfinance or related libraries not available: {e}")
    YF_AVAILABLE = False

# Rate limiting을 위한 글로벌 변수들
_last_api_call = None
_api_call_count = 0
_rate_limit_window = datetime.now()


def rate_limit_decorator(min_interval=2.0, max_calls_per_minute=10):
    """
    API 호출에 rate limiting을 적용하는 데코레이터

    Args:
        min_interval: 최소 호출 간격 (초)
        max_calls_per_minute: 분당 최대 호출 수
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            global _last_api_call, _api_call_count, _rate_limit_window

            current_time = datetime.now()

            # 분당 호출 수 제한 체크
            if current_time - _rate_limit_window > timedelta(minutes=1):
                _api_call_count = 0
                _rate_limit_window = current_time

            if _api_call_count >= max_calls_per_minute:
                wait_time = 60 - (current_time - _rate_limit_window).seconds
                logger.warning(f"Rate limit reached. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
                _api_call_count = 0
                _rate_limit_window = datetime.now()

            # 최소 간격 체크
            if _last_api_call is not None:
                elapsed = (current_time - _last_api_call).total_seconds()
                if elapsed < min_interval:
                    wait_time = min_interval - elapsed
                    logger.info(f"Rate limiting: waiting {wait_time:.2f} seconds")
                    time.sleep(wait_time)

            _last_api_call = datetime.now()
            _api_call_count += 1

            return func(*args, **kwargs)

        return wrapper

    return decorator


def retry_on_429(max_retries=3, base_delay=1.0):
    """
    429 에러 발생 시 exponential backoff로 재시도하는 데코레이터

    Args:
        max_retries: 최대 재시도 횟수
        base_delay: 기본 대기 시간 (초)
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_str = str(e).lower()

                    # 429 에러나 rate limit 관련 에러 체크
                    if (
                        "429" in error_str
                        or "too many requests" in error_str
                        or "rate limit" in error_str
                    ):
                        if attempt < max_retries:
                            # Exponential backoff with jitter
                            delay = base_delay * (2**attempt) + random.uniform(0, 1)
                            logger.warning(
                                f"429 error on attempt {attempt + 1}/{max_retries + 1}. "
                                f"Retrying in {delay:.2f} seconds..."
                            )
                            time.sleep(delay)
                            continue
                        else:
                            logger.error(
                                f"Max retries reached for 429 error. Falling back to default data."
                            )
                            return None
                    else:
                        # 다른 종류의 에러는 즉시 재발생
                        raise e
            return None

        return wrapper

    return decorator


# 간단한 메모리 캐시 구현
_cache = {}
_cache_timestamps = {}


def get_cached_data(symbol: str, max_age_minutes=5):
    """
    캐시된 데이터 조회

    Args:
        symbol: 주식 심볼
        max_age_minutes: 캐시 최대 유효 시간 (분)

    Returns:
        캐시된 데이터 또는 None
    """
    if symbol not in _cache or symbol not in _cache_timestamps:
        return None

    cache_time = _cache_timestamps[symbol]
    current_time = datetime.now()

    if current_time - cache_time > timedelta(minutes=max_age_minutes):
        # 캐시 만료
        del _cache[symbol]
        del _cache_timestamps[symbol]
        return None

    logger.info(f"Using cached data for {symbol}")
    return _cache[symbol]


def set_cached_data(symbol: str, data: dict):
    """
    데이터를 캐시에 저장

    Args:
        symbol: 주식 심볼
        data: 저장할 데이터
    """
    _cache[symbol] = data
    _cache_timestamps[symbol] = datetime.now()
    logger.info(f"Cached data for {symbol}")


def clear_cache():
    """캐시 초기화"""
    global _cache, _cache_timestamps
    _cache.clear()
    _cache_timestamps.clear()
    logger.info("Cache cleared")


def create_standardized_response(
    title: str, market: str, price: str, change: str, change_rate: str, sign: str
) -> Dict[str, str]:
    """
    표준화된 응답 형식으로 데이터 변환

    Args:
        title: 종목명
        market: 시장명
        price: 현재가
        change: 전일대비
        change_rate: 등락률
        sign: 등락부호 (0: 보합, 1: 상승, 2: 하락)

    Returns:
        표준화된 응답 데이터
    """
    return {
        "title": title,
        "market": market,
        "price": price or "0",
        "change": change or "0",
        "changeRate": change_rate or "0.00",
        "sign": sign or "0",
    }


# yfinance용 주요 종목 심볼과 정보
STOCK_SYMBOLS = {
    "AAPL": {"name": "Apple Inc", "sector": "Technology"},
    "MSFT": {"name": "Microsoft Corporation", "sector": "Technology"},
    "GOOGL": {"name": "Alphabet Inc", "sector": "Technology"},
    "TSLA": {"name": "Tesla Inc", "sector": "Consumer Cyclical"},
    "AMZN": {"name": "Amazon.com Inc", "sector": "Consumer Cyclical"},
    "NVDA": {"name": "NVIDIA Corporation", "sector": "Technology"},
}

# 한국 주식 심볼과 정보 (KRX - 한국거래소)
STOCK_SYMBOLS_KR = {
    "005930.KS": {"name": "삼성전자", "sector": "Technology", "market": "KOSPI"},
    "000660.KS": {"name": "SK하이닉스", "sector": "Technology", "market": "KOSPI"},
    "035420.KS": {
        "name": "NAVER",
        "sector": "Communication Services",
        "market": "KOSPI",
    },
    "035720.KS": {
        "name": "카카오",
        "sector": "Communication Services",
        "market": "KOSPI",
    },
    "005380.KS": {"name": "현대차", "sector": "Consumer Cyclical", "market": "KOSPI"},
    "105560.KS": {"name": "KB금융", "sector": "Financials", "market": "KOSPI"},
}

# 해외 지수 심볼과 정보
INDEX_SYMBOLS_US = {
    "^IXIC": {"name": "NASDAQ Composite", "type": "Index", "market": "NASDAQ"},
    "^GSPC": {"name": "S&P 500", "type": "Index", "market": "NYSE"},
}

# 국내 지수 심볼과 정보
INDEX_SYMBOLS_KR = {
    "^KS11": {"name": "KOSPI", "type": "Index", "market": "KRX"},
    "^KQ11": {"name": "KOSDAQ", "type": "Index", "market": "KRX"},
}

# ETF 심볼과 정보
ETF_SYMBOLS = {
    "QQQ": {"name": "Invesco QQQ Trust", "type": "ETF", "tracks": "NASDAQ-100"},
    "SPY": {"name": "SPDR S&P 500 ETF Trust", "type": "ETF", "tracks": "S&P 500"},
    "IVV": {"name": "iShares Core S&P 500 ETF", "type": "ETF", "tracks": "S&P 500"},
    "VTI": {
        "name": "Vanguard Total Stock Market ETF",
        "type": "ETF",
        "tracks": "Total Stock Market",
    },
    "VEA": {
        "name": "Vanguard FTSE Developed Markets ETF",
        "type": "ETF",
        "tracks": "International Developed Markets",
    },
    "VWO": {
        "name": "Vanguard FTSE Emerging Markets ETF",
        "type": "ETF",
        "tracks": "Emerging Markets",
    },
}

# 원자재 심볼과 정보
COMMODITY_SYMBOLS = {
    "GC=F": {"name": "Gold Futures", "type": "Commodity", "category": "Precious Metal"},
    "SI=F": {
        "name": "Silver Futures",
        "type": "Commodity",
        "category": "Precious Metal",
    },
    "CL=F": {
        "name": "WTI Crude Oil Futures",
        "type": "Commodity",
        "category": "Energy",
    },
    "BZ=F": {
        "name": "Brent Crude Oil Futures",
        "type": "Commodity",
        "category": "Energy",
    },
    "NG=F": {"name": "Natural Gas Futures", "type": "Commodity", "category": "Energy"},
    "GOLD": {"name": "SPDR Gold Trust", "type": "ETF", "category": "Precious Metal"},
    "SLV": {
        "name": "iShares Silver Trust",
        "type": "ETF",
        "category": "Precious Metal",
    },
}

# 환율 심볼과 정보
CURRENCY_SYMBOLS = {
    "USDKRW=X": {"name": "USD/KRW", "type": "Currency", "base": "USD", "quote": "KRW"},
    "EURUSD=X": {"name": "EUR/USD", "type": "Currency", "base": "EUR", "quote": "USD"},
    "GBPUSD=X": {"name": "GBP/USD", "type": "Currency", "base": "GBP", "quote": "USD"},
    "JPYUSD=X": {"name": "JPY/USD", "type": "Currency", "base": "JPY", "quote": "USD"},
    "USDJPY=X": {"name": "USD/JPY", "type": "Currency", "base": "USD", "quote": "JPY"},
    "AUDUSD=X": {"name": "AUD/USD", "type": "Currency", "base": "AUD", "quote": "USD"},
}

# 섹터 ETF 심볼과 정보
SECTOR_ETF_SYMBOLS = {
    "XLK": {
        "name": "Technology Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Technology",
    },
    "XLV": {
        "name": "Health Care Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Health Care",
    },
    "XLE": {
        "name": "Energy Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Energy",
    },
    "XLF": {
        "name": "Financial Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Financials",
    },
    "XLI": {
        "name": "Industrial Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Industrials",
    },
    "XLP": {
        "name": "Consumer Staples Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Consumer Staples",
    },
    "XLY": {
        "name": "Consumer Discretionary Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Consumer Discretionary",
    },
    "XLU": {
        "name": "Utilities Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Utilities",
    },
    "XLB": {
        "name": "Materials Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Materials",
    },
    "XLRE": {
        "name": "Real Estate Select Sector SPDR Fund",
        "type": "ETF",
        "sector": "Real Estate",
    },
}


# yfinance 관련 함수들 - 429 에러 회피 강화
@rate_limit_decorator(min_interval=5.0, max_calls_per_minute=5)
@retry_on_429(max_retries=2, base_delay=3.0)
def get_stock_data(symbol: str) -> dict:
    """
    개별 주식 데이터 조회 (429 에러 회피 강화)

    Args:
        symbol: 주식 심볼 (예: AAPL)

    Returns:
        주식 데이터
    """
    logger.info(f"Requested data for {symbol}")

    # 먼저 캐시 확인 (더 긴 캐시 시간으로 API 호출 빈도 감소)
    cached_data = get_cached_data(symbol, max_age_minutes=15)
    if cached_data is not None:
        return cached_data

    try:
        if not YF_AVAILABLE:
            raise Exception("yfinance library not available")

        # User-Agent 설정으로 API 제한 완화
        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        )

        # 1단계: 최소한의 데이터로 시도
        try:
            hist = yf.download(
                symbol, period="2d", progress=False, session=session, timeout=10
            )
        except Exception as e1:
            logger.warning(f"First attempt failed for {symbol}: {str(e1)}")
            # 2단계: 더 짧은 기간으로 재시도
            try:
                time.sleep(random.uniform(2, 4))  # 추가 대기
                hist = yf.download(symbol, period="1d", progress=False, timeout=5)
            except Exception as e2:
                logger.warning(f"Second attempt failed for {symbol}: {str(e2)}")
                # 3단계: 완전히 실패 시 빈 DataFrame으로 설정
                hist = pd.DataFrame()

        if hist.empty:
            raise Exception("No historical data available")

        # yf.download() 결과 처리
        latest = hist.iloc[-1]
        previous = hist.iloc[-2] if len(hist) > 1 else latest

        # Column 접근 방식 조정 (yf.download는 MultiIndex를 가질 수 있음)
        if isinstance(hist.columns, pd.MultiIndex):
            # MultiIndex인 경우 (symbol이 포함된 경우)
            close_col = (
                ("Close", symbol)
                if ("Close", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "Close"][0]
            )
            open_col = (
                ("Open", symbol)
                if ("Open", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "Open"][0]
            )
            high_col = (
                ("High", symbol)
                if ("High", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "High"][0]
            )
            low_col = (
                ("Low", symbol)
                if ("Low", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "Low"][0]
            )
            volume_col = (
                ("Volume", symbol)
                if ("Volume", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "Volume"][0]
            )

            current_close = float(latest[close_col])
            previous_close = (
                float(previous[close_col]) if len(hist) > 1 else float(latest[open_col])
            )
            open_price = float(latest[open_col])
            high_price = float(latest[high_col])
            low_price = float(latest[low_col])
            volume = int(latest[volume_col])
        else:
            # 일반 컬럼인 경우
            current_close = float(latest["Close"])
            previous_close = (
                float(previous["Close"]) if len(hist) > 1 else float(latest["Open"])
            )
            open_price = float(latest["Open"])
            high_price = float(latest["High"])
            low_price = float(latest["Low"])
            volume = int(latest["Volume"])

        change = current_close - previous_close
        change_percent = (change / previous_close * 100) if previous_close != 0 else 0

        data = {
            "symbol": symbol,
            "name": STOCK_SYMBOLS.get(symbol, {}).get("name", symbol),
            "sector": STOCK_SYMBOLS.get(symbol, {}).get("sector", "Unknown"),
            "price": current_close,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "volume": volume,
            "previous_close": previous_close,
            "change": change,
            "change_percent": change_percent,
            "date": hist.index[-1].strftime("%Y-%m-%d"),
            "data_source": "yfinance_download",
        }

        # 캐시에 저장
        set_cached_data(symbol, data)

        logger.info(f"Successfully retrieved real data for {symbol}")
        return data

    except Exception as e:
        error_msg = str(e).lower()

        # 구체적인 에러 타입별 로깅
        if "429" in error_msg or "too many requests" in error_msg:
            logger.warning(f"Yahoo Finance API rate limit exceeded for {symbol}")
        elif "expecting value" in error_msg or "json" in error_msg:
            logger.warning(
                f"Invalid JSON response for {symbol} (likely due to 429 error)"
            )
        elif "connection" in error_msg or "timeout" in error_msg:
            logger.warning(f"Network connection issue for {symbol}: {str(e)}")
        else:
            logger.warning(f"Unexpected error for {symbol}: {str(e)}")

        logger.warning(f"Falling back to default data for {symbol}")

        # 기본값 반환
        default_data = get_default_stock_data(symbol)
        set_cached_data(symbol, default_data)  # 기본값도 캐싱하여 재시도 방지
        return default_data


def get_multiple_stocks_data(symbols: list) -> dict:
    """
    429 에러 대응이 강화된 다중 주식 데이터 조회

    Args:
        symbols: 주식 심볼 리스트

    Returns:
        각 심볼별 데이터가 포함된 딕셔너리
    """
    if not YF_AVAILABLE:
        logger.error("yfinance library not installed")
        return {"error": "yfinance not installed"}

    results = {}

    # 개별적으로 조회 (rate limiting 적용됨)
    for i, symbol in enumerate(symbols):
        logger.info(f"Processing {symbol} ({i+1}/{len(symbols)})")

        try:
            # get_stock_data는 이미 rate limiting과 retry가 적용됨
            stock_data = get_stock_data(symbol)
            results[symbol] = stock_data

            # 각 요청 사이에 추가 대기 (안전장치)
            if i < len(symbols) - 1:  # 마지막이 아닐 때만
                time.sleep(random.uniform(1.5, 2.5))

        except Exception as e:
            logger.error(f"Failed to get data for {symbol}: {str(e)}")
            results[symbol] = get_default_stock_data(symbol)
            results[symbol]["note"] = "Using default data due to API error"

    logger.info(f"Completed processing {len(results)} stocks")
    return results


def get_default_stock_data(symbol: str) -> dict:
    """
    기본값 주식 데이터 반환 (API 오류 시 사용)

    Args:
        symbol: 주식 심볼

    Returns:
        기본값 데이터
    """
    default_data = {
        "AAPL": {"price": 220.00, "name": "Apple Inc", "sector": "Technology"},
        "MSFT": {
            "price": 430.00,
            "name": "Microsoft Corporation",
            "sector": "Technology",
        },
        "GOOGL": {"price": 160.00, "name": "Alphabet Inc", "sector": "Technology"},
        "TSLA": {"price": 240.00, "name": "Tesla Inc", "sector": "Consumer Cyclical"},
        "AMZN": {
            "price": 170.00,
            "name": "Amazon.com Inc",
            "sector": "Consumer Cyclical",
        },
        "NVDA": {"price": 450.00, "name": "NVIDIA Corporation", "sector": "Technology"},
    }

    data = default_data.get(
        symbol, {"price": 0.00, "name": "Unknown", "sector": "Unknown"}
    )

    return {
        "symbol": symbol,
        "name": data["name"],
        "sector": data["sector"],
        "price": data["price"],
        "open": data["price"],
        "high": data["price"],
        "low": data["price"],
        "volume": 0,
        "previous_close": data["price"],
        "change": 0.00,
        "change_percent": 0.00,
        "date": "N/A",
        "data_source": "default",
    }


# === 해외 지수 조회 함수들 ===


@rate_limit_decorator(min_interval=5.0, max_calls_per_minute=5)
@retry_on_429(max_retries=2, base_delay=3.0)
def get_us_index_data(symbol: str) -> dict:
    """
    해외 지수 데이터 조회 (나스닥, S&P500)

    Args:
        symbol: 지수 심볼 (예: ^IXIC, ^GSPC)

    Returns:
        지수 데이터
    """
    logger.info(f"Requested index data for {symbol}")

    if not YF_AVAILABLE:
        logger.error("yfinance library not available")
        return get_default_us_index_data(symbol)

    try:
        ticker = yf.Ticker(symbol)

        # 최근 1일 데이터 조회
        hist = ticker.history(period="1d", interval="1m")

        if hist.empty:
            logger.warning(f"No historical data for {symbol}")
            return get_default_us_index_data(symbol)

        # 가장 최근 데이터
        latest_data = hist.iloc[-1]

        # 전일 종가 (어제 데이터)
        hist_yesterday = ticker.history(period="2d", interval="1d")
        previous_close = latest_data["Close"]
        if len(hist_yesterday) > 1:
            previous_close = hist_yesterday.iloc[-2]["Close"]

        # 변화율 계산
        current_price = latest_data["Close"]
        change = current_price - previous_close
        change_percent = (change / previous_close) * 100 if previous_close > 0 else 0

        return {
            "symbol": symbol,
            "name": INDEX_SYMBOLS_US.get(symbol, {}).get("name", symbol),
            "type": INDEX_SYMBOLS_US.get(symbol, {}).get("type", "Index"),
            "market": INDEX_SYMBOLS_US.get(symbol, {}).get("market", "US"),
            "price": round(float(current_price), 2),
            "open": round(float(latest_data["Open"]), 2),
            "high": round(float(latest_data["High"]), 2),
            "low": round(float(latest_data["Low"]), 2),
            "volume": (
                int(latest_data["Volume"]) if not pd.isna(latest_data["Volume"]) else 0
            ),
            "previous_close": round(float(previous_close), 2),
            "change": round(float(change), 2),
            "change_percent": round(float(change_percent), 2),
            "date": hist.index[-1].strftime("%Y-%m-%d"),
            "data_source": "yfinance",
        }

    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {str(e)}")
        return get_default_us_index_data(symbol)


def get_multiple_us_indexes_data(symbols: list) -> dict:
    """
    다중 해외 지수 데이터 조회

    Args:
        symbols: 지수 심볼 리스트

    Returns:
        각 심볼별 데이터가 포함된 딕셔너리
    """
    if not YF_AVAILABLE:
        logger.error("yfinance library not installed")
        return {"error": "yfinance not installed"}

    results = {}

    for i, symbol in enumerate(symbols):
        logger.info(f"Processing index {symbol} ({i+1}/{len(symbols)})")

        try:
            index_data = get_us_index_data(symbol)
            results[symbol] = index_data

            # 각 요청 사이에 추가 대기
            if i < len(symbols) - 1:
                time.sleep(random.uniform(1.5, 2.5))

        except Exception as e:
            logger.error(f"Failed to get data for index {symbol}: {str(e)}")
            results[symbol] = get_default_us_index_data(symbol)
            results[symbol]["note"] = "Using default data due to API error"

    logger.info(f"Completed processing {len(results)} indexes")
    return results


def get_default_us_index_data(symbol: str) -> dict:
    """
    기본값 해외 지수 데이터 반환

    Args:
        symbol: 지수 심볼

    Returns:
        기본값 데이터
    """
    default_data = {
        "^IXIC": {"price": 17000.00, "name": "NASDAQ Composite"},
        "^GSPC": {"price": 5500.00, "name": "S&P 500"},
    }

    data = default_data.get(symbol, {"price": 0.00, "name": "Unknown Index"})

    return {
        "symbol": symbol,
        "name": data["name"],
        "type": "Index",
        "market": "US",
        "price": data["price"],
        "open": data["price"],
        "high": data["price"],
        "low": data["price"],
        "volume": 0,
        "previous_close": data["price"],
        "change": 0.00,
        "change_percent": 0.00,
        "date": "N/A",
        "data_source": "default",
    }


def get_all_us_indexes_data() -> list:
    """
    모든 해외 지수 데이터 조회 (병렬 처리 사용)

    Returns:
        지수 데이터 리스트
    """
    symbols = list(INDEX_SYMBOLS_US.keys())

    try:
        # 병렬 처리 함수 사용
        indexes_data = get_multiple_indexes_data_parallel(symbols, "US")
        return indexes_data

    except Exception as e:
        logger.error(f"Error in get_all_us_indexes_data: {str(e)}")
        return [get_default_index_data(symbol, "US") for symbol in symbols]


def get_all_stock_data() -> list:
    """
    모든 미국 주식 데이터 조회 (병렬 처리 사용)

    Returns:
        주식 데이터 리스트
    """
    symbols = list(STOCK_SYMBOLS.keys())

    try:
        # 병렬 처리 함수 사용
        stocks_data = get_multiple_stocks_parallel(symbols)

        logger.info(
            f"Successfully processed {len(stocks_data)} US stocks with parallel processing"
        )
        return stocks_data

    except Exception as e:
        logger.error(f"Error in get_all_stock_data: {str(e)}")
        return [get_default_stock_data(symbol) for symbol in symbols]

    except Exception as e:
        logger.error(f"Failed to get all stock data: {str(e)}")
        # 전체 실패 시 모든 심볼에 대해 기본값 반환
        return [get_default_stock_data(symbol) for symbol in symbols]


@rate_limit_decorator(min_interval=8.0, max_calls_per_minute=3)
@retry_on_429(max_retries=1, base_delay=5.0)
def get_enhanced_stock_data(symbol: str) -> dict:
    """
    개별 주식에 대한 상세 정보 조회 (배당, 분할 등 포함)
    더 엄격한 rate limiting 적용 (상세 데이터는 더 많은 API 호출 필요)

    Args:
        symbol: 주식 심볼

    Returns:
        상세 주식 데이터
    """
    # 먼저 캐시 확인 (상세 데이터는 더 오래 캐싱)
    cache_key = f"{symbol}_enhanced"
    cached_data = get_cached_data(cache_key, max_age_minutes=30)
    if cached_data is not None:
        return cached_data

    try:
        if not YF_AVAILABLE:
            raise Exception("yfinance library not available")

        # 기본 데이터 가져오기 (이미 rate limited)
        basic_data = get_stock_data(symbol)
        if "error" in basic_data:
            return basic_data

        # User-Agent 설정
        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        )

        # 429 에러 방지: yf.download 사용으로 안정성 향상
        try:

            # download 방식으로 1년 데이터 조회
            hist_1year = yf.download(
                symbol, period="1y", progress=False, session=session
            )

            if not hist_1year.empty:
                # MultiIndex 처리
                if isinstance(hist_1year.columns, pd.MultiIndex):
                    high_col = [col for col in hist_1year.columns if col[0] == "High"][
                        0
                    ]
                    low_col = [col for col in hist_1year.columns if col[0] == "Low"][0]
                    week_52_high = float(hist_1year[high_col].max())
                    week_52_low = float(hist_1year[low_col].min())
                else:
                    week_52_high = float(hist_1year["High"].max())
                    week_52_low = float(hist_1year["Low"].min())

                # 기본 정보에 안전하게 계산된 추가 정보 포함
                basic_data.update(
                    {
                        "52_week_high": week_52_high,
                        "52_week_low": week_52_low,
                        "enhanced": True,
                        "enhancement_source": "calculated_from_history",
                    }
                )
            else:
                # 히스토리 데이터도 없으면 기본값
                basic_data.update(
                    {
                        "52_week_high": basic_data.get("price", 0),
                        "52_week_low": basic_data.get("price", 0),
                        "enhanced": False,
                        "enhancement_source": "fallback_to_current_price",
                    }
                )

        except Exception as e:
            logger.warning(f"Could not fetch enhanced data for {symbol}: {e}")
            basic_data["enhanced"] = False

        # 캐시에 저장
        set_cached_data(cache_key, basic_data)
        return basic_data

    except Exception as e:
        logger.error(f"Failed to get enhanced data for {symbol}: {e}")
        fallback_data = get_default_stock_data(symbol)
        fallback_data["enhanced"] = False
        set_cached_data(cache_key, fallback_data)
        return fallback_data


# 한국 주식 관련 함수들
@rate_limit_decorator(min_interval=5.0, max_calls_per_minute=5)
@retry_on_429(max_retries=2, base_delay=3.0)
def get_kr_stock_data(symbol: str) -> dict:
    """
    개별 한국 주식 데이터 조회 (429 에러 회피 강화)

    Args:
        symbol: 한국 주식 심볼 (예: 005930.KS)

    Returns:
        한국 주식 데이터
    """
    logger.info(f"Requested Korean stock data for {symbol}")

    # 먼저 캐시 확인
    cache_key = f"kr_{symbol}"
    cached_data = get_cached_data(cache_key, max_age_minutes=15)
    if cached_data is not None:
        return cached_data

    try:
        if not YF_AVAILABLE:
            raise Exception("yfinance library not available")

        # User-Agent 설정으로 API 제한 완화
        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        )

        # 단계적 fallback 전략으로 API 제한 회피
        try:
            hist = yf.download(
                symbol, period="2d", progress=False, session=session, timeout=10
            )
        except Exception as e1:
            logger.warning(f"First attempt failed for Korean stock {symbol}: {str(e1)}")
            try:
                time.sleep(random.uniform(2, 4))
                hist = yf.download(symbol, period="1d", progress=False, timeout=5)
            except Exception as e2:
                logger.warning(
                    f"Second attempt failed for Korean stock {symbol}: {str(e2)}"
                )
                hist = pd.DataFrame()

        if hist.empty:
            raise Exception("No historical data available")

        # yf.download() 결과 처리
        latest = hist.iloc[-1]
        previous = hist.iloc[-2] if len(hist) > 1 else latest

        # Column 접근 방식 조정
        if isinstance(hist.columns, pd.MultiIndex):
            close_col = (
                ("Close", symbol)
                if ("Close", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "Close"][0]
            )
            open_col = (
                ("Open", symbol)
                if ("Open", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "Open"][0]
            )
            high_col = (
                ("High", symbol)
                if ("High", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "High"][0]
            )
            low_col = (
                ("Low", symbol)
                if ("Low", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "Low"][0]
            )
            volume_col = (
                ("Volume", symbol)
                if ("Volume", symbol) in hist.columns
                else hist.columns[hist.columns.get_level_values(0) == "Volume"][0]
            )

            current_close = float(latest[close_col])
            previous_close = (
                float(previous[close_col]) if len(hist) > 1 else float(latest[open_col])
            )
            open_price = float(latest[open_col])
            high_price = float(latest[high_col])
            low_price = float(latest[low_col])
            volume = int(latest[volume_col])
        else:
            current_close = float(latest["Close"])
            previous_close = (
                float(previous["Close"]) if len(hist) > 1 else float(latest["Open"])
            )
            open_price = float(latest["Open"])
            high_price = float(latest["High"])
            low_price = float(latest["Low"])
            volume = int(latest["Volume"])

        change = current_close - previous_close
        change_percent = (change / previous_close * 100) if previous_close != 0 else 0

        data = {
            "symbol": symbol,
            "name": STOCK_SYMBOLS_KR.get(symbol, {}).get("name", symbol),
            "sector": STOCK_SYMBOLS_KR.get(symbol, {}).get("sector", "Unknown"),
            "market": STOCK_SYMBOLS_KR.get(symbol, {}).get("market", "KRX"),
            "price": current_close,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "volume": volume,
            "previous_close": previous_close,
            "change": change,
            "change_percent": change_percent,
            "date": hist.index[-1].strftime("%Y-%m-%d"),
            "data_source": "yfinance_download_kr",
            "currency": "KRW",
        }

        # 캐시에 저장
        set_cached_data(cache_key, data)

        logger.info(f"Successfully retrieved Korean stock data for {symbol}")
        return data

    except Exception as e:
        error_msg = str(e).lower()

        # 구체적인 에러 타입별 로깅
        if "429" in error_msg or "too many requests" in error_msg:
            logger.warning(
                f"Yahoo Finance API rate limit exceeded for Korean stock {symbol}"
            )
        elif "expecting value" in error_msg or "json" in error_msg:
            logger.warning(
                f"Invalid JSON response for Korean stock {symbol} (likely due to 429 error)"
            )
        elif "connection" in error_msg or "timeout" in error_msg:
            logger.warning(
                f"Network connection issue for Korean stock {symbol}: {str(e)}"
            )
        else:
            logger.warning(f"Unexpected error for Korean stock {symbol}: {str(e)}")

        logger.warning(f"Falling back to default data for Korean stock {symbol}")

        # 기본값 반환
        default_data = get_default_kr_stock_data(symbol)
        set_cached_data(cache_key, default_data)
        return default_data


def get_multiple_kr_stocks_data(symbols: list) -> dict:
    """
    429 에러 대응이 강화된 다중 한국 주식 데이터 조회

    Args:
        symbols: 한국 주식 심볼 리스트

    Returns:
        각 심볼별 데이터가 포함된 딕셔너리
    """
    if not YF_AVAILABLE:
        logger.error("yfinance library not installed")
        return {"error": "yfinance not installed"}

    results = {}

    # 개별적으로 순차 조회 (rate limiting 적용됨)
    for i, symbol in enumerate(symbols):
        logger.info(f"Processing Korean stock {symbol} ({i+1}/{len(symbols)})")

        try:
            stock_data = get_kr_stock_data(symbol)
            results[symbol] = stock_data

            # 각 요청 사이에 추가 대기
            if i < len(symbols) - 1:
                time.sleep(random.uniform(2.0, 3.0))

        except Exception as e:
            logger.error(f"Failed to get Korean stock data for {symbol}: {str(e)}")
            results[symbol] = get_default_kr_stock_data(symbol)
            results[symbol]["note"] = "Using default data due to API error"

    logger.info(f"Completed processing {len(results)} Korean stocks")
    return results


def get_default_kr_stock_data(symbol: str) -> dict:
    """
    기본값 한국 주식 데이터 반환 (API 오류 시 사용)

    Args:
        symbol: 한국 주식 심볼

    Returns:
        기본값 데이터
    """
    default_data = {
        "005930.KS": {
            "price": 75000,
            "name": "삼성전자",
            "sector": "Technology",
            "market": "KOSPI",
        },
        "000660.KS": {
            "price": 128000,
            "name": "SK하이닉스",
            "sector": "Technology",
            "market": "KOSPI",
        },
        "035420.KS": {
            "price": 180000,
            "name": "NAVER",
            "sector": "Communication Services",
            "market": "KOSPI",
        },
        "035720.KS": {
            "price": 45000,
            "name": "카카오",
            "sector": "Communication Services",
            "market": "KOSPI",
        },
        "005380.KS": {
            "price": 190000,
            "name": "현대차",
            "sector": "Consumer Cyclical",
            "market": "KOSPI",
        },
    }

    data = default_data.get(
        symbol, {"price": 0, "name": "Unknown", "sector": "Unknown", "market": "KRX"}
    )

    return {
        "symbol": symbol,
        "name": data["name"],
        "sector": data["sector"],
        "market": data.get("market", "KRX"),
        "price": data["price"],
        "open": data["price"],
        "high": data["price"],
        "low": data["price"],
        "volume": 0,
        "previous_close": data["price"],
        "change": 0,
        "change_percent": 0.0,
        "date": "N/A",
        "data_source": "default_kr",
        "currency": "KRW",
    }


def get_all_kr_stock_data() -> list:
    """
    모든 한국 주식 데이터 조회 (병렬 처리 사용)

    Returns:
        한국 주식 데이터 리스트
    """
    symbols = list(STOCK_SYMBOLS_KR.keys())

    try:
        # 병렬 처리 함수 사용
        stocks_data = get_multiple_kr_stocks_parallel(symbols)

        logger.info(
            f"Successfully processed {len(stocks_data)} Korean stocks with parallel processing"
        )
        return stocks_data

    except Exception as e:
        logger.error(f"Failed to get all Korean stock data: {str(e)}")
        return [get_default_kr_stock_data(symbol) for symbol in symbols]


@rate_limit_decorator(min_interval=8.0, max_calls_per_minute=3)
@retry_on_429(max_retries=1, base_delay=5.0)
def get_enhanced_kr_stock_data(symbol: str) -> dict:
    """
    개별 한국 주식에 대한 상세 정보 조회
    더 엄격한 rate limiting 적용

    Args:
        symbol: 한국 주식 심볼

    Returns:
        상세 한국 주식 데이터
    """
    cache_key = f"kr_{symbol}_enhanced"
    cached_data = get_cached_data(cache_key, max_age_minutes=30)
    if cached_data is not None:
        return cached_data

    try:
        if not YF_AVAILABLE:
            raise Exception("yfinance library not available")

        # 기본 데이터 가져오기
        basic_data = get_kr_stock_data(symbol)
        if "error" in basic_data:
            return basic_data

        # User-Agent 설정
        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        )

        try:
            # 1년 데이터로 52주 고가/저가 계산
            hist_1year = yf.download(
                symbol, period="1y", progress=False, session=session
            )

            if not hist_1year.empty:
                if isinstance(hist_1year.columns, pd.MultiIndex):
                    high_col = [col for col in hist_1year.columns if col[0] == "High"][
                        0
                    ]
                    low_col = [col for col in hist_1year.columns if col[0] == "Low"][0]
                    week_52_high = float(hist_1year[high_col].max())
                    week_52_low = float(hist_1year[low_col].min())
                else:
                    week_52_high = float(hist_1year["High"].max())
                    week_52_low = float(hist_1year["Low"].min())

                basic_data.update(
                    {
                        "52_week_high": week_52_high,
                        "52_week_low": week_52_low,
                        "enhanced": True,
                        "enhancement_source": "calculated_from_history_kr",
                    }
                )
            else:
                basic_data.update(
                    {
                        "52_week_high": basic_data.get("price", 0),
                        "52_week_low": basic_data.get("price", 0),
                        "enhanced": False,
                        "enhancement_source": "fallback_to_current_price_kr",
                    }
                )

        except Exception as e:
            logger.warning(
                f"Could not fetch enhanced data for Korean stock {symbol}: {e}"
            )
            basic_data["enhanced"] = False

        set_cached_data(cache_key, basic_data)
        return basic_data

    except Exception as e:
        logger.error(f"Failed to get enhanced Korean stock data for {symbol}: {e}")
        fallback_data = get_default_kr_stock_data(symbol)
        fallback_data["enhanced"] = False
        set_cached_data(cache_key, fallback_data)
        return fallback_data


def get_cache_status() -> dict:
    """
    현재 캐시 상태 조회

    Returns:
        캐시 상태 정보
    """
    current_time = datetime.now()
    cache_info = {}

    for symbol, timestamp in _cache_timestamps.items():
        age_minutes = (current_time - timestamp).total_seconds() / 60
        cache_info[symbol] = {
            "cached_at": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "age_minutes": round(age_minutes, 2),
            "data_source": _cache.get(symbol, {}).get("data_source", "unknown"),
        }

    return {"total_cached_items": len(_cache), "cache_details": cache_info}


def force_refresh_symbol(symbol: str) -> dict:
    """
    특정 심볼의 캐시를 강제로 새로고침

    Args:
        symbol: 주식 심볼

    Returns:
        새로 조회된 데이터
    """
    # 캐시에서 제거
    if symbol in _cache:
        del _cache[symbol]
    if symbol in _cache_timestamps:
        del _cache_timestamps[symbol]

    # 새로 조회
    logger.info(f"Force refreshing data for {symbol}")
    return get_stock_data(symbol)


# === 국내 지수 조회 함수들 ===


@rate_limit_decorator(min_interval=5.0, max_calls_per_minute=5)
@retry_on_429(max_retries=2, base_delay=3.0)
def get_kr_index_data(symbol: str) -> dict:
    """
    국내 지수 데이터 조회 (코스피, 코스닥)

    Args:
        symbol: 지수 심볼 (예: ^KS11, ^KQ11)

    Returns:
        지수 데이터
    """
    logger.info(f"Requested Korean index data for {symbol}")

    if not YF_AVAILABLE:
        logger.error("yfinance library not available")
        return get_default_kr_index_data(symbol)

    try:
        ticker = yf.Ticker(symbol)

        # 최근 1일 데이터 조회
        hist = ticker.history(period="1d", interval="1m")

        if hist.empty:
            logger.warning(f"No historical data for {symbol}")
            return get_default_kr_index_data(symbol)

        # 가장 최근 데이터
        latest_data = hist.iloc[-1]

        # 전일 종가 (어제 데이터)
        hist_yesterday = ticker.history(period="2d", interval="1d")
        previous_close = latest_data["Close"]
        if len(hist_yesterday) > 1:
            previous_close = hist_yesterday.iloc[-2]["Close"]

        # 변화율 계산
        current_price = latest_data["Close"]
        change = current_price - previous_close
        change_percent = (change / previous_close) * 100 if previous_close > 0 else 0

        return {
            "symbol": symbol,
            "name": INDEX_SYMBOLS_KR.get(symbol, {}).get("name", symbol),
            "type": INDEX_SYMBOLS_KR.get(symbol, {}).get("type", "Index"),
            "market": INDEX_SYMBOLS_KR.get(symbol, {}).get("market", "KRX"),
            "price": round(float(current_price), 2),
            "open": round(float(latest_data["Open"]), 2),
            "high": round(float(latest_data["High"]), 2),
            "low": round(float(latest_data["Low"]), 2),
            "volume": (
                int(latest_data["Volume"]) if not pd.isna(latest_data["Volume"]) else 0
            ),
            "previous_close": round(float(previous_close), 2),
            "change": round(float(change), 2),
            "change_percent": round(float(change_percent), 2),
            "date": hist.index[-1].strftime("%Y-%m-%d"),
            "data_source": "yfinance",
        }

    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {str(e)}")
        return get_default_kr_index_data(symbol)


def get_multiple_kr_indexes_data(symbols: list) -> dict:
    """
    다중 국내 지수 데이터 조회

    Args:
        symbols: 지수 심볼 리스트

    Returns:
        각 심볼별 데이터가 포함된 딕셔너리
    """
    if not YF_AVAILABLE:
        logger.error("yfinance library not installed")
        return {"error": "yfinance not installed"}

    results = {}

    for i, symbol in enumerate(symbols):
        logger.info(f"Processing Korean index {symbol} ({i+1}/{len(symbols)})")

        try:
            index_data = get_kr_index_data(symbol)
            results[symbol] = index_data

            # 각 요청 사이에 추가 대기
            if i < len(symbols) - 1:
                time.sleep(random.uniform(1.5, 2.5))

        except Exception as e:
            logger.error(f"Failed to get data for Korean index {symbol}: {str(e)}")
            results[symbol] = get_default_kr_index_data(symbol)
            results[symbol]["note"] = "Using default data due to API error"

    logger.info(f"Completed processing {len(results)} Korean indexes")
    return results


def get_default_kr_index_data(symbol: str) -> dict:
    """
    기본값 국내 지수 데이터 반환

    Args:
        symbol: 지수 심볼

    Returns:
        기본값 데이터
    """
    default_data = {
        "^KS11": {"price": 2600.00, "name": "KOSPI"},
        "^KQ11": {"price": 800.00, "name": "KOSDAQ"},
    }

    data = default_data.get(symbol, {"price": 0.00, "name": "Unknown Index"})

    return {
        "symbol": symbol,
        "name": data["name"],
        "type": "Index",
        "market": "KRX",
        "price": data["price"],
        "open": data["price"],
        "high": data["price"],
        "low": data["price"],
        "volume": 0,
        "previous_close": data["price"],
        "change": 0.00,
        "change_percent": 0.00,
        "date": "N/A",
        "data_source": "default",
    }


def get_all_kr_indexes_data() -> list:
    """
    모든 국내 지수 데이터 조회 (병렬 처리 사용)

    Returns:
        지수 데이터 리스트
    """
    symbols = list(INDEX_SYMBOLS_KR.keys())

    try:
        # 병렬 처리 함수 사용
        indexes_data = get_multiple_indexes_data_parallel(symbols, "KR")
        return indexes_data

    except Exception as e:
        logger.error(f"Error in get_all_kr_indexes_data: {str(e)}")
        return [get_default_index_data(symbol, "KR") for symbol in symbols]


# === ETF 조회 함수들 ===


@rate_limit_decorator(min_interval=5.0, max_calls_per_minute=5)
@retry_on_429(max_retries=2, base_delay=3.0)
def get_etf_data(symbol: str) -> dict:
    """
    ETF 데이터 조회

    Args:
        symbol: ETF 심볼 (예: QQQ, SPY)

    Returns:
        ETF 데이터
    """
    logger.info(f"Requested ETF data for {symbol}")

    # 캐시 확인
    cache_key = f"etf_{symbol}"
    cached_data = get_cached_data(cache_key, max_age_minutes=15)
    if cached_data is not None:
        return cached_data

    try:
        if not YF_AVAILABLE:
            raise Exception("yfinance library not available")

        # ETF 데이터 조회 (주식과 동일한 방식)
        hist = yf.download(symbol, period="2d", progress=False)

        if hist.empty:
            raise Exception("No historical data available")

        latest = hist.iloc[-1]
        previous = hist.iloc[-2] if len(hist) > 1 else latest

        # Column 접근 방식 조정
        if isinstance(hist.columns, pd.MultiIndex):
            close_col = hist.columns[hist.columns.get_level_values(0) == "Close"][0]
            open_col = hist.columns[hist.columns.get_level_values(0) == "Open"][0]
            high_col = hist.columns[hist.columns.get_level_values(0) == "High"][0]
            low_col = hist.columns[hist.columns.get_level_values(0) == "Low"][0]
            volume_col = hist.columns[hist.columns.get_level_values(0) == "Volume"][0]

            current_close = float(latest[close_col])
            previous_close = (
                float(previous[close_col]) if len(hist) > 1 else float(latest[open_col])
            )
            open_price = float(latest[open_col])
            high_price = float(latest[high_col])
            low_price = float(latest[low_col])
            volume = int(latest[volume_col])
        else:
            current_close = float(latest["Close"])
            previous_close = (
                float(previous["Close"]) if len(hist) > 1 else float(latest["Open"])
            )
            open_price = float(latest["Open"])
            high_price = float(latest["High"])
            low_price = float(latest["Low"])
            volume = int(latest["Volume"])

        change = current_close - previous_close
        change_percent = (change / previous_close * 100) if previous_close != 0 else 0

        data = {
            "symbol": symbol,
            "name": ETF_SYMBOLS.get(symbol, {}).get("name", symbol),
            "type": ETF_SYMBOLS.get(symbol, {}).get("type", "ETF"),
            "tracks": ETF_SYMBOLS.get(symbol, {}).get("tracks", "N/A"),
            "price": current_close,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "volume": volume,
            "previous_close": previous_close,
            "change": change,
            "change_percent": change_percent,
            "date": hist.index[-1].strftime("%Y-%m-%d"),
            "data_source": "yfinance_etf",
        }

        # 캐시에 저장
        set_cached_data(cache_key, data)

        logger.info(f"Successfully retrieved ETF data for {symbol}")
        return data

    except Exception as e:
        logger.warning(f"Error getting ETF data for {symbol}: {str(e)}")
        return get_default_etf_data(symbol)


def get_default_etf_data(symbol: str) -> dict:
    """
    기본값 ETF 데이터 반환

    Args:
        symbol: ETF 심볼

    Returns:
        기본값 데이터
    """
    default_data = {
        "QQQ": {"price": 480.00, "name": "Invesco QQQ Trust"},
        "SPY": {"price": 550.00, "name": "SPDR S&P 500 ETF Trust"},
        "IVV": {"price": 550.00, "name": "iShares Core S&P 500 ETF"},
        "VTI": {"price": 280.00, "name": "Vanguard Total Stock Market ETF"},
    }

    data = default_data.get(symbol, {"price": 0.00, "name": "Unknown ETF"})

    return {
        "symbol": symbol,
        "name": data["name"],
        "type": "ETF",
        "tracks": "N/A",
        "price": data["price"],
        "open": data["price"],
        "high": data["price"],
        "low": data["price"],
        "volume": 0,
        "previous_close": data["price"],
        "change": 0.00,
        "change_percent": 0.00,
        "date": "N/A",
        "data_source": "default_etf",
    }


def get_all_etf_data() -> list:
    """
    모든 ETF 데이터 조회

    Returns:
        ETF 데이터 리스트
    """
    symbols = list(ETF_SYMBOLS.keys())

    try:
        results = []
        for i, symbol in enumerate(symbols):
            logger.info(f"Processing ETF {symbol} ({i+1}/{len(symbols)})")

            try:
                etf_data = get_etf_data(symbol)
                results.append(etf_data)

                if i < len(symbols) - 1:
                    time.sleep(random.uniform(1.5, 2.5))

            except Exception as e:
                logger.error(f"Failed to get ETF data for {symbol}: {str(e)}")
                results.append(get_default_etf_data(symbol))

        logger.info(f"Successfully processed {len(results)} ETFs")
        return results

    except Exception as e:
        logger.error(f"Failed to get all ETF data: {str(e)}")
        return [get_default_etf_data(symbol) for symbol in symbols]


# === 원자재 조회 함수들 ===


@rate_limit_decorator(min_interval=5.0, max_calls_per_minute=5)
@retry_on_429(max_retries=2, base_delay=3.0)
def get_commodity_data(symbol: str) -> dict:
    """
    원자재 데이터 조회 (선물 및 ETF)

    Args:
        symbol: 원자재 심볼 (예: GC=F, SI=F, CL=F)

    Returns:
        원자재 데이터
    """
    logger.info(f"Requested commodity data for {symbol}")

    # 캐시 확인
    cache_key = f"commodity_{symbol}"
    cached_data = get_cached_data(
        cache_key, max_age_minutes=10
    )  # 원자재는 더 자주 업데이트
    if cached_data is not None:
        return cached_data

    try:
        if not YF_AVAILABLE:
            raise Exception("yfinance library not available")

        # 원자재 데이터 조회
        hist = yf.download(symbol, period="2d", progress=False)

        if hist.empty:
            raise Exception("No historical data available")

        latest = hist.iloc[-1]
        previous = hist.iloc[-2] if len(hist) > 1 else latest

        # Column 접근 방식 조정
        if isinstance(hist.columns, pd.MultiIndex):
            close_col = hist.columns[hist.columns.get_level_values(0) == "Close"][0]
            open_col = hist.columns[hist.columns.get_level_values(0) == "Open"][0]
            high_col = hist.columns[hist.columns.get_level_values(0) == "High"][0]
            low_col = hist.columns[hist.columns.get_level_values(0) == "Low"][0]
            volume_col = hist.columns[hist.columns.get_level_values(0) == "Volume"][0]

            current_close = float(latest[close_col])
            previous_close = (
                float(previous[close_col]) if len(hist) > 1 else float(latest[open_col])
            )
            open_price = float(latest[open_col])
            high_price = float(latest[high_col])
            low_price = float(latest[low_col])
            volume = int(latest[volume_col]) if not pd.isna(latest[volume_col]) else 0
        else:
            current_close = float(latest["Close"])
            previous_close = (
                float(previous["Close"]) if len(hist) > 1 else float(latest["Open"])
            )
            open_price = float(latest["Open"])
            high_price = float(latest["High"])
            low_price = float(latest["Low"])
            volume = int(latest["Volume"]) if not pd.isna(latest["Volume"]) else 0

        change = current_close - previous_close
        change_percent = (change / previous_close * 100) if previous_close != 0 else 0

        data = {
            "symbol": symbol,
            "name": COMMODITY_SYMBOLS.get(symbol, {}).get("name", symbol),
            "type": COMMODITY_SYMBOLS.get(symbol, {}).get("type", "Commodity"),
            "category": COMMODITY_SYMBOLS.get(symbol, {}).get("category", "N/A"),
            "price": current_close,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "volume": volume,
            "previous_close": previous_close,
            "change": change,
            "change_percent": change_percent,
            "date": hist.index[-1].strftime("%Y-%m-%d"),
            "data_source": "yfinance_commodity",
        }

        # 캐시에 저장
        set_cached_data(cache_key, data)

        logger.info(f"Successfully retrieved commodity data for {symbol}")
        return data

    except Exception as e:
        logger.warning(f"Error getting commodity data for {symbol}: {str(e)}")
        return get_default_commodity_data(symbol)


def get_default_commodity_data(symbol: str) -> dict:
    """
    기본값 원자재 데이터 반환

    Args:
        symbol: 원자재 심볼

    Returns:
        기본값 데이터
    """
    default_data = {
        "GC=F": {"price": 2420.35, "name": "Gold Futures"},
        "SI=F": {"price": 30.12, "name": "Silver Futures"},
        "CL=F": {"price": 64.84, "name": "WTI Crude Oil Futures"},
        "GOLD": {"price": 242.00, "name": "SPDR Gold Trust"},
        "SLV": {"price": 28.50, "name": "iShares Silver Trust"},
    }

    data = default_data.get(symbol, {"price": 0.00, "name": "Unknown Commodity"})

    return {
        "symbol": symbol,
        "name": data["name"],
        "type": "Commodity",
        "category": "N/A",
        "price": data["price"],
        "open": data["price"],
        "high": data["price"],
        "low": data["price"],
        "volume": 0,
        "previous_close": data["price"],
        "change": 0.00,
        "change_percent": 0.00,
        "date": "N/A",
        "data_source": "default_commodity",
    }


def get_all_commodity_data() -> list:
    """
    모든 원자재 데이터 조회

    Returns:
        원자재 데이터 리스트
    """
    symbols = list(COMMODITY_SYMBOLS.keys())

    try:
        results = []
        for i, symbol in enumerate(symbols):
            logger.info(f"Processing commodity {symbol} ({i+1}/{len(symbols)})")

            try:
                commodity_data = get_commodity_data(symbol)
                results.append(commodity_data)

                if i < len(symbols) - 1:
                    time.sleep(random.uniform(2.0, 3.0))

            except Exception as e:
                logger.error(f"Failed to get commodity data for {symbol}: {str(e)}")
                results.append(get_default_commodity_data(symbol))

        logger.info(f"Successfully processed {len(results)} commodities")
        return results

    except Exception as e:
        logger.error(f"Failed to get all commodity data: {str(e)}")
        return [get_default_commodity_data(symbol) for symbol in symbols]


# === 환율 조회 함수들 ===


@rate_limit_decorator(min_interval=5.0, max_calls_per_minute=5)
@retry_on_429(max_retries=2, base_delay=3.0)
def get_currency_data(symbol: str) -> dict:
    """
    환율 데이터 조회

    Args:
        symbol: 환율 심볼 (예: USDKRW=X)

    Returns:
        환율 데이터
    """
    logger.info(f"Requested currency data for {symbol}")

    # 캐시 확인
    cache_key = f"currency_{symbol}"
    cached_data = get_cached_data(
        cache_key, max_age_minutes=5
    )  # 환율은 더 자주 업데이트
    if cached_data is not None:
        return cached_data

    try:
        if not YF_AVAILABLE:
            raise Exception("yfinance library not available")

        # 환율 데이터 조회
        hist = yf.download(symbol, period="2d", progress=False)

        if hist.empty:
            raise Exception("No historical data available")

        latest = hist.iloc[-1]
        previous = hist.iloc[-2] if len(hist) > 1 else latest

        # Column 접근 방식 조정
        if isinstance(hist.columns, pd.MultiIndex):
            close_col = hist.columns[hist.columns.get_level_values(0) == "Close"][0]
            open_col = hist.columns[hist.columns.get_level_values(0) == "Open"][0]
            high_col = hist.columns[hist.columns.get_level_values(0) == "High"][0]
            low_col = hist.columns[hist.columns.get_level_values(0) == "Low"][0]

            current_close = float(latest[close_col])
            previous_close = (
                float(previous[close_col]) if len(hist) > 1 else float(latest[open_col])
            )
            open_price = float(latest[open_col])
            high_price = float(latest[high_col])
            low_price = float(latest[low_col])
        else:
            current_close = float(latest["Close"])
            previous_close = (
                float(previous["Close"]) if len(hist) > 1 else float(latest["Open"])
            )
            open_price = float(latest["Open"])
            high_price = float(latest["High"])
            low_price = float(latest["Low"])

        change = current_close - previous_close
        change_percent = (change / previous_close * 100) if previous_close != 0 else 0

        data = {
            "symbol": symbol,
            "name": CURRENCY_SYMBOLS.get(symbol, {}).get("name", symbol),
            "type": CURRENCY_SYMBOLS.get(symbol, {}).get("type", "Currency"),
            "base": CURRENCY_SYMBOLS.get(symbol, {}).get("base", "N/A"),
            "quote": CURRENCY_SYMBOLS.get(symbol, {}).get("quote", "N/A"),
            "rate": current_close,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "previous_close": previous_close,
            "change": change,
            "change_percent": change_percent,
            "date": hist.index[-1].strftime("%Y-%m-%d"),
            "data_source": "yfinance_currency",
        }

        # 캐시에 저장
        set_cached_data(cache_key, data)

        logger.info(f"Successfully retrieved currency data for {symbol}")
        return data

    except Exception as e:
        logger.warning(f"Error getting currency data for {symbol}: {str(e)}")
        return get_default_currency_data(symbol)


def get_default_currency_data(symbol: str) -> dict:
    """
    기본값 환율 데이터 반환

    Args:
        symbol: 환율 심볼

    Returns:
        기본값 데이터
    """
    default_data = {
        "USDKRW=X": {"rate": 1376.20, "name": "USD/KRW"},
        "EURUSD=X": {"rate": 1.0850, "name": "EUR/USD"},
        "GBPUSD=X": {"rate": 1.2650, "name": "GBP/USD"},
        "USDJPY=X": {"rate": 149.50, "name": "USD/JPY"},
    }

    data = default_data.get(symbol, {"rate": 1.0000, "name": "Unknown Currency"})

    return {
        "symbol": symbol,
        "name": data["name"],
        "type": "Currency",
        "base": "N/A",
        "quote": "N/A",
        "rate": data["rate"],
        "open": data["rate"],
        "high": data["rate"],
        "low": data["rate"],
        "previous_close": data["rate"],
        "change": 0.00,
        "change_percent": 0.00,
        "date": "N/A",
        "data_source": "default_currency",
    }


def get_all_currency_data() -> list:
    """
    모든 환율 데이터 조회

    Returns:
        환율 데이터 리스트
    """
    symbols = list(CURRENCY_SYMBOLS.keys())

    try:
        results = []
        for i, symbol in enumerate(symbols):
            logger.info(f"Processing currency {symbol} ({i+1}/{len(symbols)})")

            try:
                currency_data = get_currency_data(symbol)
                results.append(currency_data)

                if i < len(symbols) - 1:
                    time.sleep(random.uniform(1.0, 2.0))

            except Exception as e:
                logger.error(f"Failed to get currency data for {symbol}: {str(e)}")
                results.append(get_default_currency_data(symbol))

        logger.info(f"Successfully processed {len(results)} currencies")
        return results

    except Exception as e:
        logger.error(f"Failed to get all currency data: {str(e)}")
        return [get_default_currency_data(symbol) for symbol in symbols]


# === 통합 대시보드 데이터 함수 ===


def get_dashboard_data() -> dict:
    """
    대시보드에 필요한 모든 데이터를 한 번에 조회 (기존 순차 처리 방식 유지)

    Returns:
        대시보드 데이터
    """
    logger.info("Requested comprehensive dashboard data (sequential)")

    try:
        dashboard_data = {
            # 지수 데이터
            "us_indexes": get_all_us_indexes_data(),
            "kr_indexes": get_all_kr_indexes_data(),
            # 주식 데이터
            "us_stocks": get_all_stock_data(),
            "kr_stocks": get_all_kr_stock_data(),
            # ETF 데이터
            "etfs": get_all_etf_data(),
            # 원자재 데이터
            "commodities": get_all_commodity_data(),
            # 환율 데이터
            "currencies": get_all_currency_data(),
            # 메타 정보
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "cache_status": get_cache_status(),
            "processing_type": "sequential",
        }

        logger.info("Successfully compiled dashboard data")
        return dashboard_data

    except Exception as e:
        logger.error(f"Failed to get dashboard data: {str(e)}")
        return {
            "error": str(e),
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "processing_type": "sequential_error",
        }


def get_dashboard_data_optimized() -> dict:
    """
    대시보드에 필요한 모든 데이터를 병렬 처리로 조회 (최적화된 방식)
    기존 함수명과 구별하기 위해 별도 이름 사용

    Returns:
        대시보드 데이터 (병렬 처리)
    """
    logger.info("Requested comprehensive dashboard data (parallel optimized)")

    # 병렬 처리 버전 호출
    return get_dashboard_data_parallel()


def test():
    """
    yfinance 라이브러리 테스트 함수
    AAPL 주식의 최근 1일 데이터를 조회하고 결과를 출력
    """
    try:
        print("AAPL 주식 데이터 조회 중...")

        # 1일 데이터 다운로드
        pf = yf.download("AAPL", period="1d", progress=False)

        if pf.empty:
            print(
                "❌ 데이터를 가져올 수 없습니다. API 오류 또는 네트워크 문제일 수 있습니다."
            )
            print("기본 함수를 사용해서 테스트해보겠습니다...")

            # 기존 함수 사용
            stock_data = get_stock_data("AAPL")
            print(f"✅ 기본 함수 결과: {stock_data}")
            return

        print("✅ 데이터 조회 성공!")
        print(f"📊 데이터 형태: {pf.shape}")
        print(f"📅 날짜 범위: {pf.index[0]} ~ {pf.index[-1]}")
        print("\n💰 주요 정보:")

        if len(pf) > 0:
            latest = pf.iloc[-1]
            print(f"  종가: ${latest['Close']:.2f}")
            print(f"  시가: ${latest['Open']:.2f}")
            print(f"  고가: ${latest['High']:.2f}")
            print(f"  저가: ${latest['Low']:.2f}")
            print(f"  거래량: {latest['Volume']:,}")

            if len(pf) > 1:
                prev_close = pf.iloc[-2]["Close"]
                change = latest["Close"] - prev_close
                change_pct = (change / prev_close) * 100
                print(f"  전일대비: ${change:.2f} ({change_pct:+.2f}%)")

        print("\n📋 전체 데이터:")
        print(pf)

    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        print("기본 함수를 사용해서 테스트해보겠습니다...")
        try:
            stock_data = get_stock_data("AAPL")
            print(f"✅ 기본 함수 결과: {stock_data}")
        except Exception as e2:
            print(f"❌ 기본 함수도 실패: {str(e2)}")


def test_yfinance_simple():
    """
    간단한 yfinance 테스트 - 기본적인 기능만 확인
    """
    print("=== yfinance 간단 테스트 ===")

    try:
        import yfinance as yf

        print("✅ yfinance 라이브러리 import 성공")

        # Ticker 객체 생성 테스트
        ticker = yf.Ticker("AAPL")
        print("✅ Ticker 객체 생성 성공")

        # 기본 정보 조회 (더 안정적)
        info = ticker.info
        if info:
            print(f"✅ 기본 정보 조회 성공")
            print(f"  회사명: {info.get('longName', 'N/A')}")
            print(f"  섹터: {info.get('sector', 'N/A')}")
            print(f"  현재가: ${info.get('currentPrice', 'N/A')}")
        else:
            print("⚠️  기본 정보 조회 실패 (API 제한)")

    except Exception as e:
        print(f"❌ 테스트 실패: {str(e)}")


def test_alternative_methods():
    """
    대안적인 방법들로 테스트
    """
    print("\n=== 대안적인 방법 테스트 ===")

    # 기존 함수들 테스트
    symbols = ["AAPL", "MSFT", "GOOGL"]

    for symbol in symbols:
        try:
            print(f"\n📊 {symbol} 테스트:")

            # 기본 함수 사용
            data = get_stock_data(symbol)

            if data and data.get("data_source") != "default":
                print(f"✅ 실제 데이터 조회 성공!")
            else:
                print(f"⚠️  기본값 데이터 사용 (API 제한)")

            print(f"  가격: ${data.get('price', 0):.2f}")
            print(f"  회사명: {data.get('name', 'N/A')}")
            print(f"  데이터 소스: {data.get('data_source', 'N/A')}")

        except Exception as e:
            print(f"❌ {symbol} 테스트 실패: {str(e)}")


# ===================================================================
# 병렬 처리 함수들 (Parallel Processing)
# ===================================================================

import concurrent.futures
from concurrent.futures import ThreadPoolExecutor, as_completed


def fetch_multiple_tickers_parallel(symbols: list, data_type="info", max_workers=5):
    """
    여러 심볼을 병렬로 조회하는 함수

    Args:
        symbols: 조회할 심볼 리스트
        data_type: 조회할 데이터 타입 ("info", "history", "fast_info")
        max_workers: 최대 worker 스레드 수

    Returns:
        dict: {symbol: data} 형태의 결과
    """
    if not YF_AVAILABLE:
        logger.warning("yfinance not available, returning empty dict")
        return {}

    results = {}

    try:
        # yfinance Tickers를 사용한 일괄 조회 시도
        if len(symbols) > 1:
            symbols_str = " ".join(symbols)
            tickers = yf.Tickers(symbols_str)

            for symbol in symbols:
                try:
                    ticker = tickers.tickers[symbol]

                    if data_type == "info":
                        data = ticker.info
                    elif data_type == "fast_info":
                        data = ticker.fast_info
                    elif data_type == "history":
                        data = ticker.history(period="1d")
                    else:
                        data = ticker.info

                    results[symbol] = data
                except Exception as e:
                    logger.warning(f"Failed to get {data_type} for {symbol}: {e}")
                    results[symbol] = None

        else:
            # 단일 심볼의 경우 기존 방식 사용
            if symbols:
                symbol = symbols[0]
                ticker = yf.Ticker(symbol)

                if data_type == "info":
                    results[symbol] = ticker.info
                elif data_type == "fast_info":
                    results[symbol] = ticker.fast_info
                elif data_type == "history":
                    results[symbol] = ticker.history(period="1d")
                else:
                    results[symbol] = ticker.info

    except Exception as e:
        logger.error(f"Parallel fetch failed: {e}")
        # ThreadPoolExecutor로 fallback
        results = fetch_with_thread_pool(symbols, data_type, max_workers)

    return results


def fetch_with_thread_pool(symbols: list, data_type="info", max_workers=5):
    """
    ThreadPoolExecutor를 사용한 병렬 조회

    Args:
        symbols: 조회할 심볼 리스트
        data_type: 조회할 데이터 타입
        max_workers: 최대 worker 스레드 수

    Returns:
        dict: {symbol: data} 형태의 결과
    """
    results = {}

    def fetch_single_ticker(symbol):
        try:
            ticker = yf.Ticker(symbol)

            if data_type == "info":
                return symbol, ticker.info
            elif data_type == "fast_info":
                return symbol, ticker.fast_info
            elif data_type == "history":
                return symbol, ticker.history(period="1d")
            else:
                return symbol, ticker.info

        except Exception as e:
            logger.warning(f"Failed to fetch {symbol}: {e}")
            return symbol, None

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_symbol = {
            executor.submit(fetch_single_ticker, symbol): symbol for symbol in symbols
        }

        for future in as_completed(future_to_symbol):
            try:
                symbol, data = future.result(timeout=10)  # 10초 타임아웃
                results[symbol] = data
            except Exception as e:
                symbol = future_to_symbol[future]
                logger.error(f"Exception for {symbol}: {e}")
                results[symbol] = None

    return results


def get_multiple_stocks_parallel(symbols: list):
    """
    여러 주식 데이터를 병렬로 조회

    Args:
        symbols: 주식 심볼 리스트

    Returns:
        list: 표준화된 주식 데이터 리스트
    """
    if not symbols:
        return []

    # 캐시 체크
    cached_results = []
    uncached_symbols = []

    for symbol in symbols:
        cached_data = get_cached_data(symbol)
        if cached_data:
            cached_results.append(cached_data)
        else:
            uncached_symbols.append(symbol)

    # 캐시되지 않은 심볼들만 병렬 조회
    if uncached_symbols:
        parallel_results = fetch_multiple_tickers_parallel(
            uncached_symbols, "fast_info"
        )

        for symbol in uncached_symbols:
            try:
                fast_info = parallel_results.get(symbol)

                if fast_info:
                    current_price = fast_info.get("lastPrice") or fast_info.get(
                        "regularMarketPrice", 0
                    )
                    previous_close = fast_info.get("previousClose", 0)

                    if current_price and previous_close:
                        change = current_price - previous_close
                        change_rate = (
                            (change / previous_close * 100)
                            if previous_close != 0
                            else 0
                        )
                        sign = "1" if change > 0 else "2" if change < 0 else "0"
                    else:
                        change = 0
                        change_rate = 0
                        sign = "0"

                    # 미국 주식 이름 매핑
                    stock_name = STOCK_SYMBOLS.get(symbol, {}).get("name", symbol)

                    stock_data = create_standardized_response(
                        title=stock_name,
                        market="US",
                        price=f"{current_price:.2f}",
                        change=f"{change:.2f}",
                        change_rate=f"{change_rate:.2f}",
                        sign=sign,
                    )

                    # 캐시에 저장
                    set_cached_data(symbol, stock_data)
                    cached_results.append(stock_data)

                else:
                    # 기본값 사용
                    default_data = get_default_stock_data(symbol)
                    cached_results.append(default_data)

            except Exception as e:
                logger.error(f"Error processing {symbol}: {e}")
                default_data = get_default_stock_data(symbol)
                cached_results.append(default_data)

    return cached_results


def get_multiple_etfs_parallel(symbols: list):
    """
    여러 ETF 데이터를 병렬로 조회

    Args:
        symbols: ETF 심볼 리스트

    Returns:
        list: ETF 데이터 리스트
    """
    if not symbols:
        return []

    parallel_results = fetch_multiple_tickers_parallel(symbols, "fast_info")
    etf_data_list = []

    for symbol in symbols:
        try:
            fast_info = parallel_results.get(symbol)

            if fast_info:
                current_price = fast_info.get("lastPrice") or fast_info.get(
                    "regularMarketPrice", 0
                )
                previous_close = fast_info.get("previousClose", 0)

                if current_price and previous_close:
                    change = current_price - previous_close
                    change_rate = (
                        (change / previous_close * 100) if previous_close != 0 else 0
                    )
                else:
                    change = 0
                    change_rate = 0

                # ETF 이름 매핑
                etf_name = ETF_SYMBOLS.get(symbol, symbol)

                etf_data = {
                    "symbol": symbol,
                    "name": etf_name,
                    "price": current_price,
                    "change": change,
                    "change_rate": change_rate,
                    "data_source": "yfinance",
                }

                etf_data_list.append(etf_data)

            else:
                # 기본값 사용
                default_etf_data = get_default_etf_data(symbol)
                etf_data_list.append(default_etf_data)

        except Exception as e:
            logger.error(f"Error processing ETF {symbol}: {e}")
            default_etf_data = get_default_etf_data(symbol)
            etf_data_list.append(default_etf_data)

    return etf_data_list


def get_multiple_commodities_parallel(symbols: list):
    """
    여러 원자재 데이터를 병렬로 조회

    Args:
        symbols: 원자재 심볼 리스트

    Returns:
        list: 원자재 데이터 리스트
    """
    if not symbols:
        return []

    parallel_results = fetch_multiple_tickers_parallel(symbols, "fast_info")
    commodity_data_list = []

    for symbol in symbols:
        try:
            fast_info = parallel_results.get(symbol)

            if fast_info:
                current_price = fast_info.get("lastPrice") or fast_info.get(
                    "regularMarketPrice", 0
                )
                previous_close = fast_info.get("previousClose", 0)

                if current_price and previous_close:
                    change = current_price - previous_close
                    change_rate = (
                        (change / previous_close * 100) if previous_close != 0 else 0
                    )
                else:
                    change = 0
                    change_rate = 0

                # 원자재 이름 매핑
                commodity_name = COMMODITY_SYMBOLS.get(symbol, symbol)

                commodity_data = {
                    "symbol": symbol,
                    "name": commodity_name,
                    "price": current_price,
                    "change": change,
                    "change_rate": change_rate,
                    "data_source": "yfinance",
                }

                commodity_data_list.append(commodity_data)

            else:
                # 기본값 사용
                default_commodity_data = get_default_commodity_data(symbol)
                commodity_data_list.append(default_commodity_data)

        except Exception as e:
            logger.error(f"Error processing commodity {symbol}: {e}")
            default_commodity_data = get_default_commodity_data(symbol)
            commodity_data_list.append(default_commodity_data)

    return commodity_data_list


def get_multiple_currencies_parallel(symbols: list):
    """
    여러 환율 데이터를 병렬로 조회

    Args:
        symbols: 환율 심볼 리스트

    Returns:
        list: 환율 데이터 리스트
    """
    if not symbols:
        return []

    parallel_results = fetch_multiple_tickers_parallel(symbols, "fast_info")
    currency_data_list = []

    for symbol in symbols:
        try:
            fast_info = parallel_results.get(symbol)

            if fast_info:
                current_rate = fast_info.get("lastPrice") or fast_info.get(
                    "regularMarketPrice", 0
                )
                previous_close = fast_info.get("previousClose", 0)

                if current_rate and previous_close:
                    change = current_rate - previous_close
                    change_rate = (
                        (change / previous_close * 100) if previous_close != 0 else 0
                    )
                else:
                    change = 0
                    change_rate = 0

                # 환율 이름 매핑
                currency_name = CURRENCY_SYMBOLS.get(symbol, symbol)

                currency_data = {
                    "symbol": symbol,
                    "name": currency_name,
                    "rate": current_rate,
                    "change": change,
                    "change_rate": change_rate,
                    "data_source": "yfinance",
                }

                currency_data_list.append(currency_data)

            else:
                # 기본값 사용
                default_currency_data = get_default_currency_data(symbol)
                currency_data_list.append(default_currency_data)

        except Exception as e:
            logger.error(f"Error processing currency {symbol}: {e}")
            default_currency_data = get_default_currency_data(symbol)
            currency_data_list.append(default_currency_data)

    return currency_data_list


def get_dashboard_data_parallel():
    """
    모든 대시보드 데이터를 병렬로 조회하는 개선된 버전

    Returns:
        dict: 모든 시장 데이터
    """
    start_time = datetime.now()
    logger.info("Starting parallel dashboard data collection")

    # 모든 심볼 리스트 준비
    all_symbols = {
        "us_indexes": list(INDEX_SYMBOLS_US.keys()),
        "kr_indexes": list(INDEX_SYMBOLS_KR.keys()),
        "us_stocks": list(STOCK_SYMBOLS.keys()),
        "kr_stocks": list(STOCK_SYMBOLS_KR.keys()),
        "etfs": list(ETF_SYMBOLS.keys()),
        "commodities": list(COMMODITY_SYMBOLS.keys()),
        "currencies": list(CURRENCY_SYMBOLS.keys()),
    }

    dashboard_data = {}

    # ThreadPoolExecutor로 각 카테고리를 병렬 처리
    with ThreadPoolExecutor(max_workers=7) as executor:
        futures = {}

        # 각 카테고리별로 태스크 제출
        futures["us_indexes"] = executor.submit(
            get_multiple_indexes_data_parallel, all_symbols["us_indexes"], "US"
        )
        futures["kr_indexes"] = executor.submit(
            get_multiple_indexes_data_parallel, all_symbols["kr_indexes"], "KR"
        )
        futures["us_stocks"] = executor.submit(
            get_multiple_stocks_parallel, all_symbols["us_stocks"]
        )
        futures["kr_stocks"] = executor.submit(
            get_multiple_kr_stocks_parallel, all_symbols["kr_stocks"]
        )
        futures["etfs"] = executor.submit(
            get_multiple_etfs_parallel, all_symbols["etfs"]
        )
        futures["commodities"] = executor.submit(
            get_multiple_commodities_parallel, all_symbols["commodities"]
        )
        futures["currencies"] = executor.submit(
            get_multiple_currencies_parallel, all_symbols["currencies"]
        )

        # 결과 수집
        for category, future in futures.items():
            try:
                dashboard_data[category] = future.result(timeout=30)  # 30초 타임아웃
            except Exception as e:
                logger.error(f"Error getting {category} data: {e}")
                dashboard_data[category] = []

    # 메타데이터 추가
    end_time = datetime.now()
    processing_time = (end_time - start_time).total_seconds()

    dashboard_data["last_updated"] = end_time.strftime("%Y-%m-%d %H:%M:%S")
    dashboard_data["processing_time"] = f"{processing_time:.2f}s"
    dashboard_data["cache_status"] = "parallel_processing"
    dashboard_data["total_symbols"] = sum(
        len(symbols) for symbols in all_symbols.values()
    )

    logger.info(
        f"Parallel dashboard data collection completed in {processing_time:.2f}s"
    )

    return dashboard_data


def get_multiple_indexes_data_parallel(symbols: list, market_type: str):
    """
    여러 지수 데이터를 병렬로 조회

    Args:
        symbols: 지수 심볼 리스트
        market_type: 시장 타입 ('US' 또는 'KR')

    Returns:
        list: 지수 데이터 리스트
    """
    if not symbols:
        return []

    parallel_results = fetch_multiple_tickers_parallel(symbols, "fast_info")
    index_data_list = []

    # 심볼 매핑 선택
    symbol_mapping = INDEX_SYMBOLS_US if market_type == "US" else INDEX_SYMBOLS_KR

    for symbol in symbols:
        try:
            fast_info = parallel_results.get(symbol)

            if fast_info:
                current_price = fast_info.get("lastPrice") or fast_info.get(
                    "regularMarketPrice", 0
                )
                previous_close = fast_info.get("previousClose", 0)

                if current_price and previous_close:
                    change = current_price - previous_close
                    change_rate = (
                        (change / previous_close * 100) if previous_close != 0 else 0
                    )
                    sign = "1" if change > 0 else "2" if change < 0 else "0"
                else:
                    change = 0
                    change_rate = 0
                    sign = "0"

                # 지수 이름 매핑
                index_name = symbol_mapping.get(symbol, {}).get("name", symbol)

                index_data = create_standardized_response(
                    title=index_name,
                    market=market_type,
                    price=f"{current_price:.2f}",
                    change=f"{change:.2f}",
                    change_rate=f"{change_rate:.2f}",
                    sign=sign,
                )

                index_data_list.append(index_data)

            else:
                # 기본값 사용
                default_index_data = get_default_index_data(symbol, market_type)
                index_data_list.append(default_index_data)

        except Exception as e:
            logger.error(f"Error processing index {symbol}: {e}")
            default_index_data = get_default_index_data(symbol, market_type)
            index_data_list.append(default_index_data)

    return index_data_list


def get_multiple_kr_stocks_parallel(symbols: list):
    """
    여러 한국 주식 데이터를 병렬로 조회

    Args:
        symbols: 한국 주식 심볼 리스트

    Returns:
        list: 표준화된 한국 주식 데이터 리스트
    """
    if not symbols:
        return []

    parallel_results = fetch_multiple_tickers_parallel(symbols, "fast_info")
    kr_stock_data_list = []

    for symbol in symbols:
        try:
            fast_info = parallel_results.get(symbol)

            if fast_info:
                current_price = fast_info.get("lastPrice") or fast_info.get(
                    "regularMarketPrice", 0
                )
                previous_close = fast_info.get("previousClose", 0)

                if current_price and previous_close:
                    change = current_price - previous_close
                    change_rate = (
                        (change / previous_close * 100) if previous_close != 0 else 0
                    )
                    sign = "1" if change > 0 else "2" if change < 0 else "0"
                else:
                    change = 0
                    change_rate = 0
                    sign = "0"

                # 한국 주식 이름 매핑
                stock_name = STOCK_SYMBOLS_KR.get(symbol, {}).get("name", symbol)

                stock_data = create_standardized_response(
                    title=stock_name,
                    market="KR",
                    price=f"{current_price:.0f}",  # 한국 주식은 정수로 표시
                    change=f"{change:.0f}",
                    change_rate=f"{change_rate:.2f}",
                    sign=sign,
                )

                kr_stock_data_list.append(stock_data)

            else:
                # 기본값 사용
                default_kr_stock_data = get_default_kr_stock_data(symbol)
                kr_stock_data_list.append(default_kr_stock_data)

        except Exception as e:
            logger.error(f"Error processing KR stock {symbol}: {e}")
            default_kr_stock_data = get_default_kr_stock_data(symbol)
            kr_stock_data_list.append(default_kr_stock_data)

    return kr_stock_data_list


# 기본값 데이터 함수들 (Default Data Functions)
def get_default_etf_data(symbol: str):
    """ETF 기본값 데이터 반환"""
    default_prices = {
        "QQQ": 480.00,
        "SPY": 575.00,
        "IVV": 520.00,
        "VTI": 270.00,
        "VEA": 52.00,
        "VWO": 45.00,
    }

    etf_name = ETF_SYMBOLS.get(symbol, symbol)
    price = default_prices.get(symbol, 100.00)

    return {
        "symbol": symbol,
        "name": etf_name,
        "price": price,
        "change": 0.00,
        "change_rate": 0.00,
        "data_source": "default",
    }


def get_default_commodity_data(symbol: str):
    """원자재 기본값 데이터 반환"""
    default_prices = {
        "GC=F": 2420.35,
        "SI=F": 31.25,
        "CL=F": 68.50,
        "BZ=F": 72.80,
        "NG=F": 2.85,
        "GOLD": 2420.00,
        "SLV": 31.00,
    }

    commodity_name = COMMODITY_SYMBOLS.get(symbol, symbol)
    price = default_prices.get(symbol, 50.00)

    return {
        "symbol": symbol,
        "name": commodity_name,
        "price": price,
        "change": 0.00,
        "change_rate": 0.00,
        "data_source": "default",
    }


def get_default_currency_data(symbol: str):
    """환율 기본값 데이터 반환"""
    default_rates = {
        "USDKRW=X": 1376.20,
        "EURUSD=X": 1.0850,
        "GBPUSD=X": 1.2650,
        "JPYUSD=X": 0.0067,
        "USDJPY=X": 149.50,
        "AUDUSD=X": 0.6750,
    }

    currency_name = CURRENCY_SYMBOLS.get(symbol, symbol)
    rate = default_rates.get(symbol, 1.0000)

    return {
        "symbol": symbol,
        "name": currency_name,
        "rate": rate,
        "change": 0.00,
        "change_rate": 0.00,
        "data_source": "default",
    }


def get_default_index_data(symbol: str, market_type: str):
    """지수 기본값 데이터 반환"""
    us_default_prices = {"^GSPC": 5750.00, "^IXIC": 18200.00, "^DJI": 42500.00}

    kr_default_prices = {"^KS11": 2650.00, "^KQ11": 850.00}

    if market_type == "US":
        symbol_mapping = INDEX_SYMBOLS_US
        default_prices = us_default_prices
    else:
        symbol_mapping = INDEX_SYMBOLS_KR
        default_prices = kr_default_prices

    index_name = symbol_mapping.get(symbol, {}).get("name", symbol)
    price = default_prices.get(symbol, 1000.00)

    return create_standardized_response(
        title=index_name,
        market=market_type,
        price=f"{price:.2f}",
        change="0.00",
        change_rate="0.00",
        sign="0",
    )


def get_default_kr_stock_data(symbol: str):
    """한국 주식 기본값 데이터 반환"""
    default_prices = {
        "005930.KS": 75000,
        "000660.KS": 135000,
        "035420.KS": 105000,
        "035720.KS": 41500,
        "051910.KS": 195000,
        "005380.KS": 110000,
        "373220.KS": 820000,
        "068270.KS": 195000,
        "105560.KS": 135000,
    }

    stock_name = STOCK_SYMBOLS_KR.get(symbol, {}).get("name", symbol)
    price = default_prices.get(symbol, 50000)

    return create_standardized_response(
        title=stock_name,
        market="KR",
        price=f"{price:.0f}",
        change="0",
        change_rate="0.00",
        sign="0",
    )


# ================================================================
# KIS API (한국투자증권) 관련 기능 추가
# ================================================================

import os
import requests
from typing import Dict, Optional, Any
from datetime import datetime, timedelta

from .token_manager import get_token_manager, KISTokenError

logger = logging.getLogger(__name__)


class KISAPIError(Exception):
    """KIS API 관련 기본 예외"""

    pass


class KISAPIConnectionError(KISAPIError):
    """KIS API 연결 관련 예외"""

    pass


class KISAPIAuthenticationError(KISAPIError):
    """KIS API 인증 관련 예외"""

    pass


class KISAPIRateLimitError(KISAPIError):
    """KIS API Rate Limit 관련 예외"""

    pass


class KISAPIClient:
    """한국투자증권 Open API 클라이언트"""

    def __init__(self):
        self.app_key = os.getenv("KIS_APP_KEY")
        self.app_secret = os.getenv("KIS_APP_SECRET")
        self.base_url = os.getenv(
            "KIS_BASE_URL", "https://openapi.koreainvestment.com:9443"
        )

        if not self.app_key or not self.app_secret:
            raise ValueError(
                "KIS_APP_KEY and KIS_APP_SECRET environment variables are required"
            )

        # Redis 기반 토큰 매니저 사용
        self.token_manager = get_token_manager()

    def _is_token_valid(self, is_overseas: bool = False) -> bool:
        """토큰 유효성 체크 - 이제 토큰 매니저가 관리"""
        try:
            # 토큰 매니저에서 토큰 정보 조회
            token_info = self.token_manager.get_token_info()
            return token_info.get("is_valid", False)
        except Exception as e:
            logger.warning(f"Error checking token validity: {e}")
            return False

    def _get_headers(
        self, tr_id: str, custtype: str = "P", is_overseas: bool = False
    ) -> Dict[str, str]:
        """
        API 요청 헤더 생성

        Args:
            tr_id: 거래 ID
            custtype: 고객구분 (P: 개인)
            is_overseas: 해외주식 API 여부
        """
        try:
            # 토큰 매니저에서 유효한 토큰 가져오기 (자동 갱신 포함)
            token = self.token_manager.get_token()
        except KISTokenError as e:
            logger.error(f"Failed to get valid token: {e}")
            raise KISAPIAuthenticationError(f"토큰 획득 실패: {str(e)}")

        return {
            "Content-Type": "application/json",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": tr_id,
            "custtype": custtype,
        }

    def _is_token_expired(self) -> bool:
        """토큰 만료 여부 확인 (하위호환성 유지)"""
        return not self._is_token_valid(is_overseas=False)

    def _make_request(
        self,
        method: str,
        endpoint: str,
        tr_id: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        custtype: str = "P",
        is_overseas: bool = False,
    ) -> Dict[str, Any]:
        """API 요청 실행"""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers(tr_id, custtype, is_overseas)

        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(
                    url, headers=headers, json=data, params=params, timeout=30
                )
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.Timeout:
            logger.error(f"KIS API request timeout: {url}")
            raise KISAPIConnectionError(f"API 요청 시간 초과: {endpoint}")
        except requests.exceptions.ConnectionError:
            logger.error(f"KIS API connection error: {url}")
            raise KISAPIConnectionError(f"API 연결 오류: {endpoint}")
        except requests.HTTPError as e:
            logger.error(f"KIS API HTTP error: {e}")
            if e.response.status_code == 403:
                # 토큰 관련 오류 시 캐시 무효화
                logger.warning("Token authentication failed, invalidating cache")
                self.token_manager.invalidate_token()
                raise KISAPIAuthenticationError(f"API 권한 오류: {endpoint}")
            elif e.response.status_code == 429:
                raise KISAPIRateLimitError(f"API 요청 횟수 초과: {endpoint}")
            else:
                raise KISAPIError(f"API HTTP 오류: {e}")
        except requests.RequestException as e:
            logger.error(f"KIS API request failed: {e}")
            raise KISAPIConnectionError(f"API 요청 실패: {str(e)}")
        except ValueError as e:
            logger.error(f"Invalid response from KIS API: {e}")
            raise KISAPIError(f"API 응답 파싱 오류: {str(e)}")

    def get_domestic_stock_price(
        self, stock_code: str, market_code: str = "J"
    ) -> Dict[str, Any]:
        """
        국내 주식 현재가 조회

        Args:
            stock_code: 종목코드 (6자리)
            market_code: 시장구분코드 (J: 주식, ETF, ETN)

        Returns:
            주식 현재가 정보
        """
        endpoint = "/uapi/domestic-stock/v1/quotations/inquire-price"
        tr_id = "FHKST01010100"

        params = {"FID_COND_MRKT_DIV_CODE": market_code, "FID_INPUT_ISCD": stock_code}

        return self._make_request("GET", endpoint, tr_id, params=params)

    def get_overseas_stock_price(
        self, stock_code: str, exchange_code: str = "NAS"
    ) -> Dict[str, Any]:
        """
        해외 주식 현재가 조회

        Args:
            stock_code: 종목코드
            exchange_code: 거래소코드 (NAS: 나스닥, NYS: 뉴욕, AMS: 아메리칸, HKS: 홍콩)

        Returns:
            해외 주식 현재가 정보
        """
        endpoint = "/uapi/overseas-price/v1/quotations/price"
        tr_id = "HHDFS00000300"

        params = {"AUTH": "", "EXCD": exchange_code, "SYMB": stock_code}

        return self._make_request(
            "GET", endpoint, tr_id, params=params, is_overseas=True
        )

    def get_overseas_index_price(
        self, index_code: str, exchange_code: str = "NAS"
    ) -> Dict[str, Any]:
        """
        해외 지수 현재가 조회 (지수 전용)

        한국투자증권 API에서 해외 지수 조회를 위한 최적화된 파라미터 사용

        Args:
            index_code: 지수코드 (예: IXIC, COMP, NDX)
            exchange_code: 거래소코드 (NAS: 나스닥)

        Returns:
            해외 지수 현재가 정보
        """
        # 해외 지수 조회용 엔드포인트
        endpoint = "/uapi/overseas-price/v1/quotations/price"

        # 현재 날짜 (YYYYMMDD 형식)
        current_date = datetime.now().strftime("%Y%m%d")

        # 한국투자증권 API에서 해외 지수 조회를 위한 TR_ID 및 파라미터 조합
        tr_ids_to_try = [
            # 방법 1: 해외지수 전용 TR_ID (가장 적합)
            (
                "HHDFS00000300",
                {
                    "AUTH": "",
                    "EXCD": exchange_code,
                    "SYMB": index_code,
                },
            ),
            # 방법 2: 해외주식 현재가 TR_ID (일반적)
            (
                "HHDFS76240000",
                {
                    "AUTH": "",
                    "EXCD": exchange_code,
                    "SYMB": index_code,
                },
            ),
            # 방법 3: 해외지수 조회 (GUBN 파라미터 포함)
            (
                "HHDFS76200000",
                {
                    "AUTH": "",
                    "EXCD": exchange_code,
                    "SYMB": index_code,
                    "GUBN": "0",  # 0: 지수
                },
            ),
            # 방법 4: 시세 조회 (날짜 파라미터 포함)
            (
                "HHDFS00000300",
                {
                    "AUTH": "",
                    "EXCD": exchange_code,
                    "SYMB": index_code,
                    "BYMD": current_date,
                },
            ),
        ]

        for tr_id, params in tr_ids_to_try:
            try:
                response = self._make_request(
                    "GET", endpoint, tr_id, params=params, is_overseas=True
                )

                # 응답 로깅 (더 상세하게)
                logger.info(
                    f"NASDAQ SYMBOL TEST: {index_code} with TR_ID {tr_id} - rt_cd={response.get('rt_cd')}, msg={response.get('msg1', 'N/A')}"
                )

                # 성공적인 응답인지 확인
                if response.get("rt_cd") == "0":
                    output = response.get("output", {})
                    last_price = output.get("last", "").strip()

                    if last_price:
                        logger.info(
                            f"SUCCESS: {index_code} with TR_ID {tr_id} returned price {last_price}"
                        )
                        return response
                    else:
                        logger.warning(
                            f"EMPTY: {index_code} with TR_ID {tr_id} - rt_cd=0 but no price data"
                        )
                else:
                    logger.warning(
                        f"FAILED: {index_code} with TR_ID {tr_id} - rt_cd={response.get('rt_cd')}"
                    )

            except Exception as e:
                logger.warning(f"Failed with TR_ID {tr_id} for index {index_code}: {e}")
                continue

        # 모든 시도 실패 시 대표 종목으로 폴백
        logger.warning(
            f"All TR_IDs failed for index {index_code}, trying fallback stocks"
        )
        return self._get_fallback_index_data(exchange_code)

    def _get_fallback_index_data(self, exchange_code: str) -> Dict[str, Any]:
        """
        지수 조회 실패 시 대표 종목으로 폴백
        나스닥의 경우 QQQ ETF보다는 종합지수와 더 유사한 대안들을 우선 시도
        """
        fallback_symbols = {
            "NAS": [
                # 나스닥 100 지수 (종합지수에 가장 가까운 대안)
                "NDX",  # 나스닥 100 지수 (NASDAQ-100 Index)
                # 나스닥 관련 ETF들 (지수와 유사)
                "QQQ",  # Invesco QQQ Trust (나스닥 100 ETF)
                "ONEQ",  # Fidelity NASDAQ Composite Index ETF
                "QQQM",  # Invesco NASDAQ 100 ETF
                "NDAQ",  # Invesco NASDAQ Internet ETF
                # 대표적인 나스닥 대형주들 (확실히 작동)
                "AAPL",  # Apple Inc.
                "MSFT",  # Microsoft Corporation
                "GOOGL",  # Alphabet Inc. Class A
                "AMZN",  # Amazon.com Inc.
                "TSLA",  # Tesla Inc.
                "META",  # Meta Platforms Inc.
                "NVDA",  # NVIDIA Corporation
                # 추가 대안들
                "ARKK",  # ARK Innovation ETF
                "VGT",  # Vanguard Information Technology ETF
            ],  # 나스닥 대표 종목/ETF (확실히 작동하는 것들 우선)
        }

        symbols = fallback_symbols.get(exchange_code, ["QQQ"])

        for symbol in symbols:
            try:
                logger.info(
                    f"Trying fallback symbol {symbol} for {exchange_code} index"
                )
                response = self.get_overseas_stock_price(symbol, exchange_code)
                if response.get("rt_cd") == "0" and response.get("output", {}).get(
                    "last"
                ):
                    logger.info(f"Fallback success with {symbol}")
                    return response
                else:
                    logger.warning(f"Fallback symbol {symbol} returned empty data")
            except Exception as e:
                logger.warning(f"Fallback symbol {symbol} failed with error: {e}")
                continue

        # 모든 폴백도 실패 시 빈 응답 반환
        logger.error(f"All fallback attempts failed for {exchange_code}")
        return {"rt_cd": "1", "msg1": "All attempts failed", "output": {}}

    def get_market_index(self, market_code: str = "0001") -> Dict[str, Any]:
        """
        국내 시장 지수 조회

        Args:
            market_code: 시장코드 (0001: 코스피, 1001: 코스닥)

        Returns:
            시장 지수 정보
        """
        endpoint = "/uapi/domestic-stock/v1/quotations/inquire-index-price"
        tr_id = "FHPUP02100000"

        params = {"FID_COND_MRKT_DIV_CODE": "U", "FID_INPUT_ISCD": market_code}

        return self._make_request("GET", endpoint, tr_id, params=params)


def safe_float_conversion(value: str, default: float = 0.0) -> float:
    """
    문자열을 안전하게 float로 변환

    Args:
        value: 변환할 문자열 값
        default: 변환 실패 시 기본값

    Returns:
        변환된 float 값 또는 기본값
    """
    if not value or value.strip() == "":
        return default

    try:
        return float(value)
    except (ValueError, TypeError):
        logger.warning(f"Failed to convert '{value}' to float, using default {default}")
        return default


def create_standardized_response(
    title: str, market: str, price: str, change: str, change_rate: str, sign: str
) -> Dict[str, str]:
    """
    표준화된 응답 형식으로 데이터 변환 (한국투자증권 API 필드명 기준)

    Args:
        title: 종목명 (stck_shrn_iscd)
        market: 시장명 (rprs_mrkt_kor_name)
        price: 현재가 (stck_prpr)
        change: 전일대비 (prdy_vrss)
        change_rate: 등락률 (prdy_ctrt)
        sign: 등락부호 (prdy_vrss_sign)

    Returns:
        표준화된 응답 데이터
    """
    return {
        "title": title,
        "market": market,
        "price": price or "0",
        "change": change or "0",
        "changeRate": change_rate or "0.00",
        "sign": sign or "0",
    }


# 시장별 대표 종목 코드 (예시)
MARKET_INDICES_KIS = {
    "kospi": "0001",  # 코스피 지수
    "kosdaq": "1001",  # 코스닥 지수
}

# 해외 거래소 코드 (한국투자증권 API 표준)
EXCHANGE_CODES_KIS = {
    "nasdaq": "NAS",  # 나스닥 (NASDAQ)
    "nyse": "NYS",  # 뉴욕증권거래소 (NYSE)
    "amex": "AMS",  # 아메리칸증권거래소 (AMEX)
}

# 대표 해외 지수 종목 코드 (실제 작동 우선순서)
OVERSEAS_INDICES_KIS = {
    "nasdaq": [
        # 실제 작동하는 나스닥 관련 심볼들 (검증된 순서)
        "QQQ",  # Invesco QQQ Trust (나스닥 100 ETF) - 확실히 작동
        "NDX",  # 나스닥 100 지수
        "AAPL",  # Apple (나스닥 대표 종목)
        "MSFT",  # Microsoft (나스닥 대표 종목)
        # 나스닥 종합지수 시도 (작동 여부 불확실)
        "IXIC",  # 나스닥 종합지수 (NASDAQ Composite Index)
        "COMP",  # 나스닥 종합지수 (Composite)
        "COMPX",  # 나스닥 종합지수 (Composite X)
        ".IXIC",  # 점 접두사 형식
        "^IXIC",  # 캐럿 접두사 형식
        # 기타 시도해볼 형식들
        "NASDAQ",  # 직접적인 명칭
        "CCMP",  # 축약 형태
        "ONEQ",  # Fidelity NASDAQ Composite Index ETF
        "QQQM",  # Invesco NASDAQ 100 ETF
    ],  # 나스닥 관련 (실제 작동 가능성 순서)
}

# 폴백용 대표 종목 (지수 조회 실패 시 사용) - 더 이상 사용하지 않음 (deprecated)
# _get_fallback_index_data 메서드 내에서 직접 정의함
FALLBACK_STOCKS_KIS = {
    "nasdaq": [
        "NDX",
        "ONEQ",
        "NDAQ",
        "QQQ",
        "AAPL",
        "MSFT",
    ],  # 나스닥 대표 (종합지수 우선)
}

if __name__ == "__main__":
    # 여러 테스트 실행
    test_yfinance_simple()
    test_alternative_methods()
    print("\n=== 원래 테스트 함수 실행 ===")
    test()
