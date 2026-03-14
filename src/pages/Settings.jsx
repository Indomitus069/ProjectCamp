import { Link } from "react-router-dom";
import { Settings as SettingsIcon, User, Briefcase, FolderOpen, ArrowRight } from "lucide-react";
import { useSelector } from "react-redux";
import { useUser } from "@clerk/clerk-react";

export default function Settings() {
    const { user } = useUser();
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const projects = currentWorkspace?.projects ?? [];

    const stats = {
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => project.status !== "COMPLETED" && project.status !== "CANCELLED").length,
        totalMembers: currentWorkspace?.members?.length || 0,
    };

    const primaryEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "Unknown";

    return (
        <div className="space-y-6 max-w-5xl mx-auto text-zinc-900 dark:text-white">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                    <SettingsIcon className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold">Settings</h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Account and workspace overview for your current session.
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-lg border p-6 bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <User className="size-4" /> Account
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400">Name</p>
                            <p>{user?.fullName || "Unknown"}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400">Email</p>
                            <p>{primaryEmail}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400">Clerk User ID</p>
                            <p className="break-all">{user?.id || "Unavailable"}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border p-6 bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Briefcase className="size-4" /> Workspace
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400">Current workspace</p>
                            <p>{currentWorkspace?.name || "My Workspace"}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400">Members</p>
                            <p>{stats.totalMembers}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400">Projects</p>
                            <p>{stats.totalProjects} total, {stats.activeProjects} active</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border p-6 bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <FolderOpen className="size-4" /> Project Settings
                </h2>
                {projects.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Create a project first, then open that project to manage status, dates, progress, and members.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {projects.slice(0, 5).map((project) => (
                            <Link
                                key={project.id}
                                to={`/projectsDetail?id=${project.id}&tab=settings`}
                                className="flex items-center justify-between rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
                            >
                                <div>
                                    <p className="font-medium">{project.name}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {project.status?.replace("_", " ")}
                                    </p>
                                </div>
                                <ArrowRight className="size-4 text-zinc-500 dark:text-zinc-400" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
