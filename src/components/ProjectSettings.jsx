import { format } from "date-fns";
import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import AddProjectMember from "./AddProjectMember";
import { buildApiUrl } from "../utils/api";
import { normalizeProject } from "../utils/normalize";
import { updateProject } from "../features/workspaceSlice";

export default function ProjectSettings({ project }) {
    const dispatch = useDispatch();
    const { getToken } = useAuth();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: null,
        end_date: null,
        progress: 0,
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!project?.id) return;

        if (!formData.start_date || !formData.end_date) {
            toast.error("Start date and end date are required");
            return;
        }

        if (new Date(formData.end_date) < new Date(formData.start_date)) {
            toast.error("End date cannot be before the start date");
            return;
        }

        try {
            setIsSubmitting(true);
            const token = await getToken();
            const response = await fetch(buildApiUrl(`/api/v1/projects/${project.id}`), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    status: formData.status.toLowerCase(),
                    priority: formData.priority.toLowerCase(),
                    progress: Number(formData.progress) || 0,
                    startDate: formData.start_date ? new Date(formData.start_date).toISOString() : null,
                    endDate: formData.end_date ? new Date(formData.end_date).toISOString() : null,
                }),
            });

            const json = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error("You do not have permission to update this project.");
                }
                throw new Error(json?.message || "Failed to update project");
            }

            const updatedProject = normalizeProject(json?.data);
            if (updatedProject) {
                updatedProject.tasks = project.tasks || [];
                updatedProject.members = project.members || [];
                dispatch(updateProject(updatedProject));
            }

            toast.success("Project updated successfully");
        } catch (error) {
            toast.error(error.message || "Failed to update project");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (project) {
            const start = project.start_date ? new Date(project.start_date) : null;
            const end = project.end_date ? new Date(project.end_date) : null;
            const status = (project.status || "PLANNING").toString().toUpperCase().replace(/\s/g, "_");
            const priority = (project.priority || "MEDIUM").toString().toUpperCase();
            setFormData({
                name: project.name ?? "",
                description: project.description ?? "",
                status: status || "PLANNING",
                priority: priority || "MEDIUM",
                start_date: start,
                end_date: end,
                progress: project.progress ?? 0,
            });
        }
    }, [project]);

    const inputClasses = "w-full px-3 py-2 rounded mt-2 border text-sm dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300";

    const cardClasses = "rounded-lg border p-6 not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800";

    const labelClasses = "text-sm text-zinc-600 dark:text-zinc-400";

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            {/* Project Details */}
            <div className={cardClasses}>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4">Project Details</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Project Name</label>
                        <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClasses} required />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputClasses + " h-24"} />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Status</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClasses} >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClasses}>Priority</label>
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className={inputClasses} >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Start Date</label>
                            <input type="date" value={formData.start_date ? format(new Date(formData.start_date), "yyyy-MM-dd") : ""} onChange={(e) => setFormData({ ...formData, start_date: e.target.value ? new Date(e.target.value) : null })} className={inputClasses} required />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClasses}>End Date</label>
                            <input type="date" value={formData.end_date ? format(new Date(formData.end_date), "yyyy-MM-dd") : ""} onChange={(e) => setFormData({ ...formData, end_date: e.target.value ? new Date(e.target.value) : null })} min={formData.start_date ? format(new Date(formData.start_date), "yyyy-MM-dd") : undefined} className={inputClasses} required />
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Progress: {formData.progress}%</label>
                        <input type="range" min="0" max="100" step="5" value={formData.progress} onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })} className="w-full accent-blue-500 dark:accent-blue-400" />
                    </div>

                    {/* Save Button */}
                    <button type="submit" disabled={isSubmitting} className="ml-auto flex items-center text-sm justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-2 rounded" >
                        <Save className="size-4" /> {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </div>

            {/* Team Members */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4">
                            Team Members <span className="text-sm text-zinc-600 dark:text-zinc-400">({(project.members || []).length})</span>
                        </h2>
                        <button type="button" onClick={() => setIsDialogOpen(true)} className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800" >
                            <Plus className="size-4 text-zinc-900 dark:text-zinc-300" />
                        </button>
                        <AddProjectMember isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
                    </div>

                    {/* Member List */}
                    {(project.members || []).length > 0 ? (
                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                            {(project.members || []).map((member, index) => (
                                <div key={index} className="flex items-center justify-between px-3 py-2 rounded dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-300" >
                                    <span> {member?.user?.email || "Unknown"} </span>
                                    <span className="px-2 py-0.5 rounded-xs ring ring-zinc-200 dark:ring-zinc-600 capitalize">
                                        {(member?.role || "member").replace("_", " ")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">No team members yet. Add members to collaborate.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
