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

    static $debug() {
        return new Proxy({}, {
            get(target: {}, p: PropertyKey, receiver: any): any {
                console.log(p)
                return null
            }
        })
    }
}