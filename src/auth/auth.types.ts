/** The shape attached to req.user after JWT auth, and returned by /admin/me. */
export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

/** Access-token JWT payload. */
export interface AdminJwtPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  type: 'access';
}

/** Refresh-token JWT payload (httpOnly cookie). */
export interface AdminRefreshPayload {
  sub: string;
  type: 'refresh';
}
