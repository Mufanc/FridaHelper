import { GuiHelper } from './core/view'
import { utils } from './core/utils';
import * as jclass from './core/jclass'

Java.perform(() => {
    /**
     * Todo:
     *   1. 增加 dexdump 功能
     *   2. Intent 记录
     */
    Java.deoptimizeEverything()
    Object.assign(
        global, {
            jclass,
            '$': Object.assign(
                Object.create(null), {
                    utils,
                    gui: GuiHelper
                }
            )
        }
    )
})
