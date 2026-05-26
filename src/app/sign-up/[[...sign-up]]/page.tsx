import { SignUp } from "@clerk/nextjs";
import Logo from "@/components/Logo";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-background">
      <div className="flex items-center gap-2 mb-6">
        <div className="size-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
          <Logo size={20} />
        </div>
        <span className="font-semibold text-lg">Jarvis AI</span>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-xl border border-border bg-surface",
          },
        }}
      />
    </div>
  );
}
