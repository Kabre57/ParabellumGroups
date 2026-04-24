const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');

const prismaLogs = ['error'];

if (process.env.PRISMA_LOG_WARN === 'true') {
  prismaLogs.push('warn');
}

if (process.env.PRISMA_LOG_QUERIES === 'true') {
  prismaLogs.push('query');
}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const toSnakeColumn = (key) => {
  const map = {
    passwordHash: 'password_hash',
    firstName: 'first_name',
    lastName: 'last_name',
    roleId: 'role_id',
    serviceId: 'service_id',
    enterpriseId: 'enterprise_id',
    isActive: 'is_active',
    lastLogin: 'last_login',
    avatarUrl: 'avatar_url',
    employeeNumber: 'employee_number',
    registrationNumber: 'registration_number',
    dateOfBirth: 'date_of_birth',
    placeOfBirth: 'place_of_birth',
    socialSecurityNumber: 'social_security_number',
    cnpsNumber: 'cnps_number',
    cnamNumber: 'cnam_number',
    bankAccount: 'bank_account',
    emergencyContact: 'emergency_contact',
    hireDate: 'hire_date',
    expiresAt: 'expires_at',
    isRevoked: 'is_revoked',
    ipAddress: 'ip_address',
    userAgent: 'user_agent',
    entityType: 'entity_type',
    entityId: 'entity_id',
    newValue: 'new_value',
    oldValue: 'old_value',
  };

  return map[key] || key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const createSqlFallback = () => {
  const rawDatabaseUrl = process.env.DATABASE_URL;

  if (!rawDatabaseUrl) {
    throw new Error('DATABASE_URL is required for SQL fallback mode');
  }

  const toPsqlDatabaseUrl = (value) => {
    const url = new URL(value);
    url.searchParams.delete('schema');
    return url.toString();
  };

  const databaseUrl = toPsqlDatabaseUrl(rawDatabaseUrl);

  const runPsql = (args) =>
    execFileSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

  const sqlLiteral = (value) => {
    if (value === null || value === undefined) return 'NULL';
    if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    return `'${String(value).replace(/'/g, "''")}'`;
  };

  const rows = (selectSql) => {
    const output = runPsql([
      '-t',
      '-A',
      '-c',
      `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (${selectSql}) t`,
    ]);

    return output ? JSON.parse(output) : [];
  };

  const mutationRows = (mutationSql) => {
    const output = runPsql([
      '-t',
      '-A',
      '-c',
      `WITH changed AS (${mutationSql}) SELECT COALESCE(json_agg(row_to_json(changed)), '[]'::json) FROM changed`,
    ]);

    return output ? JSON.parse(output) : [];
  };

  const execute = (sql) => runPsql(['-q', '-c', sql]);

  const userSelect = `
    SELECT
      u.id,
      u.email,
      u.password_hash AS "passwordHash",
      u.first_name AS "firstName",
      u.last_name AS "lastName",
      u.service_id AS "serviceId",
      u.role_id AS "roleId",
      u.enterprise_id AS "enterpriseId",
      u.is_active AS "isActive",
      u.last_login AS "lastLogin",
      u.preferences,
      u.permissions,
      u.avatar_url AS "avatarUrl",
      u.employee_number AS "employeeNumber",
      u.registration_number AS "registrationNumber",
      u.phone,
      u.address,
      u.position,
      u.department,
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt",
      CASE WHEN r.id IS NULL THEN NULL ELSE json_build_object(
        'id', r.id,
        'name', r.name,
        'code', r.code,
        'description', r.description,
        'rolePermissions', COALESCE((
          SELECT json_agg(json_build_object(
            'canView', rp.can_view,
            'canCreate', rp.can_create,
            'canEdit', rp.can_edit,
            'canDelete', rp.can_delete,
            'canApprove', rp.can_approve,
            'permission', json_build_object('name', p.name)
          ))
          FROM role_permissions rp
          JOIN permissions p ON p.id = rp.permission_id
          WHERE rp.role_id = r.id
        ), '[]'::json)
      ) END AS role,
      CASE WHEN s.id IS NULL THEN NULL ELSE json_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description
      ) END AS service,
      CASE WHEN e.id IS NULL THEN NULL ELSE json_build_object(
        'id', e.id,
        'name', e.name,
        'logoUrl', e.logo_url
      ) END AS enterprise,
      COALESCE((
        SELECT json_agg(json_build_object(
          'can_view', up.can_view,
          'can_create', up.can_create,
          'can_edit', up.can_edit,
          'can_delete', up.can_delete,
          'can_approve', up.can_approve,
          'permissions', json_build_object('name', p.name)
        ))
        FROM user_permissions up
        JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = u.id
      ), '[]'::json) AS user_permissions
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    LEFT JOIN services s ON s.id = u.service_id
    LEFT JOIN enterprises e ON e.id = u.enterprise_id
  `;

  const getUser = (where = {}) => {
    let predicate = null;
    if (hasOwn(where, 'id')) predicate = `u.id = ${Number(where.id)}`;
    if (hasOwn(where, 'email')) predicate = `LOWER(u.email) = LOWER(${sqlLiteral(where.email)})`;
    if (!predicate) return null;
    return rows(`${userSelect} WHERE ${predicate} LIMIT 1`)[0] || null;
  };

  const updateUser = ({ where, data }) => {
    const clauses = Object.entries(data || {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `"${toSnakeColumn(key)}" = ${sqlLiteral(value)}`);

    clauses.push('"updated_at" = NOW()');

    const predicate = hasOwn(where, 'email')
      ? `LOWER(email) = LOWER(${sqlLiteral(where.email)})`
      : `id = ${Number(where.id)}`;

    execute(`UPDATE users SET ${clauses.join(', ')} WHERE ${predicate}`);
    return getUser(where);
  };

  const createRefreshToken = ({ data }) => {
    const id = data.id || crypto.randomUUID();
    execute(`
      INSERT INTO refresh_tokens (
        id, token, user_id, expires_at, is_revoked, ip_address, user_agent, created_at, updated_at
      )
      VALUES (
        ${sqlLiteral(id)},
        ${sqlLiteral(data.token)},
        ${Number(data.userId)},
        ${sqlLiteral(data.expiresAt)},
        ${sqlLiteral(Boolean(data.isRevoked))},
        ${sqlLiteral(data.ipAddress)},
        ${sqlLiteral(data.userAgent)},
        NOW(),
        NOW()
      )
    `);
    return { id, ...data, isRevoked: Boolean(data.isRevoked) };
  };

  const getRefreshToken = ({ where }) => {
    if (!where?.token) return null;
    const tokenRows = rows(`
      SELECT
        id,
        token,
        user_id AS "userId",
        expires_at AS "expiresAt",
        is_revoked AS "isRevoked",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM refresh_tokens
      WHERE token = ${sqlLiteral(where.token)}
      LIMIT 1
    `);
    const token = tokenRows[0];
    if (!token) return null;
    token.user = getUser({ id: token.userId });
    return token;
  };

  const updateRefreshToken = ({ where, data }) => {
    if (!where?.token) return null;
    const clauses = Object.entries(data || {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `"${toSnakeColumn(key)}" = ${sqlLiteral(value)}`);
    clauses.push('"updated_at" = NOW()');
    execute(`UPDATE refresh_tokens SET ${clauses.join(', ')} WHERE token = ${sqlLiteral(where.token)}`);
    return getRefreshToken({ where });
  };

  const updateManyRefreshTokens = ({ where = {}, data = {} }) => {
    const clauses = Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `"${toSnakeColumn(key)}" = ${sqlLiteral(value)}`);
    clauses.push('"updated_at" = NOW()');

    const predicates = [];
    if (where.token) predicates.push(`token = ${sqlLiteral(where.token)}`);
    if (where.userId) predicates.push(`user_id = ${Number(where.userId)}`);
    if (hasOwn(where, 'isRevoked')) predicates.push(`is_revoked = ${sqlLiteral(where.isRevoked)}`);

    const output = mutationRows(`
      UPDATE refresh_tokens
      SET ${clauses.join(', ')}
      ${predicates.length ? `WHERE ${predicates.join(' AND ')}` : ''}
      RETURNING id
    `);
    return { count: output.length };
  };

  const deleteManyRefreshTokens = () => {
    const output = mutationRows(`
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
         OR (is_revoked = TRUE AND created_at < NOW() - INTERVAL '30 days')
      RETURNING id
    `);
    return { count: output.length };
  };

  const createAuditLog = ({ data }) => {
    execute(`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, details, old_value, new_value,
        level, ip_address, user_agent, created_at
      )
      VALUES (
        ${data.userId == null ? 'NULL' : Number(data.userId)},
        ${sqlLiteral(data.action)},
        ${sqlLiteral(data.entityType)},
        ${sqlLiteral(data.entityId)},
        ${sqlLiteral(data.details)},
        ${sqlLiteral(data.oldValue)},
        ${sqlLiteral(data.newValue)},
        ${sqlLiteral(data.level || 'INFO')},
        ${sqlLiteral(data.ipAddress)},
        ${sqlLiteral(data.userAgent)},
        NOW()
      )
    `);
    return { id: null, ...data };
  };

  const createUser = ({ data }) => {
    const created = mutationRows(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, role_id, service_id,
        enterprise_id, is_active, created_at, updated_at
      )
      VALUES (
        ${sqlLiteral(data.email)},
        ${sqlLiteral(data.passwordHash)},
        ${sqlLiteral(data.firstName)},
        ${sqlLiteral(data.lastName)},
        ${data.roleId == null ? 'NULL' : Number(data.roleId)},
        ${data.serviceId == null ? 'NULL' : Number(data.serviceId)},
        ${data.enterpriseId == null ? 'NULL' : Number(data.enterpriseId)},
        ${sqlLiteral(data.isActive !== false)},
        NOW(),
        NOW()
      )
      RETURNING id
    `)[0];
    return getUser({ id: created.id });
  };

  const roleSelect = `
    SELECT id, name, code, description, is_system AS "isSystem", is_active AS "isActive"
    FROM roles
  `;

  const fallback = {
    __isSqlFallback: true,
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    user: {
      findUnique: async (params) => getUser(params?.where),
      update: async (params) => updateUser(params),
      create: async (params) => createUser(params),
    },
    role: {
      findUnique: async ({ where }) => {
        if (where?.code) return rows(`${roleSelect} WHERE code = ${sqlLiteral(where.code)} LIMIT 1`)[0] || null;
        if (where?.id) return rows(`${roleSelect} WHERE id = ${Number(where.id)} LIMIT 1`)[0] || null;
        return null;
      },
      create: async ({ data }) => {
        const created = mutationRows(`
          INSERT INTO roles (name, code, description, is_system, is_active, created_at, updated_at)
          VALUES (
            ${sqlLiteral(data.name)},
            ${sqlLiteral(data.code)},
            ${sqlLiteral(data.description)},
            ${sqlLiteral(Boolean(data.isSystem))},
            ${sqlLiteral(data.isActive !== false)},
            NOW(),
            NOW()
          )
          RETURNING id
        `)[0];
        return rows(`${roleSelect} WHERE id = ${Number(created.id)} LIMIT 1`)[0] || null;
      },
    },
    refreshToken: {
      create: async (params) => createRefreshToken(params),
      findUnique: async (params) => getRefreshToken(params),
      update: async (params) => updateRefreshToken(params),
      updateMany: async (params) => updateManyRefreshTokens(params),
      deleteMany: async () => deleteManyRefreshTokens(),
    },
    auditLog: {
      create: async (params) => createAuditLog(params),
    },
  };

  return new Proxy(fallback, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return new Proxy(
        {},
        {
          get() {
            return async () => {
              throw new Error(`Prisma model ${String(prop)} is unavailable in SQL fallback mode`);
            };
          },
        }
      );
    },
  });
};

let prisma;

try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient({ log: prismaLogs });
} catch (error) {
  console.warn('Prisma client unavailable, using SQL fallback:', error.message);
  prisma = createSqlFallback();
}

module.exports = prisma;
