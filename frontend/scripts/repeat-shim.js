// Ensures String.prototype.repeat never throws on negative counts in build workers
/* eslint-disable no-extend-native */
String.prototype.repeat = function repeat(count) {
  count = Math.max(0, Math.floor(count || 0));
  return new Array(count + 1).join(this);
};
if (process.stdout) {
  const cols = Number(process.env.COLUMNS || 120);
  const rows = Number(process.env.LINES || 60);
  process.stdout.columns = cols;
  process.stdout.rows = rows;
  if (!process.stdout.getWindowSize) {
    process.stdout.getWindowSize = () => [cols, rows];
  }
}
if (process.stderr) {
  const cols = Number(process.env.COLUMNS || 120);
  const rows = Number(process.env.LINES || 60);
  process.stderr.columns = cols;
  process.stderr.rows = rows;
  if (!process.stderr.getWindowSize) {
    process.stderr.getWindowSize = () => [cols, rows];
  }
}
