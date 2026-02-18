"use client";

import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

type ProfileMenuProps = {
  name: string;
  email: string;
};

const Avatar = ({ name }: { name: string }) => (
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-neutral-700 bg-muted text-sm font-semibold text-white">
    {name?.charAt(0).toUpperCase()}
  </div>
);

const ProfileMenu = ({ name, email }: ProfileMenuProps) => {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar name={name} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Avatar name={name} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-popover-foreground">{name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/user">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/wallet">Wallet</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/orders">Orders</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/docs">Docs</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-500 focus:text-red-500 ">
            Log Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
