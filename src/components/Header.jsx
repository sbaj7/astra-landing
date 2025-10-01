import React from 'react';
import AuthButton from './Auth/AuthButton';

const Header = ({ onAuthRequired }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-transparent">
      <div className="flex justify-end items-center h-16 px-4 sm:px-6 lg:px-8">
        {/* Auth Button - positioned at top right */}
        <AuthButton onAuthRequired={onAuthRequired} />
      </div>
    </header>
  );
};

export default Header;