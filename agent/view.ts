import Wrapper = Java.Wrapper
import * as jclass from './jclass'

interface Rect {
    left: number,
    top: number,
    right: number,
    bottom: number
}

let mHighlightViews: Wrapper = jclass.WeakHashMap.$new();
jclass.View.isShowingLayoutBounds.implementation = function () {
    if (mHighlightViews.get(this) !== null) {
        return true;
    }
    return this.isShowingLayoutBounds();
}


class ActivityWrapper {
    instance: Wrapper

    constructor(activity: Wrapper) {
        this.instance = Java.cast(activity, jclass.Activity)
    }

    get class(): Wrapper {
        return this.instance.getClass()
    }

    get className(): string {
        return this.class.getName()
    }

    getRoot(): ViewWrapper {
        return new ViewWrapper(this.instance.getWindow().getDecorView())
    }

    getIntent(): string {
        return this.instance.getIntent().toUri(0)
    }

    toString() {
        return `ActivityWrapper {${this.instance.toString()}}`
    }
}

class Selector {
    readonly #target: ViewWrapper
    #filters: ((view: ViewWrapper) => boolean)[] = []

    constructor(wrapper: ViewWrapper) {
        this.#target = wrapper
    }

    text(pattern: string | RegExp): Selector {
        this.#filters.push((view) => {
            let text = view.text
            if (text === null) {
                return false
            }

            if (typeof pattern === 'string') {
                return text === pattern
            } else {
                return pattern.test(text)
            }
        })
        return this
    }

    desc(pattern: string | RegExp): Selector {
        this.#filters.push((view) => {
            let desc = view.desc
            if (desc === null) {
                return false
            }

            if (typeof pattern === 'string') {
                return desc === pattern
            } else {
                return pattern.test(desc)
            }
        })
        return this
    }

    id(param: string | RegExp | number): Selector {
        this.#filters.push((view) => {
            if (typeof param === 'number') {
                return parseInt(view.idHex) === param
            }

            let id = view.id
            if (id === null) {
                return false
            }
            if (typeof param === 'string') {
                return id === param
            } else {
                return param.test(id)
            }
        })
        return this
    }

    class(param: Wrapper | string | RegExp): Selector {
        this.#filters.push((view) => {
            let classname = view.class.getName()
            if (typeof param === 'string') {
                return classname === param
            } else if (param instanceof RegExp) {
                return param.test(classname)
            }

            try {
                return param.class.isInstance(view.instance)
            } catch(err) {
                console.error(err)
            }
        })
        return this
    }

    boundsInside(param: Wrapper | Rect): Selector {
        this.#filters.push((view) => {
            let bounds = view.bounds
            try {
                let rect: { [key: string]: any } = {
                    left: param.left,
                    top: param.top,
                    right: param.right,
                    bottom: param.bottom
                }
                for (const key in rect) {
                    if (typeof rect[key] === 'object') {
                        rect[key] = rect[key].value
                    }
                }
                return param.left <= bounds.left && param.top <= bounds.top &&
                    param.right >= bounds.right && param.bottom >= bounds.bottom
            } catch(err) {
                console.error(err)
            }
            return false
        })
        return this
    }

    filter(func: (view: ViewWrapper) => boolean): Selector {
        this.#filters.push(func)
        return this
    }

    find(): ViewWrapper | null {
        let inner = (view: ViewWrapper): ViewWrapper | null => {
            if (this.#filters.every((func: (view: ViewWrapper) => boolean) => func(view))) {
                return view
            }
            let children = view.children
            if (children !== null) {
                for (let child of children) {
                    let result
                    if ((result = inner(child)) !== null) {
                        return result
                    }
                }
            }
            return null
        }
        return inner(this.#target)
    }

    findAll(): ViewWrapper[] {
        let inner = (view: ViewWrapper): ViewWrapper[] => {
            let result = []
            if (this.#filters.every(func => func(view))) {
                result.push(view)
            }
            let children = view.children
            if (children) {
                for (let child of children) {
                    result.push(...inner(child))
                }
            }
            return result
        }
        return inner(this.#target)
    }
}

class ViewWrapper {
    instance: Wrapper

    constructor(view: any) {
        this.instance = Java.cast(view, jclass.View)
    }

    get children(): ViewWrapper[] | null {
        if (!jclass.ViewGroup.class.isInstance(this.instance)) {
            return null
        }
        let result = []
        let length = jclass.ViewGroup.getChildCount.call(this.instance)
        for (let i = 0; i < length; i++) {
            result.push(new ViewWrapper(
                jclass.ViewGroup.getChildAt.call(this.instance, i)
            ))
        }
        return result
    }

    get text(): string | null {
        if (jclass.TextView.class.isInstance()) {
            return jclass.TextView.getText.call(this.instance).toString()
        }
        return null
    }

    get desc(): string | null {
        let desc = this.instance.mContentDescription.value
        if (desc !== null) {
            return desc.toString()
        }
        return null
    }

    get id(): string | null {
        let id = jclass.View.getId.call(this.instance)
        if (id === jclass.View.NO_ID.value) {
            return null
        }
        let mResources = this.instance.mResources.value
        if (id > 0 && jclass.Resources.resourceHasPackage(id) && mResources != null) {
            return jclass.Resources.getResourceEntryName.call(mResources, id)
        }
        return null
    }

    get idHex(): string {
        let id: number = jclass.View.getId.call(this.instance)
        if (id === jclass.View.NO_ID.value) {
            return jclass.View.NO_ID.value.toString()
        }
        return '0x' + id.toString(16)
    }

    get class(): Wrapper {
        return this.instance.getClass()
    }

    get bounds(): Rect {
        let rect = jclass.Rect.$new()
        this.instance.getBoundsOnScreen(rect)
        return {
            left: rect.left.value,
            top: rect.top.value,
            right: rect.right.value,
            bottom: rect.bottom.value
        }
    }

    get parent(): ViewWrapper | null {
        if (jclass.DecorView.class.isInstance(this.instance)) {
            return null
        }
        return new ViewWrapper(this.instance.getParent())
    }

    highlight(state: boolean): void {
        // Todo: 取消所有 highlight
        if (state) {
            mHighlightViews.put(this.instance, '#')
        } else {
            mHighlightViews.remove(this.instance)
        }
        Java.scheduleOnMainThread(() => {
            this.instance.invalidate()
        });
    }

    getSelector(): Selector {
        return new Selector(this)
    }

    getListeners(defaults=['click']): { [key: string]: Wrapper } {
        let info = this.instance.getListenerInfo()
        return Object.fromEntries(defaults.map((name) => {
            let capital = name.replace(/^./, str => str.toUpperCase())
            return [name, info[`mOn${capital}Listener`].value]
        }))
    }

    tree(limit: number): void {
        function inner(root: ViewWrapper, stack: number[], limit = NaN) {
            console.log(stack.map(x => x + '|').join('') + ' ' + root.instance.toString())
            let children = root.children
            if (children !== null) {
                if (stack.length >= limit) {
                    console.log('  '.repeat(stack.length) + `  [${children.length} children(s) ...]`)
                } else {
                    for (let i = 0; i < children.length; i++) {
                        stack.push(i)
                        inner(children[i], stack, limit)
                        stack.pop()
                    }
                }
            }
        }
        inner(this, [], limit)
    }

    toString() {
        return `ViewWrapper {${this.instance.toString()}}`
    }
}

export class GuiHelper {
    static currentActivity() {
        let activityThread = jclass.ActivityThread.currentActivityThread();
        let mActivities = activityThread.mActivities.value;
        let keys = mActivities.keySet().toArray();
        for (const key of keys) {
            let record = Java.cast(mActivities.get(key), jclass.ActivityClientRecord);
            if (!record.paused.value) {
                return new ActivityWrapper(record.activity.value);
            }
        }
        return null;
    }

    static currentRoot(): ViewWrapper | null {
        let activity = this.currentActivity();
        if (activity !== null) {
            return activity.getRoot();
        }
        return null;
    }
}
