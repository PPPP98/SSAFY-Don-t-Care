import { PasswordResetForm } from '@/auth/components/resetPassword/PasswordResetForm';
import { AuthBackground } from '@/shared/components/AuthBackground';

export const PasswordResetPage = () => {
  return (
    <main className="relative min-h-dvh overflow-y-auto bg-black text-white">
      <AuthBackground />
      <div className="relative isolate min-h-dvh">
        <div className="relative z-10 flex min-h-dvh items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            <h1 className="sr-only">Reset your password</h1>
            <PasswordResetForm />
          </div>
        </div>
      </div>
    </main>
  );
};
