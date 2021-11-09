import { GuiHelper } from './view'

Java.perform(() => {
    Java.deoptimizeEverything()
    Object.assign(global, {
        $: {
            gui: GuiHelper
        }
    })
})
