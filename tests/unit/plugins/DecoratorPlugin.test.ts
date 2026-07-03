import { describe, it, expect } from 'vitest'
import { DecoratorPlugin } from '@core/plugins/DecoratorPlugin'

describe('DecoratorPlugin', () => {
  describe('basic prefix', () => {
    it('should add prefix symbol', () => {
      const plugin = new DecoratorPlugin()
      plugin.symbol('$', { position: 'prefix' })
        .accept(/\d/)
      
      plugin.init({} as any)
      
      const result = plugin.toRawValue('1', {} as any)
      expect(result).toBe('$1')
    })

    it('should remove prefix from clear value', () => {
      const plugin = new DecoratorPlugin()
      plugin.symbol('$', { position: 'prefix' })
        .accept(/\d/)
      
      plugin.init({} as any)
      
      const result = plugin.toValueClear('$1', {} as any)
      expect(result).toBe('$1')
    })
  })

  describe('basic postfix', () => {
    it('should add postfix symbol', () => {
      const plugin = new DecoratorPlugin()
      plugin.symbol('%', { position: 'postfix' })
        .accept(/\d/)
      
      plugin.init({} as any)
      
      const result = plugin.toRawValue('5', {} as any)
      expect(result).toBe('5%')
    })
  })

  describe('complex scenarios', () => {
    it('should handle currency', () => {
      const plugin = new DecoratorPlugin()
      plugin.symbol('$', { position: 'prefix' })
        .accept(/\d/)
      
      plugin.init({} as any)
      
      const raw = plugin.toRawValue('1', {} as any)
      expect(raw).toBe('$1')
      
      const clear = plugin.toValueClear('$1', {} as any)
      expect(clear).toBe('$1')
    })

    it('should handle percentage', () => {
      const plugin = new DecoratorPlugin()
      plugin.symbol(null)
        .accept(/\d/)
      plugin.symbol('%', { position: 'postfix' })
      
      plugin.init({} as any)
      
      const raw = plugin.toRawValue('50', {} as any)
      expect(raw).toBe('50%')
      
      const clear = plugin.toValueClear('50%', {} as any)
      expect(clear).toBe('50%')
    })
  })

  describe('mask vs non-mask', () => {
    it('should include symbol in clear when not mask', () => {
      const plugin = new DecoratorPlugin()
      plugin.symbol('$', { isMask: false, position: 'prefix' })
        .accept(/\d/)
      
      plugin.init({} as any)
      
      const clear = plugin.toValueClear('$1', {} as any)
      expect(clear).toBe('$1')
    })

    it('should exclude symbol in clear when mask', () => {
      const plugin = new DecoratorPlugin()
      plugin.symbol('$', { isMask: true, position: 'prefix' })
        .accept(/\d/)
      
      plugin.init({} as any)
      
      const clear = plugin.toValueClear('$1', {} as any)
      expect(clear).toBe('1')
    })
  })
})
