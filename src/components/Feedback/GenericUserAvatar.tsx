import React from 'react';

interface GenericUserAvatarProps {
  name?: string;
  size?: number;
  className?: string;
  title?: string;
}

export const GenericUserAvatar: React.FC<GenericUserAvatarProps> = ({
  name = 'Administrador',
  size = 38,
  className = '',
  title,
}) => {
  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'AD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <div
      className={`generic-user-avatar ${className}`}
      title={title || name}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        backgroundColor: '#16468e',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 700,
        fontSize: Math.round(size * 0.38),
        letterSpacing: '0.04em',
        boxShadow: '0 2px 6px rgba(15, 81, 174, 0.2)',
        userSelect: 'none',
        border: '1.5px solid #d5e0ee',
      }}
    >
      <svg
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'none' }}
      >
        <path
          d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
          fill="currentColor"
        />
        <path
          d="M12.0002 14.5C6.99016 14.5 2.91016 17.86 2.91016 22C2.91016 22.28 3.13016 22.5 3.41016 22.5H20.5902C20.8702 22.5 21.0902 22.28 21.0902 22C21.0902 17.86 17.0102 14.5 12.0002 14.5Z"
          fill="currentColor"
        />
      </svg>
      <span>{initials}</span>
    </div>
  );
};

export default GenericUserAvatar;
