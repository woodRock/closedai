import pc from 'picocolors';

export function printHeader() {
  console.log(pc.bold(pc.magenta("====================================================")));
  console.log(pc.bold(pc.magenta("         🤖 CLOSED-AI BOT ENGINE v1.1              ")));
  console.log(pc.bold(pc.magenta("====================================================")));
  console.log(`${pc.gray("Status:")} ${pc.green("Online")}`);
  console.log(`${pc.gray("Mode:")}   ${process.argv.includes('--poll') ? pc.yellow("Polling") : pc.blue("Batch Process")}`);
  console.log(pc.gray("----------------------------------------------------\n"));
}

export function logInstruction(chatId: number, type: string, details: string) {
  const timestamp = new Date().toLocaleTimeString();
  const colorMap: any = {
    'WRITE': pc.blue,
    'READ': pc.cyan,
    'SHELL': pc.yellow,
    'REPLY': pc.green,
    'GEMINI': pc.magenta,
    'GIT': pc.blue,
    'ERROR': pc.red,
    'CMD': pc.white,
    'INFO': pc.gray
  };
  const color = colorMap[type] || pc.white;
  console.log(`${pc.gray(`[${timestamp}]`)} ${pc.bold(pc.white(`[Chat ${chatId}]`))} ${color(type.padEnd(6))} ${details}`);
}
