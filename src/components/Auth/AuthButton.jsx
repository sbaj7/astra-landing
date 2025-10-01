import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from './SupabaseAuthProvider.jsx';
import { LogIn, LogOut, User } from 'lucide-react';
import authService from '../../services/authService';

const AuthButton = ({ onAuthRequired }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signOut
  } = useSupabaseAuth();

  const [chatLimit, setChatLimit] = useState({ remaining: 10, used: 0 });
  const [notice, setNotice] = useState('');

  // Update chat limit counter
  const updateChatLimit = async () => {
    if (!isAuthenticated) {
      const limit = await authService.checkAnonymousLimit();
      setChatLimit({
        remaining: limit.remaining || 0,
        used: limit.used || 0
      });
    }
  };

  useEffect(() => {
    updateChatLimit();
    // Make function available globally for updating after messages
    window.updateChatLimit = updateChatLimit;

    return () => {
      delete window.updateChatLimit;
    };
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      const result = await signIn();
      if (result?.cancelled) return;

      if (result?.method === 'password-signup' && result?.email) {
        setNotice(`Check ${result.email} to verify your account.`);
      } else if (result?.method === 'magic-link' && result?.email) {
        setNotice(`Check ${result.email} for the sign-in link.`);
      } else if (result?.method === 'password-signin') {
        setNotice('Signed in successfully.');
      } else if (result?.email) {
        setNotice(`Check ${result.email} for next steps.`);
      }

      if (result && !result.cancelled) {
        setTimeout(() => setNotice(''), 6000);
      }
    } catch (error) {
      console.error('Supabase sign-in failed', error);
      setNotice(error.message || 'Sign-in failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Supabase sign-out failed', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Chat Counter for Anonymous Users */}
      {!isAuthenticated && (
        <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
          <span className="text-sm font-medium text-blue-800">
            {chatLimit.remaining} free chats left
          </span>
          {chatLimit.remaining <= 3 && chatLimit.remaining > 0 && (
            <span className="text-xs text-orange-600 font-medium">
              (Sign up for unlimited)
            </span>
          )}
        </div>
      )}

      {!isAuthenticated && notice && (
        <span className="text-xs text-blue-700">{notice}</span>
      )}

      {isAuthenticated ? (
        <div className="flex items-center space-x-3">
          {/* User Info */}
          <div className="flex items-center space-x-2">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full border-2 border-blue-500"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-green-600">Unlimited chats</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In</span>
        </button>
      )}
    </div>
  );
};

export default AuthButton;
