import { WelcomeScreen } from '@/main/components/features/WelcomeScreen';
import { ChatInterface } from '@/main/components/features/ChatInterface';
import { ChatMessages } from '@/main/components/features/ChatMessages';
import { useMainStore } from '@/main/stores/mainStore';
import { ToggleButton } from '@/shared/components/ui/ToggleButton';

interface MainContentProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function MainContent({ isSidebarCollapsed, onToggleSidebar }: MainContentProps) {
  const { isFirstMessage, messages } = useMainStore();

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-bg-primary transition-all duration-300">
      {/* 사이드바가 닫혀있을 때만 토글 버튼 표시 (favicon 모드) */}
      {isSidebarCollapsed && (
        <div className="fixed left-5 top-5 z-[1000] max-[1200px]:hidden">
          <ToggleButton
            isSidebarOpen={!isSidebarCollapsed}
            onClick={onToggleSidebar}
            showFavicon={true}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4 lg:gap-5">
        {isFirstMessage ? <WelcomeScreen /> : <ChatMessages messages={messages} />}
      </div>

      <ChatInterface />
    </div>
  );
}
