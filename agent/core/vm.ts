import Wrapper = Java.Wrapper
import { utils } from './utils'


export const vm = Object.assign(
    Object.create(null), {
        /**
         * 寻找包含指定的类的所有 ClassLoader，返回一个数组
         * @param className 完整的类名字符串
         */
        findClassLoaderContains(className: string): Wrapper[] {
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
        },

        /**
         * 尝试修复 frida 无法找到 ClassLoader 的情况
         */
        fixClassLoader(): void {
            if (Java.classFactory.loader === null) {
                Object.defineProperty(
                    Java.classFactory, 'loader',
                    {
                        value: utils.getApplication().getClass().getClassLoader()
                    }
                )
            }
        }
    }
)