type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/**
 * Parse Go struct code back to JSON structure
 * Example: "type User struct { ID int64; Name string; }"
 * Returns: { ID: 0, Name: "" }
 */
export function parseGolangToJson(code: string): JsonValue {
  const properties = extractStructProperties(code)
  return buildJsonFromProperties(properties)
}

function extractStructProperties(code: string): { [key: string]: string } {
  const properties: { [key: string]: string } = {}

  // Match struct definition: type StructName struct { ... }
  const structRegex = /type\s+(\w+)\s+struct\s*\{([^}]*)\}/
  const match = structRegex.exec(code)

  if (!match) return {}

  const body = match[2]!

  // Extract fields: FieldName Type `json:"fieldName"`
  const fieldRegex = /(\w+)\s+([^`\n]+)/g
  let fieldMatch

  while ((fieldMatch = fieldRegex.exec(body)) !== null) {
    const fieldName = fieldMatch[1]!
    const fieldType = fieldMatch[2]!.trim()

    if (!fieldType.includes('`')) {
      properties[fieldName] = fieldType
    }
  }

  return properties
}

function buildJsonFromProperties(properties: {
  [key: string]: string
}): JsonValue {
  const result: { [key: string]: JsonValue } = {}

  for (const [key, type] of Object.entries(properties)) {
    result[key] = inferDefaultValueFromGoType(type)
  }

  return result
}

function inferDefaultValueFromGoType(typeStr: string): JsonValue {
  const type = typeStr.trim().toLowerCase()

  if (type.includes('string')) return ''
  if (type.includes('int') || type.includes('float')) return 0
  if (type.includes('bool')) return false
  if (type.includes('[]')) return []
  if (type.includes('time')) return ''

  // Check for pointer types
  if (type.startsWith('*')) {
    return inferDefaultValueFromGoType(type.slice(1))
  }

  // For custom types, return empty object
  return {}
}
