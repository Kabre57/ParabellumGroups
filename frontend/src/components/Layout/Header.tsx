import React from 'react';
import { Menu, Bell, User, LogOut, Moon, Sun } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useDarkMode } from '../../hooks/useDarkMode';
import { createCrudService } from '../../services/api';

const notificationService = createCrudService('notifications');
interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Récupérer le nombre de notifications non lues
  const { data: notificationData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationService.getAll({ unreadOnly: true }),
    refetchInterval: 30000 // Rafraîchir toutes les 30 secondes
  });

  const unreadCount = notificationData?.data?.unreadCount || 0;
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="ml-4 lg:ml-0">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Tableau de bord
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Toggle Dark Mode */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {isDarkMode ? (
              <Sun className="h-6 w-6" />
            ) : (
              <Moon className="h-6 w-6" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profil utilisateur */}
          <div className="relative group">
            <button className="flex items-center space-x-3 p-2 text-sm rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div className="hidden md:block text-left">
                <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</div>
              </div>
            </button>

            {/* Menu déroulant */}
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-200 dark:border-gray-700">
              <a
                href="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <User className="mr-3 h-4 w-4" />
                Mon profil
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};