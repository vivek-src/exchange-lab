import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
export default function Navbar() {
  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="Backpack logo"
              width={170}
              height={60}
              priority
            />
          </Link>
          <div className="hidden md:flex gap-4 text-sm text-muted-foreground">
            <button>Spot</button>
            <button>Futures</button>
            <button>Lend</button>
            <button>More</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search markets"
            className="hidden md:block w-56"
          />
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button>Sign up</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
