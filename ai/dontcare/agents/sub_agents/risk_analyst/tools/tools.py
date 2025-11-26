from typing import Literal, Dict, Any, Optional
from .backtest_vectorbt import VectorBTBacktester


def run_strategy_backtest(
    ticker: str,
    strategy: Literal["ema_cross", "macd_cross", "golden_cross"],
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
    use_ema_for_golden: bool = False,
) -> Dict[str, Any]:
    """
    Execute a comprehensive backtest of trading strategies using vectorbt library.

    This function fetches historical stock data via yfinance, generates trading signals
    based on technical indicators (EMA crossover, MACD crossover, Golden/Dead cross),
    and calculates performance metrics including CAGR, volatility, max drawdown, and
    Sharpe ratio.

    Args:
        ticker (str): Stock symbol to analyze (e.g., 'AAPL', 'MSFT', 'TSLA').
        strategy (Literal["ema_cross", "macd_cross", "golden_cross"]): Trading strategy type.
            - "ema_cross": Exponential Moving Average crossover strategy
            - "macd_cross": MACD line and signal line crossover strategy  
            - "golden_cross": Moving average golden/dead cross strategy
        params (Dict[str, Any]): Strategy-specific parameters.
            - For "ema_cross": {"short": int, "long": int} (e.g., {"short": 5, "long": 20})
            - For "macd_cross": {"fast": int, "slow": int, "signal": int} (e.g., {"fast": 12, "slow": 26, "signal": 9})
            - For "golden_cross": {"short": int, "long": int} (e.g., {"short": 50, "long": 200})
        start (Optional[str]): Start date in 'YYYY-MM-DD' format. If provided with end, 
            overrides period parameter.
        end (Optional[str]): End date in 'YYYY-MM-DD' format. If provided with start,
            overrides period parameter.
        period (str): Time period for data collection when start/end not specified.
            Valid values: '1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'.
            Defaults to '3y'.
        interval (str): Data interval/frequency. Valid values: '1m', '2m', '5m', '15m', 
            '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'. Defaults to '1d'.
        init_cash (float): Initial capital for backtesting in USD. Defaults to 100,000.
        fee_bps (float): Transaction fees in basis points (1 bps = 0.01%). Defaults to 0.0.
        slippage_bps (float): Market slippage in basis points. Defaults to 0.0.
        risk_free_rate (float): Annual risk-free rate for Sharpe ratio calculation. 
            Defaults to 0.03 (3%).
        trading_days (int): Number of trading days per year for annualization. 
            Defaults to 252 (US market standard).
        use_ema_for_golden (bool): For golden_cross strategy, use EMA instead of SMA.
            Defaults to False (uses Simple Moving Average).

    Returns:
        Dict[str, Any]: Comprehensive backtest results with the following structure:
        {
            "ticker": str,                    # Stock symbol analyzed
            "strategy": str,                  # Strategy type used
            "params": Dict[str, Any],         # Strategy parameters applied
            "sample_range": {                 # Data sample information
                "start": str,                 # Start date (YYYY-MM-DD)
                "end": str,                   # End date (YYYY-MM-DD)  
                "rows": int                   # Number of data points
            },
            "signals": {
                "latest": int                 # Latest signal: 1=buy, -1=sell, 0=hold
            },
            "metrics": {                      # Performance metrics
                "total_return": float,        # Total return (e.g., 0.15 = 15%)
                "cagr": float,                # Compound Annual Growth Rate
                "vol_annual": float,          # Annualized volatility
                "max_drawdown": float,        # Maximum drawdown (negative value)
                "sharpe_ratio": float,        # Risk-adjusted return metric
                "win_rate": float            # Percentage of profitable periods
            }
        }

    Raises:
        ValueError: If strategy type is not recognized or if insufficient data is available.
        Exception: If data fetching fails or technical indicator calculation encounters errors.

    Examples:
        Basic EMA crossover strategy:
        >>> result = run_strategy_backtest(
        ...     ticker="AAPL",
        ...     strategy="ema_cross", 
        ...     params={"short": 5, "long": 20},
        ...     period="1y"
        ... )
        >>> print(f"CAGR: {result['metrics']['cagr']:.2%}")
        
        MACD strategy with specific date range:
        >>> result = run_strategy_backtest(
        ...     ticker="MSFT",
        ...     strategy="macd_cross",
        ...     params={"fast": 12, "slow": 26, "signal": 9},
        ...     start="2023-01-01",
        ...     end="2024-01-01",
        ...     fee_bps=5
        ... )
        
        Golden cross strategy with EMA:
        >>> result = run_strategy_backtest(
        ...     ticker="TSLA", 
        ...     strategy="golden_cross",
        ...     params={"short": 50, "long": 200},
        ...     period="2y",
        ...     use_ema_for_golden=True
        ... )

    Note:
        - This function requires internet connection to fetch data from Yahoo Finance
        - Performance metrics are calculated using vectorbt library's Portfolio.from_signals
        - CAGR and volatility are annualized using the trading_days parameter
        - Sharpe ratio uses the risk_free_rate for excess return calculation
        - The function handles weekends and market holidays automatically
        - For intraday intervals, ensure the period doesn't exceed data availability limits

    Technical Details:
        - EMA calculation uses pandas.ewm(span=n, adjust=False).mean()
        - MACD uses standard 12-26-9 parameters unless overridden
        - Golden cross detects moving average crossovers (bullish/bearish signals)
        - Backtest assumes long-only positions with full capital allocation
        - Transaction costs are applied on every entry/exit signal
    """
    backtester = VectorBTBacktester()
    return backtester.run_backtest(
        ticker=ticker,
        strategy=strategy,
        params=params,
        start=start,
        end=end,
        period=period,
        interval=interval,
        init_cash=init_cash,
        fee_bps=fee_bps,
        slippage_bps=slippage_bps,
        risk_free_rate=risk_free_rate,
        trading_days=trading_days,
        use_ema_for_golden=use_ema_for_golden,
    )


def get_tools():
    tools = []
    tools.append(run_strategy_backtest)
    return tools
