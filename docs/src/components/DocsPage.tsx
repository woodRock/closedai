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
            <a href="#setup" className={styles['text-gray-400']}>Setup</a>
            <a href="#features" className={styles['text-gray-400']}>Features</a>
            <a href="#capabilities" className={styles['text-gray-400']}>Capabilities</a>
            <a href="#config" className={styles['text-gray-400']}>Config</a>
            <a href="https://github.com/woodRock/closedai" target="_blank" rel="noopener noreferrer" className={styles['btn-github']}>Star on GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`${styles.relative} ${styles['pt-48']} ${styles['pb-32']} ${styles.reveal}`}>
        <div className={`${styles.absolute} ${styles['hero-glow']}`}></div>
        <div className={`${styles['max-w-7xl']} ${styles['px-6']} ${styles['text-center']}`}>
          <h1 className={`${styles['text-7xl']} ${styles.md_text_9xl} ${styles['font-extrabold']} ${styles['mb-8']} ${styles['text-white']}`}>
            DevOps on <br />
            <span className={styles['gradient-text']}>Autopilot.</span>
          </h1>
          <p className={`${styles['text-xl']} ${styles['text-gray-400']} ${styles['max-w-3xl']} ${styles['mb-12']} ${styles['font-light']}`}>
            Meet the first autonomous AI agent designed to live inside your{' '}
            <span className={`${styles['text-white']} ${styles['font-medium']}`}>GitHub Actions</span>.
            Build, refactor, and manage your entire codebase via Telegram.
          </p>
          <div className={`${styles.flex} ${styles['justify-center']} ${styles['gap-6']} ${styles['mb-24']}`}>
            <a href="#setup" className={styles['btn-primary']}>
              Get Started
            </a>
            <a href="https://github.com/woodRock/closedai" target="_blank" rel="noopener noreferrer" className={styles['btn-secondary']}>
              View Source
            </a>
          </div>

          {/* Terminal Mockup */}
          <div className={`${styles['max-w-4xl']} ${styles.relative}`}>
            <div className={`${styles.relative} ${styles['rounded-3xl']} ${styles['p-2']} ${styles.glass}`}>
              <div className={`${styles['bg-black']} ${styles['rounded-2xl']} ${styles['p-8']} ${styles['text-left']} ${styles['font-mono']} ${styles['text-sm']}`}>
                <div className={styles['mb-6']}>
                  <span className={styles['text-blue-400']}>Telegram:</span>
                  <span className={`${styles['text-gray-300']} ${styles['p-4']}`}>"Update the app entry point"</span>
                </div>
                <div className={`${styles['text-yellow-400']} ${styles['mb-4']}`}>Executing: write_file to src/main.tsx</div>
                <div className={`${styles['bg-black']} ${styles['p-4']} ${styles['rounded-xl']} ${styles['text-gray-400']}`}>
                  <div>1 | <span className={styles['text-purple-400']}>import</span> React <span className={styles['text-purple-400']}>from</span> <span className={styles['text-green-400']}>'react'</span></div>
                  <div>2 | <span className={styles['text-purple-400']}>import</span> {'{'} createRoot {'}'} <span className={styles['text-purple-400']}>from</span> <span className={styles['text-green-400']}>'react-dom/client'</span></div>
                  <div>3 | <span className={styles['text-purple-400']}>import</span> App <span className={styles['text-purple-400']}>from</span> <span className={styles['text-green-400']}>'./App'</span></div>
                </div>
                <div className={`${styles['text-green-400']} ${styles['mt-4']}`}>Successfully updated src/main.tsx</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup (MOVED TO TOP) */}
      <section id="setup" className={`${styles['py-32']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={`${styles['max-w-4xl']} ${styles['p-12']} ${styles['rounded-3xl']} ${styles.glass}`}>
          <h2 className={`${styles['text-4xl']} ${styles['font-bold']} ${styles['mb-12']} ${styles['text-center']} ${styles['text-white']}`}>Quick Setup (GitHub Action)</h2>
          <div className={styles['space-y-8']}>
            <div className={`${styles.flex} ${styles['gap-8']} ${styles['items-start']}`}>
              <div className={styles['step-number']}>1</div>
              <div>
                <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>Add Workflow File</h4>
                <p className={`${styles['text-gray-400']} ${styles['mb-4']}`}>Create <code>.github/workflows/closedai.yml</code> in your repository.</p>
                <div className={styles['code-block']}>
                  name: ClosedAI<br/>
                  on:<br/>
                  &nbsp;&nbsp;schedule: [{cron: '*/5 * * * *'}]<br/>
                  jobs:<br/>
                  &nbsp;&nbsp;run-bot:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;runs-on: ubuntu-latest<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;steps:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- uses: actions/checkout@v4<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- uses: woodRock/closedai@main<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;with:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;telegram_bot_token: ${'{'}{ secrets.TELEGRAM_BOT_TOKEN }{'}'}<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;gemini_api_key: ${'{'}{ secrets.GEMINI_API_KEY }{'}'}<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;firebase_service_account: ${'{'}{ secrets.FIREBASE_SERVICE_ACCOUNT }{'}'}<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allowed_user_ids: ${'{'}{ secrets.ALLOWED_TELEGRAM_USER_IDS }{'}'}
                </div>
              </div>
            </div>
            <div className={`${styles.flex} ${styles['gap-8']} ${styles['items-start']}`}>
              <div className={styles['step-number']}>2</div>
              <div>
                <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>Configure Secrets</h4>
                <p className={`${styles['text-gray-400']} ${styles['mb-4']}`}>Add your <code>TELEGRAM_BOT_TOKEN</code>, <code>GEMINI_API_KEY</code>, <code>FIREBASE_SERVICE_ACCOUNT</code>, and <code>ALLOWED_TELEGRAM_USER_IDS</code> to your GitHub Repository Secrets.</p>
              </div>
            </div>
          </div>
          <div className={`${styles['mt-12']} ${styles['text-center']}`}>
            <a href="https://github.com/woodRock/closedai#quick-start-use-as-a-github-action" target="_blank" rel="noopener noreferrer" className={styles['btn-primary']}>
              View Full Setup Guide
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`${styles['py-32']} ${styles['bg-white/5']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={styles['max-w-7xl']}>
          <div className={`${styles.grid} ${styles.md_grid_cols_3} ${styles['gap-12']}`}>
            <div className={styles['space-y-6']}>
              <div className={`${styles['icon-box']} ${styles['bg-blue-600']}`}>
                <i className={`${styles['text-white']} fas fa-piggy-bank`}></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Zero Overhead</h3>
              <p className={styles['text-gray-400']}>Runs within the generous free tier of GitHub Actions. No servers to maintain.</p>
            </div>
            <div className={styles['space-y-6']}>
              <div className={`${styles['icon-box']} ${styles['bg-purple-500']}`}>
                <i className={`${styles['text-white']} fas fa-brain`}></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Powered by Gemini</h3>
              <p className={styles['text-gray-400']}>Uses Google's Gemini 3 Flash to write high-quality code with massive context windows.</p>
            </div>
            <div className={styles['space-y-6']}>
              <div className={`${styles['icon-box']} ${styles['bg-pink-500']}`}>
                <i className={`${styles['text-white']} fas fa-shield-virus`}></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Sandboxed</h3>
              <p className={styles['text-gray-400']}>Isolated environment for every task. Your main environment stays clean and safe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className={`${styles['py-32']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={styles['max-w-7xl']}>
          <h2 className={`${styles['text-4xl']} ${styles['font-bold']} ${styles['mb-16']} ${styles['text-center']} ${styles['text-white']}`}>Tool Capabilities</h2>
          <div className={`${styles.grid} ${styles.md_grid_cols_2} ${styles['gap-8']}`}>
            <div className={`${styles['p-8']} ${styles['rounded-3xl']} ${styles.glass}`}>
              <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['mb-4']} ${styles['text-white']}`}>File Operations</h4>
              <ul className={`${styles['space-y-2']} ${styles['text-gray-400']}`}>
                <li><code>read_file</code>: Read file contents</li>
                <li><code>write_file</code>: Create or overwrite files</li>
                <li><code>list_directory</code>: Explore repo structure</li>
                <li><code>delete_file</code>: Remove files</li>
                <li><code>move_file</code>: Rename or move files</li>
              </ul>
            </div>
            <div className={`${styles['p-8']} ${styles['rounded-3xl']} ${styles.glass}`}>
              <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['mb-4']} ${styles['text-white']}`}>System & Communication</h4>
              <ul className={`${styles['space-y-2']} ${styles['text-gray-400']}`}>
                <li><code>run_shell</code>: Execute arbitrary shell commands</li>
                <li><code>search_repo</code>: Recursive grep search</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section id="config" className={`${styles['py-32']} ${styles['bg-white/5']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={styles['max-w-7xl']}>
          <h2 className={`${styles['text-4xl']} ${styles['font-bold']} ${styles['mb-16']} ${styles['text-center']} ${styles['text-white']}`}>Environment Configuration</h2>
          <div className={styles['table-container']}>
            <table>
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Description</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>TELEGRAM_BOT_TOKEN</code></td>
                  <td>Token from @BotFather</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td><code>GEMINI_API_KEY</code></td>
                  <td>API Key from Google AI Studio</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td><code>FIREBASE_SERVICE_ACCOUNT</code></td>
                  <td>JSON string of your Firebase Service Account key</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td><code>ALLOWED_TELEGRAM_USER_IDS</code></td>
                  <td>Comma-separated list of authorized IDs</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td><code>WORKSPACE_DIR</code></td>
                  <td>Path to the repository to manage</td>
                  <td>No (defaults to .)</td>
                </tr>
                <tr>
                  <td><code>UNSAFE_MODE</code></td>
                  <td>Set to <code>true</code> to bypass file/command filters</td>
                  <td>No</td>
                </tr>
              </tbody>
            </table>
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
        <p className={styles['text-gray-500']}>Empowering developers with autonomous Git workflows.</p>
        <div className={`${styles['mt-8']} ${styles['text-gray-600']} ${styles['text-sm']}`}>
          &copy; {new Date().getFullYear()} ClosedAI. Built with Gemini 3 Flash.
        </div>
      </footer>
    </div>
  );
};

export default DocsPage;
