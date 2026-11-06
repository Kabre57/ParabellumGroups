// Reference: the 18-page SYSCOHADA chart supplied on 2026-11-06, especially
// pages 8-12 (third parties and treasury) and 17-18 (other expenses/revenue).
// Configured company/global accounts take priority in accountTypeResolver.
// Mixed accounts deliberately return null: their configured parent is needed.
const GROUPS = new Set(('10 11 12 13 14 15 16 17 18 19 ' +
  '21 22 23 24 25 26 27 28 29 31 32 33 34 35 36 37 38 39 ' +
  '40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 ' +
  '60 61 62 63 64 65 66 67 68 69 70 71 72 73 75 77 78 79 ' +
  '81 82 83 84 85 86 87 88 89').split(' '));

const RULES = {
  '10': 'EQUITY', '11': 'EQUITY', '12': 'EQUITY', '13': 'EQUITY',
  '14': 'EQUITY', '15': 'EQUITY', '109': null,
  '16': 'LIABILITY', '17': 'LIABILITY',
  '181': 'LIABILITY', '182': 'LIABILITY', '183': 'LIABILITY',
  '19': 'LIABILITY', '1962': 'ASSET',
  '40': 'LIABILITY', '409': 'ASSET', '41': 'ASSET', '419': 'LIABILITY',
  '421': 'ASSET', '422': 'LIABILITY', '423': 'LIABILITY', '424': 'LIABILITY',
  '425': 'LIABILITY', '426': 'LIABILITY', '427': 'LIABILITY',
  '4281': 'LIABILITY', '4286': 'LIABILITY', '4287': 'ASSET',
  '43': 'LIABILITY', '438': null,
  '4381': 'LIABILITY', '4382': 'LIABILITY', '4386': 'LIABILITY', '4387': 'ASSET',
  '441': 'LIABILITY', '442': 'LIABILITY', '443': 'LIABILITY',
  '4441': 'LIABILITY', '4449': 'ASSET', '445': 'ASSET',
  '446': 'LIABILITY', '447': 'LIABILITY', '4486': 'LIABILITY', '4487': 'ASSET',
  '4491': 'LIABILITY', '4492': 'ASSET', '4493': 'ASSET', '4494': 'ASSET',
  '4495': 'ASSET', '4496': 'ASSET', '4497': 'LIABILITY', '4499': 'LIABILITY',
  '458': 'ASSET', '4611': 'ASSET', '4612': 'ASSET', '4613': 'ASSET',
  '4615': 'LIABILITY', '4616': 'LIABILITY', '4617': 'ASSET', '4619': 'LIABILITY',
  '462': 'LIABILITY', '465': 'LIABILITY', '467': 'ASSET',
  '4711': 'ASSET', '4712': 'LIABILITY', '4713': 'LIABILITY', '4715': 'LIABILITY',
  '4721': 'ASSET', '4726': 'LIABILITY', '4751': 'ASSET', '4752': 'LIABILITY',
  '476': 'ASSET', '477': 'LIABILITY', '478': 'ASSET', '479': 'LIABILITY',
  '481': 'LIABILITY', '482': 'LIABILITY', '484': 'LIABILITY',
  '485': 'ASSET', '488': 'ASSET',
  '490': 'ASSET', '491': 'ASSET', '492': 'ASSET', '493': 'ASSET',
  '494': 'ASSET', '495': 'ASSET', '496': 'ASSET', '497': 'ASSET', '498': 'ASSET',
  '499': 'LIABILITY',
  '50': 'ASSET', '51': 'ASSET', '52': 'ASSET', '526': null,
  '5261': 'LIABILITY', '5267': 'ASSET', '53': 'ASSET', '536': null,
  '545': 'ASSET', '55': 'ASSET', '56': 'LIABILITY', '57': 'ASSET',
  '581': 'ASSET', '582': 'ASSET',
  '590': 'ASSET', '591': 'ASSET', '592': 'ASSET', '593': 'ASSET', '594': 'ASSET',
  '599': 'LIABILITY',
  '81': 'EXPENSE', '82': 'REVENUE', '83': 'EXPENSE', '84': 'REVENUE',
  '85': 'EXPENSE', '86': 'REVENUE', '87': 'EXPENSE', '88': 'REVENUE', '89': 'EXPENSE',
};

const inferSyscohadaAccountType = (code) => {
  const normalized = String(code ?? '').trim();
  if (!/^[1-8]\d+$/.test(normalized) || !GROUPS.has(normalized.slice(0, 2))) return null;
  for (let length = Math.min(normalized.length, 4); length >= 2; length -= 1) {
    const prefix = normalized.slice(0, length);
    if (Object.prototype.hasOwnProperty.call(RULES, prefix)) return RULES[prefix];
  }
  if (normalized.startsWith('2') || normalized.startsWith('3')) return 'ASSET';
  if (normalized.startsWith('6')) return 'EXPENSE';
  if (normalized.startsWith('7')) return 'REVENUE';
  return null;
};

module.exports = { inferSyscohadaAccountType };
