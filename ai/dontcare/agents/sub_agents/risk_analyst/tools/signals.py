# signals.py

"""
신호 생성 모듈
- EMA 크로스
- MACD 크로스
- 골든/데드 크로스 (SMA 또는 EMA)
"""

import pandas as pd
from .indicators import calculate_ema, calculate_macd

def generate_ema_cross_signals(
    prices: pd.Series,
    short: int = 5,
    long: int = 20
) -> tuple[pd.Series, pd.Series]:
    """
    EMA 크로스오버 신호 생성

    Args:
        prices: 종가 시계열
        short: 단기 EMA 기간
        long: 장기 EMA 기간

    Returns:
        entries: 진입 시그널(Boolean Series)
        exits: 청산 시그널(Boolean Series)
    """
    ema_short = calculate_ema(prices, span=short)
    ema_long = calculate_ema(prices, span=long)
    
    prev_above = ema_short.shift(1) > ema_long.shift(1)
    now_above  = ema_short > ema_long
    
    entries = (~prev_above) & now_above
    exits   = prev_above & (~now_above)
    
    return entries.fillna(False), exits.fillna(False)


def generate_macd_signals(
    prices: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9
) -> tuple[pd.Series, pd.Series]:
    """
    MACD 크로스오버 신호 생성

    Args:
        prices: 종가 시계열
        fast: 빠른 EMA 기간
        slow: 느린 EMA 기간
        signal_period: 시그널 EMA 기간

    Returns:
        entries: 진입 시그널(Boolean Series)
        exits: 청산 시그널(Boolean Series)
    """
    macd_df = calculate_macd(prices, fast=fast, slow=slow, signal=signal_period)
    macd_line = macd_df['macd']
    signal_line = macd_df['signal']
    
    prev_above = macd_line.shift(1) > signal_line.shift(1)
    now_above  = macd_line > signal_line
    
    entries = (~prev_above) & now_above
    exits   = prev_above & (~now_above)
    
    return entries.fillna(False), exits.fillna(False)


def generate_golden_cross_signals(
    prices: pd.Series,
    short: int = 50,
    long: int = 200,
    use_ema: bool = False
) -> tuple[pd.Series, pd.Series]:
    """
    골든/데드 크로스 신호 생성
    단기선이 장기선 상향 돌파 → 진입, 하향 이탈 → 청산

    Args:
        prices: 종가 시계열
        short: 단기 이동평균 기간
        long: 장기 이동평균 기간
        use_ema: True면 EMA, False면 SMA 사용

    Returns:
        entries: 진입 시그널(Boolean Series)
        exits: 청산 시그널(Boolean Series)
    """
    if use_ema:
        short_ma = calculate_ema(prices, span=short)
        long_ma  = calculate_ema(prices, span=long)
    else:
        short_ma = prices.rolling(window=short).mean()
        long_ma  = prices.rolling(window=long).mean()
    
    # 동일 인덱스 보장
    idx = short_ma.dropna().index.intersection(long_ma.dropna().index)
    s = short_ma.loc[idx]
    l = long_ma.loc[idx]
    
    prev_above = s.shift(1) > l.shift(1)
    now_above  = s > l
    
    entries = (~prev_above) & now_above
    exits   = prev_above & (~now_above)
    
    # 원본 인덱스로 재정렬
    entries_full = pd.Series(False, index=prices.index)
    exits_full   = pd.Series(False, index=prices.index)
    entries_full.loc[idx] = entries.fillna(False)
    exits_full.loc[idx]   = exits.fillna(False)
    
    return entries_full, exits_full

