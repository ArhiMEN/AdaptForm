import {isValidationError, validationError, type ValidationError} from './ValidationError'

type ErrorFieldMapping = string | ((errorValue: any) => string)

export interface ParsedError {
  fieldName: string
  message: string
  sourceKey: string
  matchedBy: 'static' | 'dynamic' | 'fallback'
}

export interface DynamicRule {
  pattern: RegExp
  mapping: ErrorFieldMapping | ((match: RegExpMatchArray, value?: any) => string)
  priority: number
}

export class ErrorsSchema {
  private _staticRules: Map<string, ErrorFieldMapping> = new Map()
  private _dynamicRules: DynamicRule[] = []
  private _fallbackHandler?: (key: string, value: any) => string | null
  private _valueTransformers: Array<(value: any) => any> = []

  /**
   * Add a static rule that matches an exact error key.
   * @param errorKey - Exact error key returned by the server.
   * @param fieldName - Form field name or a function that resolves it dynamically.
   */
  staticKey(errorKey: string, fieldName: string | ((errorValue: any) => string)): this {
    this._staticRules.set(errorKey, fieldName)
    return this
  }

  /**
   * Add a dynamic rule using a regular expression.
   * @param pattern - Regular expression used to match an error key.
   * @param mapping - Field name or function that derives it from the match.
   * @param options - Additional options, such as rule priority.
   */
  dynamicKey(
    pattern: RegExp,
    mapping: string | ((match: RegExpMatchArray, value?: any) => string),
    options?: { priority?: number }
  ): this {
    this._dynamicRules.push({
      pattern,
      mapping,
      priority: options?.priority ?? 0
    })
    // Sort by priority, highest first.
    this._dynamicRules.sort((a, b) => b.priority - a.priority)
    return this
  }

  /**
   * Set a handler for errors that do not match any rule.
   */
  fallback(handler: (key: string, value: any) => string | null): this {
    this._fallbackHandler = handler
    return this
  }

  /**
   * Add a transformer for error values.
   * Useful for normalizing messages, such as server responses containing arrays.
   */
  transformValue(transformer: (value: any) => any): this {
    this._valueTransformers.push(transformer)
    return this
  }

  /**
   * Create a schema from a simple mapping object.
   */
  static fromObject(mapping: Record<string, string>): ErrorsSchema {
    const schema = new ErrorsSchema()
    for (const [errorKey, fieldName] of Object.entries(mapping)) {
      schema.staticKey(errorKey, fieldName)
    }
    return schema
  }

  /**
   * Create a schema for an array of similarly structured forms.
   */
  static forArray(
    itemSchema: ErrorsSchema,
    arrayFieldName: string,
    indexExtractor?: (key: string) => number
  ): ErrorsSchema {
    const schema = new ErrorsSchema()

    for (const transformer of itemSchema._valueTransformers) {
      schema.transformValue(transformer)
    }

    const escapedArrayFieldName = arrayFieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Accept bracket and dotted indices by default; custom formats use indexExtractor.
    const indexPattern = indexExtractor
      ? '(.+?)'
      : '(?:\\[(\\d+)\\]|\\.(\\d+))'

    schema.dynamicKey(
      new RegExp(`^${escapedArrayFieldName}${indexPattern}\\.(.+)$`),
      (match, value) => {
        const sourceKey = match[0]
        const index = indexExtractor
          ? indexExtractor(sourceKey)
          : Number(match[1] ?? match[2])

        if (!Number.isInteger(index) || index < 0) {
          return ''
        }

        const fieldPath = match[indexExtractor ? 2 : 3]
        const itemMapping = itemSchema.findMapping(fieldPath, value)
        const mappedFieldPath = itemMapping
          ? typeof itemMapping === 'function'
            ? itemMapping(value)
            : itemMapping
          : fieldPath

        return `${arrayFieldName}.${index}.${mappedFieldPath}`
      },
      {priority: 100}
    )

    return schema
  }


  /**
   * Parse errors while applying configured value transformers.
   * Supports nested structures using dot notation.
   */
  parseErrors(errors: Record<string, any>, prefix: string = ''): Record<string, string> {
    const result: Record<string, string> = {}

    for (const [key, value] of Object.entries(errors)) {
      const fullKey = prefix ? `${prefix}.${key}` : key

      // Recursively parse nested error objects.
      if (this.isNestedObject(value)) {
        const nestedErrors = this.parseErrors(value, fullKey)
        Object.assign(result, nestedErrors)
        continue
      }

      // Skip null and undefined values.
      if (value === null || value === undefined) {
        continue
      }

      // Apply value transformers.
      let transformedValue = value
      for (const transformer of this._valueTransformers) {
        transformedValue = transformer(transformedValue)
      }

      const mapping = this.findMapping(fullKey, transformedValue)

      if (mapping) {
        if (typeof mapping === 'function') {
          const fieldName = mapping(transformedValue)
          if (fieldName) {
            Object.defineProperty(result, fieldName, {value: typeof transformedValue === 'string'
              ? transformedValue
              : JSON.stringify(transformedValue), enumerable: true, writable: true, configurable: true})
          }
        } else {
          Object.defineProperty(result, mapping, {value: typeof transformedValue === 'string'
            ? transformedValue
            : JSON.stringify(transformedValue), enumerable: true, writable: true, configurable: true})
        }
      }
    }

    return result
  }

  /**
   * Lossless server input. Transformers run on each leaf before mapping, as in parseErrors.
   * Legacy parseErrors overrides remain authoritative for custom schemas.
   */
  parseValidationErrors(errors: Record<string, unknown>, prefix: string = ''): readonly ValidationError[] {
    if (this.parseErrors !== ErrorsSchema.prototype.parseErrors) {
      return Object.freeze(Object.entries(this.parseErrors(errors, prefix)).map(([path, message]) =>
        validationError({code: 'server', message}, 'server', this.errorPath(path))))
    }
    const result: ValidationError[] = []
    const visit = (data: Record<string, unknown>, parent: string) => {
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) continue
        const fullKey = parent ? `${parent}.${key}` : key
        if (!isValidationError(value) && this.isNestedObject(value)) {
          visit(value as Record<string, unknown>, fullKey)
          continue
        }
        let transformedValue: unknown = value
        for (const transformer of this._valueTransformers) transformedValue = transformer(transformedValue)
        if (Array.isArray(transformedValue) && transformedValue.some(item => this.isNestedObject(item) && !isValidationError(item))) {
          visit(Object.fromEntries(transformedValue.map((item, index) => [String(index), item])), fullKey)
          continue
        }
        const mapping = this.findMapping(fullKey, transformedValue)
        const fieldName = typeof mapping === 'function' ? mapping(transformedValue) : mapping
        if (!fieldName) continue
        const values = Array.isArray(transformedValue) ? transformedValue : [transformedValue]
        for (const item of values) {
          if (item === null || item === undefined) continue
          const input = isValidationError(item) ? item : {code: 'server',
            message: typeof item === 'string' ? item : JSON.stringify(item)}
          result.push(validationError(input, 'server', this.errorPath(fieldName)))
        }
      }
    }
    visit(errors, prefix)
    return Object.freeze(result)
  }

  private errorPath(path: string): (string | number)[] {
    return path.split('.').map(part => /^(0|[1-9]\d*)$/.test(part) ? Number(part) : part)
  }

  /**
   * Parse server errors and return detailed metadata.
   */
  parseErrorsDetailed(errors: Record<string, any>, prefix: string = ''): Record<string, ParsedError> {
    const result: Record<string, ParsedError> = {}

    for (const [key, value] of Object.entries(errors)) {
      const fullKey = prefix ? `${prefix}.${key}` : key

      // Recursively process nested objects.
      if (this.isNestedObject(value)) {
        const nestedErrors = this.parseErrorsDetailed(value, fullKey)
        Object.assign(result, nestedErrors)
        continue
      }

      // Skip null and undefined values.
      if (value === null || value === undefined) {
        continue
      }

      // Apply value transformers.
      let transformedValue = value
      for (const transformer of this._valueTransformers) {
        transformedValue = transformer(transformedValue)
      }

      const matchResult = this.findMappingDetailed(fullKey, transformedValue)

      if (matchResult) {
        const message = typeof transformedValue === 'string'
          ? transformedValue
          : JSON.stringify(transformedValue)

        Object.defineProperty(result, matchResult.fieldName, {value: {
          fieldName: matchResult.fieldName,
          message,
          sourceKey: fullKey,
          matchedBy: matchResult.matchedBy
        }, enumerable: true, writable: true, configurable: true})
      }
    }

    return result
  }

  /**
   * Create a schema for a nested form.
   */
  nest(prefix: string): ErrorsSchema {
    const nestedSchema = new ErrorsSchema()

    // Forward static rules with the prefix.
    for (const [key, mapping] of this._staticRules.entries()) {
      nestedSchema.staticKey(`${prefix}.${key}`, mapping)
    }

    // Forward dynamic rules with the prefix.
    for (const rule of this._dynamicRules) {
      const newPattern = new RegExp(`^${prefix}\\.${rule.pattern.source.replace(/^\^/, '')}`)
      nestedSchema.dynamicKey(newPattern, rule.mapping, {priority: rule.priority})
    }

    // Forward value transformers.
    for (const transformer of this._valueTransformers) {
      nestedSchema.transformValue(transformer)
    }

    // Forward the fallback handler while removing the prefix.
    if (this._fallbackHandler) {
      nestedSchema.fallback((key, value) => {
        if (key.startsWith(`${prefix}.`)) {
          return this._fallbackHandler!(key.slice(prefix.length + 1), value)
        }
        return null
      })
    }

    return nestedSchema
  }

  /**
   * Clone the current schema.
   */
  clone(): ErrorsSchema {
    const cloned = new ErrorsSchema()

    // Copy static rules.
    for (const [key, mapping] of this._staticRules.entries()) {
      cloned._staticRules.set(key, mapping)
    }

    // Copy dynamic rules.
    for (const rule of this._dynamicRules) {
      cloned._dynamicRules.push({...rule})
    }

    // Copy the fallback handler and value transformers.
    cloned._fallbackHandler = this._fallbackHandler
    cloned._valueTransformers = [...this._valueTransformers]

    return cloned
  }

  /**
   * Merge the current schema with another schema.
   */
  merge(other: ErrorsSchema): ErrorsSchema {
    const merged = this.clone()

    // Add static rules from the other schema.
    for (const [key, mapping] of other._staticRules.entries()) {
      merged._staticRules.set(key, mapping)
    }

    // Add dynamic rules.
    merged._dynamicRules.push(...other._dynamicRules)
    merged._dynamicRules.sort((a, b) => b.priority - a.priority)

    // Add value transformers.
    merged._valueTransformers.push(...other._valueTransformers)

    // Replace the fallback handler when the other schema defines one.
    if (other._fallbackHandler) {
      merged._fallbackHandler = other._fallbackHandler
    }

    return merged
  }

  private isNestedObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
  }

  private findMappingDetailed(key: string, value: any): {
    fieldName: string
    matchedBy: 'static' | 'dynamic' | 'fallback'
  } | null {
    // Check static rules (Map).
    if (this._staticRules.has(key)) {
      const mapping = this._staticRules.get(key)!
      const fieldName = typeof mapping === 'function' ? mapping(value) : mapping
      return fieldName ? {fieldName, matchedBy: 'static'} : null
    }

    // Check dynamic rules.
    for (const rule of this._dynamicRules) {
      const match = key.match(rule.pattern)
      if (match) {
        const fieldName = typeof rule.mapping === 'function'
          ? rule.mapping(match, value)
          : rule.mapping
        return fieldName ? {fieldName, matchedBy: 'dynamic'} : null
      }
    }

    // Fallback
    if (this._fallbackHandler) {
      const fieldName = this._fallbackHandler(key, value)
      return fieldName ? {fieldName, matchedBy: 'fallback'} : null
    }

    return null
  }

  private findMapping(key: string, value: any): ErrorFieldMapping | null {
    // Check static rules (Map).
    if (this._staticRules.has(key)) {
      return this._staticRules.get(key)!
    }

    // Check dynamic rules.
    for (const rule of this._dynamicRules) {
      const match = key.match(rule.pattern)
      if (match) {
        if (typeof rule.mapping === 'function') {
          const fieldName = rule.mapping(match, value)
          return fieldName
        }
        return rule.mapping
      }
    }

    // Fallback
    if (this._fallbackHandler) {
      const fieldName = this._fallbackHandler(key, value)
      return fieldName
    }

    return null
  }
}

/**
 * Default base schema.
 */
export const DefaultErrorsSchema = new ErrorsSchema()
  .fallback((key) => key)
