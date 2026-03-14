import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { buildApiUrl } from "../utils/api";

const AcceptInvitation = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [message, setMessage] = useState("Accepting invitation...");

    useEffect(() => {
        const invitationId = searchParams.get("invitationId");

        async function accept() {
            if (!invitationId) {
                setMessage("Invitation link is invalid.");
                return;
            }

            if (!isLoaded) return;
            if (!isSignedIn) {
                setMessage("Please sign in to accept this invitation.");
                return;
            }

            try {
                const token = await getToken();
                const response = await fetch(buildApiUrl(`/api/v1/invitations/${invitationId}/accept`), {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(json?.message || "Failed to accept invitation");
                }

                setMessage("Invitation accepted. Redirecting to your workspace...");
                setTimeout(() => navigate("/team"), 1200);
            } catch (error) {
                setMessage(error.message || "Failed to accept invitation.");
            }
        }

        accept();
    }, [getToken, isLoaded, isSignedIn, navigate, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-6">
            <div className="max-w-md w-full border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 bg-white dark:bg-zinc-900 text-center">
                <h1 className="text-xl font-semibold mb-3">ProjectCamp Invitation</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
            </div>
        </div>
    );
};

export default AcceptInvitation;
