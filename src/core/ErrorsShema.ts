type ErrorFieldMapping = string | ((errorValue: any) => string)

export interface ParsedError {
  fieldName: string
  message: string
  sourceKey: string
  matchedBy: 'static' | 'dynamic' | 'fallback'
}

export interface DynamicRule {
  pattern: RegExp
  mapping: ErrorFieldMapping | ((match: RegExpMatchArray) => string)
  priority: number
}

export class ErrorsSchema {
  private _staticRules: Map<string, ErrorFieldMapping> = new Map()
  private _dynamicRules: DynamicRule[] = []
  private _fallbackHandler?: (key: string, value: any) => string | null
  private _valueTransformers: Array<(value: any) => any> = []

  /**
   * Добавляет статическое правило - точное соответствие ключа ошибки
   * @param errorKey - точный ключ ошибки из ответа сервера
   * @param fieldName - имя поля в форме или функция для динамического определения
   */
  staticKey(errorKey: string, fieldName: string | ((errorValue: any) => string)): this {
    this._staticRules.set(errorKey, fieldName)
    return this
  }

  /**
   * Добавляет динамическое правило с регулярным выражением
   * @param pattern - регулярное выражение для сопоставления ключа ошибки
   * @param mapping - имя поля или функция для извлечения имени поля из совпадения
   * @param options - дополнительные опции (приоритет и т.д.)
   */
  dynamicKey(
    pattern: RegExp,
    mapping: string | ((match: RegExpMatchArray) => string),
    options?: { priority?: number }
  ): this {
    this._dynamicRules.push({
      pattern,
      mapping,
      priority: options?.priority ?? 0
    })
    // Сортируем по приоритету (высший приоритет первым)
    this._dynamicRules.sort((a, b) => b.priority - a.priority)
    return this
  }

  /**
   * Устанавливает обработчик для ошибок, которые не подошли ни под одно правило
   */
  fallback(handler: (key: string, value: any) => string | null): this {
    this._fallbackHandler = handler
    return this
  }

  /**
   * Добавляет трансформер для значений ошибок
   * Полезно для нормализации сообщений (например, если сервер возвращает массив ошибок)
   */
  transformValue(transformer: (value: any) => any): this {
    this._valueTransformers.push(transformer)
    return this
  }

  /**
   * Быстрый метод для создания схемы из простого объекта маппинга
   */
  static fromObject(mapping: Record<string, string>): ErrorsSchema {
    const schema = new ErrorsSchema()
    for (const [errorKey, fieldName] of Object.entries(mapping)) {
      schema.staticKey(errorKey, fieldName)
    }
    return schema
  }

  /**
   * Создает схему для массива однотипных форм
   */
  static forArray(
    itemSchema: ErrorsSchema,
    arrayFieldName: string,
    indexExtractor?: (key: string) => number
  ): ErrorsSchema {
    const schema = new ErrorsSchema()

    const extractIndex = indexExtractor || ((key: string) => {
      const match = key.match(/\[(\d+)\]/)
      return match ? parseInt(match[1]) : -1
    })

    // Динамически обрабатывает ошибки массива
    schema.dynamicKey(
      new RegExp(`^${arrayFieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[(\\d+)\\]\\.(.+)$`),
      (match) => {
        const index = match[1]
        const fieldName = match[2]
        return `${arrayFieldName}.${index}.${fieldName}`
      },
      {priority: 100}
    )

    return schema
  }


  /**
   * Основной метод парсинга ошибок с поддержкой трансформеров
   * Поддерживает вложенные структуры через точечную нотацию
   */
  parseErrors(errors: Record<string, any>, prefix: string = ''): Record<string, string> {
    const result: Record<string, string> = {}

    for (const [key, value] of Object.entries(errors)) {
      const fullKey = prefix ? `${prefix}.${key}` : key

      // Если значение - объект, рекурсивно парсим вложенные ошибки
      if (this.isNestedObject(value)) {
        const nestedErrors = this.parseErrors(value, fullKey)
        Object.assign(result, nestedErrors)
        continue
      }

      // Пропускаем null и undefined значения
      if (value === null || value === undefined) {
        continue
      }

      // Применяем трансформеры к значению
      let transformedValue = value
      for (const transformer of this._valueTransformers) {
        transformedValue = transformer(transformedValue)
      }

      const mapping = this.findMapping(fullKey, transformedValue)

      if (mapping) {
        if (typeof mapping === 'function') {
          const fieldName = mapping(transformedValue)
          if (fieldName) {
            result[fieldName] = typeof transformedValue === 'string'
              ? transformedValue
              : JSON.stringify(transformedValue)
          }
        } else {
          result[mapping] = typeof transformedValue === 'string'
            ? transformedValue
            : JSON.stringify(transformedValue)
        }
      } else if (this._fallbackHandler) {
        const fieldName = this._fallbackHandler(fullKey, transformedValue)
        if (fieldName) {
          result[fieldName] = typeof transformedValue === 'string'
            ? transformedValue
            : JSON.stringify(transformedValue)
        }
      }
    }

    return result
  }

  /**
   * Парсит ошибки сервера и возвращает расширенную информацию
   */
  parseErrorsDetailed(errors: Record<string, any>, prefix: string = ''): Record<string, ParsedError> {
    const result: Record<string, ParsedError> = {}

    for (const [key, value] of Object.entries(errors)) {
      const fullKey = prefix ? `${prefix}.${key}` : key

      // Рекурсивно обрабатываем вложенные объекты
      if (this.isNestedObject(value)) {
        const nestedErrors = this.parseErrorsDetailed(value, fullKey)
        Object.assign(result, nestedErrors)
        continue
      }

      // Пропускаем null и undefined значения
      if (value === null || value === undefined) {
        continue
      }

      // Применяем трансформеры к значению
      let transformedValue = value
      for (const transformer of this._valueTransformers) {
        transformedValue = transformer(transformedValue)
      }

      const matchResult = this.findMappingDetailed(fullKey, transformedValue)

      if (matchResult) {
        const message = typeof transformedValue === 'string'
          ? transformedValue
          : JSON.stringify(transformedValue)

        result[matchResult.fieldName] = {
          fieldName: matchResult.fieldName,
          message,
          sourceKey: fullKey,
          matchedBy: matchResult.matchedBy
        }
      }
    }

    return result
  }

  /**
   * Создает схему для вложенной формы
   */
  nest(prefix: string): ErrorsSchema {
    const nestedSchema = new ErrorsSchema()

    // Проксируем статические правила с префиксом
    for (const [key, mapping] of this._staticRules.entries()) {
      nestedSchema.staticKey(`${prefix}.${key}`, mapping)
    }

    // Проксируем динамические правила с префиксом
    for (const rule of this._dynamicRules) {
      const newPattern = new RegExp(`^${prefix}\\.${rule.pattern.source.replace(/^\^/, '')}`)
      nestedSchema.dynamicKey(newPattern, rule.mapping, {priority: rule.priority})
    }

    // Проксируем трансформеры
    for (const transformer of this._valueTransformers) {
      nestedSchema.transformValue(transformer)
    }

    // Проксируем fallback с обработкой префикса
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
   * Клонирует текущую схему
   */
  clone(): ErrorsSchema {
    const cloned = new ErrorsSchema()

    // Копируем статические правила
    for (const [key, mapping] of this._staticRules.entries()) {
      cloned._staticRules.set(key, mapping)
    }

    // Копируем динамические правила
    for (const rule of this._dynamicRules) {
      cloned._dynamicRules.push({...rule})
    }

    // Копируем fallback и трансформеры
    cloned._fallbackHandler = this._fallbackHandler
    cloned._valueTransformers = [...this._valueTransformers]

    return cloned
  }

  /**
   * Объединяет текущую схему с другой
   */
  merge(other: ErrorsSchema): ErrorsSchema {
    const merged = this.clone()

    // Добавляем статические правила из другой схемы
    for (const [key, mapping] of other._staticRules.entries()) {
      merged._staticRules.set(key, mapping)
    }

    // Добавляем динамические правила
    merged._dynamicRules.push(...other._dynamicRules)
    merged._dynamicRules.sort((a, b) => b.priority - a.priority)

    // Добавляем трансформеры
    merged._valueTransformers.push(...other._valueTransformers)

    // Заменяем fallback если есть в другой схеме
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
    // Проверяем статические правила (Map)
    if (this._staticRules.has(key)) {
      const mapping = this._staticRules.get(key)!
      const fieldName = typeof mapping === 'function' ? mapping(value) : mapping
      return fieldName ? {fieldName, matchedBy: 'static'} : null
    }

    // Проверяем динамические правила
    for (const rule of this._dynamicRules) {
      const match = key.match(rule.pattern)
      if (match) {
        const fieldName = typeof rule.mapping === 'function'
          ? rule.mapping(match)
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
    // Проверяем статические правила (Map)
    if (this._staticRules.has(key)) {
      return this._staticRules.get(key)!
    }

    // Проверяем динамические правила
    for (const rule of this._dynamicRules) {
      const match = key.match(rule.pattern)
      if (match) {
        if (typeof rule.mapping === 'function') {
          const fieldName = rule.mapping(match)
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
 * Базовая схема по умолчанию
 */
export const DefaultErrorsSchema = new ErrorsSchema()
  .fallback((key) => key)
