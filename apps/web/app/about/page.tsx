import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/pageHeader";
import { Section } from "@/components/section";
import ContactCard from "@/components/contactCard";
import { FlaskConical, Zap, BarChart3 } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      {/* Intro */}
      <Section>
        <PageHeader
          title="About XCHG LAB"
          description="A personal project to explore exchange architecture from the inside out."
        />
      </Section>

      <Separator />

      {/* The "Why" - Personal & Human */}
      <Section className="space-y-6">
        <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
          <p>
            I&apos;ve always been curious about what actually happens when you
            click &quot;Buy&quot; on a trading app. Most of us see the charts
            and the flashing prices, but the core engine that makes it all work
            is usually a black box.
          </p>
          <p>
            <strong>XCHG LAB</strong> is my personal journey to peek under that
            hood. I built this to learn the fundamentals of high-performance
            systems-like real-time order matching and live books-by building
            them from scratch rather than just using third-party APIs.
          </p>
        </div>

        <Alert className="bg-muted/50 border-none">
          <FlaskConical className="h-4 w-4" />
          <AlertDescription className="text-sm">
            This is an educational prototype. It’s a space for me to experiment
            with system design, concurrency, and real-time data.
          </AlertDescription>
        </Alert>
      </Section>

      {/* Features - Clean Grid with shadcn Cards */}
      <Section>
        <Card className="border-muted bg-card/50">
          <CardHeader>
            <CardTitle>What I&apos;ve Built</CardTitle>
            <CardDescription>The core pillars of the lab</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-background/50 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Matching Engine
                </div>
                <p className="text-sm text-muted-foreground">
                  A price-time priority engine that matches orders in memory for
                  sub-millisecond execution.
                </p>
              </div>
              <div className="p-4 rounded-xl border bg-background/50 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Live Order Book
                </div>
                <p className="text-sm text-muted-foreground">
                  Real-time market depth updates using WebSockets to stream
                  liquidity changes instantly.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="font-mono">
                Node.js
              </Badge>
              <Badge variant="secondary" className="font-mono">
                TypeScript
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Redis
              </Badge>
              <Badge variant="secondary" className="font-mono">
                PostgreSQL
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Next.js
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Express
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Tailwind
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Git
              </Badge>
              <Badge variant="secondary" className="font-mono">
                WebScoket
              </Badge>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Contact / Socials */}
      <div id="contact" className="scroll-mt-24">
        <ContactCard />
      </div>
    </main>
  );
}
