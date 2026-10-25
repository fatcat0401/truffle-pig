import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
    const { supabase, user } = await requireUser();
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    if (!profile) return <p>Profile not found.</p>;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Profile</h1>
                <p className="text-muted-foreground">Check what AI found in your resume and fill in anything missing.</p>
            </div>
            <ProfileForm profile={profile as Profile} />
        </div>
    );
}