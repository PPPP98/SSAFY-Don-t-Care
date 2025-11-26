from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        """
        커스텀 유저: 이메일을 고유 식별자로 사용
        비밀번호는 set_password()로 해시 저장
        """
        if not email:
            raise ValueError("이메일 필드는 필수입니다")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # 해시 저장
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    username을 제거하고 email을 고유 식별자로 사용
    """
    username = None
    email = models.EmailField("email address", unique=True)
    name = models.CharField(max_length=20)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

