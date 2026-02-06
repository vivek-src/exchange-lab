import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/pageHeader";
import { Section } from "@/components/section";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Intro */}
      <Section>
        <PageHeader
          title="About This Project"
          description="An experimental exchange built to understand how trading systems actually work."
        />
      </Section>

      <Separator />

      {/* Why */}
      <Section>
        <Card>
          <CardHeader>
            <CardTitle>Why this exchange exists</CardTitle>
            <CardDescription>
              Learning by building the core, not just the UI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              This project started as an attempt to understand how exchanges
              work beyond charts and APIs.
            </p>
            <p>
              Instead of relying on third-party services, the focus here is on
              building the fundamentals — order matching, order books, trade
              execution, and state management — from scratch.
            </p>
          </CardContent>
        </Card>
      </Section>

      {/* What you'll find */}
      <Section>
        <Card>
          <CardHeader>
            <CardTitle>What’s implemented here</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li>Basic order book and matching logic</li>
              <li>Limit and market order handling</li>
              <li>Trade execution and state updates</li>
              <li>Edge cases and failure scenarios</li>
            </ul>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">Order Book</Badge>
              <Badge variant="secondary">Matching Engine</Badge>
              <Badge variant="secondary">Market Orders</Badge>
              <Badge variant="secondary">Limit Orders</Badge>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Philosophy */}
      <Section>
        <Card>
          <CardHeader>
            <CardTitle>How I approach building it</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              The goal is correctness first. Performance and optimization come
              later.
            </p>
            <p>
              Every feature is built with a focus on understanding trade-offs,
              edge cases, and failure modes — especially around partial fills
              and order lifecycle management.
            </p>
            <p className="font-medium text-foreground">
              This is a learning project, not a production exchange.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Separator />

      {/* Closing */}
      <Section>
        <p className="text-sm text-muted-foreground">
          The project will evolve as the system becomes more robust. If you’re
          interested in exchange internals, feel free to explore.
        </p>
      </Section>
    </main>
  );
}
