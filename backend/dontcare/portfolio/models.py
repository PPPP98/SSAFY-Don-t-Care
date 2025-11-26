from django.db import models
from django.conf import settings


class Portfolio(models.Model):
    """
    사용자 포트폴리오 모델
    - 사용자별 보유 주식 정보와 현금 저장
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='portfolios',
        verbose_name='사용자'
    )
    stock_name = models.CharField(
        max_length=100,
        verbose_name='종목명'
    )
    stock_code = models.CharField(
        max_length=20,
        verbose_name='종목코드'
    )
    quantity = models.PositiveIntegerField(
        verbose_name='보유수량'
    )
    purchase_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='매입가'
    )
    cash_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='보유현금'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='생성일시'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='수정일시'
    )

    class Meta:
        db_table = 'portfolio'
        verbose_name = '포트폴리오'
        verbose_name_plural = '포트폴리오'
        indexes = [
            models.Index(fields=['user', 'stock_code']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.stock_name}({self.stock_code})"