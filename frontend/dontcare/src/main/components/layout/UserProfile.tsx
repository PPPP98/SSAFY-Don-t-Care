import { useLogout } from '@/auth/hooks/useLogout';
import { useLocalStorageUser } from '@/main/hooks/useLocalStorageUser';
import { useState } from 'react';

interface UserProfileProps {
  className?: string;
}

export function UserProfile({ className = '' }: UserProfileProps) {
  const user = useLocalStorageUser();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { logout: performLogout, isLoading: isLoggingOut, error: logoutError } = useLogout();

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen((prev) => !prev);
  };

  const showMyInfo = () => {
    alert(
      `My Information: ${user?.name}\nEmail: ${user?.email}\nAccount Type: Premium\nMember Since: 2025`,
    );
    setIsProfileDropdownOpen(false);
  };

  const logout = async () => {
    try {
      await performLogout();
      setIsProfileDropdownOpen(false);
    } catch {
      // 에러는 useLogout 훅에서 처리되고 logoutError를 통해 노출됨
      // 로그아웃 실패
    }
  };

  return (
    <div
      className={`relative border-t border-border-color bg-bg-secondary p-3 md:p-4 ${className}`}
    >
      {/* 프로필 드롭다운 */}
      {isProfileDropdownOpen && (
        <div className="absolute bottom-full left-3 right-3 mb-2 rounded-lg border border-border-color bg-bg-chat p-2 shadow-xl md:left-4 md:right-4">
          <div
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-text-secondary transition-all duration-200 hover:bg-bg-tertiary hover:text-text-primary"
            onClick={showMyInfo}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            내 정보
          </div>
          <div className="my-2 h-px bg-border-color"></div>
          <div
            className={`flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-red-500 transition-all duration-200 hover:bg-bg-tertiary hover:text-red-600 ${
              isLoggingOut ? 'cursor-not-allowed opacity-50' : ''
            }`}
            onClick={isLoggingOut ? undefined : logout}
          >
            {isLoggingOut ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            )}
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </div>
          {logoutError && (
            <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {logoutError}
            </div>
          )}
        </div>
      )}

      <button
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent p-2 text-text-primary transition-all duration-200 hover:bg-bg-tertiary"
        onClick={toggleProfileDropdown}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-gradient text-xs font-semibold md:h-8 md:w-8 md:text-sm">
          {user?.avatar}
        </div>
        <div className="flex-1 text-left">
          <div className="text-xs font-semibold md:text-sm">{user?.name}</div>
          <div className="text-xs text-text-muted">{user?.email}</div>
        </div>
      </button>
    </div>
  );
}
