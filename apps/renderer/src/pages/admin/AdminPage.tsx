import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';

type Role = 'Administrador' | 'Cajero' | 'Bodeguero';
type UserStatus = 'ACTIVO' | 'INACTIVO';

type User = {
  id: number;
  fullName: string;
  email: string;
  username: string;
  role: Role;
  status: UserStatus;
};

type UserForm = {
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  status: UserStatus;
};
type SortOrder = 'RECENT_FIRST' | 'OLD_FIRST';
type SelectOption = { value: string; label: string };
const USERS_STORAGE_KEY = 'ferred.users.v1';
const THEME_STORAGE_KEY = 'ferred.admin.theme';

const initialUsers: User[] = [
  {
    id: 1,
    fullName: 'Juan Delgado',
    email: 'j.delgado@hardwarepro.com',
    username: 'jdelgado_admin',
    role: 'Administrador',
    status: 'ACTIVO',
  },
  {
    id: 2,
    fullName: 'Maria Soto',
    email: 'm.soto@hardwarepro.com',
    username: 'msoto_caja',
    role: 'Cajero',
    status: 'ACTIVO',
  },
  {
    id: 3,
    fullName: 'Roberto Pena',
    email: 'r.pena@hardwarepro.com',
    username: 'rpena_stock',
    role: 'Bodeguero',
    status: 'INACTIVO',
  },
  {
    id: 4,
    fullName: 'Lucia Gomez',
    email: 'l.gomez@hardwarepro.com',
    username: 'lgomez_caja',
    role: 'Cajero',
    status: 'ACTIVO',
  },
  {
    id: 5,
    fullName: 'Henry',
    email: 'henry@ferred.local',
    username: 'henry_admin',
    role: 'Administrador',
    status: 'ACTIVO',
  },
  {
    id: 6,
    fullName: 'Pacheco',
    email: 'pacheco@ferred.local',
    username: 'pacheco_stock',
    role: 'Bodeguero',
    status: 'ACTIVO',
  },
  {
    id: 7,
    fullName: 'Carlos',
    email: 'carlos@ferred.local',
    username: 'carlos_caja',
    role: 'Cajero',
    status: 'ACTIVO',
  },
  {
    id: 8,
    fullName: 'Lenin',
    email: 'lenin@ferred.local',
    username: 'lenin_stock',
    role: 'Bodeguero',
    status: 'INACTIVO',
  },
  {
    id: 9,
    fullName: 'Bremon',
    email: 'bremon@ferred.local',
    username: 'bremon_admin',
    role: 'Administrador',
    status: 'ACTIVO',
  },
  {
    id: 10,
    fullName: 'Mauricio',
    email: 'mauricio@ferred.local',
    username: 'mauricio_caja',
    role: 'Cajero',
    status: 'ACTIVO',
  },
];

const emptyForm: UserForm = {
  fullName: '',
  email: '',
  username: '',
  password: '',
  role: 'Cajero',
  status: 'ACTIVO',
};

const statusFilterOptions: SelectOption[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

const roleFilterOptions: SelectOption[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Cajero', label: 'Cajero' },
  { value: 'Bodeguero', label: 'Bodeguero' },
];

const sortOptions: SelectOption[] = [
  { value: 'RECENT_FIRST', label: 'Mas reciente' },
  { value: 'OLD_FIRST', label: 'Mas antiguo' },
];

const roleOptions: SelectOption[] = [
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Cajero', label: 'Cajero' },
  { value: 'Bodeguero', label: 'Bodeguero' },
];

const statusOptions: SelectOption[] = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

type CustomSelectProps = {
  selectId: string;
  openSelectId: string | null;
  setOpenSelectId: (next: string | null) => void;
  value: string;
  options: SelectOption[];
  onChange: (nextValue: string) => void;
  ariaLabel: string;
};

function CustomSelect({
  selectId,
  openSelectId,
  setOpenSelectId,
  value,
  options,
  onChange,
  ariaLabel,
}: CustomSelectProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const open = openSelectId === selectId;

  useEffect(() => {
    if (!open) return;

    function closeSelect() {
      setOpenSelectId(null);
    }

    function onDocPointerDown(event: PointerEvent) {
      if (!wrapperRef.current) return;
      const target = event.target as Node;
      if (!wrapperRef.current.contains(target)) closeSelect();
    }

    function onEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeSelect();
    }

    function onWindowScroll() {
      closeSelect();
    }

    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onEscapeKey);
    window.addEventListener('scroll', onWindowScroll, true);

    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onEscapeKey);
      window.removeEventListener('scroll', onWindowScroll, true);
    };
  }, [open, setOpenSelectId]);

  const selected = options.find((option) => option.value === value)?.label ?? value;

  return (
    <div className={`custom-select ${open ? 'custom-select-open' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="dark-select custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpenSelectId(open ? null : selectId)}
      >
        <span>{selected}</span>
        <svg className="custom-select-caret" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 10.5 12 15l5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option ${option.value === value ? 'custom-select-option-active' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpenSelectId(null);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function loadUsersFromStorage(): User[] {
  if (typeof window === 'undefined') return initialUsers;

  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return initialUsers;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialUsers;

    const valid = parsed.filter(
      (u): u is User =>
        typeof u?.id === 'number' &&
        typeof u?.fullName === 'string' &&
        typeof u?.email === 'string' &&
        typeof u?.username === 'string' &&
        (u?.role === 'Administrador' || u?.role === 'Cajero' || u?.role === 'Bodeguero') &&
        (u?.status === 'ACTIVO' || u?.status === 'INACTIVO')
    );

    if (!valid.length) return initialUsers;

    // If local data exists, keep it and add missing seed users by name.
    const byName = new Set(valid.map((u) => u.fullName.trim().toLowerCase()));
    const merged = [...valid];
    for (const seed of initialUsers) {
      if (!byName.has(seed.fullName.trim().toLowerCase())) {
        merged.push(seed);
      }
    }

    return merged;
  } catch {
    return initialUsers;
  }
}

export default function AdminPage() {
  const authUser = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);

  const [users, setUsers] = useState<User[]>(() => loadUsersFromStorage());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | UserStatus>('TODOS');
  const [roleFilter, setRoleFilter] = useState<'TODOS' | Role>('TODOS');
  const [sortOrder, setSortOrder] = useState<SortOrder>('RECENT_FIRST');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
  });

  const [form, setForm] = useState<UserForm>(emptyForm);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const pageSize = 4;

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = users.filter((u) => {
      const bucket = `${u.fullName} ${u.email} ${u.username} ${u.role}`.toLowerCase();
      const matchesSearch = q ? bucket.includes(q) : true;
      const matchesStatus = statusFilter === 'TODOS' ? true : u.status === statusFilter;
      const matchesRole = roleFilter === 'TODOS' ? true : u.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });

    return filtered.sort((a, b) => (sortOrder === 'RECENT_FIRST' ? b.id - a.id : a.id - b.id));
  }, [search, users, statusFilter, roleFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safeCurrentPage]);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const effectiveSelectedUserId = useMemo(() => {
    if (!users.length) return null;
    if (selectedUserId && users.some((u) => u.id === selectedUserId)) return selectedUserId;
    return users[0].id;
  }, [selectedUserId, users]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  function openNewModal() {
    setForm(emptyForm);
    setOpenSelectId(null);
    setNewOpen(true);
  }

  function openEditModal(user: User) {
    setOpenSelectId(null);
    setSelectedUser(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
      status: user.status,
    });
    setEditOpen(true);
  }

  function openDeleteModal(user: User) {
    setOpenSelectId(null);
    setSelectedUser(user);
    setDeleteOpen(true);
  }

  function openEditForSelected() {
    if (!effectiveSelectedUserId) return;
    const user = users.find((u) => u.id === effectiveSelectedUserId);
    if (user) openEditModal(user);
  }

  function openDeleteForSelected() {
    if (!effectiveSelectedUserId) return;
    const user = users.find((u) => u.id === effectiveSelectedUserId);
    if (user) openDeleteModal(user);
  }

  function exportUsersCsv() {
    const header = 'Nombre,Email,Usuario,Rol,Estado';
    const rows = filteredUsers.map((u) => `${u.fullName},${u.email},${u.username},${u.role},${u.status}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function createUser() {
    if (!form.fullName.trim() || !form.email.trim() || !form.username.trim()) return;

    const next: User = {
      id: Math.max(0, ...users.map((u) => u.id)) + 1,
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      username: form.username.trim().toLowerCase(),
      role: form.role,
      status: form.status,
    };

    setUsers((prev) => [next, ...prev]);
    setSelectedUserId(next.id);
    setNewOpen(false);
    setForm(emptyForm);
  }

  function updateUser() {
    if (!selectedUser) return;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              fullName: form.fullName.trim() || u.fullName,
              email: form.email.trim().toLowerCase() || u.email,
              username: form.username.trim().toLowerCase() || u.username,
              role: form.role,
              status: form.status,
            }
          : u
      )
    );

    setEditOpen(false);
    setSelectedUser(null);
  }

  function confirmDeleteUser() {
    if (!selectedUser) return;
    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
    setSelectedUserId((prevId) => (prevId === selectedUser.id ? null : prevId));
    setDeleteOpen(false);
    setSelectedUser(null);
  }

  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  return (
    <main className={`dark-admin-shell ${themeMode === 'light' ? 'theme-light' : 'theme-dark'}`}>
      <aside className="dark-sidebar">
        <div>
          <div className="brand-box">
            <div className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path
                  d="M21.7 7.3 16.7 2.3a1 1 0 0 0-1.4 0L12 5.6l-1.6-1.6a1 1 0 0 0-1.4 1.4L10.6 7 6.8 10.8l-1.7-1.7A2 2 0 0 0 2.3 12l1.9 1.9a2 2 0 0 0 2.8 0l1.7-1.7 3.8 3.8-1.6 1.6a1 1 0 1 0 1.4 1.4l1.6-1.6 3.3 3.3a1 1 0 0 0 1.4 0l5-5a1 1 0 0 0 0-1.4L18.4 12l3.3-3.3a1 1 0 0 0 0-1.4Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div>
              <strong>FERRED</strong>
              <small>Panel de Control</small>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button className="nav-item">
              <span className="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM13 10h8v11h-8V10ZM3 13h8v8H3v-8Z" fill="currentColor" />
                </svg>
              </span>
              <span>Dashboard</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path
                    d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v3h14V5H5Zm0 5v9h14v-9H5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Inventario</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path
                    d="M7 4h-2l-1 2H2v2h2l2.6 8.1A2 2 0 0 0 8.5 18H18v-2H8.5l-.6-2H18a2 2 0 0 0 1.9-1.4L22 6H7.4L7 4Zm2 16a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Ventas</span>
            </button>
            <button className="nav-item nav-item-active">
              <span className="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path
                    d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11Zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Zm-8 0c-.29 0-.62.02-.97.06C5.03 14.36 2 15.36 2 18v2h4v-2c0-1.16.59-2.19 1.64-2.99A9.62 9.62 0 0 1 8 14Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Usuarios</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14">
                  <path
                    d="m19.14 12.94.04-.94-.04-.94 2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58-.04.94.04.94-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Ajustes</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{authUser?.nombre?.charAt(0) ?? 'A'}</div>
          <div>
            <strong>{authUser?.nombre ?? 'Administrador'}</strong>
            <small>{authUser?.rol ?? 'ADMIN'}</small>
          </div>
        </div>
      </aside>

      <section className="dark-content">
        <header className="mobile-admin-head">
          <div className="mobile-brand">
            <span className="mobile-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="12" height="12">
                <path
                  d="M21.7 7.3 16.7 2.3a1 1 0 0 0-1.4 0L12 5.6l-1.6-1.6a1 1 0 0 0-1.4 1.4L10.6 7 6.8 10.8l-1.7-1.7A2 2 0 0 0 2.3 12l1.9 1.9a2 2 0 0 0 2.8 0l1.7-1.7 3.8 3.8-1.6 1.6a1 1 0 1 0 1.4 1.4l1.6-1.6 3.3 3.3a1 1 0 0 0 1.4 0l5-5a1 1 0 0 0 0-1.4L18.4 12l3.3-3.3a1 1 0 0 0 0-1.4Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <strong>FERRED</strong>
          </div>
          <div className="mobile-head-actions">
            <button className="top-icon-btn" title="Notificaciones">
              <svg className="topbar-bell-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 22a2.5 2.5 0 0 0 2.35-1.67h-4.7A2.5 2.5 0 0 0 12 22Zm6-5H6c.9-.8 1.5-2.2 1.5-3.75V10a4.5 4.5 0 1 1 9 0v3.25C16.5 14.8 17.1 16.2 18 17Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button className="mobile-user-btn" title="Perfil">
              {authUser?.nombre?.charAt(0) ?? 'A'}
            </button>
          </div>
        </header>

        <header className="content-topbar">
          <h1>Gestion de Usuarios</h1>
          <input
            className="dark-field top-search"
            placeholder="🔎 Buscar por nombre, correo o rol..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <div className="topbar-actions">
            <button
              type="button"
              className="theme-toggle-btn theme-toggle-btn-inline"
              onClick={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label="Cambiar apariencia"
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {themeMode === 'dark' ? '☀' : '◐'}
              </span>
              <span>{themeMode === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
            <button className="top-icon-btn" title="Notificaciones">
              <svg className="topbar-bell-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 22a2.5 2.5 0 0 0 2.35-1.67h-4.7A2.5 2.5 0 0 0 12 22Zm6-5H6c.9-.8 1.5-2.2 1.5-3.75V10a4.5 4.5 0 1 1 9 0v3.25C16.5 14.8 17.1 16.2 18 17Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <span className="topbar-sep" />
            <button className="logout-link" onClick={logout}>
              Cerrar Sesion
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path
                  d="M14 7h-2v2h2v6h-2v2h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Zm-4 9H7V8h3V6H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3v-2Zm7.59-5L15 8.41V11h-5v2h5v2.59L17.59 13 19 11.59Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="directory-panel">
          <div className="directory-head">
            <h2>Directorio de Usuarios</h2>
            <p>Control de acceso y estados de cuenta para el personal de la ferreteria.</p>
          </div>

          <div className="directory-actions">
            <div className="directory-actions-left">
              <button className="btn btn-toolbar-primary" onClick={openNewModal}>
                <svg className="toolbar-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 5h2v14h-2V5Zm-6 6h14v2H5v-2Z" fill="currentColor" />
                </svg>
                Nuevo
              </button>
              <button
                className="btn btn-toolbar-secondary"
                onClick={openEditForSelected}
                disabled={!effectiveSelectedUserId}
              >
                <svg className="toolbar-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m4 16.25 9.3-9.29 3.75 3.75L7.75 20H4v-3.75Zm14.7-9.79-1.16 1.16-3.75-3.75 1.16-1.16a1.5 1.5 0 0 1 2.12 0l1.63 1.63a1.5 1.5 0 0 1 0 2.12Z"
                    fill="currentColor"
                  />
                </svg>
                Modificar
              </button>
              <button
                className="btn btn-toolbar-critical"
                onClick={openDeleteForSelected}
                disabled={!effectiveSelectedUserId}
              >
                <svg className="toolbar-trash-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M9 3h6m-9 3h12m-9 3v8m3-8v8m3-8v8M8 6l.7 12a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L16 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Eliminar
              </button>
            </div>
            <div className="directory-actions-right">
              <button className="icon-btn" title="Filtros" onClick={() => setShowFilters((v) => !v)}>
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M3 6h18v2H3V6Zm4 5h10v2H7v-2Zm3 5h4v2h-4v-2Z" fill="currentColor" />
                </svg>
              </button>
              <button className="icon-btn" title="Descargar CSV" onClick={exportUsersCsv}>
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path
                    d="M11 3h2v9.17l2.59-2.58L17 11l-5 5-5-5 1.41-1.41L11 12.17V3Zm-7 14h16v4H4v-4Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <label>
                Estado
                <CustomSelect
                  selectId="filter-status"
                  openSelectId={openSelectId}
                  setOpenSelectId={setOpenSelectId}
                  ariaLabel="Filtrar por estado"
                  value={statusFilter}
                  options={statusFilterOptions}
                  onChange={(next) => {
                    setStatusFilter(next as 'TODOS' | UserStatus);
                    setCurrentPage(1);
                  }}
                />
              </label>
              <label>
                Rol
                <CustomSelect
                  selectId="filter-role"
                  openSelectId={openSelectId}
                  setOpenSelectId={setOpenSelectId}
                  ariaLabel="Filtrar por rol"
                  value={roleFilter}
                  options={roleFilterOptions}
                  onChange={(next) => {
                    setRoleFilter(next as 'TODOS' | Role);
                    setCurrentPage(1);
                  }}
                />
              </label>
              <label>
                Orden
                <CustomSelect
                  selectId="filter-sort"
                  openSelectId={openSelectId}
                  setOpenSelectId={setOpenSelectId}
                  ariaLabel="Orden de lista"
                  value={sortOrder}
                  options={sortOptions}
                  onChange={(next) => {
                    setSortOrder(next as SortOrder);
                    setCurrentPage(1);
                  }}
                />
              </label>
            </div>
          )}

          <div className="dark-table-wrap">
            <table className="dark-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <span className="check-dot" />
                  </th>
                  <th>NOMBRE</th>
                  <th>EMAIL</th>
                  <th>USUARIO</th>
                  <th>ROL</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={effectiveSelectedUserId === u.id ? 'row-selected' : ''}
                    onClick={() => setSelectedUserId(u.id)}
                  >
                    <td className="col-check">
                      <button
                        className={`row-check ${effectiveSelectedUserId === u.id ? 'row-check-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserId(u.id);
                        }}
                        aria-label={`Seleccionar ${u.fullName}`}
                      />
                    </td>
                    <td>
                      <div className="name-cell">
                        <span className="name-avatar">{getInitials(u.fullName)}</span>
                        <span>{u.fullName}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`role-pill role-${u.role.toLowerCase()}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${u.status === 'ACTIVO' ? 'status-active' : 'status-inactive'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-users-list">
            {pagedUsers.map((u) => (
              <article
                key={u.id}
                className={`mobile-user-card ${selectedUserId === u.id ? 'mobile-user-card-selected' : ''}`}
                onClick={() => setSelectedUserId(u.id)}
              >
                <div className="mobile-user-row">
                  <div className="name-cell">
                    <span className="name-avatar">{getInitials(u.fullName)}</span>
                    <div>
                      <strong>{u.fullName}</strong>
                      <small>@{u.username}</small>
                    </div>
                  </div>
                  <button
                    className={`row-check ${selectedUserId === u.id ? 'row-check-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUserId(u.id);
                    }}
                    aria-label={`Seleccionar ${u.fullName}`}
                  />
                </div>
                <p className="mobile-user-email">{u.email}</p>
                <div className="mobile-user-meta">
                  <span className={`role-pill role-${u.role.toLowerCase()}`}>{u.role}</span>
                  <span className={`status-pill ${u.status === 'ACTIVO' ? 'status-active' : 'status-inactive'}`}>
                    {u.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="table-footer">
            <small>
              Mostrando {pagedUsers.length} de {filteredUsers.length} usuarios
            </small>
            <div className="pager">
              <button
                className="pager-btn"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`pager-btn ${safeCurrentPage === page ? 'pager-btn-active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="pager-btn"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </section>
      <nav className="mobile-bottom-nav" aria-label="Navegacion principal">
        <button className="mobile-nav-item">
          <span className="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M4 4h7v7H4V4Zm9 0h7v5h-7V4ZM13 11h7v9h-7v-9ZM4 13h7v7H4v-7Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <small>Inicio</small>
        </button>
        <button className="mobile-nav-item">
          <span className="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M4 7.5 12 4l8 3.5-8 3.5L4 7.5Zm2 3.1 5 2.2v6L6 16.6v-6Zm12 0v6l-5 2.2v-6l5-2.2Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <small>Stock</small>
        </button>
        <button className="mobile-nav-item mobile-nav-item-active">
          <span className="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M7 5H5l-1 2H2v2h2l2.6 8.1A2 2 0 0 0 8.5 19H18v-2H8.5l-.5-2H18a2 2 0 0 0 1.9-1.4L22 7H7.4L7 5Zm2 15a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <small>Ventas</small>
        </button>
        <button className="mobile-nav-item">
          <span className="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M4 19h16v1.8H4V19Zm2-2V9h2v8H6Zm5 0V4h2v13h-2Zm5 0v-6h2v6h-2Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <small>Stats</small>
        </button>
        <button className="mobile-nav-item">
          <span className="mobile-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="m19.14 12.94.04-.94-.04-.94 2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58-.04.94.04.94-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <small>Perfil</small>
        </button>
      </nav>

      {newOpen && (
        <div className="modal-overlay">
          <div className="dark-modal">
            <div className="modal-header">
              <h3>Agregar Usuario</h3>
              <button className="icon-close" onClick={() => setNewOpen(false)}>
                x
              </button>
            </div>
            <div className="modal-body">
              <label>
                Nombre Completo
                <input
                  className="dark-field"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </label>
              <label>
                Correo Electronico
                <input
                  className="dark-field"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>

              <div className="two-col">
                <label>
                  Nombre de Usuario
                  <input
                    className="dark-field"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  />
                </label>
                <label>
                  Contrasena
                  <input
                    className="dark-field"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </label>
              </div>

              <div className="two-col">
                <label>
                  Rol
                  <CustomSelect
                    selectId="create-role"
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    ariaLabel="Rol de usuario"
                    value={form.role}
                    options={roleOptions}
                    onChange={(next) => setForm((p) => ({ ...p, role: next as Role }))}
                  />
                </label>
                <label>
                  Estado
                  <CustomSelect
                    selectId="create-status"
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    ariaLabel="Estado de usuario"
                    value={form.status}
                    options={statusOptions}
                    onChange={(next) => setForm((p) => ({ ...p, status: next as UserStatus }))}
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setNewOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={createUser}>
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="dark-modal">
            <div className="modal-header">
              <h3>Modificar Usuario</h3>
              <button className="icon-close" onClick={() => setEditOpen(false)}>
                x
              </button>
            </div>
            <div className="modal-body">
              <label>
                Nombre Completo
                <input
                  className="dark-field"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </label>
              <label>
                Correo Electronico
                <input
                  className="dark-field"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </label>

              <div className="two-col">
                <label>
                  Nombre de Usuario
                  <input
                    className="dark-field"
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  />
                </label>
                <label>
                  Contrasena
                  <input
                    className="dark-field"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </label>
              </div>

              <div className="two-col">
                <label>
                  Rol
                  <CustomSelect
                    selectId="edit-role"
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    ariaLabel="Rol de usuario"
                    value={form.role}
                    options={roleOptions}
                    onChange={(next) => setForm((p) => ({ ...p, role: next as Role }))}
                  />
                </label>
                <label>
                  Estado
                  <CustomSelect
                    selectId="edit-status"
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    ariaLabel="Estado de usuario"
                    value={form.status}
                    options={statusOptions}
                    onChange={(next) => setForm((p) => ({ ...p, status: next as UserStatus }))}
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={updateUser}>
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="dark-modal danger-modal">
            <div className="danger-icon">!</div>
            <h3>Estas seguro de eliminar el usuario?</h3>
            <p>
              Esta accion no se puede deshacer. Se eliminara permanentemente al usuario {selectedUser.fullName} y
              todos sus accesos asociados al sistema.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteUser}>
                Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
