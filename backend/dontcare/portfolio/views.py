# portfolio/views.py
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from django.shortcuts import get_object_or_404
from django.db import transaction, IntegrityError
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Sum, Count, Avg
from drf_spectacular.utils import extend_schema
import logging
from decimal import Decimal

from .models import Portfolio
from .serializers import (
    PortfolioCreateSerializer, 
    PortfolioListSerializer, 
    PortfolioUpdateSerializer
)

# 로거 설정
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# 포트폴리오 CRUD 작업 (Class-based Views)
# ─────────────────────────────────────────────────────────────────────────────

class PortfolioCreateView(generics.CreateAPIView):
    """
    POST /api/portfolio/create/
    - 새로운 포트폴리오 생성
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PortfolioCreateSerializer

    def perform_create(self, serializer):
        """중복 검사 후 포트폴리오 생성"""
        # 동일한 종목이 이미 존재하는지 확인
        existing_portfolio = Portfolio.objects.filter(
            user=self.request.user,
            stock_code=serializer.validated_data['stock_code']
        ).first()
        
        if existing_portfolio:
            logger.warning(f"중복 종목 생성 시도 - 사용자: {self.request.user.email}, 종목: {serializer.validated_data['stock_code']}")
            raise ValidationError({
                'stock_code': ['이미 보유중인 종목입니다.'],
                'message': f'이미 보유중인 종목({serializer.validated_data["stock_name"]})입니다.'
            })
        
        # 사용자 정보 추가하여 저장
        portfolio = serializer.save(user=self.request.user)
        logger.info(f"포트폴리오 생성 성공 - 사용자: {self.request.user.email}, 종목: {portfolio.stock_name}")
        return portfolio

    def create(self, request, *args, **kwargs):
        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                
                portfolio = self.perform_create(serializer)
                response_serializer = PortfolioListSerializer(portfolio)
                
                return Response({
                    'success': True,
                    'message': '포트폴리오가 성공적으로 생성되었습니다.',
                    'data': response_serializer.data
                }, status=status.HTTP_201_CREATED)
                
        except ValidationError as e:
            # 검증 오류 처리
            error_detail = e.detail if hasattr(e, 'detail') else str(e)
            if isinstance(error_detail, dict) and 'message' in error_detail:
                message = error_detail.pop('message')
                errors = error_detail
            else:
                message = '포트폴리오 생성에 실패했습니다.'
                errors = error_detail if isinstance(error_detail, dict) else {'non_field_errors': [str(error_detail)]}
            
            return Response({
                'success': False,
                'message': message,
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except IntegrityError as e:
            logger.error(f"포트폴리오 생성 중 데이터베이스 무결성 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '데이터 저장 중 오류가 발생했습니다.',
                'errors': {'non_field_errors': ['데이터베이스 제약 조건 위반']}
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"포트폴리오 생성 중 예상치 못한 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '서버 내부 오류가 발생했습니다.',
                'errors': {'non_field_errors': ['내부 서버 오류']}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PortfolioListView(generics.ListAPIView):
    """
    GET /api/portfolio/list/
    - 사용자 포트폴리오 목록 조회
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PortfolioListSerializer

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            
            logger.info(f"포트폴리오 목록 조회 - 사용자: {request.user.email}, 개수: {queryset.count()}")
            
            return Response({
                'success': True,
                'message': '포트폴리오 목록을 성공적으로 조회했습니다.',
                'data': serializer.data,
                'count': queryset.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"포트폴리오 목록 조회 중 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '포트폴리오 목록 조회 중 오류가 발생했습니다.',
                'errors': {'non_field_errors': ['내부 서버 오류']}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PortfolioDetailView(generics.RetrieveAPIView):
    """
    GET /api/portfolio/{pk}/
    - 포트폴리오 상세 조회
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PortfolioListSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            logger.info(f"포트폴리오 상세 조회 - 사용자: {request.user.email}, ID: {instance.pk}")
            
            return Response({
                'success': True,
                'message': '포트폴리오 상세 정보를 성공적으로 조회했습니다.',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Portfolio.DoesNotExist:
            logger.warning(f"존재하지 않는 포트폴리오 접근 시도 - 사용자: {request.user.email}")
            return Response({
                'success': False,
                'message': '포트폴리오를 찾을 수 없습니다.',
                'errors': {'detail': ['존재하지 않는 포트폴리오입니다.']}
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"포트폴리오 상세 조회 중 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '포트폴리오 상세 조회 중 오류가 발생했습니다.',
                'errors': {'non_field_errors': ['내부 서버 오류']}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PortfolioUpdateView(generics.UpdateAPIView):
    """
    PUT/PATCH /api/portfolio/{pk}/update/
    - 포트폴리오 수정
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PortfolioUpdateSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            
            if serializer.is_valid():
                with transaction.atomic():
                    # 종목코드가 변경되는 경우 중복 검사
                    if 'stock_code' in serializer.validated_data:
                        new_stock_code = serializer.validated_data['stock_code']
                        if new_stock_code != instance.stock_code:
                            existing_portfolio = Portfolio.objects.filter(
                                user=request.user,
                                stock_code=new_stock_code
                            ).exclude(pk=instance.pk).first()
                            
                            if existing_portfolio:
                                return Response({
                                    'success': False,
                                    'message': '이미 보유중인 종목으로 변경할 수 없습니다.',
                                    'errors': {'stock_code': ['이미 보유중인 종목입니다.']}
                                }, status=status.HTTP_400_BAD_REQUEST)
                    
                    updated_instance = serializer.save()
                    response_serializer = PortfolioListSerializer(updated_instance)
                    
                    logger.info(f"포트폴리오 수정 성공 - 사용자: {request.user.email}, ID: {instance.pk}")
                    
                    return Response({
                        'success': True,
                        'message': '포트폴리오가 성공적으로 수정되었습니다.',
                        'data': response_serializer.data
                    }, status=status.HTTP_200_OK)
            
            return Response({
                'success': False,
                'message': '포트폴리오 수정에 실패했습니다.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Portfolio.DoesNotExist:
            logger.warning(f"존재하지 않는 포트폴리오 수정 시도 - 사용자: {request.user.email}")
            return Response({
                'success': False,
                'message': '포트폴리오를 찾을 수 없습니다.',
                'errors': {'detail': ['존재하지 않는 포트폴리오입니다.']}
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"포트폴리오 수정 중 예상치 못한 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '서버 내부 오류가 발생했습니다.',
                'errors': {'non_field_errors': ['내부 서버 오류']}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PortfolioDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/portfolio/{pk}/delete/
    - 포트폴리오 삭제
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            stock_name = instance.stock_name  # 삭제 전 종목명 저장 (로깅용)
            
            with transaction.atomic():
                instance.delete()
            
            logger.info(f"포트폴리오 삭제 성공 - 사용자: {request.user.email}, 종목: {stock_name}")
            
            return Response({
                'success': True,
                'message': '포트폴리오가 성공적으로 삭제되었습니다.'
            }, status=status.HTTP_200_OK)
            
        except Portfolio.DoesNotExist:
            logger.warning(f"존재하지 않는 포트폴리오 삭제 시도 - 사용자: {request.user.email}")
            return Response({
                'success': False,
                'message': '포트폴리오를 찾을 수 없습니다.',
                'errors': {'detail': ['존재하지 않는 포트폴리오입니다.']}
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"포트폴리오 삭제 중 예상치 못한 오류: {str(e)}")
            return Response({
                'success': False,
                'message': '포트폴리오 삭제 중 오류가 발생했습니다.',
                'errors': {'non_field_errors': ['내부 서버 오류']}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# 포트폴리오 통계 및 부가 기능
# ─────────────────────────────────────────────────────────────────────────────

@extend_schema(tags=['Portfolio'])
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_portfolio_stats(request):
    """
    포트폴리오 통계 정보 조회 API
    GET /api/portfolio/stats/
    """
    try:
        portfolios = Portfolio.objects.filter(user=request.user)
        
        if not portfolios.exists():
            return Response({
                'success': True,
                'message': '포트폴리오 통계 정보를 조회했습니다.',
                'data': {
                    'total_portfolios': 0,
                    'total_investment': '0.00',
                    'total_cash': '0.00',
                    'total_assets': '0.00',
                    'average_investment_per_stock': '0.00'
                }
            }, status=status.HTTP_200_OK)
        
        # 통계 계산
        stats = portfolios.aggregate(
            total_portfolios=Count('id'),
            total_cash=Sum('cash_balance'),
            avg_investment=Avg('purchase_price')
        )
        
        # 총 투자액 계산 (각 포트폴리오별 quantity * purchase_price의 합)
        total_investment = sum(
            portfolio.quantity * portfolio.purchase_price 
            for portfolio in portfolios
        )
        
        total_assets = total_investment + (stats['total_cash'] or Decimal('0'))
        
        stats_data = {
            'total_portfolios': stats['total_portfolios'] or 0,
            'total_investment': str(total_investment),
            'total_cash': str(stats['total_cash'] or Decimal('0')),
            'total_assets': str(total_assets),
            'average_investment_per_stock': str(total_investment / stats['total_portfolios'] if stats['total_portfolios'] > 0 else Decimal('0'))
        }
        
        logger.info(f"포트폴리오 통계 조회 - 사용자: {request.user.email}")
        
        return Response({
            'success': True,
            'message': '포트폴리오 통계 정보를 성공적으로 조회했습니다.',
            'data': stats_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"포트폴리오 통계 조회 중 오류: {str(e)}")
        return Response({
            'success': False,
            'message': '포트폴리오 통계 조회 중 오류가 발생했습니다.',
            'errors': {'non_field_errors': ['내부 서버 오류']}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
