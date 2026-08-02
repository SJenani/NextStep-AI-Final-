import { LogOut, User } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

export default function ProfileCard() {
  const { user, profilePhoto, profile } = useChat();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const initial = user?.full_name?.charAt(0).toUpperCase() || "U";

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="border-t border-gray-100 dark:border-slate-800 p-4 relative group">
      
      {/* Dropdown Menu */}
      <div className="absolute bottom-[72px] left-4 right-4 z-50 flex origin-bottom flex-col scale-95 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl shadow-blue-900/5">
        <NavLink 
          to="/profile"
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <User className="h-4 w-4" />
          Profile
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 p-3 shadow-sm border border-gray-50 dark:border-slate-700 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md cursor-pointer">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-sm font-bold text-white shadow-inner">
          {profilePhoto ? (
            <img src={profilePhoto} alt={user?.full_name || "Profile"} className="h-full w-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col justify-center">
          <p className="truncate text-sm font-bold text-gray-800 dark:text-gray-200">{user?.full_name || "User"}</p>
          <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
            {profile?.desired_role || "Career mentor"}
          </p>
        </div>
      </div>
    </div>
  );
}
