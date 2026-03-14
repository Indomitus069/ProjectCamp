import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
};

const buildWorkspaceMembers = (projects = []) => {
    const membersByUserId = new Map();

    projects.forEach((project) => {
        (project?.members || []).forEach((member) => {
            if (!member?.userId) return;
            const existing = membersByUserId.get(member.userId);
            if (!existing || existing.role !== "admin") {
                membersByUserId.set(member.userId, member);
            }
        });
    });

    return Array.from(membersByUserId.values());
};

const buildDefaultWorkspace = (projects = []) => ({
    id: "default",
    name: "My Workspace",
    projects,
    members: buildWorkspaceMembers(projects),
    owner: { email: "" },
});

const withWorkspaceMembers = (workspace) => {
    if (!workspace) return workspace;
    return {
        ...workspace,
        members: buildWorkspaceMembers(workspace.projects || []),
    };
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload);
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);

            // set current workspace to the new workspace
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map((w) =>
                w.id === action.payload.id ? action.payload : w
            );

            // if current workspace is updated, set it to the updated workspace
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w._id !== action.payload);
        },
        updateProject: (state, action) => {
            const updatedProject = action.payload;
            if (!updatedProject?.id) return;

            const syncProjects = (projects = []) =>
                projects.map((project) =>
                    project.id === updatedProject.id ? updatedProject : project
                );

            if (state.currentWorkspace) {
                state.currentWorkspace = withWorkspaceMembers({
                    ...state.currentWorkspace,
                    projects: syncProjects(state.currentWorkspace.projects),
                });
            }

            state.workspaces = state.workspaces.map((workspace) =>
                workspace.id === state.currentWorkspace?.id
                    ? withWorkspaceMembers({ ...workspace, projects: syncProjects(workspace.projects) })
                    : workspace
            );
        },
        addProjectMember: (state, action) => {
            const { projectId, member } = action.payload || {};
            if (!projectId || !member || !state.currentWorkspace) return;

            const addMemberToProjects = (projects = []) =>
                projects.map((project) =>
                    project.id === projectId
                        ? {
                            ...project,
                            members: (project.members || []).some((item) => item.userId === member.userId)
                                ? project.members
                                : [...(project.members || []), member],
                        }
                        : project
                );

            state.currentWorkspace = withWorkspaceMembers({
                ...state.currentWorkspace,
                projects: addMemberToProjects(state.currentWorkspace.projects),
            });

            state.workspaces = state.workspaces.map((workspace) =>
                workspace.id === state.currentWorkspace.id
                    ? withWorkspaceMembers({ ...workspace, projects: addMemberToProjects(workspace.projects) })
                    : workspace
            );
        },
        addProject: (state, action) => {
            const project = action.payload;
            if (!project || !project.id) return;
            if (!state.currentWorkspace) {
                const defaultWorkspace = buildDefaultWorkspace([project]);
                state.workspaces = [defaultWorkspace];
                state.currentWorkspace = defaultWorkspace;
                return;
            }
            state.currentWorkspace.projects = state.currentWorkspace.projects || [];
            state.currentWorkspace.projects.push(project);
            const idx = state.workspaces.findIndex((w) => w.id === state.currentWorkspace.id);
            if (idx >= 0) {
                state.workspaces[idx] = withWorkspaceMembers({ ...state.currentWorkspace, projects: [...state.currentWorkspace.projects] });
                state.currentWorkspace = state.workspaces[idx];
            }
        },
        setUserProjects: (state, action) => {
            const projects = action.payload || [];
            const defaultWorkspace = buildDefaultWorkspace(projects);
            const existing = state.workspaces.find((w) => w.id === "default");
            if (existing) {
                existing.projects = projects;
                existing.members = buildWorkspaceMembers(projects);
                if (state.currentWorkspace?.id === "default") state.currentWorkspace = existing;
            } else {
                state.workspaces = [defaultWorkspace];
                state.currentWorkspace = defaultWorkspace;
            }
        },
        addTask: (state, action) => {
            const task = action.payload;
            if (!task?.projectId || !state.currentWorkspace) return;

            const addTaskToProjects = (projects = []) =>
                projects.map((project) =>
                    project.id === task.projectId
                        ? { ...project, tasks: [...(project.tasks || []), task] }
                        : project
                );

            state.currentWorkspace = {
                ...state.currentWorkspace,
                projects: addTaskToProjects(state.currentWorkspace.projects),
            };

            state.workspaces = state.workspaces.map((workspace) =>
                workspace.id === state.currentWorkspace.id
                    ? { ...workspace, projects: addTaskToProjects(workspace.projects) }
                    : workspace
            );
        },
        updateTask: (state, action) => {
            const task = action.payload;
            if (!task?.projectId || !state.currentWorkspace) return;

            const updateTaskInProjects = (projects = []) =>
                projects.map((project) =>
                    project.id === task.projectId
                        ? {
                            ...project,
                            tasks: (project.tasks || []).map((item) =>
                                item.id === task.id ? task : item
                            ),
                        }
                        : project
                );

            state.currentWorkspace = {
                ...state.currentWorkspace,
                projects: updateTaskInProjects(state.currentWorkspace.projects),
            };

            state.workspaces = state.workspaces.map((workspace) =>
                workspace.id === state.currentWorkspace.id
                    ? { ...workspace, projects: updateTaskInProjects(workspace.projects) }
                    : workspace
            );
        },
        deleteTask: (state, action) => {
            const { projectId, taskIds } = action.payload || {};
            if (!projectId || !Array.isArray(taskIds) || !state.currentWorkspace) return;

            const deleteTaskFromProjects = (projects = []) =>
                projects.map((project) =>
                    project.id === projectId
                        ? {
                            ...project,
                            tasks: (project.tasks || []).filter((task) => !taskIds.includes(task.id)),
                        }
                        : project
                );

            state.currentWorkspace = {
                ...state.currentWorkspace,
                projects: deleteTaskFromProjects(state.currentWorkspace.projects),
            };

            state.workspaces = state.workspaces.map((workspace) =>
                workspace.id === state.currentWorkspace.id
                    ? { ...workspace, projects: deleteTaskFromProjects(workspace.projects) }
                    : workspace
            );
        }

    }
});

export const { setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace, deleteWorkspace, addProject, updateProject, addProjectMember, setUserProjects, addTask, updateTask, deleteTask } = workspaceSlice.actions;
export default workspaceSlice.reducer;
