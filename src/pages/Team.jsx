import { useEffect, useState } from "react";
import { UsersIcon, Search, UserPlus, Shield, Activity, Mail, Clock, CheckCircle } from "lucide-react";
import InviteMemberDialog from "../components/InviteMemberDialog";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { buildApiUrl } from "../utils/api";

const Team = () => {

    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [invitations, setInvitations] = useState([]);
    const [invitationsLoading, setInvitationsLoading] = useState(true);
    const [inviteRefreshKey, setInviteRefreshKey] = useState(0);
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const projects = currentWorkspace?.projects || [];
    const users = currentWorkspace?.members || [];
    const tasks = currentWorkspace?.projects?.reduce((acc, project) => [...acc, ...(project.tasks || [])], []) || [];

    useEffect(() => {
        let cancelled = false;

        async function loadInvitations() {
            if (!isLoaded || !isSignedIn) {
                setInvitations([]);
                setInvitationsLoading(false);
                return;
            }

            setInvitationsLoading(true);
            try {
                const token = await getToken();
                if (!token || cancelled) return;
                const wId = currentWorkspace?.id || "default";
                const res = await fetch(buildApiUrl(`/api/v1/invitations?workspaceId=${encodeURIComponent(wId)}`), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok || cancelled) return;
                const json = await res.json();
                setInvitations(Array.isArray(json?.data) ? json.data : []);
            } catch (e) {
                if (!cancelled) {
                    console.error("Failed to fetch invitations", e);
                }
            } finally {
                if (!cancelled) {
                    setInvitationsLoading(false);
                }
            }
        }

        loadInvitations();
        return () => {
            cancelled = true;
        };
    }, [currentWorkspace?.id, getToken, inviteRefreshKey, isLoaded, isSignedIn]);

    const filteredUsers = users.filter(
        (user) =>
            user?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatRole = (role) => {
        const normalized = String(role || "member").toLowerCase();
        if (normalized === "admin" || normalized === "project_admin" || normalized === "org:admin") {
            return "Admin";
        }
        return "Member";
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">Team</h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">
                        Manage team members and their contributions
                    </p>
                </div>
                <button onClick={() => setIsDialogOpen(true)} className="flex items-center px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white transition" >
                    <UserPlus className="w-4 h-4 mr-2" /> Invite Member
                </button>
                <InviteMemberDialog
                    isDialogOpen={isDialogOpen}
                    setIsDialogOpen={setIsDialogOpen}
                    onSuccess={() => setInviteRefreshKey((value) => value + 1)}
                />
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
                {/* Total Members */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Members</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <UsersIcon className="size-4 text-blue-500 dark:text-blue-200" />
                        </div>
                    </div>
                </div>

                {/* Active Projects */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Active Projects</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {projects.filter((p) => p.status !== "CANCELLED" && p.status !== "COMPLETED").length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
                            <Activity className="size-4 text-emerald-500 dark:text-emerald-200" />
                        </div>
                    </div>
                </div>

                {/* Total Tasks */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Tasks</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/10">
                            <Shield className="size-4 text-purple-500 dark:text-purple-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3" />
                <input placeholder="Search team members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full text-sm rounded-md border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 py-2 focus:outline-none focus:border-blue-500" />
            </div>

            {/* Invitations */}
            <div className="w-full">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Mail className="size-5 text-gray-500 dark:text-zinc-400" />
                    Invitations
                </h2>
                {invitationsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Loading invitations...</p>
                ) : invitations.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-zinc-400">No invitations yet. Invite someone to see pending and accepted invites here.</p>
                ) : (
                    <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                            <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-medium text-sm text-gray-700 dark:text-zinc-300">Email</th>
                                    <th className="px-4 py-2.5 text-left font-medium text-sm text-gray-700 dark:text-zinc-300">Role</th>
                                    <th className="px-4 py-2.5 text-left font-medium text-sm text-gray-700 dark:text-zinc-300">Status</th>
                                    <th className="px-4 py-2.5 text-left font-medium text-sm text-gray-700 dark:text-zinc-300">Sent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                                {invitations.map((inv) => (
                                    <tr key={inv._id || inv.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                        <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">{inv.email}</td>
                                        <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-zinc-400">{inv.role === "org:admin" ? "Admin" : "Member"}</td>
                                        <td className="px-4 py-2.5">
                                            {inv.status === "pending" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                                    <Clock className="size-3.5" /> Waiting
                                                </span>
                                            ) : inv.status === "accepted" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle className="size-3.5" /> Accepted
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs rounded-md bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400">{inv.status}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-zinc-400">
                                            {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Team Members */}
            <div className="w-full">
                {filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {users.length === 0
                                ? "No team members yet"
                                : "No members match your search"}
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6">
                            {users.length === 0
                                ? "Invite team members to start collaborating"
                                : "Try adjusting your search term"}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full">
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Name
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Email
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Role
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                    {filteredUsers.map((user) => (
                                        <tr
                                            key={user.userId}
                                            className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                                        >
                                            <td className="px-6 py-2.5 whitespace-nowrap flex items-center gap-3">
                                                <img
                                                    src={user.user.image}
                                                    alt={user.user.name}
                                                    className="size-7 rounded-full bg-gray-200 dark:bg-zinc-800"
                                                />
                                                <span className="text-sm text-zinc-800 dark:text-white truncate">
                                                    {user.user?.name || "Unknown User"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                                                {user.user.email}
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs rounded-md ${formatRole(user.role) === "Admin"
                                                            ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400"
                                                            : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                                                        }`}
                                                >
                                                    {formatRole(user.role)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.userId}
                                    className="p-4 border border-gray-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <img
                                            src={user.user.image}
                                            alt={user.user.name}
                                            className="size-9 rounded-full bg-gray-200 dark:bg-zinc-800"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {user.user?.name || "Unknown User"}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                                                {user.user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <span
                                            className={`px-2 py-1 text-xs rounded-md ${formatRole(user.role) === "Admin"
                                                    ? "bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400"
                                                    : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                                                }`}
                                        >
                                            {formatRole(user.role)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
};

export default Team;
