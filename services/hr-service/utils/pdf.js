const DEFAULT_CHROMIUM_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter(Boolean);

const buildPuppeteerLaunchOptions = () => {
  const executablePath = DEFAULT_CHROMIUM_PATHS.find(Boolean);

  return {
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };
};

module.exports = {
  buildPuppeteerLaunchOptions,
};
