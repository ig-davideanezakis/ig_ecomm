import { Suspense } from "react";
import LoginPageContent from "./login-content";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
