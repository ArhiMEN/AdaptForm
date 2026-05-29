import {Field} from "@core/fields/Field";
import {BasePlugin} from "@core/plugins/FieldPlugin";
import {PluginOptions} from "@core/options";

type SymbolPosition = 'prefix' | 'postfix'

interface SymbolOptions {
  repeat?: number
  isMask?: boolean
  position?: SymbolPosition
}

interface AcceptRule {
  regex: RegExp
  transform?: (char: string) => string
}

interface PatternRule {
  regex: RegExp
  fallback?: string
}

interface ReplaceRule {
  search: RegExp
  replace: string
}

interface DecoratorBlock {
  symbol: string | null
  options: Required<SymbolOptions>

  accepts: AcceptRule[]
  patterns: PatternRule[]
}

export class DecoratorPlugin<T = any> extends BasePlugin<T> {
  private blocks: DecoratorBlock[] = []
  private replaces: ReplaceRule[] = []
  private valueClear: string = ''

  private currentBlock: DecoratorBlock | null = null

  constructor(pluginOptions: PluginOptions = {}) {
    super(pluginOptions)
  }

  symbol(
    symbol: string | null = null,
    options: SymbolOptions = {}
  ) {
    const block: DecoratorBlock = {
      symbol,

      options: {
        repeat: options.repeat ?? 1,
        isMask: options.isMask ?? false,
        position: options.position ?? 'prefix'
      },

      accepts: [],
      patterns: []
    }

    this.blocks.push(block)
    this.currentBlock = block

    return this
  }

  accept(
    regex: RegExp,
    transform?: (char: string) => string
  ) {
    if (!this.currentBlock) {
      throw new Error('accept() requires symbol() before it')
    }

    this.currentBlock.accepts.push({
      regex,
      transform
    })

    return this
  }

  pattern(
    regex: RegExp | string[] | number[],
    fallback?: string
  ) {
    if (!this.currentBlock) {
      throw new Error('pattern() requires symbol() before it')
    }

    let compiledRegex: RegExp

    if (regex instanceof RegExp) {
      compiledRegex = regex
    } else {
      const escaped = regex
        .map(v => this.escapeRegex(String(v)))
        .join('')

      compiledRegex = new RegExp(`[${escaped}]`)
    }

    this.currentBlock.patterns.push({
      regex: compiledRegex,
      fallback
    })

    return this
  }

  replace(search: RegExp, replace: string) {
    this.replaces.push({
      search,
      replace
    })

    return this
  }

  init(field: Field<T>) {
  }

  toRawValue(value: any, field: Field<T>) {
    return this.process(String(value ?? '')).rawValue
  }

  toValueClear(value: any, field: Field<T>) {
    return this.process(String(value ?? '')).valueClear
  }

  private removeMask(input: string) {
    let result = input

    for (const block of this.blocks) {
      if (block.options.isMask && block.symbol) {
        result = result.split(block.symbol).join('')
      }
    }

    return result
  }

  private process(input: string) {
    input = this.removeMask(input)

    let valueClear = ''
    let rawValue = ''

    let inputIndex = 0

    for (const block of this.blocks) {
      const repeat =
        block.options.repeat === -1
          ? Infinity
          : block.options.repeat

      let inserted = 0
      let blockStarted = false

      while (
        inserted < repeat &&
        inputIndex < input.length
        ) {

        const char = input[inputIndex]

        let accepted = true
        let outputChar = char
        let consumeChar = true

        // =========================
        // ACCEPT
        // =========================

        if (block.accepts.length) {
          for (const accept of block.accepts) {
            if (!accept.regex.test(char)) {
              accepted = false

              if (accept.transform) {
                outputChar = accept.transform(char)

                // символ пользователя идёт дальше
                consumeChar = false
                accepted = true
              }
            }
          }
        }

        // =========================
        // PATTERN
        // =========================

        if (accepted && block.patterns.length) {
          for (const pattern of block.patterns) {
            if (!pattern.regex.test(char)) {
              if (pattern.fallback !== undefined) {
                outputChar = pattern.fallback
              } else {
                accepted = false
              }
            }
          }
        }

        // =========================
        // INVALID
        // =========================

        if (!accepted) {
          inputIndex++
          continue
        }

        // =========================
        // PREFIX
        // рисуется только когда
        // пользователь дошёл
        // до этого блока
        // =========================

        if (
          !blockStarted &&
          block.symbol &&
          block.options.position === 'prefix'
        ) {
          rawValue += block.symbol

          if (!block.options.isMask) {
            valueClear += block.symbol
          }

          blockStarted = true
        }

        // =========================
        // VALUE
        // =========================

        rawValue += outputChar
        valueClear += outputChar

        // =========================
        // POSTFIX
        // =========================

        if (
          block.symbol &&
          block.options.position === 'postfix'
        ) {
          rawValue += block.symbol

          if (!block.options.isMask) {
            valueClear += block.symbol
          }
        }

        inserted++

        if (consumeChar) {
          inputIndex++
        }
      }
    }

    // =========================
    // REPLACE
    // =========================

    for (const replaceRule of this.replaces) {
      rawValue = rawValue.replace(
        replaceRule.search,
        replaceRule.replace
      )
    }

    return {
      valueClear,
      rawValue
    }
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}