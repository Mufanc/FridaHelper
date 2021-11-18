import Wrapper = Java.Wrapper
import * as jclass from './jclass'

export class utils {
    /**
     * 打开 WebView 的远程调试功能
     */
    static enableWebInspector(): void {
        jclass.WebView.setWebContentsDebuggingEnabled(true)
    }

    /**
     * 尝试修复 frida 无法找到 ClassLoader 的情况
     */
    static fixClassLoader(): void {
        if (Java.classFactory.loader === null) {
            Object.defineProperty(
                Java.classFactory, 'loader',
                {
                    value: this.getApplication().getClass().getClassLoader()
                }
            )
        }
    }

    /**
     * 寻找包含指定的类的所有 ClassLoader，返回一个数组
     * @param className 完整的类名字符串
     */
    static findClassLoaderContains(className: string): Wrapper[] {
        let loaders: Wrapper[] = [];
        Java.enumerateClassLoaders({
            onMatch(loader) {
                try {
                    loader.findClass(className)
                    loaders.push(loader)
                } catch { }
            },
            onComplete() { }
        });
        return loaders;
    }

    /**
     * 获取当前 Application 实例
     */
    static getApplication(): Wrapper {
        return jclass.ActivityThread.currentActivityThread().mInitialApplication.value;
    }

    /**
     * 在控制台打印当前函数的调用栈
     */
    static printStackTrace(): void {
        let trace = ''
        jclass.Thread.currentThread().getStackTrace().forEach((item: Wrapper) => {
            trace += `${item.toString()}\n`
        })
        console.log(trace)
    }

    static $debug() {

    }
}
