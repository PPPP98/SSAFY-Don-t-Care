from rest_framework import serializers
from decimal import Decimal, InvalidOperation
import re
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Portfolio


# ─────────────────────────────────────────────────────────────────────────────
# 공통 Validation 함수들
# ─────────────────────────────────────────────────────────────────────────────

def validate_stock_name_format(stock_name):
		"""종목명 형식 검증 함수"""
		if not stock_name or not stock_name.strip():
				raise serializers.ValidationError("종목명은 필수 입력 사항입니다.")
		
		cleaned_name = stock_name.strip()
		
		if len(cleaned_name) < 2:
				raise serializers.ValidationError("종목명은 최소 2자 이상이어야 합니다.")
		
		if len(cleaned_name) > 100:
				raise serializers.ValidationError("종목명은 100자를 초과할 수 없습니다.")
		
		# 특수문자 검증 (한글, 영문, 숫자, 공백, 일부 특수문자만 허용)
		if not re.match(r'^[가-힣a-zA-Z0-9\s\-\(\)\.]+$', cleaned_name):
				raise serializers.ValidationError("종목명에 허용되지 않는 문자가 포함되어 있습니다.")
		
		return cleaned_name

def validate_stock_code_format(stock_code):
		"""종목코드 형식 검증 함수"""
		if not stock_code or not stock_code.strip():
				raise serializers.ValidationError("종목코드는 필수 입력 사항입니다.")
		
		cleaned_code = stock_code.strip().upper()
		
		# 기본 형식 검증 (3-20자의 영문 대문자와 숫자)
		if not re.match(r'^[A-Z0-9]{3,20}$', cleaned_code):
				raise serializers.ValidationError("종목코드는 3-20자의 영문 대문자와 숫자만 허용됩니다.")
		
		# 한국 주식의 경우 6자리 숫자 패턴 검증
		if re.match(r'^\d{6}$', cleaned_code):
				if cleaned_code.startswith('000'):
						raise serializers.ValidationError("유효하지 않은 종목코드 형식입니다.")
		
		return cleaned_code

def validate_positive_integer(value, field_name, max_value=None):
		"""양의 정수 검증 함수"""
		if value is None:
				raise serializers.ValidationError(f"{field_name}은(는) 필수 입력 사항입니다.")
		
		if not isinstance(value, int) or value <= 0:
				raise serializers.ValidationError(f"{field_name}은(는) 0보다 큰 정수여야 합니다.")
		
		if max_value and value > max_value:
				raise serializers.ValidationError(f"{field_name}이(가) 너무 큽니다. (최대: {max_value:,})")
		
		return value

def validate_positive_decimal(value, field_name, max_value=None, max_decimal_places=2):
		"""양의 소수 검증 함수"""
		if value is None:
				raise serializers.ValidationError(f"{field_name}은(는) 필수 입력 사항입니다.")
		
		if not isinstance(value, (int, float, Decimal)) or value < 0:
				raise serializers.ValidationError(f"{field_name}은(는) 0 이상의 숫자여야 합니다.")
		
		# Decimal로 변환
		try:
				decimal_value = Decimal(str(value))
		except (InvalidOperation, ValueError):
				raise serializers.ValidationError(f"{field_name}의 형식이 올바르지 않습니다.")
		
		# 소수점 자릿수 검증
		if decimal_value.as_tuple().exponent < -max_decimal_places:
				raise serializers.ValidationError(f"{field_name}은(는) 소수점 {max_decimal_places}자리까지만 허용됩니다.")
		
		if max_value and decimal_value > max_value:
				raise serializers.ValidationError(f"{field_name}이(가) 너무 큽니다. (최대: {max_value:,})")
		
		return decimal_value


# ─────────────────────────────────────────────────────────────────────────────
# Base Serializer 클래스들
# ─────────────────────────────────────────────────────────────────────────────

class _PortfolioBaseSerializer(serializers.ModelSerializer):
		"""포트폴리오 공통 베이스 시리얼라이저"""
		
		class Meta:
				model = Portfolio
				fields = []  # 하위 클래스에서 정의
		
		def validate_stock_name(self, value):
				"""종목명 유효성 검사"""
				return validate_stock_name_format(value)
		
		def validate_stock_code(self, value):
				"""종목코드 유효성 검사"""
				return validate_stock_code_format(value)
		
		def validate_quantity(self, value):
				"""보유수량 유효성 검사"""
				return validate_positive_integer(value, "보유수량", max_value=999999999)
		
		def validate_purchase_price(self, value):
				"""매입가 유효성 검사"""
				return validate_positive_decimal(
						value, 
						"매입가", 
						max_value=Decimal('999999999.99'),
						max_decimal_places=2
				)
		
		def validate_cash_balance(self, value):
				"""보유현금 유효성 검사"""
				return validate_positive_decimal(
						value, 
						"보유현금", 
						max_value=Decimal('9999999999999.99'),
						max_decimal_places=2
				)
		
		def validate_total_investment(self, quantity, purchase_price):
				"""총 투자액 검증"""
				try:
						total_investment = quantity * purchase_price
						if total_investment > Decimal('9999999999999.99'):
								raise serializers.ValidationError({
										'non_field_errors': [
												'총 투자액이 너무 큽니다. 수량 또는 매입가를 조정해주세요.',
												f'현재 총 투자액: {total_investment:,}원'
										]
								})
						return total_investment
				except (TypeError, InvalidOperation):
						raise serializers.ValidationError({
								'non_field_errors': ['투자액 계산 중 오류가 발생했습니다.']
						})


# ─────────────────────────────────────────────────────────────────────────────
# 구체적인 Serializer 클래스들
# ─────────────────────────────────────────────────────────────────────────────


class PortfolioSerializer(_PortfolioBaseSerializer):
		"""
		포트폴리오 기본 시리얼라이저
		"""
		user = serializers.HiddenField(default=serializers.CurrentUserDefault())
		
		class Meta:
				model = Portfolio
				fields = [
						'id',
						'user', 
						'stock_name',
						'stock_code',
						'quantity',
						'purchase_price',
						'cash_balance',
						'created_at',
						'updated_at'
				]
				read_only_fields = ['id', 'created_at', 'updated_at']

		def validate(self, attrs):
				"""전체 데이터 유효성 검사"""
				quantity = attrs.get('quantity')
				purchase_price = attrs.get('purchase_price')
				
				if quantity is not None and purchase_price is not None:
						self.validate_total_investment(quantity, purchase_price)
				
				return attrs


class PortfolioCreateSerializer(_PortfolioBaseSerializer):
		"""
		포트폴리오 생성 전용 시리얼라이저
		"""
		class Meta:
				model = Portfolio
				fields = [
						'stock_name',
						'stock_code',
						'quantity',
						'purchase_price',
						'cash_balance'
				]

		def validate(self, attrs):
				"""전체 데이터 유효성 검사"""
				quantity = attrs.get('quantity')
				purchase_price = attrs.get('purchase_price')
				
				# 총 투자액 검증
				if quantity is not None and purchase_price is not None:
						self.validate_total_investment(quantity, purchase_price)
				
				return attrs

		def create(self, validated_data):
				"""포트폴리오 생성"""
				try:
						return super().create(validated_data)
				except Exception as e:
						raise serializers.ValidationError({
								'non_field_errors': [f'포트폴리오 생성 중 오류가 발생했습니다: {str(e)}']
						})


class PortfolioListSerializer(serializers.ModelSerializer):
		"""
		포트폴리오 목록 조회용 시리얼라이저
		"""
		user_email = serializers.CharField(source='user.email', read_only=True)
		total_investment = serializers.SerializerMethodField()
		
		class Meta:
				model = Portfolio
				fields = [
						'id',
						'user_email',
						'stock_name',
						'stock_code',
						'quantity',
						'purchase_price',
						'cash_balance',
						'total_investment',
						'created_at',
						'updated_at'
				]
		
		def get_total_investment(self, obj):
				"""총 투자액 계산"""
				try:
						return float(obj.quantity * obj.purchase_price)
				except (TypeError, ValueError):
						return 0.0


class PortfolioUpdateSerializer(_PortfolioBaseSerializer):
		"""
		포트폴리오 수정 전용 시리얼라이저
		"""
		class Meta:
				model = Portfolio
				fields = [
						'stock_name',
						'stock_code',
						'quantity',
						'purchase_price',
						'cash_balance'
				]

		def validate_stock_name(self, value):
				"""종목명 유효성 검사 (수정 시에는 None 허용)"""
				if value is not None:
						return validate_stock_name_format(value)
				return value

		def validate_stock_code(self, value):
				"""종목코드 유효성 검사 (수정 시에는 None 허용)"""
				if value is not None:
						return validate_stock_code_format(value)
				return value

		def validate_quantity(self, value):
				"""보유수량 유효성 검사 (수정 시에는 None 허용)"""
				if value is not None:
						return validate_positive_integer(value, "보유수량", max_value=999999999)
				return value

		def validate_purchase_price(self, value):
				"""매입가 유효성 검사 (수정 시에는 None 허용)"""
				if value is not None:
						return validate_positive_decimal(
								value, 
								"매입가", 
								max_value=Decimal('999999999.99'),
								max_decimal_places=2
						)
				return value

		def validate_cash_balance(self, value):
				"""보유현금 유효성 검사 (수정 시에는 None 허용)"""
				if value is not None:
						return validate_positive_decimal(
								value, 
								"보유현금", 
								max_value=Decimal('9999999999999.99'),
								max_decimal_places=2
						)
				return value
		
		def validate(self, attrs):
				"""전체 데이터 유효성 검사"""
				# 기존 인스턴스의 값과 새로운 값을 합쳐서 검증
				if hasattr(self, 'instance') and self.instance:
						quantity = attrs.get('quantity', self.instance.quantity)
						purchase_price = attrs.get('purchase_price', self.instance.purchase_price)
						
						if quantity is not None and purchase_price is not None:
								self.validate_total_investment(quantity, purchase_price)
				
				return attrs

		def update(self, instance, validated_data):
				"""포트폴리오 업데이트"""
				try:
						return super().update(instance, validated_data)
				except Exception as e:
						raise serializers.ValidationError({
								'non_field_errors': [f'포트폴리오 수정 중 오류가 발생했습니다: {str(e)}']
						})


# ─────────────────────────────────────────────────────────────────────────────
# 통합 API용 Serializer 클래스들
# ─────────────────────────────────────────────────────────────────────────────

class PortfolioValidationSerializer(serializers.Serializer):
		"""포트폴리오 데이터 검증만 수행하는 시리얼라이저"""
		stock_name = serializers.CharField(max_length=100)
		stock_code = serializers.CharField(max_length=20)
		quantity = serializers.IntegerField()
		purchase_price = serializers.DecimalField(max_digits=12, decimal_places=2)
		cash_balance = serializers.DecimalField(max_digits=15, decimal_places=2)

		def validate_stock_name(self, value):
				return validate_stock_name_format(value)
		
		def validate_stock_code(self, value):
				return validate_stock_code_format(value)
		
		def validate_quantity(self, value):
				return validate_positive_integer(value, "보유수량", max_value=999999999)
		
		def validate_purchase_price(self, value):
				return validate_positive_decimal(
						value, 
						"매입가", 
						max_value=Decimal('999999999.99'),
						max_decimal_places=2
				)
		
		def validate_cash_balance(self, value):
				return validate_positive_decimal(
						value, 
						"보유현금", 
						max_value=Decimal('9999999999999.99'),
						max_decimal_places=2
				)

		def validate(self, attrs):
				"""전체 데이터 유효성 검사"""
				quantity = attrs.get('quantity')
				purchase_price = attrs.get('purchase_price')
				
				if quantity is not None and purchase_price is not None:
						try:
								total_investment = quantity * purchase_price
								if total_investment > Decimal('9999999999999.99'):
										raise serializers.ValidationError({
												'non_field_errors': [
														'총 투자액이 너무 큽니다. 수량 또는 매입가를 조정해주세요.',
														f'현재 총 투자액: {total_investment:,}원'
												]
										})
						except (TypeError, InvalidOperation):
								raise serializers.ValidationError({
										'non_field_errors': ['투자액 계산 중 오류가 발생했습니다.']
								})
				
				return attrs


class PortfolioValidateAndCreateSerializer(PortfolioValidationSerializer):
		"""
		포트폴리오 검증 후 생성하는 통합 시리얼라이저
		- 데이터 유효성 검증
		- 중복 종목 검증
		- 포트폴리오 생성
		"""
		
		def validate(self, attrs):
				"""전체 데이터 유효성 검사 + 비즈니스 로직 검증"""
				# 부모 클래스의 기본 검증 실행
				attrs = super().validate(attrs)
				
				# 현재 사용자 가져오기
				request = self.context.get('request')
				if not request or not request.user.is_authenticated:
						raise serializers.ValidationError({
								'non_field_errors': ['인증이 필요합니다.']
						})
				
				# 중복 종목 검증
				stock_code = attrs.get('stock_code')
				if Portfolio.objects.filter(user=request.user, stock_code=stock_code).exists():
						raise serializers.ValidationError({
								'stock_code': [f'이미 보유 중인 종목({stock_code})입니다.']
						})
				
				return attrs
		
		def create(self, validated_data):
				"""검증된 데이터로 포트폴리오 생성"""
				request = self.context.get('request')
				
				try:
						portfolio = Portfolio.objects.create(
								user=request.user,
								**validated_data
						)
						return portfolio
				except Exception as e:
						raise serializers.ValidationError({
								'non_field_errors': [f'포트폴리오 생성 중 오류가 발생했습니다: {str(e)}']
						})


# ─────────────────────────────────────────────────────────────────────────────
# 기타 유틸리티 Serializer 클래스들
# ─────────────────────────────────────────────────────────────────────────────

class PortfolioBulkDeleteSerializer(serializers.Serializer):
		"""여러 포트폴리오 일괄 삭제용 시리얼라이저"""
		portfolio_ids = serializers.ListField(
				child=serializers.IntegerField(min_value=1),
				min_length=1,
				max_length=100,
				help_text="삭제할 포트폴리오 ID 목록 (최대 100개)"
		)
		
		def validate_portfolio_ids(self, value):
				"""포트폴리오 ID 목록 검증"""
				# 중복 제거
				unique_ids = list(set(value))
				
				if len(unique_ids) != len(value):
						raise serializers.ValidationError("중복된 포트폴리오 ID가 있습니다.")
				
				# 현재 사용자의 포트폴리오인지 확인
				request = self.context.get('request')
				if request and request.user.is_authenticated:
						existing_count = Portfolio.objects.filter(
								id__in=unique_ids,
								user=request.user
						).count()
						
						if existing_count != len(unique_ids):
								raise serializers.ValidationError(
										"존재하지 않거나 접근 권한이 없는 포트폴리오가 포함되어 있습니다."
								)
				
				return unique_ids


class PortfolioStatsSerializer(serializers.Serializer):
		"""포트폴리오 통계 정보 시리얼라이저"""
		total_portfolios = serializers.IntegerField(read_only=True)
		total_investment = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True)
		total_cash = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True)
		total_assets = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True)
		average_investment_per_stock = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True)
		
		# 추가 통계 정보들은 필요에 따라 확장 가능
