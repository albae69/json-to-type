import { useState, useMemo } from 'react'
import { convertToTypeScript } from './converters/typescript'
import { convertToGolang } from './converters/golang'
import { convertToDart } from './converters/dart'
import { convertToPayload } from './converters/payload'
import {
  convertSqlToTypeScript,
  convertSqlToGolang,
  convertSqlToDart,
  convertSqlToPayload,
} from './converters/sql-ddl'
import { Analytics } from '@vercel/analytics/react'

type Language = 'typescript' | 'golang' | 'dart' | 'payload'
type InputType = 'json' | 'sql'

const TABS: { id: Language; label: string; badge: string }[] = [
  { id: 'typescript', label: 'TypeScript', badge: 'TS' },
  { id: 'golang', label: 'Go Struct', badge: 'GO' },
  { id: 'dart', label: 'Dart Model', badge: 'DT' },
  { id: 'payload', label: 'Payload', badge: 'P' },
]

const EXAMPLE_JSON = `{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "active": true,
  "score": 98.5,
  "tags": ["admin", "user"],
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "zip": "12345"
  },
  "friends": [
    { "id": 2, "name": "Bob" }
  ]
}`

const EXAMPLE_SQL = `CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  age INT,
  active BOOLEAN DEFAULT true,
  created_at DATETIME,
  updated_at TIMESTAMP
)`

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

export default function App() {
  const [input, setInput] = useState(EXAMPLE_JSON)
  const [activeTab, setActiveTab] = useState<Language>('typescript')
  const [inputType, setInputType] = useState<InputType>('json')
  const [rootName, setRootName] = useState('Root')
  const [copied, setCopied] = useState(false)

  const { result, error } = useMemo(() => {
    if (!input.trim()) return { result: '', error: null }
    try {
      let result: string

      if (inputType === 'sql') {
        // Handle SQL DDL conversion
        switch (activeTab) {
          case 'typescript':
            result = convertSqlToTypeScript(input)
            break
          case 'golang':
            result = convertSqlToGolang(input)
            break
          case 'dart':
            result = convertSqlToDart(input)
            break
          case 'payload':
            result = convertSqlToPayload(input)
            break
        }
      } else {
        // Handle JSON conversion
        switch (activeTab) {
          case 'typescript':
            result = convertToTypeScript(input, rootName)
            break
          case 'golang':
            result = convertToGolang(input, rootName)
            break
          case 'dart':
            result = convertToDart(input, rootName)
            break
          case 'payload':
            result = convertToPayload(input)
            break
        }
      }
      return { result, error: null }
    } catch (e) {
      return { result: '', error: e instanceof Error ? e.message : String(e) }
    }
  }, [input, activeTab, rootName, inputType])

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFormat = () => {
    setInput(formatJson(input))
  }

  const handleClear = () => {
    setInput('')
  }

  const handleLoadExample = () => {
    setInput(inputType === 'sql' ? EXAMPLE_SQL : EXAMPLE_JSON)
  }

  return (
    <div className='app'>
      <header className='header'>
        <div className='header-inner'>
          <div className='logo'>
            <span className='logo-icon'>&#x7B;&#x7D;</span>
            <span className='logo-text'>JSON to Type</span>
          </div>
        </div>
      </header>

      <main className='main'>
        <div className='options-bar'>
          <div className='option-group'>
            <label className='option-label' htmlFor='input-type'>
              Input Type
            </label>
            <select
              id='input-type'
              className='option-input'
              value={inputType}
              onChange={(e) => {
                const newType = e.target.value as InputType
                setInputType(newType)
                setInput(newType === 'sql' ? EXAMPLE_SQL : EXAMPLE_JSON)
              }}
            >
              <option value='json'>JSON</option>
              <option value='sql'>SQL DDL</option>
            </select>
          </div>
          {inputType === 'json' && (
            <div className='option-group'>
              <label className='option-label' htmlFor='root-name'>
                Root Name
              </label>
              <input
                id='root-name'
                className='option-input'
                value={rootName}
                onChange={(e) => setRootName(e.target.value || 'Root')}
                placeholder='Root'
                spellCheck={false}
              />
            </div>
          )}
        </div>

        <div className='panels'>
          {/* Input Panel */}
          <div className='panel'>
            <div className='panel-header'>
              <span className='panel-title'>
                {inputType === 'sql' ? 'SQL DDL Input' : 'JSON Input'}
              </span>
              <div className='panel-actions'>
                <button className='btn btn-ghost' onClick={handleLoadExample}>
                  Example
                </button>
                <button className='btn btn-ghost' onClick={handleFormat}>
                  Format
                </button>
                <button className='btn btn-ghost' onClick={handleClear}>
                  Clear
                </button>
              </div>
            </div>
            <div className='editor-wrap'>
              <textarea
                className={`editor${error ? ' editor-error' : ''}`}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                }}
                placeholder={
                  inputType === 'sql'
                    ? 'Paste your SQL DDL (CREATE TABLE) here...'
                    : 'Paste your JSON here...'
                }
                spellCheck={false}
                autoComplete='off'
              />
              {error && (
                <div className='error-banner'>
                  <span className='error-icon'>&#9888;</span>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Output Panel */}
          <div className='panel'>
            <div className='panel-header'>
              <div className='tabs'>
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`tab${activeTab === tab.id ? ' tab-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className={`tab-badge tab-badge-${tab.id}`}>
                      {tab.badge}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className='panel-actions'>
                <button
                  className={`btn ${copied ? 'btn-success' : 'btn-ghost'}`}
                  onClick={handleCopy}
                  disabled={!result}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className='editor-wrap'>
              <pre className='output'>
                {result || (
                  <span className='output-placeholder'>
                    Output will appear here...
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </main>

      <footer className='footer'>
        <span>
          Built with ❤️ by{' '}
          <a
            href='https://github.com/albae69'
            target='_blank'
            rel='noopener noreferrer'
            style={{ color: 'inherit', textDecorationLine: 'none' }}
          >
            @albae69
          </a>
          <br />
          2026
        </span>
      </footer>
      <Analytics />
    </div>
  )
}
