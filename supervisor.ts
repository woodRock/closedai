import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function launch() {
  console.log('🚀 [Supervisor] Starting bot process...');
  
  const child = spawn('npx', ['tsx', 'bot.ts', '--poll'], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ [Supervisor] Bot exited normally. Restarting in 2 seconds...');
    } else {
      console.log(`❌ [Supervisor] Bot crashed with exit code ${code}. Restarting in 5 seconds...`);
    }
    
    setTimeout(launch, code === 0 ? 2000 : 5000);
  });

  child.on('error', (err) => {
    console.error('🔥 [Supervisor] Failed to start bot:', err);
    setTimeout(launch, 10000);
  });
}

launch();
