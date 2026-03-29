import { useState } from 'react'
import { X, Copy, Check, FileCode } from 'lucide-react'

interface CodeFile {
  name: string
  className: string
  code: string
  lineCount: number
}

function parseCodeFiles(code: string): CodeFile[] {
  if (!code.trim()) return []

  // Split by class definitions, preserving leading comment blocks
  const classRegex = /(?:^|\n)((?:\/\/[^\n]*\n)*)class\s+(\w+)/g
  const matches = [...code.matchAll(classRegex)]

  if (matches.length === 0) {
    return [{ name: 'Game3D.js', className: 'Game3D', code: code.trim(), lineCount: code.split('\n').length }]
  }

  const files: CodeFile[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + (matches[i][0].startsWith('\n') ? 1 : 0)
    const end = i + 1 < matches.length
      ? matches[i + 1].index! + (matches[i + 1][0].startsWith('\n') ? 1 : 0)
      : code.length
    const className = matches[i][2]
    const slice = code.slice(start, end).trim()
    files.push({
      name: className + '.js',
      className,
      code: slice,
      lineCount: slice.split('\n').length,
    })
  }

  return files
}

// Very basic syntax highlighting with inline styles
function highlight(code: string): string {
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // strings
    .replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span style="color:#ce9178">$1$2$1</span>')
    // keywords
    .replace(/\b(class|constructor|const|let|var|if|else|for|while|return|new|this|import|export|default|function|async|await|try|catch|throw|null|undefined|true|false|typeof|instanceof|extends|super)\b/g, '<span style="color:#569cd6">$1</span>')
    // numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>')
    // single-line comments
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#6a9955">$1</span>')
    // method calls
    .replace(/(\w+)(\s*\()/g, '<span style="color:#dcdcaa">$1</span>$2')
}

interface Props {
  code: string
  onClose: () => void
  gameId?: string
}

export function CodeFiles3D({ code, onClose }: Props) {
  const files = parseCodeFiles(code)
  const [activeFile, setActiveFile] = useState(0)
  const [copied, setCopied] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)

  const current = files[activeFile] ?? files[0]

  function copyFile() {
    if (!current) return
    navigator.clipboard.writeText(current.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function copyAll() {
    navigator.clipboard.writeText(code)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d0d12', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', height: 32, padding: '0 10px', borderBottom: '1px solid #1e1e28', background: '#111116', flexShrink: 0, gap: 8 }}>
        <FileCode size={11} style={{ color: '#569cd6' }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9cdcfe', letterSpacing: '0.04em' }}>Game Code</span>
        <span style={{ fontSize: 9, color: '#444450' }}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            onClick={copyAll}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 20, borderRadius: 3, fontSize: 9, color: copiedAll ? '#4ec9b0' : '#555560', background: '#1a1a22', border: '1px solid #2a2a32', cursor: 'pointer' }}
          >
            {copiedAll ? <Check size={8} /> : <Copy size={8} />}
            {copiedAll ? 'Copied!' : 'Copy All'}
          </button>
          <button
            onClick={onClose}
            style={{ width: 20, height: 20, borderRadius: 3, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444450' }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* File tree sidebar */}
        <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid #1e1e28', background: '#0a0a10', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#2a2a32 transparent' }}>
          <div style={{ padding: '6px 8px 3px', fontSize: 8, fontWeight: 700, color: '#333340', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            FILES
          </div>
          {files.map((file, i) => (
            <button
              key={file.name}
              onClick={() => setActiveFile(i)}
              style={{
                display: 'flex', alignItems: 'center', width: '100%', padding: '4px 8px', gap: 6,
                background: activeFile === i ? '#16304c' : 'transparent',
                borderLeft: `2px solid ${activeFile === i ? '#569cd6' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 9, color: '#569cd6', flexShrink: 0 }}>⬡</span>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 10, color: activeFile === i ? '#e0e0ec' : '#888894', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 7, color: '#383840' }}>{file.lineCount}L</div>
              </div>
            </button>
          ))}

          {files.length === 0 && (
            <div style={{ padding: '12px 8px', fontSize: 9, color: '#2a2a38' }}>No code yet</div>
          )}
        </div>

        {/* Code editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {current && (
            <>
              {/* File tab */}
              <div style={{ display: 'flex', alignItems: 'center', height: 28, padding: '0 12px', borderBottom: '1px solid #1e1e28', background: '#111116', flexShrink: 0, gap: 8 }}>
                <span style={{ fontSize: 10, color: '#9cdcfe' }}>{current.name}</span>
                <span style={{ fontSize: 8, color: '#333340' }}>{current.lineCount} lines</span>
                <button
                  onClick={copyFile}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '0 7px', height: 18, borderRadius: 3, fontSize: 8, color: copied ? '#4ec9b0' : '#444450', background: '#1a1a22', border: '1px solid #252530', cursor: 'pointer' }}
                >
                  {copied ? <Check size={7} /> : <Copy size={7} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Code body */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#2a2a32 transparent', padding: '8px 0' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                  <tbody>
                    {current.code.split('\n').map((line, i) => (
                      <tr key={i} style={{ height: 18 }}>
                        <td style={{ paddingLeft: 12, paddingRight: 8, textAlign: 'right', width: 40, flexShrink: 0, fontSize: 9, color: '#383840', userSelect: 'none', verticalAlign: 'top', lineHeight: '18px' }}>
                          {i + 1}
                        </td>
                        <td
                          style={{ paddingRight: 24, fontSize: 11, lineHeight: '18px', whiteSpace: 'pre', fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, monospace', color: '#d4d4d4', verticalAlign: 'top' }}
                          dangerouslySetInnerHTML={{ __html: highlight(line) || '&nbsp;' }}
                        />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!current && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: '#2a2a38' }}>Generate a game to see code</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
