type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/**
 * Parse Dart class code back to JSON structure
 * Example: "class User { String name; int id; }"
 * Returns: { name: "", id: 0 }
 */
export function parseDartToJson(code: string): JsonValue {
  const properties = extractDartClassProperties(code)
  return buildJsonFromProperties(properties)
}

function extractDartClassProperties(code: string): { [key: string]: string } {
  const properties: { [key: string]: string } = {}

  // Match class definition: class ClassName { ... }
  const classRegex = /class\s+(\w+)\s*\{([^}]*)\}/
  const match = classRegex.exec(code)

  if (!match) return {}

  const body = match[2]!

  // Extract fields: Type? fieldName;
  const fieldRegex = /(\w+)(<[^>]+>)?\s*\??\s+(\w+)\s*;?/g
  let fieldMatch

  while ((fieldMatch = fieldRegex.exec(body)) !== null) {
    const fieldType = fieldMatch[1]!
    const generic = fieldMatch[2]
    const fieldName = fieldMatch[3]!

    const fullType = generic ? fieldType + generic : fieldType
    properties[fieldName] = fullType
  }

  return properties
}

function buildJsonFromProperties(properties: {
  [key: string]: string
}): JsonValue {
  const result: { [key: string]: JsonValue } = {}

  for (const [key, type] of Object.entries(properties)) {
    result[key] = inferDefaultValueFromDartType(type)
  }

  return result
}

function inferDefaultValueFromDartType(typeStr: string): JsonValue {
  const type = typeStr.trim().toLowerCase()

  if (type.includes('string')) return ''
  if (type.includes('int') || type.includes('double')) return 0
  if (type.includes('bool')) return false
  if (type.includes('list')) return []
  if (type.includes('map')) return {}
  if (type.includes('datetime')) return ''
  if (type.includes('dynamic')) return null

  // For custom types, return empty object
  return {}
}
