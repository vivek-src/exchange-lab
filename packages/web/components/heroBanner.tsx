import Link from "next/link";

import { Coins } from "lucide-react";
import { Button } from "./ui/button";

export default function HeroBanner() {
  return (
    <>
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-3 py-3 flex items-center justify-center gap-2">
          <Coins className="size-5 stroke-2 shrink-0" />
          <span className="font-medium text-sm">
            Start trading today with a <strong>$50,000</strong> virtual balance
            and coindrops available for all new members.
          </span>
        </div>
      </div>
      {/* Hero Section */}
      <div className="mt-6 rounded-xl bg-gradient-to-r from-background to-muted p-8">
        <h1 className="text-3xl font-bold">Trade on RIL</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Lend SOL to earn staking yield + lending yield, and use as collateral.
        </p>

        <Link href="/trade/RIL_INR">
          <Button className="mt-6">Trade RIL</Button>
        </Link>
      </div>
    </>
  );
}
