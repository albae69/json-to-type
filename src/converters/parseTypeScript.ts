type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

interface ParsedType {
  name: string
  properties: { [key: string]: string }
  nestedTypes: ParsedType[]
}

/**
 * Parse TypeScript interface code back to JSON structure
 * Example: "export interface User { id: number; name: string; }"
 * Returns: { id: 0, name: "" }
 */
export function parseTypeScriptToJson(code: string): JsonValue {
  const properties = extractInterfaceProperties(code)
  return buildJsonFromProperties(properties)
}

function extractInterfaceProperties(code: string): { [key: string]: string } {
  const properties: { [key: string]: string } = {}

  // Match all interface definitions
  const interfaceRegex = /export\s+interface\s+(\w+)\s*\{([^}]*)\}/g
  let match

  // Store all interfaces for reference
  const interfaces: { [name: string]: string } = {}
  while ((match = interfaceRegex.exec(code)) !== null) {
    const interfaceName = match[1]!
    const body = match[2]!
    interfaces[interfaceName] = body
  }

  // Parse the first (root) interface
  const firstInterfaceMatch = /export\s+interface\s+(\w+)\s*\{([^}]*)\}/.exec(
    code,
  )
  if (!firstInterfaceMatch) return {}

  const rootBody = firstInterfaceMatch[2]!

  // Extract properties from interface body
  const propRegex = /(\w+)\s*\??\s*:\s*([^;\n}]+);?/g
  while ((match = propRegex.exec(rootBody)) !== null) {
    const key = match[1]!
    const type = match[2]!.trim()
    properties[key] = type
  }

  return properties
}

function buildJsonFromProperties(properties: {
  [key: string]: string
}): JsonValue {
  const result: { [key: string]: JsonValue } = {}

  for (const [key, type] of Object.entries(properties)) {
    result[key] = inferDefaultValueFromType(type)
  }

  return result
}

function inferDefaultValueFromType(typeStr: string): JsonValue {
  const type = typeStr.trim().toLowerCase()

  if (type.includes('string')) return ''
  if (type.includes('number') || type.includes('int')) return 0
  if (type.includes('boolean') || type.includes('bool')) return false
  if (type.includes('null')) return null
  if (type.includes('[]') || type.includes('array')) {
    return []
  }
  if (type.includes('date') || type.includes('datetime')) return ''

  // For complex types (nested interfaces), return empty object
  if (!['string', 'number', 'boolean', 'null'].some((t) => type.includes(t))) {
    return {}
  }

  return null
}
