import React from 'react';

const CircleButton = ({ 
  icon: Icon, 
  fill = false, 
  onClick = () => {}, 
  size = 18,
  disabled = false,
  theme 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-105 active:scale-95"
      style={{
        backgroundColor: fill ? theme.accentSoftBlue : 'transparent',
        border: fill ? 'none' : `1px solid ${theme.textSecondary}50`,
        color: fill ? 'white' : theme.textPrimary
      }}
    >
      <Icon size={size} />
    </button>
  );
};

export default CircleButton;