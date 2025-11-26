# data_collector.py
"""
yfinance를 활용한 주식 데이터 수집 및 전처리 모듈
"""
import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class StockDataCollector:
    """주식 데이터 수집 및 전처리 클래스"""
    
    def __init__(self):
        self.cache = {}  # 단순 메모리 캐시
    
    def fetch_stock_data(
        self,
        ticker: str,
        start: Optional[str] = None,
        end: Optional[str] = None, 
        period: str = "3y",
        interval: str = "1d",
        auto_adjust: bool = True,
        validate: bool = True
    ) -> pd.DataFrame:
        """
        주식 데이터 수집
        
        Args:
            ticker: 종목 심볼 (예: 'AAPL', 'MSFT')
            start: 시작일 ('YYYY-MM-DD')
            end: 종료일 ('YYYY-MM-DD') 
            period: 기간 ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
            interval: 간격 ('1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo')
            auto_adjust: 배당/분할 조정 여부
            validate: 데이터 검증 수행 여부
            
        Returns:
            OHLCV 데이터프레임
        """
        # 캐시 키 생성
        cache_key = f"{ticker}_{start}_{end}_{period}_{interval}_{auto_adjust}"
        
        if cache_key in self.cache:
            return self.cache[cache_key].copy()

        try:
            pass
            
            # yfinance 티커 객체 생성
            stock = yf.Ticker(ticker)
            
            # 데이터 다운로드
            if start or end:
                data = stock.history(
                    start=start, 
                    end=end, 
                    interval=interval, 
                    auto_adjust=auto_adjust
                )
            else:
                data = stock.history(
                    period=period, 
                    interval=interval, 
                    auto_adjust=auto_adjust
                )
            
            if data is None or data.empty:
                raise ValueError(f"No data returned for {ticker}")
            
            # 전처리
            processed_data = self._preprocess_data(data, ticker, validate)
            
            # 캐시 저장
            self.cache[cache_key] = processed_data.copy()

            return processed_data
            
        except Exception as e:
            raise Exception(f"Failed to fetch data for {ticker}: {str(e)}")
    
    def _preprocess_data(
        self, 
        data: pd.DataFrame, 
        ticker: str, 
        validate: bool = True
    ) -> pd.DataFrame:
        """데이터 전처리"""
        
        # 컬럼명 표준화 (소문자, 공백 제거)
        data.columns = [col.lower().replace(" ", "_") for col in data.columns]
        
        # 인덱스 정렬
        data = data.sort_index()
        
        # 기본 검증
        if validate:
            self._validate_data(data, ticker)
        
        # 결측치 처리 (전진 채우기)
        numeric_columns = data.select_dtypes(include=[np.number]).columns
        data[numeric_columns] = data[numeric_columns].fillna(method='ffill')
        
        # 여전히 NaN이 있는 행 제거 (주로 첫 행들)
        data = data.dropna()
        
        # 가격 컬럼 존재 확인 및 우선순위 설정
        price_columns = ['adj_close', 'close']
        available_price_col = None
        
        for col in price_columns:
            if col in data.columns:
                available_price_col = col
                break
        
        if available_price_col is None:
            raise ValueError("No price column (close/adj_close) found")
        
        # 메타데이터 추가
        data.attrs['ticker'] = ticker
        data.attrs['primary_price_column'] = available_price_col
        data.attrs['processed_at'] = datetime.now().isoformat()
        
        return data
    
    def _validate_data(self, data: pd.DataFrame, ticker: str):
        """데이터 유효성 검증"""
        
        if len(data) < 30:
            raise ValueError(f"Insufficient data for {ticker}: {len(data)} rows (minimum 30 required)")
        
        # 필수 컬럼 확인
        required_columns = ['open', 'high', 'low', 'close', 'volume']
        missing_columns = [col for col in required_columns if col not in data.columns]
        
        if missing_columns:
            pass

        # 가격 데이터 이상치 확인
        price_cols = ['open', 'high', 'low', 'close']
        if 'adj_close' in data.columns:
            price_cols.append('adj_close')

        for col in price_cols:
            if col in data.columns:
                if (data[col] <= 0).any():
                    pass
                
                # 급격한 가격 변화 감지 (하루 50% 이상 변동)
                if len(data) > 1:
                    price_change = data[col].pct_change().abs()
                    extreme_changes = price_change > 0.5
                    if extreme_changes.any():
                        extreme_dates = data[extreme_changes].index.tolist()
                        pass
    
    def get_stock_info(self, ticker: str) -> Dict[str, Any]:
        """종목 기본 정보 조회"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            # 주요 정보만 추출
            key_info = {
                'symbol': info.get('symbol', ticker),
                'longName': info.get('longName', 'N/A'),
                'sector': info.get('sector', 'N/A'),
                'industry': info.get('industry', 'N/A'),
                'marketCap': info.get('marketCap', 0),
                'currency': info.get('currency', 'USD'),
                'exchange': info.get('exchange', 'N/A'),
                'country': info.get('country', 'N/A'),
            }
            
            return key_info
            
        except Exception as e:
            return {'symbol': ticker, 'error': str(e)}
