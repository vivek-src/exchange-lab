"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import ProfileMenu from "@/components/profileMenu";
import { useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  const user = session?.user;

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

          <div className="hidden md:flex gap-4 text-sm text-foreground">
            <Link href="/trade" className="pointer-events-none opacity-60">
              Trade
            </Link>
            <Link
              href="/user/portfolio"
              className="pointer-events-none opacity-60">
              Portfolio
            </Link>
            <Link href="/user/wallet">Wallet</Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search markets"
            className="hidden md:block w-56"
          />

          {!user ? (
            <>
              <Link href="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <ProfileMenu name={user.name ?? ""} email={user.email ?? ""} />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
