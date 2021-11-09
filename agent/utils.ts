import Wrapper = Java.Wrapper
import * as jclass from './jclass'

export class utils {
    static getApplication(): Wrapper {
        return jclass.ActivityThread.currentActivityThread().mInitialApplication.value;
    }
}