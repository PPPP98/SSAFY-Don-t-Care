from __future__ import annotations
from typing import Dict, Any, Optional
import vectorbt as vbt
from .data_collector import StockDataCollector
from .signals import (
    generate_ema_cross_signals,
    generate_macd_signals,
    generate_golden_cross_signals
)
from .metrics import calculate_performance_metrics  # 새로 추가

class VectorBTBacktester:
    """vectorbt 기반 전략 백테스트 클래스"""

    def __init__(self):
        self.collector = StockDataCollector()

    def run_backtest(
        self,
        ticker: str,
        strategy: str,
        params: Dict[str, Any],
        start: Optional[str] = None,
        end: Optional[str] = None,
        period: str = "3y",
        interval: str = "1d",
        init_cash: float = 100000.0,
        fee_bps: float = 0.0,
        slippage_bps: float = 0.0,
        risk_free_rate: float = 0.03,
        trading_days: int = 252,
        use_ema_for_golden: bool = False
    ) -> Dict[str, Any]:
        """
        전략 백테스트 실행 및 성과 지표 계산
        """
        # 1) 데이터 수집
        df = self.collector.fetch_stock_data(
            ticker, start=start, end=end, period=period, interval=interval
        )
        prices = df[df.attrs['primary_price_column']]

        # 2) 신호 생성
        if strategy == "ema_cross":
            entries, exits = generate_ema_cross_signals(
                prices, short=params.get("short", 5), long=params.get("long", 20)
            )
        elif strategy == "macd_cross":
            entries, exits = generate_macd_signals(
                prices,
                fast=params.get("fast", 12),
                slow=params.get("slow", 26),
                signal_period=params.get("signal", 9)
            )
        elif strategy == "golden_cross":
            entries, exits = generate_golden_cross_signals(
                prices,
                short=params.get("short", 50),
                long=params.get("long", 200),
                use_ema=use_ema_for_golden
            )
        else:
            raise ValueError(f"Unknown strategy: {strategy}")

        # 3) 백테스트 실행
        pf = vbt.Portfolio.from_signals(
            close=prices,
            entries=entries,
            exits=exits,
            init_cash=init_cash,
            fees=fee_bps / 10000,
            slippage=slippage_bps / 10000,
            freq="1D"
        )

        # 4) 지표 계산 모듈 사용
        equity = pf.value()
        daily_rets = equity.pct_change().fillna(0)
        metrics = calculate_performance_metrics(
            equity=equity,
            returns=daily_rets,
            risk_free_rate=risk_free_rate,
            trading_days=trading_days
        )

        # 5) 최신 신호
        latest_signal = int(1 if entries.iloc[-1] else (-1 if exits.iloc[-1] else 0))

        # 6) 결과 반환
        return {
            "ticker": ticker,
            "strategy": strategy,
            "params": params,
            "sample_range": {
                "start": equity.index[0].strftime("%Y-%m-%d"),
                "end": equity.index[-1].strftime("%Y-%m-%d"),
                "rows": len(equity)
            },
            "signals": {"latest": latest_signal},
            "metrics": metrics
        }

