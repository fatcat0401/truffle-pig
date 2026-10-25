import Link from "next/link";
import { ArrowRight, Bot, Check, FileText, ListChecks, Search, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

const FEATURES = [
  { icon: FileText, title: "AI resume parsing", text: "Upload a PDF or DOCX and Gemini fills your profile in seconds." },
  { icon: Search, title: "Real job scouting", text: "Fresh postings from Greenhouse, Lever, Workable and Wellfound." },
  { icon: Bot, title: "Cloud browser agent", text: "An AI agent opens the form in a cloud browser and fills it for you." },
  { icon: Sparkles, title: "AI Autofill", text: "Stuck on a tricky question? Let AI draft the answer from your profile." },
  { icon: Video, title: "Session replay", text: "Watch a replay of exactly what the agent did on every application." },
  { icon: ListChecks, title: "Application tracker", text: "See every application: queued, in progress, submitted or failed." },
];

const STEPS = [
  "Sign in with Google",
  "Upload your resume",
  "Pick jobs you like",
  "AI applies while you relax",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctaHref = user ? "/dashboard/jobs" : "/sign-in";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="size-5" />
            </span>
            Truffle Pig
          </Link>
          <Button asChild>
            <Link href={ctaHref}>{user ? "Open dashboard" : "Sign in"}</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
          <Badge variant="secondary" className="mb-6">AI job application agent</Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Apply to jobs <span className="text-primary">while you sleep</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload your resume once. Truffle Pig finds matching jobs, fills out applications in a cloud browser and
            tracks everything in one dashboard.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={ctaHref}>
                Get started free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#pricing">See pricing</a>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <CardTitle>{f.title}</CardTitle>
                  <CardDescription>{f.text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-center text-3xl font-bold">How it works</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step} className="flex flex-col items-center text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="mt-4 font-medium">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-4xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
          <p className="mt-2 text-center text-muted-foreground">Prices in Australian dollars.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {Object.values(PLANS).map((plan) => (
              <Card key={plan.id} className={plan.id === "pro" ? "border-primary shadow-lg" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {plan.id === "pro" && <Badge>Popular</Badge>}
                  </CardTitle>
                  <p className="text-3xl font-bold">{plan.price}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-4 text-primary" /> {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.id === "pro" ? "default" : "outline"} asChild>
                    <Link href={user ? "/dashboard/billing" : "/sgn-in"}>
                      {plan.id === "pro" ? "Upgrade to Pro" : "Start free"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Truffle Pig
      </footer>
    </div>
  );
}