import React, { useState } from 'react';
import { Stethoscope, Edit3 } from 'lucide-react';

// MARK: - Toolbar Background Component
const ToolbarBackground = ({ theme }) => {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: theme.backgroundSurface,
        borderBottomLeftRadius: '20px',
        borderBottomRightRadius: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        maskImage: 'linear-gradient(to bottom, black 0%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 100%)'
      }}
    />
  );
};

// MARK: - Main Toolbar Component
const ToolbarView = ({ 
  onNewChat = () => {}, 
  onToggleSidebar = () => {},
  theme 
}) => {
  const [newChatCooldown, setNewChatCooldown] = useState(false);

  const handleNewChat = () => {
    if (newChatCooldown) return;
    
    setNewChatCooldown(true);
    onNewChat();
    
    setTimeout(() => {
      setNewChatCooldown(false);
    }, 300);
  };

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ height: '52px' }} // Match Swift frame height
    >
      {/* Background */}
      <ToolbarBackground theme={theme} />
      
      {/* Content */}
      <div 
        className="relative flex items-center justify-between w-full px-4"
        style={{ height: '52px' }} // Match Swift frame height and center everything
      >
        {/* Left Button - Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center p-2 rounded-lg hover:bg-opacity-10 hover:bg-gray-500 transition-all duration-200"
          style={{ transform: 'translateY(-3px)' }} // Match Swift offset
        >
          <Stethoscope 
            size={18} 
            color={theme.textPrimary}
          />
        </button>

        {/* Center - App Title */}
        <h1 
          className="text-3xl font-serif text-center"
          style={{ 
            color: theme.textPrimary,
            fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
            fontSize: '28px' // Match Swift font size exactly
          }}
        >
          Astra
        </h1>

        {/* Right Button - New Chat */}
        <button
          onClick={handleNewChat}
          disabled={newChatCooldown}
          className="flex items-center justify-center p-2 rounded-lg hover:bg-opacity-10 hover:bg-gray-500 transition-all duration-200 disabled:opacity-50"
        >
          <Edit3 
            size={18} 
            color={theme.textPrimary}
          />
        </button>
      </div>
    </div>
  );
};

export default ToolbarView;