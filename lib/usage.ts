import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, USAGE_TIMEZONE, type PlanId } from "@/lib/plans";

// Today's date as YYYY-MM-DD in Australian time
export function todayKey() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: USAGE_TIMEZONE }).format(new Date());
}

export type Usage = { used: number; limit: number; remaining: number };

export async function getTodayUsage(userId: string, plan: PlanId): Promise<Usage> {
    const admin = createAdminClient();
    const { data } = await admin
        .from("daily_apply_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("usage_date", todayKey())
        .maybeSingle();

    const used = data?.count ?? 0;
    const limit = PLANS[plan].dailyLimit;
    return { used, limit, remaining: Math.max(0, limit - used) };
}

// Uses one credit. Returns false when today's limit is already reached.
export async function consumeApplyCredit(userId: string, plan: PlanId): Promise<boolean> {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("increment_daily_usage", {
        p_user_id: userId,
        p_usage_date: todayKey(),
        p_limit: PLANS[plan].dailyLimit,
    });
    if (error) throw error;
    return data === true;
}