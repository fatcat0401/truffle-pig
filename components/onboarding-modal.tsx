import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeUploader } from "@/components/resume-uploader";

// A full-screen cover with no close button: the user must upload a resume first.
export function OnboardingModal() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Upload your resume to get started</CardTitle>
                    <CardDescription>
                        Truffle Pig reads your resume with AI to build your profile and find matching jobs. You can upload a
                        new one any time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResumeUploader />
                </CardContent>
            </Card>
        </div>
    );
}