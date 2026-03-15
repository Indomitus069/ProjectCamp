import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { buildApiUrl } from "../utils/api";
import { normalizeTicket } from "../utils/normalize";

const buildInitialFormData = (projects, user) => ({
    projectId: projects[0]?.id || "",
    title: "",
    description: "",
    requesterName: user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "",
    requesterEmail: user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "",
    assigneeId: "",
    category: "SUPPORT",
    status: "OPEN",
    priority: "MEDIUM",
});

const getProjectMembers = (project) =>
    (project?.members || [])
        .map((member) => ({
            id: member?.user?.id || member?.userId || "",
            name: member?.user?.name || member?.user?.email || "Unknown user",
            email: member?.user?.email || "",
        }))
        .filter((member) => member.id);

export default function CreateTicketDialog({ isOpen, onClose, projects = [], onCreated }) {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(() => buildInitialFormData(projects, user));

    useEffect(() => {
        if (!isOpen) return;
        setFormData(buildInitialFormData(projects, user));
    }, [isOpen, projects, user]);

    const selectedProject = useMemo(
        () => projects.find((project) => project.id === formData.projectId) || null,
        [formData.projectId, projects]
    );

    const projectMembers = useMemo(() => getProjectMembers(selectedProject), [selectedProject]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!formData.projectId) {
            toast.error("Select a project first");
            return;
        }

        try {
            setIsSubmitting(true);
            const token = await getToken();

            const response = await fetch(buildApiUrl("/api/v1/tickets"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    projectId: formData.projectId,
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    requesterName: formData.requesterName.trim(),
                    requesterEmail: formData.requesterEmail.trim(),
                    assigneeId: formData.assigneeId || undefined,
                    category: formData.category.toLowerCase(),
                    status: formData.status.toLowerCase(),
                    priority: formData.priority.toLowerCase(),
                }),
            });

            const json = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(json?.message || "Failed to create ticket");
            }

            const createdTicket = normalizeTicket(json?.data);
            if (createdTicket) {
                onCreated?.(createdTicket);
            }

            toast.success("Ticket created successfully");
            onClose?.();
        } catch (error) {
            toast.error(error?.message || "Failed to create ticket");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur">
            <div className="relative w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                >
                    <XIcon className="size-5" />
                </button>

                <h2 className="text-xl font-semibold">Create Ticket</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Log a bug, request, or support issue against one of your projects.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium">Project</label>
                            <select
                                value={formData.projectId}
                                onChange={(event) => setFormData((current) => ({
                                    ...current,
                                    projectId: event.target.value,
                                    assigneeId: "",
                                }))}
                                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                required
                            >
                                <option value="">Select a project</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Assign To</label>
                            <select
                                value={formData.assigneeId}
                                onChange={(event) => setFormData((current) => ({ ...current, assigneeId: event.target.value }))}
                                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <option value="">Unassigned</option>
                                {projectMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}{member.email ? ` (${member.email})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                            placeholder="Login page crashes on submit"
                            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                            placeholder="What happened, where, and what should the team know?"
                            className="mt-1 h-28 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium">Category</label>
                            <select
                                value={formData.category}
                                onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
                                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <option value="BUG">Bug</option>
                                <option value="FEATURE_REQUEST">Feature Request</option>
                                <option value="SUPPORT">Support</option>
                                <option value="INCIDENT">Incident</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Status</label>
                            <select
                                value={formData.status}
                                onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <option value="OPEN">Open</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="CLOSED">Closed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))}
                                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium">Requester Name</label>
                            <input
                                type="text"
                                value={formData.requesterName}
                                onChange={(event) => setFormData((current) => ({ ...current, requesterName: event.target.value }))}
                                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Requester Email</label>
                            <input
                                type="email"
                                value={formData.requesterEmail}
                                onChange={(event) => setFormData((current) => ({ ...current, requesterEmail: event.target.value }))}
                                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !projects.length}
                            className="rounded bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                        >
                            {isSubmitting ? "Creating..." : "Create Ticket"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
