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
import { parseTypeScriptToJson } from './converters/parseTypeScript'
import { parseGolangToJson } from './converters/parseGolang'
import { parseDartToJson } from './converters/parseDart'
import { parsePayloadToJson } from './converters/parsePayload'
import { Analytics } from '@vercel/analytics/react'

type Language = 'typescript' | 'golang' | 'dart' | 'payload'
type InputType = 'json' | 'sql' | 'typescript' | 'golang' | 'dart' | 'payload'

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

const EXAMPLE_TYPESCRIPT = `export interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  score: number;
  tags: string[];
  address: Address;
  friends: Friend[];
}

export interface Address {
  street: string;
  city: string;
  zip: string;
}

export interface Friend {
  id: number;
  name: string;
}`

const EXAMPLE_GOLANG = `type User struct {
  id       int64     \`json:"id"\`
  name     string    \`json:"name"\`
  email    string    \`json:"email"\`
  active   bool      \`json:"active"\`
  score    float64   \`json:"score"\`
  tags     []string  \`json:"tags"\`
  address  Address   \`json:"address"\`
  friends  []Friend  \`json:"friends"\`
}

type Address struct {
  street string \`json:"street"\`
  city   string \`json:"city"\`
  zip    string \`json:"zip"\`
}

type Friend struct {
  id   int64  \`json:"id"\`
  name string \`json:"name"\`
}`

const EXAMPLE_DART = `class User {
  int id;
  String name;
  String email;
  bool active;
  double score;
  List<String> tags;
  Address address;
  List<Friend> friends;
}

class Address {
  String street;
  String city;
  String zip;
}

class Friend {
  int id;
  String name;
}`

const EXAMPLE_PAYLOAD = `{
  "id": "id",
  "name": "name",
  "email": "email",
  "active": "active",
  "score": "score",
  "tags": ["tags"],
  "address": {
    "street": "street",
    "city": "city",
    "zip": "zip"
  },
  "friends": [{
    "id": "id",
    "name": "name"
  }]
}`

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

  const getExampleForInputType = (type: InputType): string => {
    switch (type) {
      case 'sql':
        return EXAMPLE_SQL
      case 'typescript':
        return EXAMPLE_TYPESCRIPT
      case 'golang':
        return EXAMPLE_GOLANG
      case 'dart':
        return EXAMPLE_DART
      case 'payload':
        return EXAMPLE_PAYLOAD
      default:
        return EXAMPLE_JSON
    }
  }

  const getInputTypeLabel = (type: InputType): string => {
    switch (type) {
      case 'sql':
        return 'SQL DDL Input'
      case 'typescript':
        return 'TypeScript Input'
      case 'golang':
        return 'Golang Input'
      case 'dart':
        return 'Dart Input'
      case 'payload':
        return 'Payload Input'
      default:
        return 'JSON Input'
    }
  }

  const getInputTypePlaceholder = (type: InputType): string => {
    switch (type) {
      case 'sql':
        return 'Paste your SQL DDL (CREATE TABLE) here...'
      case 'typescript':
        return 'Paste your TypeScript interfaces here...'
      case 'golang':
        return 'Paste your Golang structs here...'
      case 'dart':
        return 'Paste your Dart classes here...'
      case 'payload':
        return 'Paste your Payload template here...'
      default:
        return 'Paste your JSON here...'
    }
  }

  const { result, error } = useMemo(() => {
    if (!input.trim()) return { result: '', error: null }
    try {
      let jsonData: any

      // First, normalize input to JSON
      if (inputType === 'sql') {
        // SQL conversion doesn't go through JSON
        switch (activeTab) {
          case 'typescript':
            return { result: convertSqlToTypeScript(input), error: null }
          case 'golang':
            return { result: convertSqlToGolang(input), error: null }
          case 'dart':
            return { result: convertSqlToDart(input), error: null }
          case 'payload':
            return { result: convertSqlToPayload(input), error: null }
        }
      } else if (inputType === 'json') {
        jsonData = JSON.parse(input)
      } else if (inputType === 'typescript') {
        jsonData = parseTypeScriptToJson(input)
      } else if (inputType === 'golang') {
        jsonData = parseGolangToJson(input)
      } else if (inputType === 'dart') {
        jsonData = parseDartToJson(input)
      } else if (inputType === 'payload') {
        jsonData = parsePayloadToJson(input)
      }

      // Convert normalized JSON to target language
      let result: string

      switch (activeTab) {
        case 'typescript':
          result = convertToTypeScript(JSON.stringify(jsonData), rootName)
          break
        case 'golang':
          result = convertToGolang(JSON.stringify(jsonData), rootName)
          break
        case 'dart':
          result = convertToDart(JSON.stringify(jsonData), rootName)
          break
        case 'payload':
          result = convertToPayload(JSON.stringify(jsonData))
          break
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
    setInput(getExampleForInputType(inputType))
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
                setInput(getExampleForInputType(newType))
              }}
            >
              <option value='json'>JSON</option>
              <option value='sql'>SQL DDL</option>
              <option value='typescript'>TypeScript</option>
              <option value='golang'>Golang</option>
              <option value='dart'>Dart</option>
              <option value='payload'>Payload</option>
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
                {getInputTypeLabel(inputType)}
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
                placeholder={getInputTypePlaceholder(inputType)}
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
