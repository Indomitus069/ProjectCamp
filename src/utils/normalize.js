export function normalizeProject(p) {
    if (!p || typeof p !== "object") return null;
    const id = p._id ?? p.id;
    if (!id) return null;
    const status = (p.status != null ? String(p.status) : "active").toUpperCase().replace(/\s/g, "_");
    const tasks = Array.isArray(p.tasks) ? p.tasks.map(normalizeTask).filter(Boolean) : [];
    const members = Array.isArray(p.members)
        ? p.members.map((member) => ({
            ...member,
            user: member?.user ? {
                ...member.user,
                image: member.user.image ?? member.user.imageUrl ?? "",
                imageUrl: member.user.imageUrl ?? member.user.image ?? "",
            } : null,
        }))
        : [];
    return {
        id: String(id),
        name: p.name != null ? String(p.name) : "",
        description: p.description != null ? String(p.description) : "",
        createdBy: p.createdBy != null ? String(p.createdBy) : "",
        status: status || "ACTIVE",
        progress: Number(p.progress) || 0,
        priority: (p.priority != null ? String(p.priority) : "MEDIUM").toUpperCase(),
        startDate: p.startDate ?? p.start_date ?? null,
        endDate: p.endDate ?? p.end_date ?? null,
        start_date: p.start_date ?? p.startDate ?? null,
        end_date: p.end_date ?? p.endDate ?? null,
        tasks: tasks,
        members: members,
    };
}

export function normalizeTask(t) {
    if (!t || typeof t !== "object") return null;
    const id = t._id ?? t.id;
    if (!id) return null;
    return {
        id: String(id),
        projectId: String(t.projectId),
        title: t.title != null ? String(t.title) : "",
        description: t.description != null ? String(t.description) : "",
        status: (t.status || "todo").toUpperCase().replace(/\s/g, "_"),
        priority: (t.priority || "medium").toUpperCase(),
        type: (t.type || "task").toUpperCase(),
        dueDate: t.dueDate ?? t.due_date ?? null,
        due_date: t.due_date ?? t.dueDate ?? null,
        updatedAt: t.updatedAt,
        assigneeId: t.assigneeId,
        assignee: t.assignee ? {
            id: String(t.assignee.id),
            name: String(t.assignee.name),
            email: t.assignee.email != null ? String(t.assignee.email) : "",
            imageUrl: t.assignee.imageUrl ?? t.assignee.image ?? "",
            image: t.assignee.image ?? t.assignee.imageUrl ?? "",
        } : null,
        subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    };
}
