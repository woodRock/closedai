
const Documentation = () => {
  return (
    <div className="space-y-8">
      <div className="glass p-8 rounded-3xl border border-white/10">
        <h2 className="text-3xl font-bold mb-6 gradient-text">Documentation</h2>
        <div className="space-y-6 text-gray-300">
          <section>
            <h3 className="text-xl font-semibold text-white mb-2">Overview</h3>
            <p>
              ClosedAI is an autonomous AI agent that runs entirely within your GitHub Actions environment.
              It listens for commands via a Telegram bot, processes them using Google's Gemini AI, 
              and applies changes directly to your repository.
            </p>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-white mb-2">Core Concepts</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><span className="text-blue-400 font-medium">Polling vs. Cron:</span> By default, it runs every 5 minutes via GitHub Actions cron. For instant responses, you can run it in polling mode on your own server.</li>
              <li><span className="text-blue-400 font-medium">Security:</span> All secrets are stored in GitHub Secrets. The bot only has access to what you provide.</li>
              <li><span className="text-blue-400 font-medium">Context Awareness:</span> The agent reads your file structure and relevant files to provide accurate code changes.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-white mb-2">Available Commands</h3>
            <div className="bg-black/40 rounded-xl p-4 font-mono text-sm">
              <p className="text-green-400">/start - Initialize the bot</p>
              <p className="text-green-400">/help - Show help message</p>
              <p className="text-gray-400"># Any other message is treated as a task for the AI</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
