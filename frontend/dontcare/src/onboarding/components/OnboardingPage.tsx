import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

export function OnboardingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/main');
  };

  return (
    <div className="w-full max-w-2xl text-center">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">환영합니다</h1>
      <p className="mx-auto mb-8 mt-4 max-w-xl text-lg text-muted-foreground sm:text-xl">
        서비스를 시작하려면 아래 버튼을 클릭하세요
      </p>
      <Button
        onClick={handleStart}
        size="lg"
        className="px-8 py-4 text-lg font-semibold transition-transform duration-200 hover:scale-105"
      >
        시작하기
      </Button>
    </div>
  );
}
