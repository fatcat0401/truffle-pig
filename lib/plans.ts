export const PLANS = {
    free: {
        id: "free",
        name: "Free",
        price: "A$0",
        dailyLimit: 5,
        jobsVisible: 10, // Free users only see the 10 best-matching jobs per search
        features: ["5 AI applications per day", "Top 10 job matches per search", "AI resume parsing", "AI Autofill + session replay"],
    },
    pro: {
        id: "pro",
        name: "Pro",
        price: "A$29/month",
        dailyLimit: 25,
        jobsVisible: null, // null = no limit
        features: ["25 AI applications per day", "See every matching job", "Everything in Free", "Cancel any time"],
    },
} as const;

export type PlanId = keyof typeof PLANS;

// "Today" is counted in Australian time so limits reset at local midnight.
export const USAGE_TIMEZONE = "Australia/Sydney";