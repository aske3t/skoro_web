import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-center text-3xl font-bold text-white">
        Create an account
      </h1>
      <p className="mt-2 text-center text-sm text-white/70">
        Sign up to start shipping with Skoro.
      </p>
      <div className="mt-8">
        <SignupForm />
      </div>
    </div>
  );
}
