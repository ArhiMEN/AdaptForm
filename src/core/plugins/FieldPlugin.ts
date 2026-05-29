import {PluginOptions} from "@core/options";
import {Field} from "@core/fields/Field";

export interface FieldPlugin<T = any> {
  pluginOptions?: PluginOptions

  init?(field: Field<T>): void

  toRawValue?(value: any, field: Field<T>): any

  toValueClear?(value: any, field: Field<T>): any
}

export abstract class BasePlugin<T = any> implements FieldPlugin<T> {
  pluginOptions: PluginOptions

  constructor(pluginOptions: PluginOptions = {}) {
    this.pluginOptions = {
      priority: 0,
      ...pluginOptions
    }
  }
}