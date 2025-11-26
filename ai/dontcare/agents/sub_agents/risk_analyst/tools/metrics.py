# metrics.py

"""
성과 지표 계산 모듈
- 총수익 (Total Return)
- CAGR (Compound Annual Growth Rate)
- 연환산 변동성 (Annualized Volatility)
- 최대 낙폭 (Max Drawdown)
- 샤프 지수 (Sharpe Ratio)
- 승률 (Win Rate)
"""

import math
from typing import Dict
import numpy as np
import pandas as pd

def calculate_performance_metrics(
    equity: pd.Series,
    returns: pd.Series,
    risk_free_rate: float = 0.03,
    trading_days: int = 252
) -> Dict[str, float]:
    """
    주요 성과·리스크 지표 계산

    Args:
        equity: 누적 에쿼티 커브 시계열
        returns: 일별 전략 수익률 시계열 (pct_change)
        risk_free_rate: 연 무위험 수익률 (예: 0.03)
        trading_days: 연 거래일 수 (기본 252)

    Returns:
        dict:
            total_return: 총수익률
            cagr: 연평균 복리 성장률
            vol_annual: 연환산 변동성
            max_drawdown: 최대 낙폭
            sharpe_ratio: 샤프 지수
            win_rate: 승률 (수익이 난 거래일 비율)
    """
    # 기간 계산
    days = (equity.index[-1] - equity.index[0]).days
    years = max(days / 365.25, 1e-9)

    # 총수익
    total_return = float(equity.iloc[-1] / equity.iloc[0] - 1.0)

    # CAGR
    cagr = float((equity.iloc[-1] / equity.iloc[0]) ** (1.0 / years) - 1.0)

    # 연환산 변동성
    vol_annual = float(returns.std() * math.sqrt(trading_days)) if returns.std() > 0 else float("nan")

    # 샤프 지수
    rf_daily = (1.0 + risk_free_rate) ** (1.0 / trading_days) - 1.0
    excess_rets = returns - rf_daily
    sharpe_ratio = float((excess_rets.mean() / returns.std()) * math.sqrt(trading_days)) \
        if returns.std() > 0 else float("nan")

    # 최대 낙폭
    running_max = equity.cummax()
    drawdown = equity / running_max - 1.0
    max_drawdown = float(drawdown.min())

    # 승률
    profitable = returns > 0
    win_rate = float(profitable.sum() / len(returns)) if len(returns) > 0 else float("nan")

    return {
        "total_return": total_return,
        "cagr": cagr,
        "vol_annual": vol_annual,
        "max_drawdown": max_drawdown,
        "sharpe_ratio": sharpe_ratio,
        "win_rate": win_rate
    }

