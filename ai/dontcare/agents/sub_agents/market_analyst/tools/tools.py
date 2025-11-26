import yfinance as yf
import pandas as pd
import ta


def technical_analysis_for_agent(
    ticker: str, period: str = "1y", interval: str = "1d"
) -> dict:
    """
    주식의 기술적 지표를 계산하여 수치 데이터를 반환하는 함수

    Parameters:
    ticker (str): 주식 티커 심볼 (예: 'AAPL', '005930.KS')
    period (str): 데이터 기간 ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
    interval (str): 데이터 간격 ('1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo')

    Returns:
    dict: 기술적 분석 결과가 포함된 딕셔너리. 성공시와 실패시 구조가 다름:

        성공시 반환 구조:
        {
            "status": "success",                    # 실행 상태 (항상 "success")
            "ticker": str,                          # 분석한 주식 티커 심볼
            "analysis_timestamp": str,              # 분석 수행 시각 (ISO format)

            # 가격 정보
            "current_price": float,                 # 현재 주가
            "previous_price": float,                # 이전 주가 (전날 또는 이전 기간)
            "price_change": float,                  # 가격 변화량 (절대값)
            "price_change_percent": float,          # 가격 변화율 (퍼센트)

            # 이동평균선 지표
            "sma_10": float or None,                # 10일 단순이동평균
            "sma_50": float or None,                # 50일 단순이동평균
            "sma_200": float or None,               # 200일 단순이동평균

            # MACD 지표
            "macd_line": float or None,             # MACD 라인값
            "macd_signal": float or None,           # MACD 신호선값
            "macd_histogram": float or None,        # MACD 히스토그램값 (MACD - Signal)

            # RSI 지표
            "rsi": float or None,                   # RSI값 (0-100, 70이상 과매수, 30이하 과매도)

            # 볼린저밴드 지표
            "bb_upper": float or None,              # 볼린저밴드 상단선
            "bb_lower": float or None,              # 볼린저밴드 하단선
            "bb_middle": float or None,             # 볼린저밴드 중간선 (20일 이동평균)
            "bb_width": float or None,              # 볼린저밴드 폭 (상단-하단 거리)
            "bb_percent": float or None,            # 볼린저밴드 내 현재가 위치 (0-1, 0.5가 중앙)

            # 거래량 정보
            "volume": float or None,                # 최근 거래량
            "avg_volume_10d": float or None         # 10일 평균 거래량
        }

        실패시 반환 구조:
        {
            "status": "error",                      # 실행 상태 (항상 "error")
            "error_message": str                    # 오류 상세 메시지
        }

        Note:
        - 지표값이 None인 경우는 계산에 필요한 충분한 데이터가 없을 때 발생
        - RSI는 0-100 범위, 70 이상은 과매수, 30 이하는 과매도 구간
        - MACD 라인이 신호선보다 위에 있으면 상승 모멘텀, 아래면 하락 모멘텀
        - 볼린저밴드에서 현재가가 상단/하단을 벗어나면 강한 매매 신호로 해석
        - 이동평균선은 단기선이 장기선보다 위에 있으면 상승추세로 판단
    """
    try:
        # 기존 데이터 처리 코드...
        df = yf.download(
            ticker, period=period, interval=interval, auto_adjust=True, progress=False
        )

        if df.empty:
            return {
                "status": "error",
                "error_message": f"'{ticker}' 티커 데이터를 가져올 수 없습니다",
            }

        # MultiIndex 처리 및 데이터 정리...
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)

        df.reset_index(inplace=True)
        df.dropna(inplace=True)

        def ensure_1d_series(data):
            if isinstance(data, pd.DataFrame):
                return data.iloc[:, 0].squeeze()
            elif isinstance(data, pd.Series):
                return data.squeeze()
            else:
                return pd.Series(data).squeeze()

        close = ensure_1d_series(df["Close"])

        # 지표 계산...
        sma_10 = ta.trend.SMAIndicator(close, window=10).sma_indicator()
        sma_50 = ta.trend.SMAIndicator(close, window=50).sma_indicator()
        sma_200 = ta.trend.SMAIndicator(close, window=200).sma_indicator()

        macd = ta.trend.MACD(close)
        rsi = ta.momentum.RSIIndicator(close, window=14).rsi()
        bollinger = ta.volatility.BollingerBands(close, window=20, window_dev=2)

        # 현재가 정보
        current_price = float(close.iloc[-1])
        prev_price = float(close.iloc[-2]) if len(close) > 1 else current_price
        price_change = current_price - prev_price
        price_change_pct = (price_change / prev_price) * 100 if prev_price != 0 else 0

        return {
            "status": "success",
            "ticker": ticker,
            "analysis_timestamp": pd.Timestamp.now().isoformat(),
            # 가격 정보
            "current_price": current_price,
            "previous_price": prev_price,
            "price_change": price_change,
            "price_change_percent": price_change_pct,
            # 이동평균선
            "sma_10": float(sma_10.iloc[-1]) if not sma_10.empty else None,
            "sma_50": float(sma_50.iloc[-1]) if not sma_50.empty else None,
            "sma_200": float(sma_200.iloc[-1]) if not sma_200.empty else None,
            # MACD
            "macd_line": float(macd.macd().iloc[-1]) if not macd.macd().empty else None,
            "macd_signal": (
                float(macd.macd_signal().iloc[-1])
                if not macd.macd_signal().empty
                else None
            ),
            "macd_histogram": (
                float(macd.macd_diff().iloc[-1]) if not macd.macd_diff().empty else None
            ),
            # RSI
            "rsi": float(rsi.iloc[-1]) if not rsi.empty else None,
            # 볼린저밴드
            "bb_upper": (
                float(bollinger.bollinger_hband().iloc[-1])
                if not bollinger.bollinger_hband().empty
                else None
            ),
            "bb_lower": (
                float(bollinger.bollinger_lband().iloc[-1])
                if not bollinger.bollinger_lband().empty
                else None
            ),
            "bb_middle": (
                float(bollinger.bollinger_mavg().iloc[-1])
                if not bollinger.bollinger_mavg().empty
                else None
            ),
            "bb_width": (
                float(bollinger.bollinger_wband().iloc[-1])
                if not bollinger.bollinger_wband().empty
                else None
            ),
            "bb_percent": (
                float(bollinger.bollinger_pband().iloc[-1])
                if not bollinger.bollinger_pband().empty
                else None
            ),
            # 거래량 (추가 정보)
            "volume": float(df["Volume"].iloc[-1]) if "Volume" in df.columns else None,
            "avg_volume_10d": (
                float(df["Volume"].tail(10).mean()) if "Volume" in df.columns else None
            ),
        }

    except Exception as e:
        return {"status": "error", "error_message": str(e)}



def get_tools():
    tools = []
    tools.append(technical_analysis_for_agent)
    return tools