import { useState } from 'react';

interface ToggleButtonProps {
  isSidebarOpen: boolean;
  onClick: () => void;
  showFavicon?: boolean;
  className?: string;
}

export function ToggleButton({
  isSidebarOpen,
  onClick,
  showFavicon = false,
  className = '',
}: ToggleButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  // 사이드바가 닫혀있고 favicon을 표시해야 하는 경우
  if (!isSidebarOpen && showFavicon) {
    return (
      <button
        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border-color bg-bg-tertiary text-text-secondary transition-all duration-200 hover:border-accent-primary hover:bg-bg-chat hover:text-text-primary ${className}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered ? (
          // Hover 상태일 때는 햄버거 메뉴 아이콘 표시
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        ) : (
          // 기본 상태일 때는 favicon 이미지 표시
          <img src="/DonCareLogo.png" alt="Don't Care Logo" className="h-5 w-5" />
        )}
      </button>
    );
  }

  // 일반적인 토글 버튼 (사이드바 열림/닫힘에 따른 아이콘 변경)
  return (
    <button
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border-color bg-bg-tertiary text-text-secondary transition-all duration-200 hover:border-accent-primary hover:bg-bg-chat hover:text-text-primary ${className}`}
      onClick={onClick}
    >
      {isSidebarOpen ? (
        // 사이드바가 열려있을 때: X 아이콘
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        // 사이드바가 닫혀있을 때: 햄버거 메뉴 아이콘
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )}
    </button>
  );
}
