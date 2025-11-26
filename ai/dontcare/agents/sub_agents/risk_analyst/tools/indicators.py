# indicators.py

"""
기술적 지표 계산 모듈
- EMA: Exponential Moving Average
- MACD: Moving Average Convergence Divergence
"""

import pandas as pd

def calculate_ema(prices: pd.Series, span: int) -> pd.Series:
    """
    Exponential Moving Average (EMA) 계산

    Args:
        prices: 종가 시계열
        span: EMA 기간 (예: 5, 12, 26, 20, 60 등)

    Returns:
        pd.Series: 같은 인덱스를 갖는 EMA 값 시계열
    """
    return prices.ewm(span=span, adjust=False).mean()


def calculate_macd(
    prices: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9
) -> pd.DataFrame:
    """
    MACD 라인, 시그널 라인, 히스토그램 계산

    Args:
        prices: 종가 시계열
        fast: 빠른 EMA 기간 (기본 12)
        slow: 느린 EMA 기간 (기본 26)
        signal: 시그널 EMA 기간 (기본 9)

    Returns:
        pd.DataFrame: 컬럼 ['macd', 'signal', 'hist']를 갖는 데이터프레임
    """
    # 빠른/느린 EMA 계산
    ema_fast = calculate_ema(prices, span=fast)
    ema_slow = calculate_ema(prices, span=slow)

    # MACD 라인
    macd_line = ema_fast - ema_slow

    # 시그널 라인 (MACD 라인의 EMA)
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()

    # 히스토그램
    hist = macd_line - signal_line

    return pd.DataFrame({
        'macd': macd_line,
        'signal': signal_line,
        'hist': hist
    })



