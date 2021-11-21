import Wrapper = Java.Wrapper
import { jclass } from './jclass'
import {utils} from "./utils";

interface Rect {
    left: number,
    top: number,
    right: number,
    bottom: number
}


class ActivityWrapper {
    instance: Wrapper

    constructor(activity: Wrapper) {
        this.instance = Java.cast(activity, jclass.Activity)
    }

    /**
     * 获取这个 Activity 的类对象
     */
    get class(): Wrapper {
        return this.instance.getClass()
    }

    /**
     * 获取这个 Activity 的类名
     */
    get className(): string {
        return this.class.getName()
    }

    /**
     * 获取 DecorView
     */
    getRoot(): ViewWrapper {
        return new ViewWrapper(this.instance.getWindow().getDecorView())
    }

    /**
     * 获取启动这个 Activity 的 Intent
     */
    getIntent(): string {
        return this.instance.getIntent().toUri(0)
    }

    toString() {
        return `ActivityWrapper{ ${this.instance.toString()} }`
    }

    toJSON() {
        return this.toString()
    }
}

class Selector {
    readonly #target: ViewWrapper
    #filters: ((view: ViewWrapper, depth?: number) => number)[] = []

    constructor(wrapper: ViewWrapper) {
        this.#target = wrapper
    }

    /**
     * 指定控件的文本
     * @param pattern 完全匹配的字符串 或 匹配文本的正则表达式
     */
    text(pattern: string | RegExp): Selector {
        this.#filters.push((view) => {
            let text = view.text
            if (text === null) {
                return 0
            }

            if (typeof pattern === 'string') {
                return Number(text === pattern)
            } else {
                return Number(pattern.test(text))
            }
        })
        return this
    }

    /**
     * 指定控件的描述信息
     * @param pattern 完全匹配的字符串 或 匹配描述的正则表达式
     */
    desc(pattern: string | RegExp): Selector {
        this.#filters.push((view) => {
            let desc = view.desc
            if (desc === null) {
                return 0
            }

            if (typeof pattern === 'string') {
                return Number(desc === pattern)
            } else {
                return Number(pattern.test(desc))
            }
        })
        return this
    }

    /**
     * 指定控件的 数字id/资源id
     * @param param 数字类型的 id 或字符串 ResourceId 或匹配 ResourceId 的正则表达式
     */
    id(param: string | RegExp | number): Selector {
        this.#filters.push((view) => {
            if (typeof param === 'number') {
                return Number(parseInt(view.idHex) === param)
            }

            let id = view.id
            if (id === null) {
                return 0
            }
            if (typeof param === 'string') {
                return Number(id === param)
            } else {
                return Number(param.test(id))
            }
        })
        return this
    }

    /**
     * 指定控件的 类/类名
     * @param param 可以为 jclass.Class 或 字符串形式的类名 或 匹配类名的正则表达式
     */
    class(param: Wrapper | string | RegExp): Selector {
        this.#filters.push((view) => {
            let classname = view.class.getName()
            if (typeof param === 'string') {
                return Number(classname === param)
            } else if (param instanceof RegExp) {
                return Number(param.test(classname))
            }

            try {
                return Number(param.class.isInstance(view.instance))
            } catch(err) {
                console.error(err)
            }
            return 0
        })
        return this
    }

    /**
     * 指定一个矩形区域，只有当控件全部位于矩形区域内才会被选中，
     *   (left, top) 和 (right, bottom) 分别为 左上角和右下角的坐标
     * @param args 可以为 jclass.Rect 或 object 或 [left, top, right, bottom]
     */
    boundsInside(...args: [Wrapper] | [Rect] | [number, number, number, number]): Selector {
        this.#filters.push((view) => {
            let bounds = view.bounds
            let params: Wrapper | Rect
            if (args.length === 1) {
                params = args[0]
            } else {
                params = {
                    left: args[0],
                    top: args[1],
                    right: args[2],
                    bottom: args[3]
                }
            }
            try {
                let rect: { [key: string]: any } = {
                    left: params.left,
                    top: params.top,
                    right: params.right,
                    bottom: params.bottom
                }
                for (const key in rect) {
                    if (typeof rect[key] === 'object') {
                        rect[key] = rect[key].value
                    }
                }
                return Number(rect.left <= bounds.left && rect.top <= bounds.top &&
                    rect.right >= bounds.right && rect.bottom >= bounds.bottom)
            } catch(err) {
                console.error(err)
            }
            return 0
        })
        return this
    }

    boundsContains(x: number, y: number): Selector {
        this.#filters.push((view, depth) => {
            let bounds = view.bounds
            if (bounds.left > x || bounds.top > y || bounds.right < x || bounds.bottom < y) {
                return 0
            }
            return depth ?? 0
        })
        return this
    }

    /**
     * 自定义过滤条件
     * @param func 过滤器函数，传入一个 ViewWrapper，返回该控件的优先级
     */
    filter(func: (view: ViewWrapper) => number): Selector {
        this.#filters.push(func)
        return this
    }

    /**
     * 根据当前设置的条件和优先级，返回最匹配的控件
     */
    find(algorithm: 'bfs' | 'dfs' = 'dfs'): ViewWrapper | null {
        let dfs = (view: ViewWrapper, depth: number = 1): [number, ViewWrapper][] => {
            let result: [number, ViewWrapper][] = [], weight = 1
            if (this.#filters.every((func) => {
                return weight *= func(view, depth)
            })) {
                result.push([weight, view])
            }
            let children = view.children
            if (children) {
                for (let child of children) {
                    result.push(...dfs(child, depth + 1))
                }
            }
            return result
        }

        let bfs = (root: ViewWrapper): [number, ViewWrapper][] => {
            let result: [number, ViewWrapper][] = []
            let task: [ViewWrapper, number][] = [], head = 0
            task.push([root, 1])
            while (head < task.length) {
                let [ view, depth ] = task[head++], weight = 1
                if (this.#filters.every((func) => {
                    return weight *= func(view)
                })) {
                    result.push([weight, view])
                }
                let children = view.children
                if (children !== null) {
                    task.push(...children.map(item => [item, depth + 1] as [ViewWrapper, number]))
                }
            }
            return result
        }

        let result = algorithm === 'dfs' ? dfs(this.#target) : bfs(this.#target)
        if (!result.length) {
            return null
        }

        result.sort((a, b) => {
            return b[0] - a[0]
        })
        return result.map(x => x[1])[0]
    }

    /**
     * 根据当前设置的条件，返回所有满足条件的控件数组
     */
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

    toString() {
        return `Selector{ (${this.#filters.length} filters...) }`
    }

    toJSON() {
        return this.toString()
    }
}

class ViewWrapper {
    instance: Wrapper

    constructor(view: any) {
        this.instance = Java.cast(view, jclass.View)
    }

    /**
     * 如果当前控件是 ViewGroup，返回其子控件数组，否则返回 null
     */
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

    /**
     * 如果当前控件是 TextView，则返回其内容，否则返回 null
     */
    get text(): string | null {
        if (jclass.TextView.class.isInstance(this.instance)) {
            return jclass.TextView.getText.call(this.instance).toString()
        }
        return null
    }

    /**
     * 获取当前控件的描述信息
     */
    get desc(): string | null {
        let desc = this.instance.mContentDescription.value
        if (desc !== null) {
            return desc.toString()
        }
        return null
    }

    /**
     * 获取字符串形式的控件 id
     */
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

    /**
     * 获取 16 进制的控件 id
     */
    get idHex(): string {
        let id: number = jclass.View.getId.call(this.instance)
        if (id === jclass.View.NO_ID.value) {
            return jclass.View.NO_ID.value.toString()
        }
        return '0x' + id.toString(16)
    }

    /**
     * 获取当前控件的类 Wrapper
     */
    get class(): Wrapper {
        return this.instance.getClass()
    }

    /**
     * 获取当前控件的类名
     */
    get className(): string {
        return this.class.getName()
    }

    /**
     * 获取当前控件在屏幕上的区域
     */
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

    /**
     * 获取父控件（获取 DecorView 的父控件时，将返回 ViewRootImpl 实例）
     */
    get parent(): Wrapper | ViewWrapper | null {
        let parent = this.instance.getParent()
        if (jclass.DecorView.class.isInstance(this.instance)) {
            return Java.cast(parent, jclass.ViewRootImpl)
        }
        return new ViewWrapper(parent)
    }

    /**
     * 在屏幕上标记当前控件
     */
    mark(): void {
        let original = this.instance.getForeground();

        let bitmap = jclass.Bitmap.createBitmap(1, 1, jclass.Bitmap$Config.ARGB_8888.value);
        let canvas = jclass.Canvas.$new();
        canvas.setBitmap(bitmap);
        canvas.drawColor(2147418112);  // red, 50% alpha
        let fg = jclass.BitmapDrawable.$new(utils.getApplication().getResources(), bitmap);

        Java.scheduleOnMainThread(() => {
            this.instance.setForeground(fg)
            this.instance.invalidate()

            setTimeout(() => {
                Java.scheduleOnMainThread(() => {
                    this.instance.setForeground(original)
                    this.instance.invalidate()
                })
            }, 3000)
        });
    }

    /**
     * 对当前控件调用 setEnabled 方法，用于针对灰色按钮等情况
     * @param state 状态：是否启用
     */
    enable(state: boolean = true): void {
        this.instance.setEnabled(state)
    }

    /**
     * 返回一个搜索范围为当前控件及其子控件的选择器
     */
    getSelector(): Selector {
        return new Selector(this)
    }

    /**
     * 获取形如 mOn<XXX>Listener 的事件监听器
     * @param names <XXX> 的具体名称，会自动首字母大写；缺省则获取全部
     */
    getListeners(...names: string[]): { [key: string]: Wrapper } {
        let info = this.instance.getListenerInfo()
        if (names.length) {
            return Object.fromEntries(names.map((name) => {
                let capital = name.replace(/^./, str => str.toUpperCase())
                return [name, info[`mOn${capital}Listener`].value]
            }))
        } else {
            let fields: [string, Wrapper][] = []
            info.getClass().getDeclaredFields().forEach((item: Wrapper) => {
                let name = item.getName().match(/^mOn([A-Za-z]+)Listeners?$/)
                if (name !== null) {
                    fields.push([name[1], info[name[0]].value])
                }
            })
            return Object.fromEntries(fields)
        }
    }

    /**
     * 在控制台打印当前控件及其子控件的控件树
     * @param limit 最大深度限制
     */
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
        return `ViewWrapper{ ${this.instance.toString()} }`
    }

    toJSON() {
        return this.toString()
    }
}

export const gui = Object.assign(
    Object.create(null), {
        /**
         * 返回第一个状态不是 ”paused“ 的 Activity
         */
        currentActivity(): ActivityWrapper | null {
            let activityThread = jclass.ActivityThread.currentActivityThread();
            let mActivities = activityThread.mActivities.value;
            let keys = mActivities.keySet().toArray();
            for (const key of keys) {
                let record = Java.cast(mActivities.get(), jclass.ActivityClientRecord);
                if (!record.paused.value) {
                    return new ActivityWrapper(record.activity.value);
                }
            }
            return null;
        },

        /**
         * 获取当前焦点窗口的 DecorView
         */
        currentRoot(): ViewWrapper | null {
            let roots = this.currentRoots()
            for (const root of roots) {
                if (root.instance.mAttachInfo.value.mHasWindowFocus.value) {
                    return root
                }
            }
            return null;
        },

        /**
         * 获取当前所有活动窗口的 DecorView，返回一个数组
         */
        currentRoots(): ViewWrapper[] {
            let manager = jclass.WindowManagerGlobal.getInstance()
            let arr = manager.mViews.value, length = arr.size()
            let roots = []
            for (let i = 0; i < length; i++) {
                roots.push(new ViewWrapper(arr.get(i)))
            }
            return roots
        },

        /**
         * 点击控件时，将控件信息打印到控制台
         * @param state 是否开启功能，默认为 true
         */
        handleClick(state: boolean = true): void {
            if (state) {
                jclass.View.performClick.implementation = function () {
                    console.log(this)
                    return this.performClick()
                }
            } else {
                jclass.View.performClick.implementation = null
            }
        },

        /**
         * 重绘所有控件
         */
        invalidateWorld() {
            this.currentRoots().forEach((decor) => {
                let rootImpl = Java.cast(decor.instance.getParent(), jclass.ViewRootImpl)
                Java.scheduleOnMainThread(() => {
                    rootImpl.invalidateWorld(decor.instance)
                })

                Java.scheduleOnMainThread(() => {
                    if (decor !== null) {
                        decor.instance.invalidate()
                    }
                })
            })
        },

        /**
         * 开启/关闭「显示布局边界」
         * @param state 开关状态，默认为 true
         */
        showLayoutBorder(state: boolean = true): void {
            jclass.View.DEBUG_DRAW.value = state
            this.invalidateWorld()
        }
    }
)
