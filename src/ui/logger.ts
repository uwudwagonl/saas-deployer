import chalk from "chalk";

function link(url: string, label?: string): string {
  // OSC 8 hyperlink escape sequence for terminals that support it
  const text = label ?? url;
  return `\x1b]8;;${url}\x07${chalk.cyan.underline(text)}\x1b]8;;\x07`;
}

export const log = {
  info(message: string) {
    console.log(chalk.blue("ℹ"), message);
  },

  success(message: string) {
    console.log(chalk.green("✔"), message);
  },

  warn(message: string) {
    console.log(chalk.yellow("⚠"), message);
  },

  error(message: string) {
    console.log(chalk.red("✖"), message);
  },

  step(step: number, total: number, message: string) {
    console.log(chalk.dim(`[${step}/${total}]`), message);
  },

  link(url: string, label?: string) {
    console.log(`  ${chalk.bold("→")} ${link(url, label)}`);
  },

  dim(message: string) {
    console.log(chalk.dim(message));
  },

  blank() {
    console.log();
  },

  header(title: string) {
    console.log();
    console.log(chalk.bold.white(title));
    console.log(chalk.dim("─".repeat(title.length)));
  },
};
