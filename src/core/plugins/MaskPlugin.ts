import {BasePlugin} from "@core/plugins/FieldPlugin"
import {MaskPluginOptions, PluginOptions} from "@core/options"
import {Field} from "@core/fields"

interface MaskPart {
  char: string                   // символ для отображения
  isPlaceholder: boolean         // true если это заполнитель (можно вводить)
  isEscaped: boolean             // true если символ экранирован (попадает в rawValue)
  replacementValue?: string      // фиксированная замена
  allowedChars?: string          // разрешенные символы (вместо сложного паттерна)
  transformOnMatch?: string      // во что преобразовать при совпадении
  transformOnMismatch?: string   // во что преобразовать при несовпадении
  defaultValue?: string
  pushToNext?: boolean           // если true, отправить символ в следующий placeholder
}

export class MaskPlugin extends BasePlugin {
  private config: MaskPluginOptions
  private maskParts: MaskPart[] = []

  constructor(config: MaskPluginOptions, pluginOptions?: PluginOptions) {
    super(pluginOptions)
    this.config = config
  }

  init(field: Field<any>): void {
    this.parseMask()
  }

  toRawValue(value: string, field: Field): string {
    return this.applyMask(value)
  }

  toValueClear(value: string, field: Field): string {
    return this.removeMask(value)
  }

  private parseMask(): void {
    this.maskParts = []
    let i = 0
    let escaped = false

    while (i < this.config.maskFormat.length) {
      const char = this.config.maskFormat[i]

      // Проверяем на экранирование
      if (char === '/' && !escaped) {
        escaped = true
        i++
        continue
      }

      if (char === this.config.maskPlaceholder &&
        i + 1 < this.config.maskFormat.length &&
        this.config.maskFormat[i + 1] === '{' &&
        !escaped) {

        const openBracket = i + 1
        const closeBracket = this.config.maskFormat.indexOf('}', openBracket)

        if (closeBracket !== -1 && closeBracket > openBracket + 1) {
          const configString = this.config.maskFormat.substring(openBracket + 1, closeBracket).trim()

          if (configString.includes('>')) {
            const parts = configString.split('>')
            const allowedChars = parts[0].trim()
            const replacementOnMatch = parts[1]?.trim() || ''

            // Проверяем на >> (pushToNext)
            let replacementOnMismatch = parts[2]?.trim() || ''
            let pushToNext = false

            if (parts.length > 2 && parts[2] === '' && parts[3] !== undefined) {
              // Синтаксис: allowedChars > match > > pushValue
              pushToNext = true
              replacementOnMismatch = parts[3]?.trim() || ''
            } else if (replacementOnMismatch === '' && parts.length > 3) {
              // Синтаксис: allowedChars > match > > pushValue
              pushToNext = true
              replacementOnMismatch = parts[3]?.trim() || ''
            }

            this.maskParts.push({
              char: replacementOnMatch || this.config.maskPlaceholder,
              isPlaceholder: true,
              isEscaped: escaped,
              allowedChars: allowedChars,
              transformOnMatch: replacementOnMatch,
              transformOnMismatch: replacementOnMismatch,
              defaultValue: replacementOnMatch,
              pushToNext: pushToNext
            })
          } else {
            this.maskParts.push({
              char: configString,
              isPlaceholder: true,
              isEscaped: escaped,
              replacementValue: configString,
              defaultValue: configString
            })
          }

          escaped = false
          i = closeBracket + 1
          continue
        }
      }

      const isPlaceholder = char === this.config.maskPlaceholder
      this.maskParts.push({
        char: char,
        isPlaceholder: isPlaceholder,
        isEscaped: escaped
      })

      escaped = false
      i++
    }
  }

  private applyMask(value: string): string {
    if (typeof value !== 'string' || !value) return ''

    let result = ''
    let inputIndex = 0

    for (let maskIndex = 0; maskIndex < this.maskParts.length; maskIndex++) {
      const part = this.maskParts[maskIndex]

      if (inputIndex >= value.length) {
        if (part.replacementValue) {
          result += part.replacementValue
          continue
        }
        if (part.transformOnMatch) {
          result += part.transformOnMatch
          continue
        }
        break
      }

      const inputChar = value[inputIndex]

      if (part.isPlaceholder) {
        if (part.replacementValue) {
          result += part.replacementValue
          inputIndex++
        } else if (part.allowedChars) {
          if (part.allowedChars.includes(inputChar)) {
            // Символ разрешен - заменяем на matchReplacement
            result += part.transformOnMatch || inputChar
            inputIndex++
          } else if (part.pushToNext) {
            // Символ не разрешен, но pushToNext = true
            // Вставляем mismatchReplacement, а символ идет дальше
            result += part.transformOnMismatch || this.config.maskPlaceholder
            // НЕ сдвигаем inputIndex - символ обработается в следующем placeholder
          } else if (part.transformOnMismatch !== undefined) {
            // Обычная замена при несовпадении
            result += part.transformOnMismatch || this.config.maskPlaceholder
            inputIndex++
          } else {
            result += this.config.maskPlaceholder
          }
        } else {
          // Обычный placeholder
          if (this.config.digitPattern.test(inputChar)) {
            result += inputChar
            inputIndex++
          } else if (inputChar === this.config.maskPlaceholder) {
            result += this.config.maskPlaceholder
            inputIndex++
          } else {
            inputIndex++
            maskIndex--
          }
        }
      } else {
        // Литерал
        if (inputChar === part.char) {
          result += part.char
          inputIndex++
        } else if (this.config.digitPattern.test(inputChar)) {
          result += part.char
        } else {
          result += part.char
        }
      }
    }

    return result
  }

  private removeMask(value: string): string {
    if (typeof value !== 'string' || !value) return ''

    let result = ''
    let inputIndex = 0

    for (let maskIndex = 0; maskIndex < this.maskParts.length; maskIndex++) {
      const part = this.maskParts[maskIndex]

      if (inputIndex >= value.length) {
        if (part.replacementValue) {
          result += part.replacementValue
        } else if (part.transformOnMatch) {
          result += part.transformOnMatch
        }
        continue
      }

      const inputChar = value[inputIndex]

      if (part.isPlaceholder) {
        if (part.replacementValue) {
          result += part.replacementValue
        } else if (part.allowedChars) {
          if (part.allowedChars.includes(inputChar)) {
            result += part.transformOnMatch || inputChar
          } else if (part.pushToNext) {
            // Вставляем mismatchReplacement, символ идет дальше
            result += part.transformOnMismatch || ''
            // НЕ сдвигаем inputIndex
            continue
          } else {
            result += part.transformOnMatch || ''
          }
        } else {
          if (inputChar !== this.config.maskPlaceholder &&
            this.config.digitPattern.test(inputChar)) {
            result += inputChar
          }
        }
        inputIndex++
      } else if (part.isEscaped) {
        result += part.char
        if (inputChar === part.char) inputIndex++
      } else {
        if (inputChar === part.char) inputIndex++
      }
    }

    return result
  }
}