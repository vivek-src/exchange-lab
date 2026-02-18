import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Coins,
  GitMerge,
  LayoutDashboard,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const sections = [
  {
    icon: LayoutDashboard,
    title: "Overview",
    content: `Exchange Lab is a simulated stock exchange built to demonstrate how real-world exchanges work under the hood. 
    It is not connected to real markets and uses virtual money only. The goal is to learn by doing — place orders, 
    watch them get matched, and track your portfolio in real time.`,
  },
  {
    icon: BookOpen,
    title: "Getting Started",
    content: null,
    steps: [
      "Sign up for an account using your email and password.",
      "You will receive $10,000 in virtual balance automatically on signup.",
      "Navigate to the trading page and pick a ticker to trade.",
      "Place a buy or sell order with your desired price and quantity.",
      "Once your order is matched, it will appear in your Orders page and your wallet balance will update.",
    ],
  },
  {
    icon: GitMerge,
    title: "Orderbook & Matching Engine",
    content: `The orderbook is maintained in memory. When you place an order it is added to the orderbook 
    as either a bid (buy) or ask (sell). The matching engine continuously scans the orderbook and matches 
    orders where the buy price is greater than or equal to the sell price — this is called price-time priority matching. 
    When a match is found, both the buyer and seller have their wallets updated and the trade is recorded 
    in the transaction history. Open orders that have not yet been matched remain in the orderbook until 
    they are either filled or cancelled.`,
  },
  {
    icon: Wallet,
    title: "Virtual Balance",
    content: `Every account starts with $10,000 in virtual balance. This balance is stored in the Wallet table 
    in the database. When you buy, the trade amount is debited from your balance. When you sell, the proceeds 
    are credited back. All movements are recorded in the Transaction table so you have a full audit trail 
    of every debit and credit on your account. Your wallet balance always reflects your current available 
    funds — money tied up in open orders is not yet reflected until the order is matched.`,
  },
  {
    icon: ShieldCheck,
    title: "Authentication",
    content: `Authentication is handled by NextAuth. You can sign up manually with an email and password — 
    passwords are hashed with bcrypt before being stored. Sessions are JWT-based and all protected routes 
    are guarded by middleware so unauthenticated users are redirected to the login page automatically. 
    Email verification is stubbed out and not active in the current build.`,
  },
  {
    icon: Coins,
    title: "Tech Stack",
    content: null,
    stack: [
      { label: "Framework", value: "Next.js (App Router)" },
      { label: "Auth", value: "NextAuth" },
      { label: "Database", value: "PostgreSQL via Prisma" },
      { label: "UI", value: "shadcn/ui + Tailwind CSS" },
      { label: "Orderbook", value: "In-memory (Node.js)" },
      { label: "Matching Engine", value: "Price-time priority" },
    ],
  },
];

export function DocsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <BookOpen className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Documentation
          </h1>
          <p className="text-sm text-muted-foreground">
            How Exchange Lab works
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <section.icon className="size-4 text-muted-foreground" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              {section.content && (
                <p className="leading-relaxed">{section.content}</p>
              )}

              {section.steps && (
                <ol className="space-y-1.5 list-none">
                  {section.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="shrink-0 flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {section.stack && (
                <div className="space-y-2">
                  {section.stack.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="w-36 text-foreground font-medium">
                        {item.label}
                      </span>
                      <Badge variant="outline">{item.value}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
