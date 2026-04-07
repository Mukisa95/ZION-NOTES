import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserIcon, LogoutIcon, CloudIcon, SettingsIcon } from './icons';

interface UserProfileProps {
  onOpenSettings: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onOpenSettings }) => {
  const { user, signOut, incognitoMode, toggleIncognitoMode } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shrink-0 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:outline-none"
        title={user.displayName || user.email || 'User Profile'}
      >
        {user.photoURL ? (
          <img 
            src={user.photoURL} 
            alt={user.displayName || 'User'} 
            className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-sm object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <UserIcon className="w-5 h-5 text-white" />
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsOpen(false)}
          />
          {/* Mobile: fixed full-width panel; Desktop: anchored dropdown */}
          <div className="fixed inset-x-3 top-14 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 w-auto sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden max-h-[80dvh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    className="w-12 h-12 rounded-full border-2 border-blue-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={() => {
                  toggleIncognitoMode();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
              >
                <CloudIcon className={`w-4 h-4 ${incognitoMode ? 'text-orange-500' : 'text-blue-500'}`} />
                <span>{incognitoMode ? 'Incognito mode' : 'Cloud sync enabled'}</span>
              </button>
              
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
              >
                <SettingsIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Settings</span>
              </button>
            </div>

            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <LogoutIcon className="w-4 h-4" />
                )}
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

