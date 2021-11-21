import Wrapper = Java.Wrapper
import { jclass } from './jclass'

export const utils = Object.assign(
    Object.create(null), {
        /**
         * 获取当前 Application 实例
         */
        getApplication(): Wrapper {
            return jclass.ActivityThread.currentActivityThread().mInitialApplication.value;
        },

        /**
         * 在控制台打印当前函数的调用栈
         */
        printStackTrace(): void {
            let trace = ''
            jclass.Thread.currentThread().getStackTrace().forEach((item: Wrapper) => {
                trace += `${item.toString()}\n`
            })
            console.log(trace)
        }
    }
)
