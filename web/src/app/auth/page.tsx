import { Suspense } from "react";
import dynamic from "next/dynamic";

const AuthClient = dynamic(() => import("./AuthClient"), { ssr: false });

export default function AuthPage() {
  return (
    <Suspense>
      <AuthClient />
    </Suspense>
  );
}
