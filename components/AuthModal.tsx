import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleIcon, XIcon } from './icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6" data-modal>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Welcome!</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to sync your documents across devices</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="text-center py-4">
            <div className="text-6xl mb-4">☁️</div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Cloud Sync Available
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in with Google to access your documents from any device, anywhere.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <>
                <GoogleIcon className="h-5 w-5" />
                <span className="font-semibold text-gray-700 dark:text-gray-200">Continue with Google</span>
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✨</div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Benefits of signing in:</h4>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Access documents from any device
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Automatic cloud backup
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Seamless sync across browsers
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

