import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Activity, ActivityType } from "@/lib/types";

// Writes one line into the user's activity log. Never throws: a missing log line
// must not break the real action (saving a job, applying...).
export async function logActivity(
    userId: string,
    type: ActivityType,
    message: string,
    meta: Record<string, unknown> = {},
) {
    const admin = createAdminClient();
    const { error } = await admin.from("activity_log").insert({ user_id: userId, type, message, meta });
    if (error) console.error("Could not write activity log", error.message);
}

// Latest activity for the "Recent activity" card
export async function getRecentActivity(userId: string, limit = 5): Promise<Activity[]> {
    const admin = createAdminClient();
    const { data } = await admin
        .from("activity_log")
        .select("id, type, message, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
    return (data ?? []) as Activity[];
}