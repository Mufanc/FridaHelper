import { gui } from './core/view'
import { utils } from './core/utils'
import { vm } from './core/vm'
import { misc } from './core/misc'
import { jclass, $init } from './core/jclass'

Java.performNow(() => {
    $init()
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
                    utils, gui, misc, vm
                }
            ),
            clear() {
                console.log('\x1bc')
            }
        }
    )
})

Java.perform(() => {
    if (Java.classFactory.loader === null) {
        console.warn('The classloader of current app seems "null"!')
    }
})
