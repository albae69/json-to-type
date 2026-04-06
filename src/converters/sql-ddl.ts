interface Column {
  name: string
  type: string
  isNullable: boolean
  isPrimaryKey: boolean
  isUnique: boolean
  defaultValue?: string
}

interface TableSchema {
  name: string
  columns: Column[]
}

function parseSqlDDL(ddl: string): TableSchema {
  // Match CREATE TABLE statement
  const createTableMatch = ddl.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(([\s\S]*)\)/i,
  )

  if (!createTableMatch) {
    throw new Error('Invalid SQL DDL. Expected CREATE TABLE statement.')
  }

  const tableName = createTableMatch[1]!
  const columnDefinitions = createTableMatch[2]!

  const columns: Column[] = []

  // Split by comma, but be careful with nested parentheses
  const lines = columnDefinitions.split(/,(?![^()]*\))/)

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip constraint lines (PRIMARY KEY, FOREIGN KEY, etc.)
    if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|INDEX)/i.test(trimmed)) {
      continue
    }

    // Parse column definition
    const columnMatch = trimmed.match(
      /^["'`]?(\w+)["'`]?\s+(\w+(?:\s*\(\s*\d+\s*\))?)(.*?)$/i,
    )

    if (!columnMatch) continue

    const columnName = columnMatch[1]!
    const columnType = columnMatch[2]!.trim().toUpperCase()
    const options = columnMatch[3]!.toUpperCase()

    const column: Column = {
      name: columnName,
      type: columnType,
      isNullable: !options.includes('NOT NULL'),
      isPrimaryKey: options.includes('PRIMARY KEY'),
      isUnique: options.includes('UNIQUE'),
    }

    // Extract default value
    const defaultMatch = options.match(/DEFAULT\s+([^\s]+)/)
    if (defaultMatch) {
      column.defaultValue = defaultMatch[1]
    }

    columns.push(column)
  }

  return { name: tableName, columns }
}

function sqlTypeToTsType(sqlType: string): string {
  const baseType = sqlType.split('(')[0]!.trim().toUpperCase()

  switch (baseType) {
    case 'INT':
    case 'INTEGER':
    case 'BIGINT':
    case 'SMALLINT':
    case 'TINYINT':
    case 'DECIMAL':
    case 'NUMERIC':
    case 'FLOAT':
    case 'DOUBLE':
      return 'number'
    case 'VARCHAR':
    case 'CHAR':
    case 'TEXT':
    case 'LONGTEXT':
    case 'MEDIUMTEXT':
    case 'TINYTEXT':
    case 'STRING':
      return 'string'
    case 'BOOLEAN':
    case 'BOOL':
      return 'boolean'
    case 'DATE':
    case 'DATETIME':
    case 'TIMESTAMP':
    case 'TIME':
      return 'Date'
    case 'JSON':
    case 'JSONB':
      return 'Record<string, any>'
    case 'UUID':
      return 'string'
    case 'BLOB':
    case 'BYTEA':
      return 'Buffer'
    default:
      return 'string'
  }
}

function sqlTypeToGoType(sqlType: string): string {
  const baseType = sqlType.split('(')[0]!.trim().toUpperCase()

  switch (baseType) {
    case 'INT':
    case 'INTEGER':
    case 'SMALLINT':
    case 'TINYINT':
      return 'int'
    case 'BIGINT':
      return 'int64'
    case 'DECIMAL':
    case 'NUMERIC':
    case 'FLOAT':
    case 'DOUBLE':
      return 'float64'
    case 'VARCHAR':
    case 'CHAR':
    case 'TEXT':
    case 'LONGTEXT':
    case 'MEDIUMTEXT':
    case 'TINYTEXT':
    case 'STRING':
    case 'UUID':
      return 'string'
    case 'BOOLEAN':
    case 'BOOL':
      return 'bool'
    case 'DATE':
    case 'DATETIME':
    case 'TIMESTAMP':
    case 'TIME':
      return 'time.Time'
    case 'JSON':
    case 'JSONB':
      return 'map[string]interface{}'
    case 'BLOB':
    case 'BYTEA':
      return '[]byte'
    default:
      return 'string'
  }
}

function sqlTypeToDartType(sqlType: string): string {
  const baseType = sqlType.split('(')[0]!.trim().toUpperCase()

  switch (baseType) {
    case 'INT':
    case 'INTEGER':
    case 'BIGINT':
    case 'SMALLINT':
    case 'TINYINT':
    case 'DECIMAL':
    case 'NUMERIC':
    case 'FLOAT':
    case 'DOUBLE':
      return 'int'
    case 'VARCHAR':
    case 'CHAR':
    case 'TEXT':
    case 'LONGTEXT':
    case 'MEDIUMTEXT':
    case 'TINYTEXT':
    case 'STRING':
    case 'UUID':
      return 'String'
    case 'BOOLEAN':
    case 'BOOL':
      return 'bool'
    case 'DATE':
    case 'DATETIME':
    case 'TIMESTAMP':
    case 'TIME':
      return 'DateTime'
    case 'JSON':
    case 'JSONB':
      return 'Map<String, dynamic>'
    case 'BLOB':
    case 'BYTEA':
      return 'List<int>'
    default:
      return 'String'
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[_\-\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase())
}

function toCamelCase(str: string): string {
  return str
    .replace(/[_\-\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase())
}

export function convertSqlToTypeScript(ddl: string): string {
  const schema = parseSqlDDL(ddl)
  const lines: string[] = []

  lines.push(`export interface ${toPascalCase(schema.name)} {`)

  for (const column of schema.columns) {
    const tsType = sqlTypeToTsType(column.type)
    const nullable = !column.isPrimaryKey && column.isNullable ? ' | null' : ''
    const optional = !column.isPrimaryKey && column.isNullable ? '?' : ''
    lines.push(`  ${column.name}${optional}: ${tsType}${nullable};`)
  }

  lines.push('}')

  return lines.join('\n')
}

export function convertSqlToGolang(ddl: string): string {
  const schema = parseSqlDDL(ddl)
  const lines: string[] = []

  lines.push(`type ${toPascalCase(schema.name)} struct {`)

  for (const column of schema.columns) {
    const goType = sqlTypeToGoType(column.type)
    const fieldType =
      column.isNullable && !column.isPrimaryKey ? `*${goType}` : goType
    const fieldName = toPascalCase(column.name)
    const tag = ` \`json:"${column.name}"\``
    lines.push(`  ${fieldName} ${fieldType}${tag}`)
  }

  lines.push('}')

  return lines.join('\n')
}

export function convertSqlToDart(ddl: string): string {
  const schema = parseSqlDDL(ddl)
  const lines: string[] = []

  const className = toPascalCase(schema.name)
  lines.push(`class ${className} {`)

  // Properties
  for (const column of schema.columns) {
    const dartType = sqlTypeToDartType(column.type)
    const fieldType =
      column.isNullable && !column.isPrimaryKey ? `${dartType}?` : dartType
    lines.push(`  final ${fieldType} ${toCamelCase(column.name)};`)
  }

  lines.push('')

  // Constructor
  lines.push(`  ${className}({`)
  for (const column of schema.columns) {
    const required = !column.isNullable && column.isPrimaryKey ? '' : ''
    lines.push(`    required this.${toCamelCase(column.name)},`)
  }
  lines.push(`  });`)

  lines.push('')

  // fromJson factory
  lines.push(`  factory ${className}.fromJson(Map<String, dynamic> json) {`)
  lines.push(`    return ${className}(`)
  for (const column of schema.columns) {
    lines.push(
      `      ${toCamelCase(column.name)}: json['${column.name}']${column.isNullable ? ' as ${sqlTypeToDartType(column.type)}?' : ' as ${sqlTypeToDartType(column.type)}'},`,
    )
  }
  lines.push(`    );`)
  lines.push(`  }`)

  lines.push('')

  // toJson method
  lines.push(`  Map<String, dynamic> toJson() {`)
  lines.push(`    return {`)
  for (const column of schema.columns) {
    lines.push(`      '${column.name}': ${toCamelCase(column.name)},`)
  }
  lines.push(`    };`)
  lines.push(`  }`)

  lines.push('}')

  return lines.join('\n')
}

export function convertSqlToPayload(ddl: string): string {
  const schema = parseSqlDDL(ddl)
  const fields: Record<string, unknown>[] = []

  for (const column of schema.columns) {
    const baseType = sqlTypeToTsType(column.type)

    const field: Record<string, unknown> = {
      name: column.name,
      type: baseType,
    }

    if (column.isPrimaryKey) {
      field['admin'] = { position: 'sidebar' }
    }

    const baseFieldConfig: Record<string, unknown> = {}

    if (column.isUnique) {
      baseFieldConfig['unique'] = true
    }

    if (!column.isNullable || column.isPrimaryKey) {
      baseFieldConfig['required'] = true
    }

    if (column.defaultValue) {
      baseFieldConfig['defaultValue'] = column.defaultValue
    }

    if (Object.keys(baseFieldConfig).length > 0) {
      field['config'] = baseFieldConfig
    }

    fields.push(field)
  }

  const payload = {
    slug: schema.name.toLowerCase(),
    labels: {
      singular: toPascalCase(schema.name),
      plural: `${toPascalCase(schema.name)}s`,
    },
    fields: fields,
  }

  return JSON.stringify(payload, null, 2)
}
