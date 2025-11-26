from django.core.management.base import BaseCommand
from stocks.utils import (
    get_cache_status,
    clear_cache,
    force_refresh_symbol,
    get_all_stock_data,
    STOCK_SYMBOLS,
    # 한국 주식 관련 imports 추가
    get_all_kr_stock_data,
    get_kr_stock_data,
    STOCK_SYMBOLS_KR,
    # ETF 관련 imports 추가
    get_multiple_etfs_parallel,
    get_etf_data,
    ETF_SYMBOLS,
    # 원자재 관련 imports 추가
    get_multiple_commodities_parallel,
    get_commodity_data,
    COMMODITY_SYMBOLS,
    # 환율 관련 imports 추가
    get_multiple_currencies_parallel,
    get_currency_data,
    CURRENCY_SYMBOLS,
    # 대시보드 관련 imports 추가
    get_dashboard_data_parallel,
)
import json


class Command(BaseCommand):
    help = "Manage stock data cache"

    def add_arguments(self, parser):
        parser.add_argument(
            "--status",
            action="store_true",
            help="Show cache status",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear all cache",
        )
        parser.add_argument(
            "--refresh",
            type=str,
            help="Force refresh specific symbol (e.g., AAPL)",
        )
        parser.add_argument(
            "--refresh-all",
            action="store_true",
            help="Force refresh all stock symbols",
        )
        parser.add_argument(
            "--test-api",
            action="store_true",
            help="Test API connectivity with rate limiting",
        )
        parser.add_argument(
            "--test-kr-api",
            action="store_true",
            help="Test Korean stock API connectivity with rate limiting",
        )
        parser.add_argument(
            "--refresh-kr",
            type=str,
            help="Force refresh specific Korean stock symbol (e.g., 005930.KS)",
        )
        parser.add_argument(
            "--refresh-all-kr",
            action="store_true",
            help="Force refresh all Korean stock symbols",
        )
        # 지수 관련 명령어
        parser.add_argument(
            "--test-us-indexes",
            action="store_true",
            help="Test US index API connectivity (NASDAQ, S&P500)",
        )
        parser.add_argument(
            "--test-kr-indexes",
            action="store_true",
            help="Test Korean index API connectivity (KOSPI, KOSDAQ)",
        )
        parser.add_argument(
            "--refresh-us-index",
            type=str,
            help="Force refresh specific US index symbol (e.g., ^IXIC, ^GSPC)",
        )
        parser.add_argument(
            "--refresh-kr-index",
            type=str,
            help="Force refresh specific Korean index symbol (e.g., ^KS11, ^KQ11)",
        )
        parser.add_argument(
            "--refresh-all-us-indexes",
            action="store_true",
            help="Force refresh all US index symbols",
        )
        parser.add_argument(
            "--refresh-all-kr-indexes",
            action="store_true",
            help="Force refresh all Korean index symbols",
        )
        # ETF 관련 명령어
        parser.add_argument(
            "--test-etfs",
            action="store_true",
            help="Test ETF API connectivity (QQQ, SPY, etc.)",
        )
        parser.add_argument(
            "--refresh-etf",
            type=str,
            help="Force refresh specific ETF symbol (e.g., QQQ, SPY)",
        )
        parser.add_argument(
            "--refresh-all-etfs",
            action="store_true",
            help="Force refresh all ETF symbols",
        )
        # 원자재 관련 명령어
        parser.add_argument(
            "--test-commodities",
            action="store_true",
            help="Test commodity API connectivity (GC=F, CL=F, etc.)",
        )
        parser.add_argument(
            "--refresh-commodity",
            type=str,
            help="Force refresh specific commodity symbol (e.g., GC=F, CL=F)",
        )
        parser.add_argument(
            "--refresh-all-commodities",
            action="store_true",
            help="Force refresh all commodity symbols",
        )
        # 환율 관련 명령어
        parser.add_argument(
            "--test-currencies",
            action="store_true",
            help="Test currency API connectivity (USDKRW=X, EURUSD=X, etc.)",
        )
        parser.add_argument(
            "--refresh-currency",
            type=str,
            help="Force refresh specific currency symbol (e.g., USDKRW=X)",
        )
        parser.add_argument(
            "--refresh-all-currencies",
            action="store_true",
            help="Force refresh all currency symbols",
        )
        # 대시보드 관련 명령어
        parser.add_argument(
            "--test-dashboard",
            action="store_true",
            help="Test dashboard parallel processing functionality",
        )
        parser.add_argument(
            "--refresh-dashboard",
            action="store_true",
            help="Force refresh dashboard data (parallel processing)",
        )

    def handle(self, *args, **options):
        if options["status"]:
            self.show_status()
        elif options["clear"]:
            self.clear_cache()
        elif options["refresh"]:
            self.refresh_symbol(options["refresh"])
        elif options["refresh_all"]:
            self.refresh_all()
        elif options["test_api"]:
            self.test_api()
        elif options["test_kr_api"]:
            self.test_kr_api()
        elif options["refresh_kr"]:
            self.refresh_kr_symbol(options["refresh_kr"])
        elif options["refresh_all_kr"]:
            self.refresh_all_kr()
        elif options["test_us_indexes"]:
            self.test_us_indexes()
        elif options["test_kr_indexes"]:
            self.test_kr_indexes()
        elif options["refresh_us_index"]:
            self.refresh_us_index(options["refresh_us_index"])
        elif options["refresh_kr_index"]:
            self.refresh_kr_index(options["refresh_kr_index"])
        elif options["refresh_all_us_indexes"]:
            self.refresh_all_us_indexes()
        elif options["refresh_all_kr_indexes"]:
            self.refresh_all_kr_indexes()
        elif options["test_etfs"]:
            self.test_etfs()
        elif options["refresh_etf"]:
            self.refresh_etf(options["refresh_etf"])
        elif options["refresh_all_etfs"]:
            self.refresh_all_etfs()
        elif options["test_commodities"]:
            self.test_commodities()
        elif options["refresh_commodity"]:
            self.refresh_commodity(options["refresh_commodity"])
        elif options["refresh_all_commodities"]:
            self.refresh_all_commodities()
        elif options["test_currencies"]:
            self.test_currencies()
        elif options["refresh_currency"]:
            self.refresh_currency(options["refresh_currency"])
        elif options["refresh_all_currencies"]:
            self.refresh_all_currencies()
        elif options["test_dashboard"]:
            self.test_dashboard()
        elif options["refresh_dashboard"]:
            self.refresh_dashboard()
        else:
            self.stdout.write(
                self.style.WARNING(
                    "No action specified. Use --help for available options."
                )
            )

    def show_status(self):
        """캐시 상태 표시"""
        self.stdout.write(self.style.SUCCESS("=== Stock Cache Status ==="))

        status = get_cache_status()

        self.stdout.write(f"Total cached items: {status['total_cached_items']}")

        if status["cache_details"]:
            self.stdout.write("\nCache Details:")
            for symbol, details in status["cache_details"].items():
                age = details["age_minutes"]
                source = details["data_source"]
                cached_at = details["cached_at"]

                color = (
                    self.style.SUCCESS
                    if age < 5
                    else self.style.WARNING if age < 10 else self.style.ERROR
                )

                self.stdout.write(
                    f"  {symbol}: {color(f'{age:.1f}min old')} | {source} | {cached_at}"
                )
        else:
            self.stdout.write("No items in cache.")

    def clear_cache(self):
        """캐시 초기화"""
        clear_cache()
        self.stdout.write(self.style.SUCCESS("Cache cleared successfully."))

    def refresh_symbol(self, symbol):
        """특정 심볼 새로고침"""
        symbol = symbol.upper()

        if symbol not in STOCK_SYMBOLS:
            self.stdout.write(self.style.ERROR(f"Unknown symbol: {symbol}"))
            self.stdout.write(f'Available symbols: {", ".join(STOCK_SYMBOLS.keys())}')
            return

        self.stdout.write(f"Refreshing {symbol}...")

        try:
            data = force_refresh_symbol(symbol)
            source = data.get("data_source", "unknown")
            price = data.get("price", 0)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully refreshed {symbol}: ${price} (source: {source})"
                )
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to refresh {symbol}: {str(e)}"))

    def refresh_all(self):
        """모든 심볼 새로고침"""
        self.stdout.write("Refreshing all stock symbols...")
        self.stdout.write(
            self.style.WARNING("This may take a while due to rate limiting.")
        )

        try:
            # 캐시 초기화
            clear_cache()

            # 모든 데이터 새로 조회
            data = get_all_stock_data()

            success_count = 0
            api_count = 0

            for item in data:
                if item.get("data_source") == "yfinance_api":
                    api_count += 1
                success_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"Refreshed {success_count} symbols "
                    f"({api_count} from API, {success_count - api_count} from defaults)"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh all symbols: {str(e)}")
            )

    def test_api(self):
        """API 연결 테스트"""
        self.stdout.write("Testing API connectivity...")

        test_symbol = "AAPL"

        try:
            # 캐시에서 해당 심볼 제거
            if test_symbol in get_cache_status()["cache_details"]:
                force_refresh_symbol(test_symbol)

            # 새로 조회
            data = force_refresh_symbol(test_symbol)

            source = data.get("data_source", "unknown")

            if source == "yfinance_api":
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ API connection successful! Retrieved real data for {test_symbol}"
                    )
                )
            elif source == "default":
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠ API connection failed. Using default data for {test_symbol}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"? Unknown data source: {source}")
                )

            # 데이터 샘플 표시
            self.stdout.write(f"Sample data: ${data.get('price', 0):.2f}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"API test failed: {str(e)}"))

    def test_kr_api(self):
        """한국 주식 API 연결 테스트"""
        self.stdout.write("Testing Korean stock API connectivity...")

        test_symbol = "005930.KS"  # 삼성전자

        try:
            # 캐시에서 해당 심볼 제거
            cache_status = get_cache_status()
            cache_key = f"kr_{test_symbol}"
            if cache_key in cache_status["cache_details"]:
                from stocks.utils import get_kr_stock_data

                get_kr_stock_data(test_symbol)

            # 새로 조회
            data = get_kr_stock_data(test_symbol)

            source = data.get("data_source", "unknown")

            if source == "yfinance_download_kr":
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Korean stock API connection successful! Retrieved real data for {test_symbol}"
                    )
                )
            elif source == "default_kr":
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠ Korean stock API connection failed. Using default data for {test_symbol}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"? Unknown Korean stock data source: {source}")
                )

            # 데이터 샘플 표시 (원화 단위)
            price = data.get("price", 0)
            self.stdout.write(f"Sample data: ₩{price:,.0f}")

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Korean stock API test failed: {str(e)}")
            )

    def refresh_kr_symbol(self, symbol):
        """특정 한국 주식 심볼 새로고침"""
        # .KS 접미사가 없으면 자동으로 추가
        if not symbol.endswith(".KS") and not symbol.endswith(".KQ"):
            symbol = f"{symbol}.KS"

        if symbol not in STOCK_SYMBOLS_KR:
            self.stdout.write(
                self.style.ERROR(f"Unknown Korean stock symbol: {symbol}")
            )
            self.stdout.write(
                f'Available Korean stock symbols: {", ".join(STOCK_SYMBOLS_KR.keys())}'
            )
            return

        self.stdout.write(f"Refreshing Korean stock {symbol}...")

        try:
            # 캐시 강제 새로고침을 위해 캐시에서 제거
            from stocks.utils import _cache, _cache_timestamps

            cache_key = f"kr_{symbol}"
            if cache_key in _cache:
                del _cache[cache_key]
            if cache_key in _cache_timestamps:
                del _cache_timestamps[cache_key]

            # 새로 조회
            data = get_kr_stock_data(symbol)
            source = data.get("data_source", "unknown")
            price = data.get("price", 0)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully refreshed Korean stock {symbol}: ₩{price:,.0f} (source: {source})"
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh Korean stock {symbol}: {str(e)}")
            )

    def refresh_all_kr(self):
        """모든 한국 주식 심볼 새로고침"""
        self.stdout.write("Refreshing all Korean stock symbols...")
        self.stdout.write(
            self.style.WARNING("This may take a while due to rate limiting.")
        )

        try:
            # 한국 주식 캐시 초기화
            from stocks.utils import _cache, _cache_timestamps

            kr_cache_keys = [key for key in _cache.keys() if key.startswith("kr_")]
            for key in kr_cache_keys:
                if key in _cache:
                    del _cache[key]
                if key in _cache_timestamps:
                    del _cache_timestamps[key]

            # 모든 한국 주식 데이터 새로 조회
            data = get_all_kr_stock_data()

            success_count = 0
            api_count = 0

            for item in data:
                if item.get("data_source") == "yfinance_download_kr":
                    api_count += 1
                success_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"Refreshed {success_count} Korean stock symbols "
                    f"({api_count} from API, {success_count - api_count} from defaults)"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f"Failed to refresh all Korean stock symbols: {str(e)}"
                )
            )

    # === 지수 관련 메서드들 ===

    def test_us_indexes(self):
        """해외 지수 API 연결 테스트"""
        self.stdout.write("Testing US index API connectivity...")

        try:
            from stocks.utils import get_all_us_indexes_data, INDEX_SYMBOLS_US

            self.stdout.write(f"Available US indexes: {list(INDEX_SYMBOLS_US.keys())}")

            data = get_all_us_indexes_data()

            if data and len(data) > 0:
                api_count = sum(
                    1 for item in data if item.get("data_source") == "yfinance"
                )
                default_count = len(data) - api_count

                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ US Index API test successful! "
                        f"Got {len(data)} indexes ({api_count} from API, {default_count} from defaults)"
                    )
                )

                # 샘플 데이터 출력
                if data:
                    sample = data[0]
                    self.stdout.write(
                        f"Sample: {sample['symbol']} - {sample['name']}: ${sample['price']}"
                    )
            else:
                self.stdout.write(self.style.WARNING("No US index data received"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"US Index API test failed: {str(e)}"))

    def test_kr_indexes(self):
        """국내 지수 API 연결 테스트"""
        self.stdout.write("Testing Korean index API connectivity...")

        try:
            from stocks.utils import get_all_kr_indexes_data, INDEX_SYMBOLS_KR

            self.stdout.write(
                f"Available Korean indexes: {list(INDEX_SYMBOLS_KR.keys())}"
            )

            data = get_all_kr_indexes_data()

            if data and len(data) > 0:
                api_count = sum(
                    1 for item in data if item.get("data_source") == "yfinance"
                )
                default_count = len(data) - api_count

                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Korean Index API test successful! "
                        f"Got {len(data)} indexes ({api_count} from API, {default_count} from defaults)"
                    )
                )

                # 샘플 데이터 출력
                if data:
                    sample = data[0]
                    self.stdout.write(
                        f"Sample: {sample['symbol']} - {sample['name']}: {sample['price']}"
                    )
            else:
                self.stdout.write(self.style.WARNING("No Korean index data received"))

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Korean Index API test failed: {str(e)}")
            )

    def refresh_us_index(self, symbol):
        """특정 해외 지수 심볼 새로고침"""
        self.stdout.write(f"Refreshing US index symbol: {symbol}")

        try:
            from stocks.utils import get_us_index_data, INDEX_SYMBOLS_US

            if symbol not in INDEX_SYMBOLS_US:
                self.stdout.write(
                    self.style.ERROR(
                        f"Invalid US index symbol: {symbol}. Available: {list(INDEX_SYMBOLS_US.keys())}"
                    )
                )
                return

            data = get_us_index_data(symbol)

            if data.get("data_source") == "yfinance":
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Refreshed {symbol}: ${data['price']}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Using default data for {symbol}")
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh US index {symbol}: {str(e)}")
            )

    def refresh_kr_index(self, symbol):
        """특정 국내 지수 심볼 새로고침"""
        self.stdout.write(f"Refreshing Korean index symbol: {symbol}")

        try:
            from stocks.utils import get_kr_index_data, INDEX_SYMBOLS_KR

            if symbol not in INDEX_SYMBOLS_KR:
                self.stdout.write(
                    self.style.ERROR(
                        f"Invalid Korean index symbol: {symbol}. Available: {list(INDEX_SYMBOLS_KR.keys())}"
                    )
                )
                return

            data = get_kr_index_data(symbol)

            if data.get("data_source") == "yfinance":
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Refreshed {symbol}: {data['price']}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Using default data for {symbol}")
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh Korean index {symbol}: {str(e)}")
            )

    def refresh_all_us_indexes(self):
        """모든 해외 지수 새로고침"""
        self.stdout.write("Refreshing all US index symbols...")

        try:
            from stocks.utils import get_all_us_indexes_data

            data = get_all_us_indexes_data()

            api_count = sum(1 for item in data if item.get("data_source") == "yfinance")
            default_count = len(data) - api_count

            self.stdout.write(
                self.style.SUCCESS(
                    f"Refreshed {len(data)} US index symbols "
                    f"({api_count} from API, {default_count} from defaults)"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh all US index symbols: {str(e)}")
            )

    def refresh_all_kr_indexes(self):
        """모든 국내 지수 새로고침"""
        self.stdout.write("Refreshing all Korean index symbols...")

        try:
            from stocks.utils import get_all_kr_indexes_data

            data = get_all_kr_indexes_data()

            api_count = sum(1 for item in data if item.get("data_source") == "yfinance")
            default_count = len(data) - api_count

            self.stdout.write(
                self.style.SUCCESS(
                    f"Refreshed {len(data)} Korean index symbols "
                    f"({api_count} from API, {default_count} from defaults)"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f"Failed to refresh all Korean index symbols: {str(e)}"
                )
            )

    # === ETF 관련 메서드들 ===

    def test_etfs(self):
        """ETF API 연결 테스트"""
        self.stdout.write("Testing ETF API connectivity...")

        try:
            self.stdout.write(f"Available ETFs: {list(ETF_SYMBOLS.keys())}")

            # 병렬 처리로 ETF 데이터 조회
            etf_symbols = list(ETF_SYMBOLS.keys())
            data = get_multiple_etfs_parallel(etf_symbols)

            if data and len(data) > 0:
                api_count = sum(
                    1 for item in data if item.get("data_source") == "yfinance_api"
                )
                default_count = len(data) - api_count

                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ ETF API test successful! "
                        f"Got {len(data)} ETFs ({api_count} from API, {default_count} from defaults)"
                    )
                )

                # 샘플 데이터 출력
                if data:
                    sample = data[0]
                    self.stdout.write(
                        f"Sample: {sample['symbol']} - {sample['name']}: ${sample['price']}"
                    )
            else:
                self.stdout.write(self.style.WARNING("No ETF data received"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ETF API test failed: {str(e)}"))

    def refresh_etf(self, symbol):
        """특정 ETF 심볼 새로고침"""
        symbol = symbol.upper()

        if symbol not in ETF_SYMBOLS:
            self.stdout.write(
                self.style.ERROR(
                    f"Invalid ETF symbol: {symbol}. Available: {list(ETF_SYMBOLS.keys())}"
                )
            )
            return

        self.stdout.write(f"Refreshing ETF symbol: {symbol}")

        try:
            data = get_etf_data(symbol)

            if data.get("data_source") == "yfinance_api":
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Refreshed {symbol}: ${data['price']}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Using default data for {symbol}")
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh ETF {symbol}: {str(e)}")
            )

    def refresh_all_etfs(self):
        """모든 ETF 새로고침"""
        self.stdout.write("Refreshing all ETF symbols...")
        self.stdout.write(
            self.style.WARNING("This may take a while due to parallel processing.")
        )

        try:
            etf_symbols = list(ETF_SYMBOLS.keys())
            data = get_multiple_etfs_parallel(etf_symbols)

            api_count = sum(
                1 for item in data if item.get("data_source") == "yfinance_api"
            )
            default_count = len(data) - api_count

            self.stdout.write(
                self.style.SUCCESS(
                    f"Refreshed {len(data)} ETF symbols "
                    f"({api_count} from API, {default_count} from defaults)"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh all ETF symbols: {str(e)}")
            )

    # === 원자재 관련 메서드들 ===

    def test_commodities(self):
        """원자재 API 연결 테스트"""
        self.stdout.write("Testing Commodity API connectivity...")

        try:
            self.stdout.write(
                f"Available Commodities: {list(COMMODITY_SYMBOLS.keys())}"
            )

            # 병렬 처리로 원자재 데이터 조회
            commodity_symbols = list(COMMODITY_SYMBOLS.keys())
            data = get_multiple_commodities_parallel(commodity_symbols)

            if data and len(data) > 0:
                api_count = sum(
                    1 for item in data if item.get("data_source") == "yfinance_api"
                )
                default_count = len(data) - api_count

                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Commodity API test successful! "
                        f"Got {len(data)} commodities ({api_count} from API, {default_count} from defaults)"
                    )
                )

                # 샘플 데이터 출력
                if data:
                    sample = data[0]
                    self.stdout.write(
                        f"Sample: {sample['symbol']} - {sample['name']}: ${sample['price']}"
                    )
            else:
                self.stdout.write(self.style.WARNING("No commodity data received"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Commodity API test failed: {str(e)}"))

    def refresh_commodity(self, symbol):
        """특정 원자재 심볼 새로고침"""
        symbol = symbol.upper()

        if symbol not in COMMODITY_SYMBOLS:
            self.stdout.write(
                self.style.ERROR(
                    f"Invalid commodity symbol: {symbol}. Available: {list(COMMODITY_SYMBOLS.keys())}"
                )
            )
            return

        self.stdout.write(f"Refreshing commodity symbol: {symbol}")

        try:
            data = get_commodity_data(symbol)

            if data.get("data_source") == "yfinance_api":
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Refreshed {symbol}: ${data['price']}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Using default data for {symbol}")
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh commodity {symbol}: {str(e)}")
            )

    def refresh_all_commodities(self):
        """모든 원자재 새로고침"""
        self.stdout.write("Refreshing all commodity symbols...")
        self.stdout.write(
            self.style.WARNING("This may take a while due to parallel processing.")
        )

        try:
            commodity_symbols = list(COMMODITY_SYMBOLS.keys())
            data = get_multiple_commodities_parallel(commodity_symbols)

            api_count = sum(
                1 for item in data if item.get("data_source") == "yfinance_api"
            )
            default_count = len(data) - api_count

            self.stdout.write(
                self.style.SUCCESS(
                    f"Refreshed {len(data)} commodity symbols "
                    f"({api_count} from API, {default_count} from defaults)"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh all commodity symbols: {str(e)}")
            )

    # === 환율 관련 메서드들 ===

    def test_currencies(self):
        """환율 API 연결 테스트"""
        self.stdout.write("Testing Currency API connectivity...")

        try:
            self.stdout.write(f"Available Currencies: {list(CURRENCY_SYMBOLS.keys())}")

            # 병렬 처리로 환율 데이터 조회
            currency_symbols = list(CURRENCY_SYMBOLS.keys())
            data = get_multiple_currencies_parallel(currency_symbols)

            if data and len(data) > 0:
                api_count = sum(
                    1 for item in data if item.get("data_source") == "yfinance_api"
                )
                default_count = len(data) - api_count

                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Currency API test successful! "
                        f"Got {len(data)} currencies ({api_count} from API, {default_count} from defaults)"
                    )
                )

                # 샘플 데이터 출력
                if data:
                    sample = data[0]
                    self.stdout.write(
                        f"Sample: {sample['symbol']} - {sample['name']}: {sample['price']}"
                    )
            else:
                self.stdout.write(self.style.WARNING("No currency data received"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Currency API test failed: {str(e)}"))

    def refresh_currency(self, symbol):
        """특정 환율 심볼 새로고침"""
        symbol = symbol.upper()

        if symbol not in CURRENCY_SYMBOLS:
            self.stdout.write(
                self.style.ERROR(
                    f"Invalid currency symbol: {symbol}. Available: {list(CURRENCY_SYMBOLS.keys())}"
                )
            )
            return

        self.stdout.write(f"Refreshing currency symbol: {symbol}")

        try:
            data = get_currency_data(symbol)

            if data.get("data_source") == "yfinance_api":
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Refreshed {symbol}: {data['price']}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Using default data for {symbol}")
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh currency {symbol}: {str(e)}")
            )

    def refresh_all_currencies(self):
        """모든 환율 새로고침"""
        self.stdout.write("Refreshing all currency symbols...")
        self.stdout.write(
            self.style.WARNING("This may take a while due to parallel processing.")
        )

        try:
            currency_symbols = list(CURRENCY_SYMBOLS.keys())
            data = get_multiple_currencies_parallel(currency_symbols)

            api_count = sum(
                1 for item in data if item.get("data_source") == "yfinance_api"
            )
            default_count = len(data) - api_count

            self.stdout.write(
                self.style.SUCCESS(
                    f"Refreshed {len(data)} currency symbols "
                    f"({api_count} from API, {default_count} from defaults)"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh all currency symbols: {str(e)}")
            )

    # === 대시보드 관련 메서드들 ===

    def test_dashboard(self):
        """대시보드 병렬 처리 테스트"""
        self.stdout.write("Testing Dashboard parallel processing...")
        self.stdout.write(
            self.style.WARNING("This will test all market data types in parallel.")
        )

        try:
            import time

            start_time = time.time()

            # 대시보드 병렬 데이터 조회
            data = get_dashboard_data_parallel()

            end_time = time.time()
            processing_time = end_time - start_time

            if data:
                # 각 카테고리별 결과 요약
                categories = [
                    "us_stocks",
                    "kr_stocks",
                    "us_indexes",
                    "kr_indexes",
                    "etfs",
                    "commodities",
                    "currencies",
                ]

                self.stdout.write(
                    self.style.SUCCESS("✓ Dashboard parallel processing successful!")
                )
                self.stdout.write(f"Processing time: {processing_time:.2f} seconds")
                self.stdout.write(
                    f"Cache status: {data.get('cache_status', 'unknown')}"
                )

                for category in categories:
                    if category in data:
                        count = (
                            len(data[category])
                            if isinstance(data[category], list)
                            else 0
                        )
                        self.stdout.write(f"  {category}: {count} items")

                self.stdout.write(
                    f"Total symbols processed: {data.get('total_symbols', 0)}"
                )
            else:
                self.stdout.write(self.style.WARNING("No dashboard data received"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Dashboard test failed: {str(e)}"))

    def refresh_dashboard(self):
        """대시보드 데이터 강제 새로고침"""
        self.stdout.write("Force refreshing dashboard data...")
        self.stdout.write(
            self.style.WARNING(
                "This will clear cache and reload all market data in parallel."
            )
        )

        try:
            # 캐시 초기화
            clear_cache()

            import time

            start_time = time.time()

            # 대시보드 병렬 데이터 조회 (캐시가 비어있으므로 새로 조회)
            data = get_dashboard_data_parallel()

            end_time = time.time()
            processing_time = end_time - start_time

            if data:
                api_count = 0
                total_count = 0

                # 각 카테고리의 API vs 기본값 개수 계산
                for category_name, category_data in data.items():
                    if isinstance(category_data, list):
                        for item in category_data:
                            total_count += 1
                            if item.get("data_source") in ["yfinance_api", "yfinance"]:
                                api_count += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Dashboard refresh completed in {processing_time:.2f} seconds"
                    )
                )
                self.stdout.write(
                    f"Refreshed {total_count} total symbols "
                    f"({api_count} from API, {total_count - api_count} from defaults)"
                )
                self.stdout.write(
                    f"Cache status: {data.get('cache_status', 'refreshed')}"
                )
            else:
                self.stdout.write(
                    self.style.WARNING("No dashboard data received after refresh")
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to refresh dashboard: {str(e)}")
            )
