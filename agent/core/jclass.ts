import Wrapper = Java.Wrapper;

function Future(name: string): Wrapper {
    let loader = new Proxy(Object.create(null), {
        get(...args): any {
            if (args[1] === '$load') {
                return () => Java.use(name)
            }
            console.error(`Error: jclass "${name}" not initialized!`)
            return null
        }
    })
    return loader as Wrapper
}

export const jclass: { [key: string]: Wrapper } = {
    Activity: Future('android.app.Activity'),
    ActivityThread: Future('android.app.ActivityThread'),
    ActivityClientRecord: Future("android.app.ActivityThread$ActivityClientRecord"),
    Bitmap: Future('android.graphics.Bitmap'),
    BitmapDrawable: Future('android.graphics.drawable.BitmapDrawable'),
    Bitmap$Config: Future('android.graphics.Bitmap$Config'),
    Canvas: Future('android.graphics.Canvas'),
    DecorView: Future('com.android.internal.policy.DecorView'),
    Rect: Future('android.graphics.Rect'),
    Resources: Future('android.content.res.Resources'),
    TextView: Future('android.widget.TextView'),
    Thread: Future('java.lang.Thread'),
    View: Future('android.view.View'),
    ViewGroup: Future('android.view.ViewGroup'),
    ViewRootImpl: Future('android.view.ViewRootImpl'),
    WeakHashMap: Future('java.util.WeakHashMap'),
    WebView: Future('android.webkit.WebView'),
    WindowManagerGlobal: Future('android.view.WindowManagerGlobal'),
}

export function $init() {
    console.warn('Initializing jclass...')
    for (const key in jclass) {
        jclass[key] = jclass[key].$load()
    }
}
