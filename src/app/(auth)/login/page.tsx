import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-center text-3xl font-bold text-white">Добро пожаловать</h1>
      <p className="mt-2 text-center text-sm text-white/70">
        Все о ваших доставках в одном месте.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
