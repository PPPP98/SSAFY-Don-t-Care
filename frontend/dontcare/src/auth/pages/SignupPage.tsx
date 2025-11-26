import { SignupForm } from '@/auth/components/signup/SignupForm';
import { AuthBackground } from '@/shared/components/AuthBackground';

export const SignupPage = () => {
  return (
    <main className="relative min-h-dvh overflow-y-auto bg-black text-white">
      <AuthBackground />
      <div className="relative isolate min-h-dvh">
        <div className="relative z-10 flex min-h-dvh items-center justify-center p-4 sm:p-6">
          <SignupForm />
        </div>
      </div>
    </main>
  );
};
