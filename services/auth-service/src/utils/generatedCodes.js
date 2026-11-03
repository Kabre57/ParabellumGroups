const toAscii = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const toRoleCodeBase = (name) => toAscii(name)
  .toUpperCase()
  .replace(/[^A-Z]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 50) || 'ROLE';

const toServiceCodeBase = (name) => toAscii(name)
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '')
  .slice(0, 10) || 'SERVICE';

const findAvailableCode = async ({ base, maxLength, exists, suffixFor }) => {
  for (let index = 1; ; index += 1) {
    const suffix = index === 1 ? '' : suffixFor(index);
    const code = `${base.slice(0, maxLength - suffix.length)}${suffix}`;
    if (!await exists(code)) return code;
  }
};

const generateRoleCode = async (prisma, name) => findAvailableCode({
  base: toRoleCodeBase(name),
  maxLength: 50,
  exists: async (code) => Boolean(await prisma.role.findUnique({ where: { code }, select: { id: true } })),
  suffixFor: (index) => `_${index}`,
});

const generateServiceCode = async (prisma, name) => findAvailableCode({
  base: toServiceCodeBase(name),
  maxLength: 10,
  exists: async (code) => Boolean(await prisma.service.findUnique({ where: { code }, select: { id: true } })),
  suffixFor: (index) => String(index),
});

module.exports = { generateRoleCode, generateServiceCode };
