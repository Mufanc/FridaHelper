import {jclass} from "./jclass";

export const misc = Object.assign(
    Object.create(null), {
        /**
         * 打开 WebView 的远程调试功能
         */
        enableWebInspector(): void {
            Java.scheduleOnMainThread(() => {
                jclass.WebView.setWebContentsDebuggingEnabled(true)
            })
        },

        /**
         * 调试用函数
         */
        $debug(): any {

        }
    }
)
