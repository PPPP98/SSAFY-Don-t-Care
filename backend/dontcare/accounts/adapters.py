# accounts/adapters.py
from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.utils import user_email, user_field
from .utils import validate_email_format

class CustomAccountAdapter(DefaultAccountAdapter):
    def save_user(self, request, user, form, commit=True):
        """
        등록 폼에서 제공된 정보를 사용하여 새로운 `User` 인스턴스를 저장합니다.
        """
        data = form.cleaned_data
        email = data.get('email')
        name = data.get('name')

        # 이메일 형식 검증
        validate_email_format(email)
        
        user_email(user, email)
        user_field(user, 'name', name)
        
        if 'password1' in data:
            user.set_password(data["password1"])
        else:
            user.set_unusable_password()

        self.populate_username(request, user)

        # 이메일 인증 상태 설정
        if commit:
            user.save()
            user.emailaddress_set.create(
                email=user.email,
                verified=True,
                primary=True
            )

        return user
