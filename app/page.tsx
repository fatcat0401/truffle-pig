import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SnoutMark, Wordmark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";

const REPO_URL = "https://github.com/fatcat0401/truffle-pig";

const STEPS = [
  { title: "Upload your resume", text: "Gemini reads the PDF or DOCX and fills in your profile: skills, experience, projects." },
  { title: "Search", text: "Brave finds fresh Australian postings on LinkedIn, Greenhouse, Lever and Workable, ranked by skill match." },
  { title: "Apply", text: "For company careers pages, a robot opens the form in a cloud browser and fills in what your profile covers." },
  { title: "Answer what it asks", text: "Questions it cannot answer from your profile come back to you. Nothing is invented." },
];

const LIMITS = [
  "Never makes up an answer. Unknown questions stop the run and wait for you.",
  "Dry run by default: it fills the form but does not press Submit.",
  "Only applies on company careers pages (Greenhouse, Lever, Workable). LinkedIn, SEEK and Jora stay links you open yourself.",
  "Every run is recorded, so you can replay exactly what the browser did.",
];

// Static picture of the app: three ranked jobs and one question waiting for an answer
const PREVIEW_JOBS = [
  { title: "Data Engineer", company: "Wattle Analytics, Sydney", match: 86, dots: 4 },
  { title: "Analytics Engineer", company: "Bluegum Labs, Sydney", match: 71, dots: 4 },
  { title: "BI Developer", company: "Southern Cross Data, Melbourne", match: 43, dots: 2 },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctaHref = user ? "/dashboard/jobs" : "/sign-in";

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-soil text-soil-foreground">
        <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Wordmark className="[&_svg]:text-[#c49a7a]" />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" className="text-soil-foreground hover:bg-sidebar-accent hover:text-soil-foreground" asChild>
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </Button>
            <Button className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" asChild>
              <Link href={ctaHref}>{user ? "Open dashboard" : "Sign in"}</Link>
            </Button>
          </nav>
        </header>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20 lg:pb-28">
          <div>
            <h1 className="text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-7xl">
              A job-hunting pig that knows when to ask.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-soil-foreground/80">
              Truffle Pig is my personal AI agent for job hunting in Australia. It sniffs out matching roles, drafts
              applications in a cloud browser, and hands the hard questions back to me instead of guessing.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" asChild>
                <Link href={ctaHref}>{user ? "Open dashboard" : "Sign in"}</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-sidebar-accent bg-transparent text-soil-foreground hover:bg-sidebar-accent hover:text-soil-foreground"
                asChild
              >
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  Read the code
                </a>
              </Button>
            </div>
          </div>

          <div aria-hidden="true" className="relative">
            <div className="overflow-hidden rounded-xl border border-sidebar-accent bg-background text-foreground shadow-2xl shadow-black/40">
              <ul className="divide-y pb-8">
                {PREVIEW_JOBS.map((job, i) => (
                  <li key={job.title} className={`flex items-center gap-3 border-l-[3px] px-4 py-3.5 ${i === 0 ? "border-l-moss bg-accent" : "border-l-transparent"}`}>
                    <span className="flex size-9 items-center justify-center rounded-md bg-secondary font-heading font-semibold text-truffle">
                      {job.company.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{job.title}</span>
                      <span className="block text-sm text-muted-foreground">{job.company}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="flex gap-[3px]">
                        {Array.from({ length: 5 }).map((_, d) => (
                          <span key={d} className={`size-[7px] rounded-full ${d < job.dots ? (job.match >= 50 ? "bg-moss" : "bg-truffle/70") : "bg-border"}`} />
                        ))}
                      </span>
                      <span className={`text-sm tabular-nums ${job.match >= 50 ? "font-semibold text-moss" : "text-muted-foreground"}`}>{job.match}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative -mt-6 ml-6 rounded-xl border border-ochre/40 bg-card p-4 text-card-foreground shadow-xl shadow-black/30 sm:ml-16">
              <p className="text-sm font-medium text-ochre">Waiting for your answer</p>
              <p className="mt-1 font-medium">Do you have the right to work in Australia?</p>
              <p className="mt-1 text-sm text-muted-foreground">Your profile does not say, so the agent stopped here.</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        <section className="py-20">
          <h2 className="text-3xl font-semibold text-truffle md:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t-2 border-truffle/20 pt-4">
                <span className="font-heading text-4xl font-semibold text-moss tabular-nums">{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-10 border-t py-20 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-3xl font-semibold text-truffle md:text-4xl">What it will not do</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Real recruiters read these applications. The agent saves typing; the decisions stay with a person.
            </p>
          </div>
          <ul className="space-y-5">
            {LIMITS.map((limit) => (
              <li key={limit} className="flex gap-4">
                <SnoutMark className="mt-0.5 size-5 shrink-0 text-truffle/60" />
                <p className="text-lg leading-relaxed">{limit}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:px-6">
          <p>A personal project. Built with Next.js, Supabase, Gemini and Browserbase.</p>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
