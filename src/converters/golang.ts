type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

function toPascalCase(str: string): string {
  return str
    .replace(/[_\-\s]+(.)/g, (_, c) => (c as string).toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase())
}

function toGoFieldName(key: string): string {
  return toPascalCase(key)
}

function inferGoType(
  value: JsonValue,
  key: string,
  structs: Map<string, string>,
): string {
  if (value === null) return 'interface{}'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'bool'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int64' : 'float64'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]interface{}'
    const first = value[0]!
    const elemType = inferGoType(first, key, structs)
    return `[]${elemType}`
  }

  if (typeof value === 'object') {
    const typeName = toPascalCase(key)
    buildStruct(value as { [key: string]: JsonValue }, typeName, structs)
    return typeName
  }

  return 'interface{}'
}

function buildStruct(
  obj: { [key: string]: JsonValue },
  name: string,
  structs: Map<string, string>,
): void {
  if (structs.has(name)) return

  const lines: string[] = [`type ${name} struct {`]

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = toGoFieldName(key)
    const childTypeName = toPascalCase(key)
    const goType = inferGoType(value, childTypeName, structs)
    lines.push(`\t${fieldName} ${goType} \`json:"${key}"\``)
  }

  lines.push('}')
  structs.set(name, lines.join('\n'))
}

export function convertToGolang(jsonStr: string, rootName = 'Root'): string {
  const parsed = JSON.parse(jsonStr) as JsonValue

  const structs = new Map<string, string>()

  let rootObj: { [key: string]: JsonValue }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return `type ${rootName} []interface{}`
    const first = parsed[0]
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      rootObj = first as { [key: string]: JsonValue }
    } else {
      return `type ${rootName} []${inferGoType(first, rootName, structs)}`
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    rootObj = parsed as { [key: string]: JsonValue }
  } else {
    return `// ${rootName} = ${inferGoType(parsed, rootName, structs)}`
  }

  buildStruct(rootObj, rootName, structs)

  const result: string[] = ['package main', '']
  structs.forEach((s, name) => {
    if (name !== rootName) result.push(s + '\n')
  })
  const root = structs.get(rootName)
  if (root) result.push(root)

  return result.join('\n')
}
