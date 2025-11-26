#!/usr/bin/env python
"""Django의 관리 작업을 위한 명령줄 유틸리티입니다."""
import os
import sys


def main():
    """관리 작업을 실행합니다."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dontcare.settings')
    os.environ.setdefault('PGCLIENTENCODING', 'UTF8')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django를 가져올 수 없습니다. Django가 설치되어 있고 "
            "PYTHONPATH 환경 변수에서 사용 가능한지 확인하세요. "
            "가상 환경을 활성화하는 것을 잊으셨나요?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
