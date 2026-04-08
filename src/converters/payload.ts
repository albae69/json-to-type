type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/** Convert PascalCase to snake_case */
function pascalToSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Insert underscore before uppercase letters that follow lowercase
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2') // Handle consecutive uppercase letters
    .toLowerCase()
}

/** Replace every leaf value with its field name as a placeholder */
function toTemplate(value: JsonValue, key: string): JsonValue {
  if (value === null) return null
  if (Array.isArray(value)) {
    if (value.length === 0) return []
    return [toTemplate(value[0]!, key)]
  }
  if (typeof value === 'object') {
    const result: { [k: string]: JsonValue } = {}
    for (const [k, v] of Object.entries(value)) {
      result[pascalToSnakeCase(k)] = toTemplate(v, k)
    }
    return result
  }
  // leaf → use the key name as placeholder value, cast to same type, snake_case
  if (typeof value === 'number') return pascalToSnakeCase(key)
  if (typeof value === 'boolean') return pascalToSnakeCase(key)
  return pascalToSnakeCase(key)
}

function buildTemplate(
  parsed: JsonValue,
): { [key: string]: JsonValue } | JsonValue {
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const result: { [k: string]: JsonValue } = {}
    for (const [k, v] of Object.entries(
      parsed as { [key: string]: JsonValue },
    )) {
      result[pascalToSnakeCase(k)] = toTemplate(v, k)
    }
    return result
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return []
    return [toTemplate(parsed[0]!, 'item')]
  }
  return parsed
}

export function convertToPayload(jsonStr: string): string {
  const parsed = JSON.parse(jsonStr) as JsonValue
  const template = buildTemplate(parsed)
  const templateJson = JSON.stringify(template, null, 2)
  const rawJson = JSON.stringify(template)

  let jsBodyLines: string[]
  if (
    typeof template === 'object' &&
    template !== null &&
    !Array.isArray(template)
  ) {
    jsBodyLines = Object.entries(template as { [key: string]: JsonValue }).map(
      ([k, v]) => `    ${k}: ${JSON.stringify(v)},`,
    )
  } else {
    jsBodyLines = [`    ${JSON.stringify(template)},`]
  }

  return [templateJson].join('\n')
}

function buildAxiosBody(template: JsonValue): string[] {
  if (
    typeof template === 'object' &&
    template !== null &&
    !Array.isArray(template)
  ) {
    return Object.entries(template as { [key: string]: JsonValue }).map(
      ([k, v]) => `  ${k}: ${JSON.stringify(v)},`,
    )
  }
  return [`  ${JSON.stringify(template)},`]
}
