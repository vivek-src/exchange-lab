"use client";
// import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/authProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

type ProfileMenuProps = {
  name: string;
  email: string;
};

const ProfileMenu = ({ name, email }: ProfileMenuProps) => {
  const { setUser } = useAuth();
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    setUser(null); // 🔥 instantly update navbar
    router.push("/"); // optional redirect
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex h-9 w-9 items-center justify-center border-2 border-neutral-700 rounded-full bg-muted  text-white text-sm font-semibold">
          {name?.charAt(0).toUpperCase()}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center border-2 border-neutral-700 rounded-full bg-muted  text-white text-sm font-semibold">
            {name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-1 flex-col">
            <span className="text-popover-foreground">{name}</span>
            <span className="text-muted-foreground text-xs">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>Profile</DropdownMenuItem>
          <DropdownMenuItem disabled>Wallet</DropdownMenuItem>
          <DropdownMenuItem disabled>Orders</DropdownMenuItem>
          <DropdownMenuItem disabled>Docs</DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
