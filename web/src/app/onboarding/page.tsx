import dynamic from "next/dynamic";

const OnboardingClient = dynamic(() => import("./OnboardingClient"), {
  ssr: false,
});

export default function OnboardingPage() {
  return <OnboardingClient />;
}
