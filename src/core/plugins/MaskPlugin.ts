import {BasePlugin} from "@core/plugins/FieldPlugin"
import {MaskPluginOptions, PluginOptions} from "@core/options"
import {Field} from "@core/fields"

interface MaskPart {
  char: string                   // Character to display
  isPlaceholder: boolean         // True when this is an editable placeholder
  isEscaped: boolean             // True when the character is escaped and should be included in rawValue
  replacementValue?: string      // Fixed replacement
  allowedChars?: string          // Allowed characters, as an alternative to a complex pattern
  transformOnMatch?: string      // Value to use on a match
  transformOnMismatch?: string   // Value to use on a mismatch
  defaultValue?: string
  pushToNext?: boolean           // When true, pass the character to the next placeholder
}

export class MaskPlugin extends BasePlugin {
  private config: MaskPluginOptions
  private maskParts: MaskPart[] = []

  constructor(config: MaskPluginOptions, pluginOptions?: PluginOptions) {
    super(pluginOptions)
    this.config = config
  }

  init(_field: Field<any>): void {
    this.parseMask()
  }

  toRawValue(value: string, _field: Field): string {
    return this.applyMask(value)
  }

  toValueClear(value: string, _field: Field): string {
    return this.removeMask(value)
  }

  private parseMask(): void {
    this.maskParts = []
    let i = 0
    let escaped = false

    while (i < this.config.maskFormat.length) {
      const char = this.config.maskFormat[i]

      // Check for escaping
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

            // Check for >> (pushToNext)
            let replacementOnMismatch = parts[2]?.trim() || ''
            let pushToNext = false

            if (parts.length > 2 && parts[2] === '' && parts[3] !== undefined) {
              // Syntax: allowedChars > match > > pushValue
              pushToNext = true
              replacementOnMismatch = parts[3]?.trim() || ''
            } else if (replacementOnMismatch === '' && parts.length > 3) {
              // Syntax: allowedChars > match > > pushValue
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
            // The character is allowed; replace it with matchReplacement
            result += part.transformOnMatch || inputChar
            inputIndex++
          } else if (part.pushToNext) {
            // The character is not allowed, but pushToNext is true
            // Insert mismatchReplacement and pass the character onward
            result += part.transformOnMismatch || this.config.maskPlaceholder
            // Do not advance inputIndex; the next placeholder will process this character
          } else if (part.transformOnMismatch !== undefined) {
            // Standard replacement on mismatch
            result += part.transformOnMismatch || this.config.maskPlaceholder
            inputIndex++
          } else {
            result += this.config.maskPlaceholder
          }
        } else {
          // Standard placeholder
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
        // Literal character
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
            // Insert mismatchReplacement and pass the character onward
            result += part.transformOnMismatch || ''
            // Do not advance inputIndex; the next placeholder will process this character.
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