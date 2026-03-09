// Custom build wrapper to avoid Turbopack TTY width issues in CI/containers
process.env.NODE_ENV = "production";
process.env.CI = process.env.CI || "1";
process.env.COLUMNS = process.env.COLUMNS || "120";
process.env.LINES = process.env.LINES || "60";
process.env.TERM = process.env.TERM || "xterm";
// Force webpack, disable Turbopack
process.env.NEXT_FORCE_WEBPACK = "1";
process.env.NEXT_USE_TURBOPACK = "0";
process.env.NEXT_SKIP_TURBOPACK = "1";
process.env.TURBOPACK = "0";
// Inject shim into all node workers to avoid negative repeat errors
const path = require("path");
const shimPath = path.join(__dirname, "repeat-shim.js");
process.env.NODE_OPTIONS = `--require ${shimPath}`;

// Guard against negative widths used by progress bars
// Clamp repeat count to zero if anything odd is passed
// eslint-disable-next-line no-extend-native
String.prototype.repeat = function repeat(count) {
  count = Math.max(0, Math.floor(count || 0));
  return new Array(count + 1).join(this);
};
if (process.stdout && !process.stdout.getWindowSize) {
  process.stdout.getWindowSize = () => [Number(process.env.COLUMNS || 120), Number(process.env.LINES || 60)];
}
if (process.stderr && !process.stderr.getWindowSize) {
  process.stderr.getWindowSize = () => [Number(process.env.COLUMNS || 120), Number(process.env.LINES || 60)];
}
if (process.stdout) {
  process.stdout.columns = Number(process.env.COLUMNS || 120);
  process.stdout.rows = Number(process.env.LINES || 60);
}
if (process.stderr) {
  process.stderr.columns = Number(process.env.COLUMNS || 120);
  process.stderr.rows = Number(process.env.LINES || 60);
}

const { nextBuild } = require("next/dist/cli/next-build");

nextBuild(
  {
    turbo: false,
    profile: false,
    mangling: true,
    experimentalDebugMemoryUsage: false,
  },
  process.cwd()
)
  .then(() => {
    // success
  })
  .catch((err) => {
    console.error(err);
    if (err && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  });
