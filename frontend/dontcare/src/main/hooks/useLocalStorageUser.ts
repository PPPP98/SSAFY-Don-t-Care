import { useAuthStore } from '@/auth/stores/authStore';
import type { User } from '@/main/types/main.types';
import { createDefaultAvatar } from '@/main/utils/avatarUtils';
import { useEffect, useState } from 'react';

/**
 * Custom hook to read user information from localStorage and transform it
 * to the Main User format expected by the UserProfile component
 *
 * @returns User object from localStorage or null if not available
 */
export function useLocalStorageUser(): User | null {
  const [user, setUser] = useState<User | null>(null);
  const { loadUserFromStorage } = useAuthStore();

  useEffect(() => {
    const loadUser = () => {
      try {
        const safeUserInfo = loadUserFromStorage();

        if (!safeUserInfo) {
          setUser(null);
          return;
        }

        // SafeUserInfo를 Main User 형식으로 변환
        const transformedUser: User = {
          id: safeUserInfo.email, // SafeUserInfo에서는 pk를 사용할 수 없으므로 email을 ID로 사용
          name: safeUserInfo.name,
          email: safeUserInfo.email,
          avatar: createDefaultAvatar(safeUserInfo.name),
        };

        setUser(transformedUser);
      } catch {
        // localStorage에서 사용자 로드 실패
        setUser(null);
      }
    };

    // 사용자 정보를 즉시 로드
    loadUser();

    // localStorage 변경 감지 (예: 다른 탭에서의 변경)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userInfo') {
        loadUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadUserFromStorage]);

  return user;
}
