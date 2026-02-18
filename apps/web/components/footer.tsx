import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Github, Linkedin, Twitter } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      {/* Standard width wrapper */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-10 ">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            {/* <h3 className="text-lg font-semibold">XCHG LAB</h3> */}
            <Link href="/">
              <Image src="/logo.svg" alt="XCHG logo" width={170} height={60} />
            </Link>
            <p className="text-sm text-muted-foreground">
              Sharing what I learn, one project at a time. Built with curiosity,
              code, and caffeine.
            </p>
          </div>

          {/* Links */}
          <div className="lg:place-items-center">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/docs">Docs</Link>
              </li>
              <li>
                <Link href="/about#contact">Contact</Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Connect</h4>
            <div className="flex gap-4">
              <Link href="https://github.com/viveek-sh" target="_blank">
                <Github className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </Link>
              <Link
                href="https://www.linkedin.com/in/viveek-sh/"
                target="_blank">
                <Linkedin className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </Link>
              <Link href="https://x.com/viveek_sh" target="_blank">
                <Twitter className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </Link>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <span className="mt-4 text-neutral-200 text-xs flex items-center">
            Developed by{" "}
            <Link
              href="https://viveksahu.com/"
              target="_blank"
              className="font-semibold ml-1">
              Vivek
            </Link>
          </span>
          <p className="text-xs text-muted-foreground">
            © XCHG Lab - Orders matched, bugs included.
          </p>
        </div>
      </div>
    </footer>
  );
}
