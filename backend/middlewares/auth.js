import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export default function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...rolesOrIds) {
  return function (req, res, next) {
    const roleName = req?.user?.role ?? null;
    const roleId = req?.user?.roleId ?? null;
    const allowed = rolesOrIds.some((r) => (
      (typeof r === 'string' && r === roleName) ||
      (typeof r === 'number' && r === roleId)
    ));
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    return next();
  };
}

export const requireManager = requireRole('manager');
export const requireSupervisor = requireRole('supervisor');
export const requireChief = requireRole('chief');
export const requireDriver = requireRole('driver');
export const requireManpower = requireRole('manpower');
export const requireClient = requireRole('client', 'clients');
