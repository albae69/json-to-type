type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

function toPascalCase(str: string): string {
  return str
    .replace(/[_\-\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase())
}

function inferTsType(
  value: JsonValue,
  key: string,
  interfaces: Map<string, string>,
): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number')
    return Number.isInteger(value) ? 'number' : 'number'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]'
    const elementType = inferTsType(value[0]!, key, interfaces)
    return `${elementType}[]`
  }

  if (typeof value === 'object') {
    const typeName = toPascalCase(key)
    buildInterface(value as { [key: string]: JsonValue }, typeName, interfaces)
    return typeName
  }

  return 'unknown'
}

function buildInterface(
  obj: { [key: string]: JsonValue },
  name: string,
  interfaces: Map<string, string>,
): void {
  if (interfaces.has(name)) return

  const lines: string[] = [`export interface ${name} {`]

  for (const [key, value] of Object.entries(obj)) {
    const childName = toPascalCase(key)
    const tsType = inferTsType(value, childName, interfaces)
    const nullable = value === null ? ' | null' : ''
    lines.push(`  ${key}: ${tsType}${nullable};`)
  }

  lines.push('}')
  interfaces.set(name, lines.join('\n'))
}

export function convertToTypeScript(
  jsonStr: string,
  rootName = 'Root',
): string {
  const parsed = JSON.parse(jsonStr) as JsonValue

  const interfaces = new Map<string, string>()

  let rootObj: { [key: string]: JsonValue }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return `export type ${rootName} = unknown[]`
    const first = parsed[0]
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      rootObj = first as { [key: string]: JsonValue }
    } else {
      return `export type ${rootName} = ${inferTsType(parsed, rootName, interfaces)}[]`
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    rootObj = parsed as { [key: string]: JsonValue }
  } else {
    return `export type ${rootName} = ${inferTsType(parsed, rootName, interfaces)}`
  }

  buildInterface(rootObj, rootName, interfaces)

  // Return child interfaces first, then the root
  const result: string[] = []
  interfaces.forEach((iface, name) => {
    if (name !== rootName) result.push(iface)
  })
  const root = interfaces.get(rootName)
  if (root) result.push(root)

  return result.join('\n\n')
}
