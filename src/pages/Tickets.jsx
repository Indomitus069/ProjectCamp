import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { AlertTriangle, KanbanIcon, Loader2Icon, Plus, Save, Search, Trash } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import CreateTicketDialog from "../components/CreateTicketDialog";
import { buildApiUrl } from "../utils/api";
import { normalizeTicket } from "../utils/normalize";

const statusColumns = [
    { key: "OPEN", label: "Open" },
    { key: "IN_PROGRESS", label: "In Progress" },
    { key: "RESOLVED", label: "Resolved" },
    { key: "CLOSED", label: "Closed" },
];

const priorityOptions = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"];
const categoryOptions = ["ALL", "BUG", "FEATURE_REQUEST", "SUPPORT", "INCIDENT", "OTHER"];

const statusStyles = {
    OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    CLOSED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
};

const priorityStyles = {
    LOW: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    URGENT: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const formatLabel = (value) =>
    String(value || "")
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

const createEditForm = (ticket) => ({
    title: ticket?.title || "",
    description: ticket?.description || "",
    status: ticket?.status || "OPEN",
    priority: ticket?.priority || "MEDIUM",
    category: ticket?.category || "SUPPORT",
    assigneeId: ticket?.assigneeId || "",
    requesterName: ticket?.requesterName || "",
    requesterEmail: ticket?.requesterEmail || "",
});

const getProjectMembers = (project) =>
    (project?.members || [])
        .map((member) => ({
            id: member?.user?.id || member?.userId || "",
            name: member?.user?.name || member?.user?.email || "Unknown user",
            email: member?.user?.email || "",
        }))
        .filter((member) => member.id);

const normalizeComment = (comment) => {
    const id = comment?._id ?? comment?.id;
    if (!id) return null;

    return {
        id: String(id),
        content: comment.content != null ? String(comment.content) : "",
        createdAt: comment.createdAt ?? null,
        user: comment.user ? {
            id: comment.user.id != null ? String(comment.user.id) : "",
            name: comment.user.name != null ? String(comment.user.name) : "Unknown",
        } : null,
    };
};

export default function Tickets() {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const currentWorkspace = useSelector((state) => state?.workspace?.currentWorkspace || null);
    const projects = useMemo(() => currentWorkspace?.projects ?? [], [currentWorkspace?.projects]);

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({ projectId: "ALL", priority: "ALL", category: "ALL" });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState(createEditForm(null));
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentDraft, setCommentDraft] = useState("");
    const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

    const projectsById = useMemo(
        () => new Map(projects.map((project) => [project.id, project])),
        [projects]
    );

    const selectedTicket = useMemo(
        () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
        [selectedTicketId, tickets]
    );

    const filteredTickets = useMemo(() => tickets.filter((ticket) => {
        const matchesSearch = !searchTerm || [ticket.ticketNumber, ticket.title, ticket.description, ticket.requesterName, ticket.requesterEmail]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesProject = filters.projectId === "ALL" || ticket.projectId === filters.projectId;
        const matchesPriority = filters.priority === "ALL" || ticket.priority === filters.priority;
        const matchesCategory = filters.category === "ALL" || ticket.category === filters.category;
        return matchesSearch && matchesProject && matchesPriority && matchesCategory;
    }), [filters, searchTerm, tickets]);

    const groupedTickets = useMemo(() => {
        const groups = { OPEN: [], IN_PROGRESS: [], RESOLVED: [], CLOSED: [] };
        filteredTickets.forEach((ticket) => {
            const bucket = groups[ticket.status] || groups.OPEN;
            bucket.push(ticket);
        });
        return groups;
    }, [filteredTickets]);

    const selectedProject = selectedTicket ? projectsById.get(selectedTicket.projectId) || null : null;
    const selectedProjectMembers = useMemo(() => getProjectMembers(selectedProject), [selectedProject]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        let cancelled = false;

        async function loadTickets() {
            setLoading(true);
            try {
                const token = await getToken();
                if (!token || cancelled) return;
                const response = await fetch(buildApiUrl("/api/v1/tickets"), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(json?.message || "Failed to load tickets");
                }
                if (!cancelled) {
                    const list = Array.isArray(json?.data) ? json.data.map(normalizeTicket).filter(Boolean) : [];
                    setTickets(list);
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error(error?.message || "Failed to load tickets");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadTickets();

        return () => {
            cancelled = true;
        };
    }, [getToken, isLoaded, isSignedIn]);

    useEffect(() => {
        if (!tickets.length) {
            setSelectedTicketId("");
            return;
        }
        if (!selectedTicketId || !tickets.some((ticket) => ticket.id === selectedTicketId)) {
            setSelectedTicketId(tickets[0].id);
        }
    }, [selectedTicketId, tickets]);

    useEffect(() => {
        setEditForm(createEditForm(selectedTicket));
    }, [selectedTicket]);

    useEffect(() => {
        if (!selectedTicket || !isLoaded || !isSignedIn) {
            setComments([]);
            return;
        }

        let cancelled = false;

        async function loadComments() {
            setCommentsLoading(true);
            try {
                const token = await getToken();
                if (!token || cancelled) return;
                const response = await fetch(buildApiUrl(`/api/v1/tickets/${selectedTicket.id}/comments`), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(json?.message || "Failed to load comments");
                }
                if (!cancelled) {
                    const list = Array.isArray(json?.data) ? json.data.map(normalizeComment).filter(Boolean) : [];
                    setComments(list);
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error(error?.message || "Failed to load comments");
                }
            } finally {
                if (!cancelled) {
                    setCommentsLoading(false);
                }
            }
        }

        loadComments();

        return () => {
            cancelled = true;
        };
    }, [getToken, isLoaded, isSignedIn, selectedTicket]);

    const handleCreatedTicket = (ticket) => {
        if (!ticket) return;
        setTickets((current) => [ticket, ...current]);
        setSelectedTicketId(ticket.id);
        setIsDialogOpen(false);
    };

    const handleSaveTicket = async () => {
        if (!selectedTicket) return;
        if (!editForm.title.trim()) {
            toast.error("Ticket title is required");
            return;
        }

        try {
            setIsSaving(true);
            const token = await getToken();
            const response = await fetch(buildApiUrl(`/api/v1/tickets/${selectedTicket.id}`), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: editForm.title.trim(),
                    description: editForm.description.trim(),
                    status: editForm.status.toLowerCase(),
                    priority: editForm.priority.toLowerCase(),
                    category: editForm.category.toLowerCase(),
                    assigneeId: editForm.assigneeId || "",
                    requesterName: editForm.requesterName.trim(),
                    requesterEmail: editForm.requesterEmail.trim(),
                }),
            });
            const json = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(json?.message || "Failed to update ticket");
            }
            const updated = normalizeTicket(json?.data);
            if (!updated) {
                throw new Error("Updated ticket could not be parsed");
            }
            setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
            toast.success("Ticket updated");
        } catch (error) {
            toast.error(error?.message || "Failed to update ticket");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTicket = async () => {
        if (!selectedTicket) return;
        if (!window.confirm(`Delete ${selectedTicket.ticketNumber || selectedTicket.title}?`)) return;

        try {
            setIsDeleting(true);
            const token = await getToken();
            const response = await fetch(buildApiUrl(`/api/v1/tickets/${selectedTicket.id}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(json?.message || "Failed to delete ticket");
            }
            setTickets((current) => current.filter((ticket) => ticket.id !== selectedTicket.id));
            setComments([]);
            toast.success("Ticket deleted");
        } catch (error) {
            toast.error(error?.message || "Failed to delete ticket");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAddComment = async (event) => {
        event.preventDefault();
        if (!selectedTicket) return;
        if (!commentDraft.trim()) {
            toast.error("Write a comment first");
            return;
        }

        try {
            setIsCommentSubmitting(true);
            const token = await getToken();
            const response = await fetch(buildApiUrl(`/api/v1/tickets/${selectedTicket.id}/comments`), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content: commentDraft.trim() }),
            });
            const json = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(json?.message || "Failed to add comment");
            }
            const created = normalizeComment(json?.data);
            if (created) {
                setComments((current) => [...current, created]);
            }
            setCommentDraft("");
            toast.success("Comment added");
        } catch (error) {
            toast.error(error?.message || "Failed to add comment");
        } finally {
            setIsCommentSubmitting(false);
        }
    };

    if (!projects.length) {
        return (
            <div className="mx-auto max-w-4xl rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/10">
                    <KanbanIcon className="size-8 text-blue-600 dark:text-blue-300" />
                </div>
                <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-white">Create a project before opening tickets</h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    This board is project-linked, so tickets inherit the right members, assignees, and permissions automatically.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-white sm:text-2xl">Tickets</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Jira-style issue tracking for bugs, requests, incidents, and support work.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className="inline-flex items-center rounded bg-gradient-to-br from-blue-500 to-blue-600 px-5 py-2 text-sm text-white hover:opacity-90"
                >
                    <Plus className="mr-2 size-4" />
                    New Ticket
                </button>
            </div>

            <CreateTicketDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                projects={projects}
                onCreated={handleCreatedTicket}
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
                <section className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex flex-col gap-4 lg:flex-row">
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search by issue key, title, requester..."
                                    className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <select
                                    value={filters.projectId}
                                    onChange={(event) => setFilters((current) => ({ ...current, projectId: event.target.value }))}
                                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                >
                                    <option value="ALL">All Projects</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filters.priority}
                                    onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
                                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                >
                                    {priorityOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option === "ALL" ? "All Priorities" : formatLabel(option)}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filters.category}
                                    onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                >
                                    {categoryOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option === "ALL" ? "All Categories" : formatLabel(option)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-16 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                            <Loader2Icon className="size-5 animate-spin" />
                            Loading board...
                        </div>
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-4">
                            {statusColumns.map((column) => (
                                <div key={column.key} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                                    <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{column.label}</h2>
                                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                            {groupedTickets[column.key].length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 p-3">
                                        {groupedTickets[column.key].length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                                Nothing here
                                            </div>
                                        ) : groupedTickets[column.key].map((ticket) => {
                                            const project = projectsById.get(ticket.projectId);
                                            const isActive = ticket.id === selectedTicketId;
                                            return (
                                                <button
                                                    key={ticket.id}
                                                    type="button"
                                                    onClick={() => setSelectedTicketId(ticket.id)}
                                                    className={`w-full rounded-lg border p-3 text-left transition ${isActive ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/60"}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                                                                {ticket.ticketNumber}
                                                            </p>
                                                            <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-white">
                                                                {ticket.title}
                                                            </h3>
                                                        </div>
                                                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${priorityStyles[ticket.priority] || priorityStyles.MEDIUM}`}>
                                                            {formatLabel(ticket.priority)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                        {ticket.description || "No description yet."}
                                                    </p>
                                                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                        <span className="truncate">{project?.name || "Unknown project"}</span>
                                                        <span className="truncate">{ticket.assignee?.name || "Unassigned"}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                        {!selectedTicket ? (
                            <div className="py-12 text-center">
                                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <KanbanIcon className="size-7 text-zinc-500 dark:text-zinc-400" />
                                </div>
                                <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">Select a ticket</h2>
                                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                    Pick an issue card to edit it and continue the discussion.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                                            {selectedTicket.ticketNumber}
                                        </p>
                                        <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">
                                            {selectedTicket.title}
                                        </h2>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[selectedTicket.status] || statusStyles.OPEN}`}>
                                                {formatLabel(selectedTicket.status)}
                                            </span>
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${priorityStyles[selectedTicket.priority] || priorityStyles.MEDIUM}`}>
                                                {formatLabel(selectedTicket.priority)}
                                            </span>
                                            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                {formatLabel(selectedTicket.category)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleDeleteTicket}
                                        disabled={isDeleting}
                                        className="inline-flex items-center rounded border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                                    >
                                        <Trash className="mr-2 size-4" />
                                        {isDeleting ? "Deleting..." : "Delete"}
                                    </button>
                                </div>

                                <div className="mt-6 space-y-4">
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                                        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                        placeholder="Issue title"
                                    />
                                    <textarea
                                        value={editForm.description}
                                        onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                                        className="h-28 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                        placeholder="Describe the issue"
                                    />

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <select
                                            value={editForm.status}
                                            onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                                            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                        >
                                            {statusColumns.map((column) => (
                                                <option key={column.key} value={column.key}>{column.label}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={editForm.priority}
                                            onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value }))}
                                            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                        >
                                            {priorityOptions.filter((option) => option !== "ALL").map((option) => (
                                                <option key={option} value={option}>{formatLabel(option)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <select
                                            value={editForm.category}
                                            onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))}
                                            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                        >
                                            {categoryOptions.filter((option) => option !== "ALL").map((option) => (
                                                <option key={option} value={option}>{formatLabel(option)}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={editForm.assigneeId}
                                            onChange={(event) => setEditForm((current) => ({ ...current, assigneeId: event.target.value }))}
                                            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                        >
                                            <option value="">Unassigned</option>
                                            {selectedProjectMembers.map((member) => (
                                                <option key={member.id} value={member.id}>
                                                    {member.name}{member.email ? ` (${member.email})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <input
                                            type="text"
                                            value={editForm.requesterName}
                                            onChange={(event) => setEditForm((current) => ({ ...current, requesterName: event.target.value }))}
                                            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                            placeholder="Requester name"
                                        />
                                        <input
                                            type="email"
                                            value={editForm.requesterEmail}
                                            onChange={(event) => setEditForm((current) => ({ ...current, requesterEmail: event.target.value }))}
                                            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                            placeholder="Requester email"
                                        />
                                    </div>

                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                                        <div className="flex items-center justify-between gap-3">
                                            <span>Project</span>
                                            <span className="font-medium">{selectedProject?.name || "Unknown project"}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveTicket}
                                            disabled={isSaving}
                                            className="inline-flex items-center rounded bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                                        >
                                            <Save className="mr-2 size-4" />
                                            {isSaving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {selectedTicket && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Comments</h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Use this thread for updates, investigation notes, and handoffs.
                                    </p>
                                </div>
                                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                    {comments.length}
                                </span>
                            </div>

                            <div className="mt-4 space-y-3">
                                {commentsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                        <Loader2Icon className="size-4 animate-spin" />
                                        Loading comments...
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                                        No comments yet. Add the first update below.
                                    </div>
                                ) : comments.map((comment) => (
                                    <div key={comment.id} className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                                {comment.user?.name?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-zinc-900 dark:text-white">{comment.user?.name || "Unknown"}</span>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}
                                                    </span>
                                                </div>
                                                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleAddComment} className="mt-4 space-y-3">
                                <textarea
                                    value={commentDraft}
                                    onChange={(event) => setCommentDraft(event.target.value)}
                                    placeholder="Add a note, blocker, or update..."
                                    className="h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isCommentSubmitting}
                                        className="rounded bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                                    >
                                        {isCommentSubmitting ? "Posting..." : "Add Comment"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </section>
            </div>

            {!loading && filteredTickets.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    <AlertTriangle className="size-4" />
                    No tickets match the current board filters.
                </div>
            )}
        </div>
    );
}
