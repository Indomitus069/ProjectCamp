import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { setUserProjects } from '../features/workspaceSlice'
import { useAuth } from '@clerk/clerk-react'
import { Loader2Icon } from 'lucide-react'
import { normalizeProject } from '../utils/normalize'
import { buildApiUrl } from '../utils/api'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading } = useSelector((state) => state.workspace)
    const { isLoaded, isSignedIn, getToken } = useAuth()
    const dispatch = useDispatch()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Global fetch projects
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        let cancelled = false;
        (async () => {
            try {
                const token = await getToken();
                if (!token || cancelled) return;
                
                const res = await fetch(buildApiUrl('/api/v1/projects'), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                if (!res.ok || cancelled) return;
                
                const json = await res.json();
                const list = Array.isArray(json?.data) ? json.data : [];
                dispatch(setUserProjects(list.map(normalizeProject).filter(Boolean)));
            } catch (e) {
                if (!cancelled) console.error("Failed to fetch projects", e);
            }
        })();
        
        return () => { cancelled = true; };
    }, [isLoaded, isSignedIn, getToken, dispatch]);

    if (loading) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout
