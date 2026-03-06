import dynamic from "next/dynamic";

const PricingClient = dynamic(() => import("./PricingClient"), { ssr: false });

export default function PricingPage() {
  return <PricingClient />;
}
