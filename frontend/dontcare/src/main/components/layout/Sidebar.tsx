import { useMainStore } from '@/main/stores/mainStore';
import { UserProfile } from '@/main/components/layout/UserProfile';
import { ChatHistory } from '@/main/components/layout/ChatHistory';
import { ToggleButton } from '@/shared/components/ui/ToggleButton';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, onToggleSidebar }: SidebarProps) {
  const { startNewChat } = useMainStore();

  return (
    <div
      className={`relative z-50 flex w-60 flex-shrink-0 flex-col border-r border-border-color bg-bg-secondary transition-all duration-300 ${
        isCollapsed ? '-ml-60' : ''
      } max-[1200px]:hidden`}
    >
      {/* 사이드바가 열려있을 때 상단 헤더 (서비스명과 토글 버튼) */}
      {!isCollapsed && (
        <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
          {/* 서비스명 */}
          <div className="flex items-center">
            <span
              onClick={startNewChat}
              className="animate-gradient-text cursor-pointer bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-[length:200%_100%] bg-clip-text text-xl font-bold tracking-tight text-transparent transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_8px_rgba(124,58,237,0.8)] md:text-2xl"
              style={{ WebkitTextFillColor: 'transparent' }}
            >
              Don&apos;t Care
            </span>
          </div>
          {/* 토글 버튼 */}
          <ToggleButton isSidebarOpen={!isCollapsed} onClick={onToggleSidebar} />
        </div>
      )}
      {/* 사이드바 헤더 */}
      <div className="border-b border-border-color px-4 pb-4 pt-12 md:px-6 md:pb-6 md:pt-16 lg:pt-20">
        <button
          onClick={startNewChat}
          className="w-full cursor-pointer rounded-lg border-none bg-accent-gradient px-4 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-primary/30 md:px-5 md:py-3 md:text-sm"
        >
          + New Chat
        </button>
      </div>

      {/* 채팅 기록 */}
      <ChatHistory />

      {/* 사용자 프로필 섹션 */}
      <UserProfile />
    </div>
  );
}
