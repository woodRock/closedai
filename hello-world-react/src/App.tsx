import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import Documentation from './Documentation';
import Tutorials from './Tutorials';
import DocsPage from './components/DocsPage';

function App() {
  const [count, setCount] = useState(0);
  const [showDocs, setShowDocs] = useState(false);
  const [showTutorials, setShowTutorials] = useState(false);
  const [showFullDocs, setShowFullDocs] = useState(false);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Hello World</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <button onClick={() => setShowDocs(!showDocs)}>Documentation</button>
      {showDocs && <Documentation />}
      <button onClick={() => setShowTutorials(!showTutorials)}>Tutorials</button>
      {showTutorials && <Tutorials />}
      <button onClick={() => setShowFullDocs(!showFullDocs)}>Full Docs</button>
      {showFullDocs && <DocsPage />}
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;