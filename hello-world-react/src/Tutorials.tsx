
const Tutorials = () => {
  return (
    <div className="space-y-8">
      <div className="glass p-8 rounded-3xl border border-white/10">
        <h2 className="text-3xl font-bold mb-6 gradient-text">Tutorials</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/5 p-6 rounded-2xl hover:bg-white/10 transition">
            <h3 className="text-xl font-bold mb-3 text-white">Getting Started</h3>
            <p className="text-gray-400 text-sm mb-4">
              Learn how to set up your first ClosedAI bot in less than 5 minutes.
            </p>
            <ol className="text-xs text-gray-500 space-y-2 list-decimal list-inside">
              <li>Create a Telegram Bot via @BotFather</li>
              <li>Fork this repository</li>
              <li>Add GEMINI_API_KEY to GitHub Secrets</li>
              <li>Send your first message!</li>
            </ol>
          </div>

          <div className="bg-white/5 p-6 rounded-2xl hover:bg-white/10 transition">
            <h3 className="text-xl font-bold mb-3 text-white">Advanced Refactoring</h3>
            <p className="text-gray-400 text-sm mb-4">
              Using ClosedAI to refactor large portions of your codebase safely.
            </p>
            <p className="text-xs text-gray-500">
              "Hey ClosedAI, migrate all my Express routes to Fastify and update the tests."
            </p>
          </div>

          <div className="bg-white/5 p-6 rounded-2xl hover:bg-white/10 transition">
            <h3 className="text-xl font-bold mb-3 text-white">Self-Hosting</h3>
            <p className="text-gray-400 text-sm mb-4">
              Run ClosedAI on your own hardware for instant execution.
            </p>
            <code className="text-[10px] text-blue-300">
              docker-compose up -d
            </code>
          </div>

          <div className="bg-white/5 p-6 rounded-2xl hover:bg-white/10 transition">
            <h3 className="text-xl font-bold mb-3 text-white">Custom Tools</h3>
            <p className="text-gray-400 text-sm mb-4">
              Extend the bot's capabilities by adding your own tools in src/tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorials;
