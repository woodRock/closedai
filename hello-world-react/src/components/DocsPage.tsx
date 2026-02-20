import { useEffect } from 'react';
import styles from './DocsPage.module.css';

const DocsPage: React.FC = () => {
  useEffect(() => {
    const reveal = () => {
      const reveals = document.querySelectorAll("section");
      reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
          el.classList.add(styles.active);
        }
      });
    };
    window.addEventListener("scroll", reveal);
    reveal();

    return () => window.removeEventListener("scroll", reveal);
  }, []);

  return (
    <div className={`selection:bg-blue-500/30 overflow-x-hidden ${styles.body}`}>
      {/* Navbar */}
      <nav className="fixed w-full z-50 px-6 py-4">
        <div className={`max-w-7xl mx-auto rounded-2xl px-6 py-3 flex justify-between items-center ${styles.glass}`}>
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tighter text-white">ClosedAI</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition">
              Workflow
            </a>
            <a href="#setup" className="hover:text-white transition">
              Setup
            </a>
            <a href="#instant-mode" className="hover:text-white transition">
              Instant Mode
            </a>
            <a
              href="https://github.com/woodRock/closedai"
              className="bg-white text-black px-5 py-2 rounded-full hover:bg-gray-200 transition font-bold"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`relative pt-48 pb-32 overflow-hidden ${styles.reveal}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] -z-10"></div>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter mb-8 leading-tight text-white">
            DevOps on <br />
            <span className={styles['gradient-text']}>Autopilot.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            Meet the first autonomous AI agent designed to live inside your{' '}
            <span className="text-white font-medium">GitHub Actions</span>.
            Build, refactor, and manage your entire codebase via Telegram.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-24">
            <a
              href="#setup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl text-xl font-bold transition-all shadow-2xl shadow-blue-600/20 flex items-center justify-center space-x-3 group"
            >
              <span>Deploy Now</span>
              <i className="fas fa-bolt group-hover:text-yellow-400 transition-colors"></i>
            </a>
            <a
              href="https://github.com/woodRock/closedai"
              className={`hover:bg-white/10 text-white px-12 py-5 rounded-2xl text-xl font-bold transition-all flex items-center justify-center space-x-3 ${styles.glass}`}
            >
              <i className="fab fa-github"></i>
              <span>View Source</span>
            </a>
          </div>

          {/* Terminal Mockup */}
          <div className="relative max-w-4xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className={`relative rounded-3xl p-2 ${styles.glass}`}>
              <div className="bg-gray-950 rounded-2xl overflow-hidden border border-white/10">
                <div className="bg-white/5 px-6 py-4 flex justify-between items-center border-b border-white/5">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/40"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/40"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/40"></div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase flex items-center">
                    <span className="mr-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    GitHub Action Active
                  </div>
                </div>
                
                <div className="p-8 text-left font-mono text-sm leading-relaxed overflow-x-auto">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <span className="text-blue-400 font-bold">Telegram:</span>
                      <span className="text-gray-300 ml-2">"Update the app entry point"</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-yellow-500/80">
                      <i className="fas fa-terminal text-xs"></i>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Executing: write_file</span>
                    </div>

                    <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                      <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">src/main.tsx</span>
                      </div>
                      <div className="p-4 text-[12px] leading-6 font-mono whitespace-pre">
                        <div className="flex">
                          <span className="text-gray-600 w-6 mr-4 text-right select-none">1</span>
                          <span><span className="text-purple-400">import</span> React <span className="text-purple-400">from</span> <span className="text-green-400">'react'</span></span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 w-6 mr-4 text-right select-none">2</span>
                          <span><span className="text-purple-400">import</span> {'{'} createRoot {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'react-dom/client'</span></span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 w-6 mr-4 text-right select-none">3</span>
                          <span><span className="text-purple-400">import</span> App <span className="text-purple-400">from</span> <span className="text-green-400">'./App'</span></span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 w-6 mr-4 text-right select-none">4</span>
                          <span></span>
                        </div>
                        <div className="flex bg-blue-500/10 -mx-4 px-4 border-l-2 border-blue-500">
                          <span className="text-blue-400/50 w-6 mr-4 text-right select-none">5</span>
                          <span><span className="text-blue-400">createRoot</span>(document.<span className="text-yellow-300">getElementById</span>(<span className="text-green-400">'root'</span>)!).<span className="text-yellow-300">render</span>(</span>
                        </div>
                        <div className="flex bg-blue-500/10 -mx-4 px-4 border-l-2 border-blue-500">
                          <span className="text-blue-400/50 w-6 mr-4 text-right select-none">6</span>
                          <span>  &lt;<span className="text-blue-400">App</span> /&gt;</span>
                        </div>
                        <div className="flex bg-blue-500/10 -mx-4 px-4 border-l-2 border-blue-500">
                          <span className="text-blue-400/50 w-6 mr-4 text-right select-none">7</span>
                          <span>);</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-green-400">
                      <i className="fas fa-check-circle text-xs"></i>
                      <span className="text-xs">Successfully updated src/main.tsx</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works (Action Diagram) */}
      <section id="how-it-works" className={`py-32 px-6 ${styles.reveal}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold mb-4 text-white">How it works</h2>
            <p className="text-gray-400 text-lg">
              A seamless loop between your phone and your production code.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 relative">
              {/* Connectors (Desktop) */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent -translate-y-1/2 -z-10"></div>

              <div className={`p-8 rounded-3xl text-center ${styles.glass}`}>
                <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 font-bold">
                  1
                </div>
                <h4 className="font-bold mb-2 text-white">Telegram</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You send a command via Telegram bot.
                </p>
              </div>
              <div className={`p-8 rounded-3xl text-center ${styles.glass}`}>
                <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-6 font-bold">
                  2
                </div>
                <h4 className="font-bold mb-2 text-white">Firestore</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Message is securely stored and queued.
                </p>
              </div>
              <div className={`p-8 rounded-3xl text-center border-blue-500/40 shadow-lg shadow-blue-500/10 ${styles.glass}`}>
                <div className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center mx-auto mb-6 font-bold">
                  3
                </div>
                <h4 className="font-bold mb-2 text-white">GitHub Action</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Workflow wakes up, pulls the message, and executes.
                </p>
              </div>
              <div className={`p-8 rounded-3xl text-center ${styles.glass}`}>
                <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 font-bold">
                  4
                </div>
                <h4 className="font-bold mb-2 text-white">Git Push</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Changes are committed and pushed back to your repo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className={`py-32 bg-white/5 px-6 ${styles.reveal}`}>
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-6">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">
                  <i className="fas fa-piggy-bank text-white"></i>
                </div>
                <h3 className="text-2xl font-bold text-white">Zero Overhead</h3>
                <p className="text-gray-400 leading-relaxed text-lg">
                  Forget about AWS, Heroku, or DigitalOcean. ClosedAI runs within
                  the generous free tier of GitHub Actions.
                </p>
              </div>
              <div className="space-y-6">
                <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30">
                  <i className="fas fa-brain text-white"></i>
                </div>
                <h3 className="text-2xl font-bold text-white">Powered by Gemini</h3>
                <p className="text-gray-400 leading-relaxed text-lg">
                  Uses Google's Gemini 3 Flash to understand context, write
                  high-quality code, and debug complex issues.
                </p>
              </div>
              <div className="space-y-6">
                <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-pink-500/30">
                  <i className="fas fa-shield-virus text-white"></i>
                </div>
                <h3 className="text-2xl font-bold text-white">Sandboxed & Secure</h3>
                <p className="text-gray-400 leading-relaxed text-lg">
                  Runs in a clean, isolated environment for every task. Only you
                  have the keys to your Kingdom.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Setup */}
        <section id="setup" className={`py-32 px-6 ${styles.reveal}`}>
          <div className={`max-w-4xl mx-auto p-12 rounded-[3rem] relative overflow-hidden ${styles.glass}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
            <h2 className="text-4xl font-bold mb-12 text-center text-white">
              Ready to start?
            </h2>

            <div className="space-y-12">
              <div className="flex gap-8">
                <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center font-bold text-gray-500">
                  1
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2 text-white">Bot Setup</h4>
                  <p className="text-gray-400 mb-4 text-sm">
                    Create a bot on{' '}
                    <a href="https://t.me/botfather" className="text-blue-400 underline">
                      Telegram
                    </a>{' '}
                    and copy the token.
                  </p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center font-bold text-gray-500">
                  2
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2 text-white">
                    Repository Secrets
                  </h4>
                  <p className="text-gray-400 mb-4 text-sm">
                    Go to Settings &gt; Secrets &gt; Actions and add the following:
                  </p>
                  <ul className="space-y-2 text-xs font-mono text-blue-300">
                    <li>• TELEGRAM_BOT_TOKEN</li>
                    <li>• GEMINI_API_KEY</li>
                    <li>• FIREBASE_SERVICE_ACCOUNT</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center font-bold text-gray-500">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold mb-2 text-white">Enable Action</h4>
                  <p className="text-gray-400 mb-4 text-sm">
                    Push this repository to your GitHub account. The workflow will
                    automatically start every 5 minutes.
                  </p>
                  <div className="bg-black/40 rounded-xl p-4 flex items-center justify-between">
                    <code className="text-blue-400 text-sm">git push origin main</code>
                    <i className="fas fa-check text-green-500"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center">
              <a
                href="https://github.com/woodRock/closedai/fork"
                className="bg-white text-black px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-transform inline-block"
              >
                Fork & Deploy Now
              </a>
            </div>
          </div>
        </section>

        {/* Instant Mode (Local Hosting) */}
        <section id="instant-mode" className={`py-32 px-6 ${styles.reveal}`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span>Real-time Response</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-white">
                  ⚡ Instant Mode
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed mb-8">
                  Want responses in seconds? Run ClosedAI on your{' '}
                  <strong>Raspberry Pi</strong>, <strong>Home Server</strong>, or{' '}
                  <strong>VPS</strong> to bypass the GitHub Action cron delay.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                      <i className="fas fa-bolt text-[10px]"></i>
                    </div>
                    <p className="text-gray-300">
                      Responses in <span className="text-white font-bold">&lt; 3 seconds</span>.
                    </p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                      <i className="fas fa-clock text-[10px]"></i>
                    </div>
                    <p className="text-gray-300">
                      Real-time <span className="text-white font-bold">Polling Mode</span> via
                      long-polling.
                    </p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                      <i className="fas fa-box text-[10px]"></i>
                    </div>
                    <p className="text-gray-300">
                      Docker-ready for <span className="text-white font-bold">Set-and-Forget</span>{' '}
                      reliability.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className={`p-8 rounded-[2.5rem] border-white/10 shadow-2xl overflow-hidden relative ${styles.glass}`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <i className="fas fa-microchip text-8xl text-white"></i>
                  </div>
                  <h4 className="text-xl font-bold mb-6 flex items-center text-white">
                    <i className="fas fa-terminal mr-3 text-blue-500"></i>
                    Self-Host Guide
                  </h4>
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
                        1. Clone &amp; Install
                      </p>
                      <div className="bg-black/60 rounded-xl p-4 font-mono text-sm text-blue-300 border border-white/5">
                        git clone https://github.com/woodrock/closedai.git<br />
                        cd closedai && npm install
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
                        2. Configure ENV
                      </p>
                      <div className="bg-black/60 rounded-xl p-4 font-mono text-sm text-purple-300 border border-white/5">
                        npm run setup
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
                        3. Start Supervisor
                      </p>
                      <div className="bg-black/60 rounded-xl p-4 font-mono text-sm text-green-300 border border-white/5">
                        npm run start:service
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">
                        Recommended: Docker
                      </p>
                      <code className="text-blue-400 text-xs">docker-compose up -d</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 px-6 text-center">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-bolt text-white text-xs"></i>
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">ClosedAI</span>
        </div>
        <p className="text-gray-500 text-sm mb-8">
          Empowering developers with autonomous Git workflows.
        </p>
        <div className="flex justify-center space-x-8 text-gray-400">
          <a href="https://github.com/woodRock/closedai" className="hover:text-white transition">
            <i className="fab fa-github"></i>
          </a>
          <a href="https://twitter.com" className="hover:text-white transition">
            <i className="fab fa-twitter"></i>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default DocsPage;
