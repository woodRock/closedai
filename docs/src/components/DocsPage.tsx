import React, { useEffect } from 'react';
import styles from './DocsPage.module.css';

const DocsPage: React.FC = () => {
  useEffect(() => {
    const reveal = () => {
      const reveals = document.querySelectorAll("section");
      reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 100;
        if (elementTop < windowHeight - elementVisible) {
          el.classList.add(styles.active);
        }
      });
    };
    window.addEventListener("scroll", reveal);
    reveal();

    return () => window.removeEventListener("scroll", reveal);
  }, []);

  const workflowCode = `name: ClosedAI Agent
on:
  schedule:
    - cron: '*/5 * * * *' # Check for messages every 5 minutes
  workflow_dispatch:      # Allow manual trigger

permissions:
  contents: write         # Required for the bot to push code changes

jobs:
  run-bot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Run ClosedAI
        uses: woodRock/closedai@main
        with:
          telegram_bot_token: \${{ secrets.TELEGRAM_BOT_TOKEN }}
          gemini_api_key: \${{ secrets.GEMINI_API_KEY }}
          firebase_service_account: \${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          allowed_user_ids: \${{ secrets.ALLOWED_TELEGRAM_USER_IDS }}`;

  return (
    <div className={styles.body}>
      {/* Navbar */}
      <nav className={`${styles.fixed} ${styles['w-full']} ${styles['z-50']} ${styles['px-6']} ${styles['py-4']}`}>
        <div className={`${styles['max-w-7xl']} ${styles['rounded-2xl']} ${styles['px-6']} ${styles['py-3']} ${styles.flex} ${styles['justify-between']} ${styles['items-center']} ${styles.glass}`}>
          <div className={`${styles.flex} ${styles['items-center']} ${styles['space-x-3']}`}>
            <div className={`${styles['w-10']} ${styles['h-10']} ${styles['bg-blue-600']} ${styles['rounded-xl']} ${styles.flex} ${styles['items-center']} ${styles['justify-center']}`}>
              <svg className={`${styles['w-6']} ${styles['h-6']} ${styles['text-white']}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>ClosedAI</span>
          </div>
          <div className={`${styles.md_flex} ${styles.hidden} ${styles['items-center']} ${styles['space-x-8']} ${styles['text-sm']} ${styles['font-medium']}`}>
            <a href="#prerequisites" className={styles['text-gray-400']}>Prerequisites</a>
            <a href="#setup" className={styles['text-gray-400']}>Setup</a>
            <a href="#features" className={styles['text-gray-400']}>Features</a>
            <a href="https://github.com/marketplace/actions/closedai-devops-on-autopilot" target="_blank" rel="noopener noreferrer" className={styles['btn-github']}>Marketplace</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`${styles.relative} ${styles['pt-48']} ${styles['pb-32']} ${styles.reveal}`}>
        <div className={`${styles.absolute} ${styles['hero-glow']}`}></div>
        <div className={`${styles['max-w-7xl']} ${styles['px-6']} ${styles['text-center']}`}>
          <div className={`${styles['inline-block']} ${styles['px-4']} ${styles['py-1']} ${styles['mb-6']} ${styles['rounded-full']} ${styles['bg-blue-500/10']} ${styles['text-blue-400']} ${styles['text-sm']} ${styles['font-medium']} ${styles['border']} ${styles['border-blue-500/20']}`}>
            v1.0.0 Now Available on GitHub Marketplace
          </div>
          <h1 className={`${styles['text-7xl']} ${styles.md_text_9xl} ${styles['font-extrabold']} ${styles['mb-8']} ${styles['text-white']}`}>
            Automate DevOps <br />
            <span className={styles['gradient-text']}>with GitHub Actions.</span>
          </h1>
          <p className={`${styles['text-xl']} ${styles['text-gray-400']} ${styles['max-w-3xl']} ${styles['mb-12']} ${styles['font-light']}`}>
            ClosedAI is an autonomous AI agent that lives in your GitHub Actions. 
            Control your repository, run commands, and deploy code directly from Telegram.
          </p>
          <div className={`${styles.flex} ${styles['justify-center']} ${styles['gap-6']} ${styles['mb-24']}`}>
            <a href="https://github.com/marketplace/actions/closedai-devops-on-autopilot" target="_blank" rel="noopener noreferrer" className={styles['btn-primary']}>
              Deploy to GitHub
            </a>
            <a href="#setup" className={styles['btn-secondary']}>
              Setup Guide
            </a>
          </div>

          {/* Terminal Mockup */}
          <div className={`${styles['max-w-4xl']} ${styles.relative}`}>
            <div className={`${styles.relative} ${styles['rounded-3xl']} ${styles['p-2']} ${styles.glass}`}>
              <div className={`${styles['bg-black']} ${styles['rounded-2xl']} ${styles['p-8']} ${styles['text-left']} ${styles['font-mono']} ${styles['text-sm']}`}>
                <div className={styles['mb-6']}>
                  <span className={styles['text-blue-400']}>Telegram:</span>
                  <span className={`${styles['text-gray-300']} ${styles['p-4']}`}>"Build the project and deploy to production"</span>
                </div>
                <div className={`${styles['text-yellow-400']} ${styles['mb-4']}`}>Executing: shell command "npm run build && firebase deploy"</div>
                <div className={`${styles['bg-black']} ${styles['p-4']} ${styles['rounded-xl']} ${styles['text-gray-400']}`}>
                  <div>{'>'} Building for production...</div>
                  <div>{'>'} Uploading to Firebase...</div>
                  <div>{'>'} Project Console: https://console.firebase.google.com/...</div>
                </div>
                <div className={`${styles['text-green-400']} ${styles['mt-4']}`}>Deployment successful! Live at: https://closed-ai.web.app</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prerequisites */}
      <section id="prerequisites" className={`${styles['py-32']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={`${styles['max-w-4xl']} ${styles['mx-auto']}`}>
          <h2 className={`${styles['text-4xl']} ${styles['font-bold']} ${styles['mb-4']} ${styles['text-center']} ${styles['text-white']}`}>Prerequisites</h2>
          <p className={`${styles['text-center']} ${styles['text-gray-400']} ${styles['mb-12']}`}>Follow these steps to gather your credentials.</p>
          <div className={`${styles.grid} ${styles.md_grid_cols_2} ${styles['gap-8']}`}>
            <div className={`${styles.glass} ${styles['p-8']} ${styles['rounded-2xl']}`}>
              <h3 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']} ${styles['mb-4']}`}>1. Telegram Bot Token</h3>
              <p className={`${styles['text-gray-400']} ${styles['mb-4']}`}>Message <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer" className={styles['text-blue-400']}>@BotFather</a> to create a bot and get your token.</p>
              <p className={styles['text-gray-500']} style={{ fontSize: '0.875rem' }}>Also find your ID via <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className={styles['text-blue-400']}>@userinfobot</a>.</p>
            </div>
            <div className={`${styles.glass} ${styles['p-8']} ${styles['rounded-2xl']}`}>
              <h3 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']} ${styles['mb-4']}`}>2. Gemini API Key</h3>
              <p className={styles['text-gray-400']}>Get a free API key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className={styles['text-blue-400']}>Google AI Studio</a>. ClosedAI uses Gemini 1.5 Flash for high efficiency.</p>
            </div>
            <div className={`${styles.glass} ${styles['p-8']} ${styles['rounded-2xl']}`}>
              <h3 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']} ${styles['mb-4']}`}>3. Firebase Setup</h3>
              <p className={`${styles['text-gray-400']} ${styles['mb-4']}`}>1. Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className={styles['text-blue-400']}>Firebase Console</a> and create a project.</p>
              <p className={`${styles['text-gray-400']} ${styles['mb-4']}`}>2. Enable <b>Firestore Database</b>.</p>
              <p className={`${styles['text-gray-400']}`}>3. Go to <b>Project Settings {'>'} Service Accounts</b> and click "Generate new private key".</p>
            </div>
            <div className={`${styles.glass} ${styles['p-8']} ${styles['rounded-2xl']}`}>
              <h3 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']} ${styles['mb-4']}`}>4. GitHub Permissions</h3>
              <p className={styles['text-gray-400']}>In your repo, go to <b>Settings {'>'} Actions {'>'} General</b>. Under "Workflow permissions", select <b>"Read and write permissions"</b> and save.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Guide */}
      <section id="setup" className={`${styles['py-32']} ${styles['bg-white/5']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={`${styles['max-w-4xl']} ${styles['mx-auto']} ${styles['p-12']} ${styles['rounded-3xl']} ${styles.glass}`}>
          <h2 className={`${styles['text-4xl']} ${styles['font-bold']} ${styles['mb-12']} ${styles['text-center']} ${styles['text-white']}`}>Deployment</h2>
          <div className={styles['space-y-12']}>
            <div className={`${styles.flex} ${styles['gap-8']} ${styles['items-start']}`}>
              <div className={styles['step-number']}>1</div>
              <div className={styles['w-full']}>
                <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>Add GitHub Secrets</h4>
                <p className={`${styles['text-gray-400']} ${styles['mb-4']}`}>Go to <b>Settings {'>'} Secrets and variables {'>'} Actions</b> and add these secrets:</p>
                <div className={styles['table-container']}>
                  <table>
                    <thead>
                      <tr>
                        <th>Secret Name</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>TELEGRAM_BOT_TOKEN</code></td>
                        <td>Token from @BotFather</td>
                      </tr>
                      <tr>
                        <td><code>GEMINI_API_KEY</code></td>
                        <td>Key from Google AI Studio</td>
                      </tr>
                      <tr>
                        <td><code>FIREBASE_SERVICE_ACCOUNT</code></td>
                        <td>Full content of the service account JSON file</td>
                      </tr>
                      <tr>
                        <td><code>ALLOWED_TELEGRAM_USER_IDS</code></td>
                        <td>Your ID from @userinfobot</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className={`${styles.flex} ${styles['gap-8']} ${styles['items-start']}`}>
              <div className={styles['step-number']}>2</div>
              <div>
                <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>Create Workflow File</h4>
                <p className={`${styles['text-gray-400']} ${styles['mb-4']}`}>Create <code>.github/workflows/closedai.yml</code> in your repository with this content:</p>
                <pre className={styles['code-block']}>
                  {workflowCode}
                </pre>
              </div>
            </div>
            <div className={`${styles.flex} ${styles['gap-8']} ${styles['items-start']}`}>
              <div className={styles['step-number']}>3</div>
              <div>
                <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>Start Chatting</h4>
                <p className={`${styles['text-gray-400']}`}>Once you push the file, the action will run every 5 minutes. You can also trigger it manually from the <b>Actions</b> tab. Send <code>"Hello"</code> to your bot to begin!</p>
              </div>
            </div>
          </div>
          <div className={`${styles['mt-24']} ${styles['text-center']}`}>
            <a href="https://github.com/marketplace/actions/closedai-devops-on-autopilot" target="_blank" rel="noopener noreferrer" className={styles['btn-primary']}>
              View on Marketplace
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`${styles['py-32']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={styles['max-w-7xl']}>
          <div className={`${styles.grid} ${styles.md_grid_cols_3} ${styles['gap-12']}`}>
            <div className={styles['space-y-6']}>
              <div className={`${styles['icon-box']} ${styles['bg-blue-600']}`}>
                <i className={`${styles['text-white']} fas fa-bolt`}></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Instant Execution</h3>
              <p className={styles['text-gray-400']}>Runs your commands in the secure environment of GitHub Actions, with full access to your repo.</p>
            </div>
            <div className={styles['space-y-6']}>
              <div className={`${styles['icon-box']} ${styles['bg-purple-500']}`}>
                <i className={`${styles['text-white']} fas fa-brain`}></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Advanced Reasoning</h3>
              <p className={styles['text-gray-400']}>Powered by Gemini 1.5 Flash, capable of understanding complex project structures and codebases.</p>
            </div>
            <div className={styles['space-y-6']}>
              <div className={`${styles['icon-box']} ${styles['bg-pink-500']}`}>
                <i className={`${styles['text-white']} fas fa-lock`}></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Secure Access</h3>
              <p className={styles['text-gray-400']}>Strictly limited to authorized Telegram User IDs. Your repository remains safe and private.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${styles['py-20']} ${styles['text-center']} ${styles['border-t']} ${styles['border-white/10']}`}>
        <div className={`${styles.flex} ${styles['justify-center']} ${styles['items-center']} ${styles['space-x-3']} ${styles['mb-6']}`}>
          <div className={`${styles['w-8']} ${styles['h-8']} ${styles['bg-blue-600']} ${styles['rounded-lg']} ${styles.flex} ${styles['items-center']} ${styles['justify-center']}`}>
            <svg className={`${styles['w-5']} ${styles['h-5']} ${styles['text-white']}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>ClosedAI</span>
        </div>
        <p className={styles['text-gray-500']}>The first autonomous AI agent for GitHub Actions.</p>
        <div className={`${styles['mt-8']} ${styles['text-gray-600']} ${styles['text-sm']}`}>
          &copy; {new Date().getFullYear()} ClosedAI. Built for the future of DevOps.
        </div>
      </footer>
    </div>
  );
};

export default DocsPage;
