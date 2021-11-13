import Wrapper = Java.Wrapper
import * as jclass from './jclass'

export class utils {
    static getApplication(): Wrapper {
        return jclass.ActivityThread.currentActivityThread().mInitialApplication.value;
    }

    static fixClassLoader(): void {
        Object.defineProperty(
            Java.classFactory, 'loader',
            {
                value: this.getApplication().getClass().getClassLoader()
            }
        )
    }

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

    static $debug() {

    }
}
