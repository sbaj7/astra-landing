import React, { useState } from 'react';
import { X, Plus, Info, Trash2 } from 'lucide-react';
import AboutView from './AboutView';

// Helper function for relative time formatting
const timeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Popup Menu Item Component
const PopupMenuItem = ({ icon: Icon, title, isDestructive = false, onClick, theme }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center w-full px-4 py-3 space-x-3 hover:bg-opacity-5 hover:bg-gray-500 transition-colors"
    >
      <Icon 
        size={16} 
        color={isDestructive ? theme.errorColor : theme.textPrimary} 
      />
      <span 
        className="text-base font-medium"
        style={{ color: isDestructive ? theme.errorColor : theme.textPrimary }}
      >
        {title}
      </span>
    </button>
  );
};

// Popup Chat Row Component
const PopupChatRow = ({ session, onSelect, theme }) => {
  return (
    <button
      onClick={onSelect}
      className="flex items-center w-full px-4 py-2 space-x-2.5 hover:bg-opacity-5 hover:bg-gray-500 transition-colors"
    >
      {/* Mode indicator */}
      <div 
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ 
          backgroundColor: session.wasInClinicalMode ? '#a855f7' : theme.accentSoftBlue 
        }}
      />
      
      <div className="flex-1 min-w-0 text-left">
        <div 
          className="text-sm font-medium truncate"
          style={{ color: theme.textPrimary }}
        >
          {session.title}
        </div>
        <div 
          className="text-xs"
          style={{ color: theme.textSecondary }}
        >
          {timeAgo(session.createdAt || session.timestamp)}
        </div>
      </div>
    </button>
  );
};

// Main Sidebar Component
const SidebarView = ({ 
  isPresented, 
  onDismiss,
  chatHistory, 
  onSelectChat, 
  onDeleteChat, 
  onNewChat, 
  theme 
}) => {
  const [showAbout, setShowAbout] = useState(false);

  const handleClearHistory = () => {
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(session => onDeleteChat(session));
    }
    onDismiss();
  };

  const handleNewChat = () => {
    onNewChat();
    onDismiss();
  };

  const handleSelectChat = (session) => {
    onSelectChat(session);
    onDismiss();
  };

  if (!isPresented) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
        onClick={onDismiss}
      >
        {/* Popup content */}
        <div className="flex h-full">
          <div className="flex flex-col pt-16 pl-4">
            <div
              className="w-65 rounded-2xl shadow-2xl transform transition-all duration-300"
              style={{ 
                backgroundColor: theme.backgroundSurface,
                transform: isPresented ? 'scale(1)' : 'scale(0.9)',
                opacity: isPresented ? 1 : 0
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <h2 
                    className="text-lg font-bold"
                    style={{ color: theme.textPrimary }}
                  >
                    Astra
                  </h2>
                  
                  <button
                    onClick={onDismiss}
                    className="flex items-center justify-center w-6 h-6 rounded-full"
                    style={{ backgroundColor: `${theme.textSecondary}1A` }}
                  >
                    <X size={12} color={theme.textSecondary} />
                  </button>
                </div>
                
                <p 
                  className="text-sm mt-2"
                  style={{ color: theme.textSecondary }}
                >
                  {chatHistory?.length || 0} chats
                </p>
              </div>

              <div 
                className="mx-4 border-t"
                style={{ borderColor: `${theme.textSecondary}20` }}
              />

              {/* Menu items */}
              <div className="py-2">
                <PopupMenuItem
                  icon={Plus}
                  title="New Chat"
                  onClick={handleNewChat}
                  theme={theme}
                />
                
                <PopupMenuItem
                  icon={Info}
                  title="About"
                  onClick={() => setShowAbout(true)}
                  theme={theme}
                />
                
                {chatHistory && chatHistory.length > 0 && (
                  <PopupMenuItem
                    icon={Trash2}
                    title="Clear History"
                    isDestructive={true}
                    onClick={handleClearHistory}
                    theme={theme}
                  />
                )}
              </div>

              {/* Recent chats */}
              {chatHistory && chatHistory.length > 0 && (
                <>
                  <div 
                    className="mx-4 border-t"
                    style={{ borderColor: `${theme.textSecondary}20` }}
                  />
                  
                  <div className="py-2">
                    <div className="px-4 py-2">
                      <h3 
                        className="text-sm font-semibold"
                        style={{ color: theme.textPrimary }}
                      >
                        Recent
                      </h3>
                    </div>
                    
                    <div className="max-h-50 overflow-y-auto">
                      {chatHistory.slice(0, 5).map((session) => (
                        <PopupChatRow
                          key={session.id}
                          session={session}
                          onSelect={() => handleSelectChat(session)}
                          theme={theme}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Bottom padding */}
              <div className="h-2" />
            </div>
          </div>
          
          <div className="flex-1" onClick={onDismiss} />
        </div>
      </div>

      {/* About View Modal */}
      <AboutView 
        isPresented={showAbout}
        onDismiss={() => setShowAbout(false)}
        theme={theme}