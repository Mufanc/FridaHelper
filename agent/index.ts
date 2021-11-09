import { GuiHelper } from './view'
import { utils } from "./utils";

Java.perform(() => {
    Java.deoptimizeEverything()
    Object.defineProperty(
        global, '$',
        {
            value: Object.assign(
                Object.create(null), {
                utils,
                gui: GuiHelper
            })
        }
    )
})
