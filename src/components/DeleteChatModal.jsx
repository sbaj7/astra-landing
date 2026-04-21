import React from 'react';

const DeleteChatModal = ({ isOpen, onConfirm, onCancel, chat, theme }) => {
  if (!isOpen) return null;

  const title = chat?.displayTitle || chat?.title || 'this chat';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm chat deletion"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(8, 11, 19, 0.55)'
      }}
      onClick={onCancel}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: theme?.backgroundSurface || '#111827',
          color: theme?.textPrimary || '#f8fafc',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 30px 70px rgba(15,23,42,0.45)',
          border: `1px solid ${(theme?.textSecondary || '#94a3b8')}22`,
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Delete chat?</h3>
          <p style={{ margin: 0, fontSize: 14, color: theme?.textSecondary || '#94a3b8', lineHeight: 1.6 }}>
            This will permanently remove <strong style={{ color: theme?.textPrimary || '#f8fafc' }}>{title}</strong>
            {chat?.timestamp ? ' and its history' : ''} from your account. This action cannot be undone.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: `1px solid ${(theme?.textSecondary || '#94a3b8')}55`,
              background: 'transparent',
              color: theme?.textPrimary || '#f8fafc',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: 'none',
              background: theme?.errorColor || '#ef4444',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteChatModal;
