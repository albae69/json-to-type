type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/**
 * Parse Payload template back to full JSON structure
 * Payload format is just JSON template, so we parse it directly
 */
export function parsePayloadToJson(code: string): JsonValue {
  try {
    // Payload is already JSON format, just clean it up
    const cleaned = code.trim()
    const parsed = JSON.parse(cleaned) as JsonValue
    return expandPayloadTemplate(parsed)
  } catch {
    return {}
  }
}

/**
 * Expand payload template (which uses field names as placeholder values)
 * into a full JSON structure with realistic default values
 */
function expandPayloadTemplate(value: JsonValue): JsonValue {
  if (value === null) return null
  if (typeof value === 'string') {
    // Convert string field names to appropriate types
    if (
      value.toLowerCase().includes('id') ||
      value.toLowerCase().includes('count')
    ) {
      return 0
    }
    if (
      value.toLowerCase().includes('active') ||
      value.toLowerCase().includes('enabled')
    ) {
      return false
    }
    if (
      value.toLowerCase().includes('date') ||
      value.toLowerCase().includes('time')
    ) {
      return ''
    }
    return ''
  }
  if (typeof value === 'boolean') return false
  if (typeof value === 'number') return 0
  if (Array.isArray(value)) {
    if (value.length === 0) return []
    return [expandPayloadTemplate(value[0]!)]
  }
  if (typeof value === 'object') {
    const result: { [key: string]: JsonValue } = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = expandPayloadTemplate(val)
    }
    return result
  }

  return null
}
