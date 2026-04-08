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

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function inferDartType(
  value: JsonValue,
  key: string,
  classes: Map<string, string>,
): string {
  if (value === null) return 'dynamic'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'boolean') return 'bool'
  if (typeof value === 'number')
    return Number.isInteger(value) ? 'int' : 'double'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<dynamic>'
    const first = value[0]!
    const elemType = inferDartType(first, key, classes)
    return `List<${elemType}>`
  }

  if (typeof value === 'object') {
    const typeName = toPascalCase(key)
    buildClass(value as { [key: string]: JsonValue }, typeName, classes)
    return typeName
  }

  return 'dynamic'
}

function defaultDartValue(value: JsonValue, dartType: string): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return "''"
  if (typeof value === 'boolean') return 'false'
  if (typeof value === 'number') return Number.isInteger(value) ? '0' : '0.0'
  if (Array.isArray(value)) return '[]'
  if (typeof value === 'object') return `${dartType}.init()`
  return 'null'
}

function buildClass(
  obj: { [key: string]: JsonValue },
  name: string,
  classes: Map<string, string>,
): void {
  if (classes.has(name)) return

  const fields: string[] = []
  const constructorParams: string[] = []
  const fromJsonLines: string[] = []
  const toJsonLines: string[] = []
  const initLines: string[] = []
  const copyWithParams: string[] = []
  const copyWithAssignments: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = toCamelCase(key)
    const childTypeName = toPascalCase(key)
    const dartType = inferDartType(value, childTypeName, classes)
    const nullable = value === null ? '?' : ''

    fields.push(`  final ${dartType}${nullable} ${fieldName};`)
    constructorParams.push(`    required this.${fieldName},`)
    initLines.push(`      ${fieldName}: ${defaultDartValue(value, dartType)},`)

    // copyWith parameters and assignments
    copyWithParams.push(`    ${dartType}${nullable}? ${fieldName},`)
    copyWithAssignments.push(`      ${fieldName}: ${fieldName} ?? this.${fieldName},`)

    // fromJson
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      fromJsonLines.push(
        `      ${fieldName}: ${dartType}.fromJson(json['${key}'] as Map<String, dynamic>),`,
      )
    } else if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      !Array.isArray(value[0])
    ) {
      const elemType = toPascalCase(key)
      fromJsonLines.push(
        `      ${fieldName}: (json['${key}'] as List<dynamic>).map((e) => ${elemType}.fromJson(e as Map<String, dynamic>)).toList(),`,
      )
    } else {
      fromJsonLines.push(
        `      ${fieldName}: json['${key}'] as ${dartType}${nullable},`,
      )
    }

    // toJson
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      toJsonLines.push(`        '${key}': ${fieldName}.toJson(),`)
    } else if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      !Array.isArray(value[0])
    ) {
      toJsonLines.push(
        `        '${key}': ${fieldName}.map((e) => e.toJson()).toList(),`,
      )
    } else {
      toJsonLines.push(`        '${key}': ${fieldName},`)
    }
  }

  const lines: string[] = [
    `class ${name} {`,
    ...fields,
    '',
    `  ${name}({`,
    ...constructorParams,
    `  });`,
    '',
    `  factory ${name}.init() => ${name}(`,
    ...initLines,
    `  );`,
    '',
    `  factory ${name}.fromJson(Map<String, dynamic> json) => ${name}(`,
    ...fromJsonLines,
    `  );`,
    '',
    `  Map<String, dynamic> toJson() => {`,
    ...toJsonLines,
    `  };`,
    '',
    `  ${name} copyWith({`,
    ...copyWithParams,
    `  }) => ${name}(`,
    ...copyWithAssignments,
    `  );`,
    '}',
  ]

  classes.set(name, lines.join('\n'))
}

export function convertToDart(jsonStr: string, rootName = 'Root'): string {
  const parsed = JSON.parse(jsonStr) as JsonValue

  const classes = new Map<string, string>()

  let rootObj: { [key: string]: JsonValue }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return `typedef ${rootName} = List<dynamic>;`
    const first = parsed[0]
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      rootObj = first as { [key: string]: JsonValue }
    } else {
      return `typedef ${rootName} = List<${inferDartType(first, rootName, classes)}>;`
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    rootObj = parsed as { [key: string]: JsonValue }
  } else {
    return `// ${rootName}: ${inferDartType(parsed, rootName, classes)}`
  }

  buildClass(rootObj, rootName, classes)

  const result: string[] = []
  classes.forEach((cls, name) => {
    if (name !== rootName) result.push(cls + '\n')
  })
  const root = classes.get(rootName)
  if (root) result.push(root)

  return result.join('\n')
}
