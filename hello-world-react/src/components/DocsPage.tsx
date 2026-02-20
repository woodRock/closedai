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
          <div className={`${styles.hidden} ${styles.md_flex} ${styles.flex} ${styles['items-center']} ${styles['space-x-8']} ${styles['text-sm']} ${styles['font-medium']} ${styles['text-gray-400']}`}>
            <a href="#features" className={styles['text-gray-400']}>Features</a>
            <a href="#how-it-works" className={styles['text-gray-400']}>Workflow</a>
            <a href="#setup" className={styles['text-gray-400']}>Setup</a>
            <a href="#instant-mode" className={styles['text-gray-400']}>Instant Mode</a>
            <a href="https://github.com/woodRock/closedai" className={styles['btn-github']}>Star on GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`${styles.relative} ${styles['pt-48']} ${styles['pb-32']} ${styles.reveal}`}>
        <div className={`${styles.absolute} ${styles['hero-glow']}`}></div>
        <div className={`${styles['max-w-7xl']} ${styles['px-6']} ${styles['text-center']}`}>
          <h1 className={`${styles['text-7xl']} ${styles['md:text-9xl']} ${styles['font-extrabold']} ${styles['mb-8']} ${styles['text-white']}`}>
            DevOps on <br />
            <span className={styles['gradient-text']}>Autopilot.</span>
          </h1>
          <p className={`${styles['text-xl']} ${styles['text-gray-400']} ${styles['max-w-3xl']} ${styles['mb-12']} ${styles['font-light']}`}>
            Meet the first autonomous AI agent designed to live inside your{' '}
            <span className={`${styles['text-white']} ${styles['font-medium']}`}>GitHub Actions</span>.
            Build, refactor, and manage your entire codebase via Telegram.
          </p>
          <div className={`${styles.flex} ${styles['justify-center']} ${styles['gap-6']} ${styles['mb-24']}`}>
            <a href="#setup" className={`${styles['bg-blue-600']} ${styles['text-white']} ${styles['px-12']} ${styles['py-5']} ${styles['rounded-2xl']} ${styles['text-xl']} ${styles['font-bold']}`}>
              Deploy Now
            </a>
            <a href="https://github.com/woodRock/closedai" className={`${styles['text-white']} ${styles['px-12']} ${styles['py-5']} ${styles['rounded-2xl']} ${styles['text-xl']} ${styles['font-bold']} ${styles.glass}`}>
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

      {/* Features */}
      <section id="features" className={`${styles['py-32']} ${styles['bg-white/5']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={styles['max-w-7xl']}>
          <div className={`${styles.grid} ${styles['md:grid-cols-3']} ${styles['gap-12']}`}>
            <div className={styles['space-y-6']}>
              <div className={`${styles['w-14']} ${styles['h-14']} ${styles['bg-blue-600']} ${styles['rounded-2xl']} ${styles.flex} ${styles['items-center']} ${styles['justify-center']}`}>
                <i className="fas fa-piggy-bank text-white"></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Zero Overhead</h3>
              <p className={styles['text-gray-400']}>Runs within the generous free tier of GitHub Actions.</p>
            </div>
            <div className={styles['space-y-6']}>
              <div className={`${styles['w-14']} ${styles['h-14']} ${styles['bg-purple-500']} ${styles['rounded-2xl']} ${styles.flex} ${styles['items-center']} ${styles['justify-center']}`}>
                <i className="fas fa-brain text-white"></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Powered by Gemini</h3>
              <p className={styles['text-gray-400']}>Uses Google's Gemini 3 Flash to write high-quality code.</p>
            </div>
            <div className={styles['space-y-6']}>
              <div className={`${styles['w-14']} ${styles['h-14']} ${styles['bg-pink-500']} ${styles['rounded-2xl']} ${styles.flex} ${styles['items-center']} ${styles['justify-center']}`}>
                <i className="fas fa-shield-virus text-white"></i>
              </div>
              <h3 className={`${styles['text-2xl']} ${styles['font-bold']} ${styles['text-white']}`}>Sandboxed</h3>
              <p className={styles['text-gray-400']}>Isolated environment for every task you trigger.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Setup */}
      <section id="setup" className={`${styles['py-32']} ${styles['px-6']} ${styles.reveal}`}>
        <div className={`${styles['max-w-4xl']} ${styles['p-12']} ${styles['rounded-3xl']} ${styles.glass}`}>
          <h2 className={`${styles['text-4xl']} ${styles['font-bold']} ${styles['mb-12']} ${styles['text-center']} ${styles['text-white']}`}>Ready to start?</h2>
          <div className={styles['space-y-12']}>
            <div className={`${styles.flex} ${styles['gap-8']}`}>
              <div className={`${styles['text-gray-500']} ${styles['font-bold']}`}>1</div>
              <div>
                <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>Bot Setup</h4>
                <p className={styles['text-gray-400']}>Create a bot on Telegram and copy the token.</p>
              </div>
            </div>
            <div className={`${styles.flex} ${styles['gap-8']}`}>
              <div className={`${styles['text-gray-500']} ${styles['font-bold']}`}>2</div>
              <div>
                <h4 className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>Secrets</h4>
                <p className={styles['text-gray-400']}>Add TELEGRAM_BOT_TOKEN and GEMINI_API_KEY to GitHub Secrets.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${styles['py-20']} ${styles['text-center']}`}>
        <span className={`${styles['text-xl']} ${styles['font-bold']} ${styles['text-white']}`}>ClosedAI</span>
        <p className={`${styles['text-gray-500']} ${styles['mt-4']}`}>Empowering developers with autonomous Git workflows.</p>
      </footer>
    </div>
  );
};

export default DocsPage;
