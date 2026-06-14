import React, { useState, useEffect, useRef } from 'react';
import { Bug, Share2, Zap, Code2, Play, LayoutDashboard, RefreshCw } from 'lucide-react';

// Custom lightweight line-by-line diff engine
function CustomDiffViewer({ oldValue, newValue }) {
  const diffLines = (oldStr = '', newStr = '') => {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    
    const dp = Array(oldLines.length + 1)
      .fill(null)
      .map(() => Array(newLines.length + 1).fill(0));

    for (let i = 1; i <= oldLines.length; i++) {
      for (let j = 1; j <= newLines.length; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result = [];
    let i = oldLines.length;
    let j = newLines.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        result.unshift({ type: 'unchanged', value: oldLines[i - 1], oldLineNum: i, newLineNum: j });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'added', value: newLines[j - 1], oldLineNum: null, newLineNum: j });
        j--;
      } else {
        result.unshift({ type: 'removed', value: oldLines[i - 1], oldLineNum: i, newLineNum: null });
        i--;
      }
    }
    return result;
  };

  const diffs = diffLines(oldValue, newValue);

  return (
    <div className="font-mono text-xs overflow-x-auto select-none rounded-xl border border-gray-800 bg-[#05070a]">
      <table className="w-full border-collapse">
        <tbody>
          {diffs.map((line, index) => {
            let rowBg = 'hover:bg-white/5';
            let sign = ' ';
            let signColor = 'text-gray-600';
            let codeColor = 'text-gray-300';

            if (line.type === 'added') {
              rowBg = 'bg-emerald-950/30 hover:bg-emerald-900/30';
              sign = '+';
              signColor = 'text-emerald-400 font-bold';
              codeColor = 'text-emerald-200';
            } else if (line.type === 'removed') {
              rowBg = 'bg-red-950/30 hover:bg-red-900/30';
              sign = '-';
              signColor = 'text-red-400 font-bold';
              codeColor = 'text-red-300 line-through decoration-red-900/50';
            }

            return (
              <tr key={index} className={`transition-colors ${rowBg}`}>
                <td className="w-10 text-right pr-2 py-0.5 border-r border-gray-800/50 text-gray-600 select-none bg-black/20 text-[10px]">
                  {line.oldLineNum || ''}
                </td>
                <td className="w-10 text-right pr-2 py-0.5 border-r border-gray-800/50 text-gray-600 select-none bg-black/20 text-[10px]">
                  {line.newLineNum || ''}
                </td>
                <td className={`w-6 text-center select-none ${signColor} font-bold text-xs py-0.5`}>
                  {sign}
                </td>
                <td className={`pl-4 py-0.5 whitespace-pre font-mono text-xs ${codeColor}`}>
                  {line.value || ' '}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Custom IDE code editor with synced dynamic line numbers
function CustomCodeEditor({ value, onChange }) {
  const [lineCount, setLineCount] = useState(1);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines || 1);
  }, [value]);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className="flex-1 flex min-h-0 bg-[#090d12] font-mono text-sm border-t border-gray-800 relative">
      {/* Line Numbers */}
      <div 
        ref={lineNumbersRef}
        className="w-12 py-4 bg-[#0d1117] text-right pr-3 text-gray-600 select-none border-r border-gray-800 overflow-hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {Array.from({ length: lineCount }).map((_, i) => (
          <div key={i} className="h-6 leading-6 text-xs font-mono">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Editor text canvas */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck="false"
        className="flex-1 p-4 bg-transparent text-gray-100 outline-none resize-none font-mono text-sm leading-6 h-full overflow-y-auto"
        placeholder="// Paste code to evaluate..."
      />
    </div>
  );
}

// Custom Mermaid renderer using dynamic async script loaders
function MermaidRenderer({ chart }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chart) return;
    
    const renderChart = async () => {
      try {
        setError(null);
        if (!window.mermaid) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
          script.async = true;
          script.onload = () => {
            window.mermaid.initialize({ startOnLoad: false, theme: 'dark' });
            generateSvg();
          };
          document.body.appendChild(script);
        } else {
          generateSvg();
        }
      } catch (err) {
        setError(err.message);
      }
    };

    const generateSvg = async () => {
      try {
        const uniqueId = 'mermaid-' + Math.floor(Math.random() * 1000000);
        let cleanChart = chart.trim();
        if (!cleanChart.startsWith('graph')) {
          cleanChart = 'graph TD\n' + cleanChart;
        }
        
        const { svg: renderedSvg } = await window.mermaid.render(uniqueId, cleanChart);
        setSvg(renderedSvg);
      } catch (err) {
        const badEl = document.getElementById('d' + uniqueId);
        if (badEl) badEl.remove();
        setError('Structure contains format mismatch. Render canceled.');
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-950/40 border border-red-500/20 rounded-xl text-red-300">
        <p className="font-semibold text-xs">Visualizer Warning:</p>
        <p className="text-xs text-red-400 mt-1">{error}</p>
        <pre className="text-[10px] bg-black/40 p-2 mt-2 rounded font-mono text-gray-400 overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center gap-2 text-gray-500 py-12">
        <RefreshCw className="animate-spin" size={16} />
        <span>Synthesizing architectural roadmap...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] p-4 rounded-xl flex justify-center items-center overflow-auto max-h-[500px]" 
         dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { 
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-950/20 border border-red-900 rounded-lg text-xs text-red-400">
          Render exception occurred.
        </div>
      );
    }
    return this.props.children; 
  }
}

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 border-b-2 transition font-medium text-xs ${
    active ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-transparent text-gray-400 hover:bg-white/5'
  }`}>
    <Icon size={14} /> {label}
  </button>
);

export default function App() {
  const [code, setCode] = useState(`// Paste code here\nvoid main() {\n  // test\n  cout<<2+3;\n}`);
  const [activeTab, setActiveTab] = useState('arch');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const analyzeCode = async () => {
    setLoading(true);
    setResults(null);
    setErrorMsg('');
    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error(`Status error: ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Unable to contact backend server. Make sure main.py is active on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0d1117] text-white flex flex-col font-sans text-sm overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#161b22]">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">CodeIntel</h1>
            <p className="text-[10px] text-gray-400 tracking-wider font-mono">AUTOMATED SYSTEM OPTIMIZER</p>
          </div>
        </div>
        
        <button onClick={analyzeCode} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 px-6 py-2 rounded-lg flex items-center gap-2 font-semibold transition-all">
          {loading ? (
            <>
              <RefreshCw className="animate-spin" size={16} />
              <span>Analyzing logic...</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Analyze Code</span>
            </>
          )}
        </button>
      </header>

      {errorMsg && (
        <div className="bg-red-950/80 border-b border-red-500/30 text-red-200 px-6 py-2.5 text-xs flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="hover:text-white font-bold px-2">✕</button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        {/* Editor component */}
        <div className="w-1/2 flex flex-col border-r border-gray-800 h-full">
          <div className="bg-[#161b22] px-6 py-2 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800">
            Input Source
          </div>
          <CustomCodeEditor value={code} onChange={setCode} />
        </div>

        {/* Dynamic Diagnostics panels */}
        <div className="w-1/2 flex flex-col bg-[#0d1117] h-full">
          <div className="flex bg-[#161b22] border-b border-gray-800">
            <TabButton active={activeTab === 'arch'}  icon={Share2} label="Architecture" onClick={() => setActiveTab('arch')} />
            <TabButton active={activeTab === 'bugs'}  icon={Bug}    label="Bugs"   onClick={() => setActiveTab('bugs')} />
            <TabButton active={activeTab === 'comp'}  icon={Zap}    label="Complexity"   onClick={() => setActiveTab('comp')} />
            <TabButton active={activeTab === 'clean'} icon={Code2}  label="Optimized Diff"    onClick={() => setActiveTab('clean')} />
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-[#0d1117] to-[#090d12]">
            {!results ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 py-12">
                <Code2 size={40} className="text-gray-700 animate-pulse" />
                <p className="font-semibold text-gray-400">Ready for review</p>
                <p className="text-xs text-gray-500">Provide snippet and run analysis above.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {activeTab === 'arch' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">Workflow Flowchart</h3>
                    <ErrorBoundary>
                      <MermaidRenderer chart={results.architecture} />
                    </ErrorBoundary>
                  </div>
                )}

                {activeTab === 'bugs' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">Found Issues</h3>
                    {Array.isArray(results.bugs) && results.bugs.length > 0 ? (
                      <div className="space-y-2">
                        {results.bugs.map((bug, i) => (
                          <div key={i} className="flex gap-3 p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-200">
                            <Bug size={14} className="shrink-0 mt-0.5 text-red-500" />
                            <span className="text-xs">{bug}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-200 text-xs">
                        No critical errors detected.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'comp' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">Time Complexity</h3>
                    <div className="flex flex-col items-center justify-center py-12 px-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                      {results.complexity && results.complexity.length <= 12 ? (
                        <div className="text-5xl font-mono text-blue-400 font-bold">{results.complexity}</div>
                      ) : (
                        <div className="text-base leading-relaxed text-blue-200 font-sans text-left whitespace-pre-wrap max-w-2xl">
                          {results.complexity || "O(?)"}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'clean' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">Visual Optimization Diff</h3>
                    {results.refinedCode ? (
                      <CustomDiffViewer oldValue={code} newValue={results.refinedCode} />
                    ) : (
                      <p className="p-4 text-gray-400 italic">Code remains unmodified.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}