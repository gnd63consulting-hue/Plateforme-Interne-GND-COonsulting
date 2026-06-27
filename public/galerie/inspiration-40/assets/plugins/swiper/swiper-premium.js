// (function() {
//     const s = document.createElement("link").relList;
//     if (s && s.supports && s.supports("modulepreload"))
//         return;
//     for (const n of document.querySelectorAll('link[rel="modulepreload"]'))
//         i(n);
//     new MutationObserver(n => {
//         for (const a of n)
//             if (a.type === "childList")
//                 for (const l of a.addedNodes)
//                     l.tagName === "LINK" && l.rel === "modulepreload" && i(l)
//     }
//     ).observe(document, {
//         childList: !0,
//         subtree: !0
//     });
//     function t(n) {
//         const a = {};
//         return n.integrity && (a.integrity = n.integrity),
//         n.referrerPolicy && (a.referrerPolicy = n.referrerPolicy),
//         n.crossOrigin === "use-credentials" ? a.credentials = "include" : n.crossOrigin === "anonymous" ? a.credentials = "omit" : a.credentials = "same-origin",
//         a
//     }
//     function i(n) {
//         if (n.ep)
//             return;
//         n.ep = !0;
//         const a = t(n);
//         fetch(n.href, a)
//     }
// }
// )();
// function ce(e) {
//     return e !== null && typeof e == "object" && "constructor"in e && e.constructor === Object
// }
// function de(e={}, s={}) {
//     const t = ["__proto__", "constructor", "prototype"];
//     Object.keys(s).filter(i => t.indexOf(i) < 0).forEach(i => {
//         typeof e[i] > "u" ? e[i] = s[i] : ce(s[i]) && ce(e[i]) && Object.keys(s[i]).length > 0 && de(e[i], s[i])
//     }
//     )
// }
// const ge = {
//     body: {},
//     addEventListener() {},
//     removeEventListener() {},
//     activeElement: {
//         blur() {},
//         nodeName: ""
//     },
//     querySelector() {
//         return null
//     },
//     querySelectorAll() {
//         return []
//     },
//     getElementById() {
//         return null
//     },
//     createEvent() {
//         return {
//             initEvent() {}
//         }
//     },
//     createElement() {
//         return {
//             children: [],
//             childNodes: [],
//             style: {},
//             setAttribute() {},
//             getElementsByTagName() {
//                 return []
//             }
//         }
//     },
//     createElementNS() {
//         return {}
//     },
//     importNode() {
//         return null
//     },
//     location: {
//         hash: "",
//         host: "",
//         hostname: "",
//         href: "",
//         origin: "",
//         pathname: "",
//         protocol: "",
//         search: ""
//     }
// };
// function H() {
//     const e = typeof document < "u" ? document : {};
//     return de(e, ge),
//     e
// }
// const Pe = {
//     document: ge,
//     navigator: {
//         userAgent: ""
//     },
//     location: {
//         hash: "",
//         host: "",
//         hostname: "",
//         href: "",
//         origin: "",
//         pathname: "",
//         protocol: "",
//         search: ""
//     },
//     history: {
//         replaceState() {},
//         pushState() {},
//         go() {},
//         back() {}
//     },
//     CustomEvent: function() {
//         return this
//     },
//     addEventListener() {},
//     removeEventListener() {},
//     getComputedStyle() {
//         return {
//             getPropertyValue() {
//                 return ""
//             }
//         }
//     },
//     Image() {},
//     Date() {},
//     screen: {},
//     setTimeout() {},
//     clearTimeout() {},
//     matchMedia() {
//         return {}
//     },
//     requestAnimationFrame(e) {
//         return typeof setTimeout > "u" ? (e(),
//         null) : setTimeout(e, 0)
//     },
//     cancelAnimationFrame(e) {
//         typeof setTimeout > "u" || clearTimeout(e)
//     }
// };
// function $() {
//     const e = typeof window < "u" ? window : {};
//     return de(e, Pe),
//     e
// }
// function Le(e="") {
//     return e.trim().split(" ").filter(s => !!s.trim())
// }
// function Ie(e) {
//     const s = e;
//     Object.keys(s).forEach(t => {
//         try {
//             s[t] = null
//         } catch {}
//         try {
//             delete s[t]
//         } catch {}
//     }
//     )
// }
// function ve(e, s=0) {
//     return setTimeout(e, s)
// }
// function U() {
//     return Date.now()
// }
// function Oe(e) {
//     const s = $();
//     let t;
//     return s.getComputedStyle && (t = s.getComputedStyle(e, null)),
//     !t && e.currentStyle && (t = e.currentStyle),
//     t || (t = e.style),
//     t
// }
// function Ae(e, s="x") {
//     const t = $();
//     let i, n, a;
//     const l = Oe(e);
//     return t.WebKitCSSMatrix ? (n = l.transform || l.webkitTransform,
//     n.split(",").length > 6 && (n = n.split(", ").map(o => o.replace(",", ".")).join(", ")),
//     a = new t.WebKitCSSMatrix(n === "none" ? "" : n)) : (a = l.MozTransform || l.OTransform || l.MsTransform || l.msTransform || l.transform || l.getPropertyValue("transform").replace("translate(", "matrix(1, 0, 0, 1,"),
//     i = a.toString().split(",")),
//     s === "x" && (t.WebKitCSSMatrix ? n = a.m41 : i.length === 16 ? n = parseFloat(i[12]) : n = parseFloat(i[4])),
//     s === "y" && (t.WebKitCSSMatrix ? n = a.m42 : i.length === 16 ? n = parseFloat(i[13]) : n = parseFloat(i[5])),
//     n || 0
// }
// function j(e) {
//     return typeof e == "object" && e !== null && e.constructor && Object.prototype.toString.call(e).slice(8, -1) === "Object"
// }
// function ke(e) {
//     return typeof window < "u" && typeof window.HTMLElement < "u" ? e instanceof HTMLElement : e && (e.nodeType === 1 || e.nodeType === 11)
// }
// function V(...e) {
//     const s = Object(e[0])
//       , t = ["__proto__", "constructor", "prototype"];
//     for (let i = 1; i < e.length; i += 1) {
//         const n = e[i];
//         if (n != null && !ke(n)) {
//             const a = Object.keys(Object(n)).filter(l => t.indexOf(l) < 0);
//             for (let l = 0, o = a.length; l < o; l += 1) {
//                 const r = a[l]
//                   , c = Object.getOwnPropertyDescriptor(n, r);
//                 c !== void 0 && c.enumerable && (j(s[r]) && j(n[r]) ? n[r].__swiper__ ? s[r] = n[r] : V(s[r], n[r]) : !j(s[r]) && j(n[r]) ? (s[r] = {},
//                 n[r].__swiper__ ? s[r] = n[r] : V(s[r], n[r])) : s[r] = n[r])
//             }
//         }
//     }
//     return s
// }
// function X(e, s, t) {
//     e.style.setProperty(s, t)
// }
// function ye({swiper: e, targetPosition: s, side: t}) {
//     const i = $()
//       , n = -e.translate;
//     let a = null, l;
//     const o = e.params.speed;
//     e.wrapperEl.style.scrollSnapType = "none",
//     i.cancelAnimationFrame(e.cssModeFrameID);
//     const r = s > n ? "next" : "prev"
//       , c = (f, y) => r === "next" && f >= y || r === "prev" && f <= y
//       , h = () => {
//         l = new Date().getTime(),
//         a === null && (a = l);
//         const f = Math.max(Math.min((l - a) / o, 1), 0)
//           , y = .5 - Math.cos(f * Math.PI) / 2;
//         let u = n + y * (s - n);
//         if (c(u, s) && (u = s),
//         e.wrapperEl.scrollTo({
//             [t]: u
//         }),
//         c(u, s)) {
//             e.wrapperEl.style.overflow = "hidden",
//             e.wrapperEl.style.scrollSnapType = "",
//             setTimeout( () => {
//                 e.wrapperEl.style.overflow = "",
//                 e.wrapperEl.scrollTo({
//                     [t]: u
//                 })
//             }
//             ),
//             i.cancelAnimationFrame(e.cssModeFrameID);
//             return
//         }
//         e.cssModeFrameID = i.requestAnimationFrame(h)
//     }
//     ;
//     h()
// }
// function N(e, s="") {
//     const t = $()
//       , i = [...e.children];
//     return t.HTMLSlotElement && e instanceof HTMLSlotElement && i.push(...e.assignedElements()),
//     s ? i.filter(n => n.matches(s)) : i
// }
// function ze(e, s) {
//     const t = [s];
//     for (; t.length > 0; ) {
//         const i = t.shift();
//         if (e === i)
//             return !0;
//         t.push(...i.children, ...i.shadowRoot ? i.shadowRoot.children : [], ...i.assignedElements ? i.assignedElements() : [])
//     }
// }
// function De(e, s) {
//     const t = $();
//     let i = s.contains(e);
//     return !i && t.HTMLSlotElement && s instanceof HTMLSlotElement && (i = [...s.assignedElements()].includes(e),
//     i || (i = ze(e, s))),
//     i
// }
// function K(e) {
//     try {
//         console.warn(e);
//         return
//     } catch {}
// }
// function Q(e, s=[]) {
//     const t = document.createElement(e);
//     return t.classList.add(...Array.isArray(s) ? s : Le(s)),
//     t
// }
// function Ge(e, s) {
//     const t = [];
//     for (; e.previousElementSibling; ) {
//         const i = e.previousElementSibling;
//         s ? i.matches(s) && t.push(i) : t.push(i),
//         e = i
//     }
//     return t
// }
// function Be(e, s) {
//     const t = [];
//     for (; e.nextElementSibling; ) {
//         const i = e.nextElementSibling;
//         s ? i.matches(s) && t.push(i) : t.push(i),
//         e = i
//     }
//     return t
// }
// function R(e, s) {
//     return $().getComputedStyle(e, null).getPropertyValue(s)
// }
// function Z(e) {
//     let s = e, t;
//     if (s) {
//         for (t = 0; (s = s.previousSibling) !== null; )
//             s.nodeType === 1 && (t += 1);
//         return t
//     }
// }
// function Se(e, s) {
//     const t = [];
//     let i = e.parentElement;
//     for (; i; )
//         s ? i.matches(s) && t.push(i) : t.push(i),
//         i = i.parentElement;
//     return t
// }
// function re(e, s, t) {
//     const i = $();
//     return e[s === "width" ? "offsetWidth" : "offsetHeight"] + parseFloat(i.getComputedStyle(e, null).getPropertyValue(s === "width" ? "margin-right" : "margin-top")) + parseFloat(i.getComputedStyle(e, null).getPropertyValue(s === "width" ? "margin-left" : "margin-bottom"))
// }
// function B(e) {
//     return (Array.isArray(e) ? e : [e]).filter(s => !!s)
// }
// function le(e, s="") {
//     typeof trustedTypes < "u" ? e.innerHTML = trustedTypes.createPolicy("html", {
//         createHTML: t => t
//     }).createHTML(s) : e.innerHTML = s
// }
// let J;
// function $e() {
//     const e = $()
//       , s = H();
//     return {
//         smoothScroll: s.documentElement && s.documentElement.style && "scrollBehavior"in s.documentElement.style,
//         touch: !!("ontouchstart"in e || e.DocumentTouch && s instanceof e.DocumentTouch)
//     }
// }
// function be() {
//     return J || (J = $e()),
//     J
// }
// let ee;
// function Ve({userAgent: e}={}) {
//     const s = be()
//       , t = $()
//       , i = t.navigator.platform
//       , n = e || t.navigator.userAgent
//       , a = {
//         ios: !1,
//         android: !1
//     }
//       , l = t.screen.width
//       , o = t.screen.height
//       , r = n.match(/(Android);?[\s\/]+([\d.]+)?/);
//     let c = n.match(/(iPad)(?!\1).*OS\s([\d_]+)/);
//     const h = n.match(/(iPod)(.*OS\s([\d_]+))?/)
//       , f = !c && n.match(/(iPhone\sOS|iOS)\s([\d_]+)/)
//       , y = i === "Win32";
//     let u = i === "MacIntel";
//     const m = ["1024x1366", "1366x1024", "834x1194", "1194x834", "834x1112", "1112x834", "768x1024", "1024x768", "820x1180", "1180x820", "810x1080", "1080x810"];
//     return !c && u && s.touch && m.indexOf(`${l}x${o}`) >= 0 && (c = n.match(/(Version)\/([\d.]+)/),
//     c || (c = [0, 1, "13_0_0"]),
//     u = !1),
//     r && !y && (a.os = "android",
//     a.android = !0),
//     (c || f || h) && (a.os = "ios",
//     a.ios = !0),
//     a
// }
// function Te(e={}) {
//     return ee || (ee = Ve(e)),
//     ee
// }
// let te;
// function Fe() {
//     const e = $()
//       , s = Te();
//     let t = !1;
//     function i() {
//         const o = e.navigator.userAgent.toLowerCase();
//         return o.indexOf("safari") >= 0 && o.indexOf("chrome") < 0 && o.indexOf("android") < 0
//     }
//     if (i()) {
//         const o = String(e.navigator.userAgent);
//         if (o.includes("Version/")) {
//             const [r,c] = o.split("Version/")[1].split(" ")[0].split(".").map(h => Number(h));
//             t = r < 16 || r === 16 && c < 2
//         }
//     }
//     const n = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(e.navigator.userAgent)
//       , a = i()
//       , l = a || n && s.ios;
//     return {
//         isSafari: t || a,
//         needPerspectiveFix: t,
//         need3dFix: l,
//         isWebView: n
//     }
// }
// function xe() {
//     return te || (te = Fe()),
//     te
// }
// function _e({swiper: e, on: s, emit: t}) {
//     const i = $();
//     let n = null
//       , a = null;
//     const l = () => {
//         !e || e.destroyed || !e.initialized || (t("beforeResize"),
//         t("resize"))
//     }
//       , o = () => {
//         !e || e.destroyed || !e.initialized || (n = new ResizeObserver(h => {
//             a = i.requestAnimationFrame( () => {
//                 const {width: f, height: y} = e;
//                 let u = f
//                   , m = y;
//                 h.forEach( ({contentBoxSize: v, contentRect: T, target: d}) => {
//                     d && d !== e.el || (u = T ? T.width : (v[0] || v).inlineSize,
//                     m = T ? T.height : (v[0] || v).blockSize)
//                 }
//                 ),
//                 (u !== f || m !== y) && l()
//             }
//             )
//         }
//         ),
//         n.observe(e.el))
//     }
//       , r = () => {
//         a && i.cancelAnimationFrame(a),
//         n && n.unobserve && e.el && (n.unobserve(e.el),
//         n = null)
//     }
//       , c = () => {
//         !e || e.destroyed || !e.initialized || t("orientationchange")
//     }
//     ;
//     s("init", () => {
//         if (e.params.resizeObserver && typeof i.ResizeObserver < "u") {
//             o();
//             return
//         }
//         i.addEventListener("resize", l),
//         i.addEventListener("orientationchange", c)
//     }
//     ),
//     s("destroy", () => {
//         r(),
//         i.removeEventListener("resize", l),
//         i.removeEventListener("orientationchange", c)
//     }
//     )
// }
// function Ne({swiper: e, extendParams: s, on: t, emit: i}) {
//     const n = []
//       , a = $()
//       , l = (c, h={}) => {
//         const f = a.MutationObserver || a.WebkitMutationObserver
//           , y = new f(u => {
//             if (e.__preventObserver__)
//                 return;
//             if (u.length === 1) {
//                 i("observerUpdate", u[0]);
//                 return
//             }
//             const m = function() {
//                 i("observerUpdate", u[0])
//             };
//             a.requestAnimationFrame ? a.requestAnimationFrame(m) : a.setTimeout(m, 0)
//         }
//         );
//         y.observe(c, {
//             attributes: typeof h.attributes > "u" ? !0 : h.attributes,
//             childList: e.isElement || (typeof h.childList > "u" ? !0 : h).childList,
//             characterData: typeof h.characterData > "u" ? !0 : h.characterData
//         }),
//         n.push(y)
//     }
//       , o = () => {
//         if (e.params.observer) {
//             if (e.params.observeParents) {
//                 const c = Se(e.hostEl);
//                 for (let h = 0; h < c.length; h += 1)
//                     l(c[h])
//             }
//             l(e.hostEl, {
//                 childList: e.params.observeSlideChildren
//             }),
//             l(e.wrapperEl, {
//                 attributes: !1
//             })
//         }
//     }
//       , r = () => {
//         n.forEach(c => {
//             c.disconnect()
//         }
//         ),
//         n.splice(0, n.length)
//     }
//     ;
//     s({
//         observer: !1,
//         observeParents: !1,
//         observeSlideChildren: !1
//     }),
//     t("init", o),
//     t("destroy", r)
// }
// var He = {
//     on(e, s, t) {
//         const i = this;
//         if (!i.eventsListeners || i.destroyed || typeof s != "function")
//             return i;
//         const n = t ? "unshift" : "push";
//         return e.split(" ").forEach(a => {
//             i.eventsListeners[a] || (i.eventsListeners[a] = []),
//             i.eventsListeners[a][n](s)
//         }
//         ),
//         i
//     },
//     once(e, s, t) {
//         const i = this;
//         if (!i.eventsListeners || i.destroyed || typeof s != "function")
//             return i;
//         function n(...a) {
//             i.off(e, n),
//             n.__emitterProxy && delete n.__emitterProxy,
//             s.apply(i, a)
//         }
//         return n.__emitterProxy = s,
//         i.on(e, n, t)
//     },
//     onAny(e, s) {
//         const t = this;
//         if (!t.eventsListeners || t.destroyed || typeof e != "function")
//             return t;
//         const i = s ? "unshift" : "push";
//         return t.eventsAnyListeners.indexOf(e) < 0 && t.eventsAnyListeners[i](e),
//         t
//     },
//     offAny(e) {
//         const s = this;
//         if (!s.eventsListeners || s.destroyed || !s.eventsAnyListeners)
//             return s;
//         const t = s.eventsAnyListeners.indexOf(e);
//         return t >= 0 && s.eventsAnyListeners.splice(t, 1),
//         s
//     },
//     off(e, s) {
//         const t = this;
//         return !t.eventsListeners || t.destroyed || !t.eventsListeners || e.split(" ").forEach(i => {
//             typeof s > "u" ? t.eventsListeners[i] = [] : t.eventsListeners[i] && t.eventsListeners[i].forEach( (n, a) => {
//                 (n === s || n.__emitterProxy && n.__emitterProxy === s) && t.eventsListeners[i].splice(a, 1)
//             }
//             )
//         }
//         ),
//         t
//     },
//     emit(...e) {
//         const s = this;
//         if (!s.eventsListeners || s.destroyed || !s.eventsListeners)
//             return s;
//         let t, i, n;
//         return typeof e[0] == "string" || Array.isArray(e[0]) ? (t = e[0],
//         i = e.slice(1, e.length),
//         n = s) : (t = e[0].events,
//         i = e[0].data,
//         n = e[0].context || s),
//         i.unshift(n),
//         (Array.isArray(t) ? t : t.split(" ")).forEach(l => {
//             s.eventsAnyListeners && s.eventsAnyListeners.length && s.eventsAnyListeners.forEach(o => {
//                 o.apply(n, [l, ...i])
//             }
//             ),
//             s.eventsListeners && s.eventsListeners[l] && s.eventsListeners[l].forEach(o => {
//                 o.apply(n, i)
//             }
//             )
//         }
//         ),
//         s
//     }
// };
// function Re() {
//     const e = this;
//     let s, t;
//     const i = e.el;
//     typeof e.params.width < "u" && e.params.width !== null ? s = e.params.width : s = i.clientWidth,
//     typeof e.params.height < "u" && e.params.height !== null ? t = e.params.height : t = i.clientHeight,
//     !(s === 0 && e.isHorizontal() || t === 0 && e.isVertical()) && (s = s - parseInt(R(i, "padding-left") || 0, 10) - parseInt(R(i, "padding-right") || 0, 10),
//     t = t - parseInt(R(i, "padding-top") || 0, 10) - parseInt(R(i, "padding-bottom") || 0, 10),
//     Number.isNaN(s) && (s = 0),
//     Number.isNaN(t) && (t = 0),
//     Object.assign(e, {
//         width: s,
//         height: t,
//         size: e.isHorizontal() ? s : t
//     }))
// }
// function qe() {
//     const e = this;
//     function s(E, C) {
//         return parseFloat(E.getPropertyValue(e.getDirectionLabel(C)) || 0)
//     }
//     const t = e.params
//       , {wrapperEl: i, slidesEl: n, rtlTranslate: a, wrongRTL: l} = e
//       , o = e.virtual && t.virtual.enabled
//       , r = o ? e.virtual.slides.length : e.slides.length
//       , c = N(n, `.${e.params.slideClass}, swiper-slide`)
//       , h = o ? e.virtual.slides.length : c.length;
//     let f = [];
//     const y = []
//       , u = [];
//     let m = t.slidesOffsetBefore;
//     typeof m == "function" && (m = t.slidesOffsetBefore.call(e));
//     let v = t.slidesOffsetAfter;
//     typeof v == "function" && (v = t.slidesOffsetAfter.call(e));
//     const T = e.snapGrid.length
//       , d = e.slidesGrid.length
//       , p = e.size - m - v;
//     let g = t.spaceBetween
//       , S = -m
//       , x = 0
//       , L = 0;
//     if (typeof p > "u")
//         return;
//     typeof g == "string" && g.indexOf("%") >= 0 ? g = parseFloat(g.replace("%", "")) / 100 * p : typeof g == "string" && (g = parseFloat(g)),
//     e.virtualSize = -g - m - v,
//     c.forEach(E => {
//         a ? E.style.marginLeft = "" : E.style.marginRight = "",
//         E.style.marginBottom = "",
//         E.style.marginTop = ""
//     }
//     ),
//     t.centeredSlides && t.cssMode && (X(i, "--swiper-centered-offset-before", ""),
//     X(i, "--swiper-centered-offset-after", ""));
//     const P = t.grid && t.grid.rows > 1 && e.grid;
//     P ? e.grid.initSlides(c) : e.grid && e.grid.unsetSlides();
//     let b;
//     const I = t.slidesPerView === "auto" && t.breakpoints && Object.keys(t.breakpoints).filter(E => typeof t.breakpoints[E].slidesPerView < "u").length > 0;
//     for (let E = 0; E < h; E += 1) {
//         b = 0;
//         const C = c[E];
//         if (!(C && (P && e.grid.updateSlide(E, C, c),
//         R(C, "display") === "none"))) {
//             if (o && t.slidesPerView === "auto")
//                 t.virtual.slidesPerViewAutoSlideSize && (b = t.virtual.slidesPerViewAutoSlideSize),
//                 b && C && (t.roundLengths && (b = Math.floor(b)),
//                 C.style[e.getDirectionLabel("width")] = `${b}px`);
//             else if (t.slidesPerView === "auto") {
//                 I && (C.style[e.getDirectionLabel("width")] = "");
//                 const w = getComputedStyle(C)
//                   , A = C.style.transform
//                   , z = C.style.webkitTransform;
//                 if (A && (C.style.transform = "none"),
//                 z && (C.style.webkitTransform = "none"),
//                 t.roundLengths)
//                     b = e.isHorizontal() ? re(C, "width") : re(C, "height");
//                 else {
//                     const G = s(w, "width")
//                       , W = s(w, "padding-left")
//                       , O = s(w, "padding-right")
//                       , M = s(w, "margin-left")
//                       , k = s(w, "margin-right")
//                       , D = w.getPropertyValue("box-sizing");
//                     if (D && D === "border-box")
//                         b = G + M + k;
//                     else {
//                         const {clientWidth: _, offsetWidth: Me} = C;
//                         b = G + W + O + M + k + (Me - _)
//                     }
//                 }
//                 A && (C.style.transform = A),
//                 z && (C.style.webkitTransform = z),
//                 t.roundLengths && (b = Math.floor(b))
//             } else
//                 b = (p - (t.slidesPerView - 1) * g) / t.slidesPerView,
//                 t.roundLengths && (b = Math.floor(b)),
//                 C && (C.style[e.getDirectionLabel("width")] = `${b}px`);
//             C && (C.swiperSlideSize = b),
//             u.push(b),
//             t.centeredSlides ? (S = S + b / 2 + x / 2 + g,
//             x === 0 && E !== 0 && (S = S - p / 2 - g),
//             E === 0 && (S = S - p / 2 - g),
//             Math.abs(S) < 1 / 1e3 && (S = 0),
//             t.roundLengths && (S = Math.floor(S)),
//             L % t.slidesPerGroup === 0 && f.push(S),
//             y.push(S)) : (t.roundLengths && (S = Math.floor(S)),
//             (L - Math.min(e.params.slidesPerGroupSkip, L)) % e.params.slidesPerGroup === 0 && f.push(S),
//             y.push(S),
//             S = S + b + g),
//             e.virtualSize += b + g,
//             x = b,
//             L += 1
//         }
//     }
//     if (e.virtualSize = Math.max(e.virtualSize, p) + v,
//     a && l && (t.effect === "slide" || t.effect === "coverflow") && (i.style.width = `${e.virtualSize + g}px`),
//     t.setWrapperSize && (i.style[e.getDirectionLabel("width")] = `${e.virtualSize + g}px`),
//     P && e.grid.updateWrapperSize(b, f),
//     !t.centeredSlides) {
//         const E = [];
//         for (let C = 0; C < f.length; C += 1) {
//             let w = f[C];
//             t.roundLengths && (w = Math.floor(w)),
//             f[C] <= e.virtualSize - p && E.push(w)
//         }
//         f = E,
//         Math.floor(e.virtualSize - p) - Math.floor(f[f.length - 1]) > 1 && f.push(e.virtualSize - p)
//     }
//     if (o && t.loop) {
//         const E = u[0] + g;
//         if (t.slidesPerGroup > 1) {
//             const C = Math.ceil((e.virtual.slidesBefore + e.virtual.slidesAfter) / t.slidesPerGroup)
//               , w = E * t.slidesPerGroup;
//             for (let A = 0; A < C; A += 1)
//                 f.push(f[f.length - 1] + w)
//         }
//         for (let C = 0; C < e.virtual.slidesBefore + e.virtual.slidesAfter; C += 1)
//             t.slidesPerGroup === 1 && f.push(f[f.length - 1] + E),
//             y.push(y[y.length - 1] + E),
//             e.virtualSize += E
//     }
//     if (f.length === 0 && (f = [0]),
//     g !== 0) {
//         const E = e.isHorizontal() && a ? "marginLeft" : e.getDirectionLabel("marginRight");
//         c.filter( (C, w) => !t.cssMode || t.loop ? !0 : w !== c.length - 1).forEach(C => {
//             C.style[E] = `${g}px`
//         }
//         )
//     }
//     if (t.centeredSlides && t.centeredSlidesBounds) {
//         let E = 0;
//         u.forEach(w => {
//             E += w + (g || 0)
//         }
//         ),
//         E -= g;
//         const C = E > p ? E - p : 0;
//         f = f.map(w => w <= 0 ? -m : w > C ? C + v : w)
//     }
//     if (t.centerInsufficientSlides) {
//         let E = 0;
//         u.forEach(w => {
//             E += w + (g || 0)
//         }
//         ),
//         E -= g;
//         const C = (m || 0) + (v || 0);
//         if (E + C < p) {
//             const w = (p - E - C) / 2;
//             f.forEach( (A, z) => {
//                 f[z] = A - w
//             }
//             ),
//             y.forEach( (A, z) => {
//                 y[z] = A + w
//             }
//             )
//         }
//     }
//     if (Object.assign(e, {
//         slides: c,
//         snapGrid: f,
//         slidesGrid: y,
//         slidesSizesGrid: u
//     }),
//     t.centeredSlides && t.cssMode && !t.centeredSlidesBounds) {
//         X(i, "--swiper-centered-offset-before", `${-f[0]}px`),
//         X(i, "--swiper-centered-offset-after", `${e.size / 2 - u[u.length - 1] / 2}px`);
//         const E = -e.snapGrid[0]
//           , C = -e.slidesGrid[0];
//         e.snapGrid = e.snapGrid.map(w => w + E),
//         e.slidesGrid = e.slidesGrid.map(w => w + C)
//     }
//     if (h !== r && e.emit("slidesLengthChange"),
//     f.length !== T && (e.params.watchOverflow && e.checkOverflow(),
//     e.emit("snapGridLengthChange")),
//     y.length !== d && e.emit("slidesGridLengthChange"),
//     t.watchSlidesProgress && e.updateSlidesOffset(),
//     e.emit("slidesUpdated"),
//     !o && !t.cssMode && (t.effect === "slide" || t.effect === "fade")) {
//         const E = `${t.containerModifierClass}backface-hidden`
//           , C = e.el.classList.contains(E);
//         h <= t.maxBackfaceHiddenSlides ? C || e.el.classList.add(E) : C && e.el.classList.remove(E)
//     }
// }
// function We(e) {
//     const s = this
//       , t = []
//       , i = s.virtual && s.params.virtual.enabled;
//     let n = 0, a;
//     typeof e == "number" ? s.setTransition(e) : e === !0 && s.setTransition(s.params.speed);
//     const l = o => i ? s.slides[s.getSlideIndexByData(o)] : s.slides[o];
//     if (s.params.slidesPerView !== "auto" && s.params.slidesPerView > 1)
//         if (s.params.centeredSlides)
//             (s.visibleSlides || []).forEach(o => {
//                 t.push(o)
//             }
//             );
//         else
//             for (a = 0; a < Math.ceil(s.params.slidesPerView); a += 1) {
//                 const o = s.activeIndex + a;
//                 if (o > s.slides.length && !i)
//                     break;
//                 t.push(l(o))
//             }
//     else
//         t.push(l(s.activeIndex));
//     for (a = 0; a < t.length; a += 1)
//         if (typeof t[a] < "u") {
//             const o = t[a].offsetHeight;
//             n = o > n ? o : n
//         }
//     (n || n === 0) && (s.wrapperEl.style.height = `${n}px`)
// }
// function je() {
//     const e = this
//       , s = e.slides
//       , t = e.isElement ? e.isHorizontal() ? e.wrapperEl.offsetLeft : e.wrapperEl.offsetTop : 0;
//     for (let i = 0; i < s.length; i += 1)
//         s[i].swiperSlideOffset = (e.isHorizontal() ? s[i].offsetLeft : s[i].offsetTop) - t - e.cssOverflowAdjustment()
// }
// const ue = (e, s, t) => {
//     s && !e.classList.contains(t) ? e.classList.add(t) : !s && e.classList.contains(t) && e.classList.remove(t)
// }
// ;
// function Xe(e=this && this.translate || 0) {
//     const s = this
//       , t = s.params
//       , {slides: i, rtlTranslate: n, snapGrid: a} = s;
//     if (i.length === 0)
//         return;
//     typeof i[0].swiperSlideOffset > "u" && s.updateSlidesOffset();
//     let l = -e;
//     n && (l = e),
//     s.visibleSlidesIndexes = [],
//     s.visibleSlides = [];
//     let o = t.spaceBetween;
//     typeof o == "string" && o.indexOf("%") >= 0 ? o = parseFloat(o.replace("%", "")) / 100 * s.size : typeof o == "string" && (o = parseFloat(o));
//     for (let r = 0; r < i.length; r += 1) {
//         const c = i[r];
//         let h = c.swiperSlideOffset;
//         t.cssMode && t.centeredSlides && (h -= i[0].swiperSlideOffset);
//         const f = (l + (t.centeredSlides ? s.minTranslate() : 0) - h) / (c.swiperSlideSize + o)
//           , y = (l - a[0] + (t.centeredSlides ? s.minTranslate() : 0) - h) / (c.swiperSlideSize + o)
//           , u = -(l - h)
//           , m = u + s.slidesSizesGrid[r]
//           , v = u >= 0 && u <= s.size - s.slidesSizesGrid[r]
//           , T = u >= 0 && u < s.size - 1 || m > 1 && m <= s.size || u <= 0 && m >= s.size;
//         T && (s.visibleSlides.push(c),
//         s.visibleSlidesIndexes.push(r)),
//         ue(c, T, t.slideVisibleClass),
//         ue(c, v, t.slideFullyVisibleClass),
//         c.progress = n ? -f : f,
//         c.originalProgress = n ? -y : y
//     }
// }
// function Ye(e) {
//     const s = this;
//     if (typeof e > "u") {
//         const h = s.rtlTranslate ? -1 : 1;
//         e = s && s.translate && s.translate * h || 0
//     }
//     const t = s.params
//       , i = s.maxTranslate() - s.minTranslate();
//     let {progress: n, isBeginning: a, isEnd: l, progressLoop: o} = s;
//     const r = a
//       , c = l;
//     if (i === 0)
//         n = 0,
//         a = !0,
//         l = !0;
//     else {
//         n = (e - s.minTranslate()) / i;
//         const h = Math.abs(e - s.minTranslate()) < 1
//           , f = Math.abs(e - s.maxTranslate()) < 1;
//         a = h || n <= 0,
//         l = f || n >= 1,
//         h && (n = 0),
//         f && (n = 1)
//     }
//     if (t.loop) {
//         const h = s.getSlideIndexByData(0)
//           , f = s.getSlideIndexByData(s.slides.length - 1)
//           , y = s.slidesGrid[h]
//           , u = s.slidesGrid[f]
//           , m = s.slidesGrid[s.slidesGrid.length - 1]
//           , v = Math.abs(e);
//         v >= y ? o = (v - y) / m : o = (v + m - u) / m,
//         o > 1 && (o -= 1)
//     }
//     Object.assign(s, {
//         progress: n,
//         progressLoop: o,
//         isBeginning: a,
//         isEnd: l
//     }),
//     (t.watchSlidesProgress || t.centeredSlides && t.autoHeight) && s.updateSlidesProgress(e),
//     a && !r && s.emit("reachBeginning toEdge"),
//     l && !c && s.emit("reachEnd toEdge"),
//     (r && !a || c && !l) && s.emit("fromEdge"),
//     s.emit("progress", n)
// }
// const se = (e, s, t) => {
//     s && !e.classList.contains(t) ? e.classList.add(t) : !s && e.classList.contains(t) && e.classList.remove(t)
// }
// ;
// function Ue() {
//     const e = this
//       , {slides: s, params: t, slidesEl: i, activeIndex: n} = e
//       , a = e.virtual && t.virtual.enabled
//       , l = e.grid && t.grid && t.grid.rows > 1
//       , o = f => N(i, `.${t.slideClass}${f}, swiper-slide${f}`)[0];
//     let r, c, h;
//     if (a)
//         if (t.loop) {
//             let f = n - e.virtual.slidesBefore;
//             f < 0 && (f = e.virtual.slides.length + f),
//             f >= e.virtual.slides.length && (f -= e.virtual.slides.length),
//             r = o(`[data-swiper-slide-index="${f}"]`)
//         } else
//             r = o(`[data-swiper-slide-index="${n}"]`);
//     else
//         l ? (r = s.find(f => f.column === n),
//         h = s.find(f => f.column === n + 1),
//         c = s.find(f => f.column === n - 1)) : r = s[n];
//     r && (l || (h = Be(r, `.${t.slideClass}, swiper-slide`)[0],
//     t.loop && !h && (h = s[0]),
//     c = Ge(r, `.${t.slideClass}, swiper-slide`)[0],
//     t.loop && !c === 0 && (c = s[s.length - 1]))),
//     s.forEach(f => {
//         se(f, f === r, t.slideActiveClass),
//         se(f, f === h, t.slideNextClass),
//         se(f, f === c, t.slidePrevClass)
//     }
//     ),
//     e.emitSlidesClasses()
// }
// const Y = (e, s) => {
//     if (!e || e.destroyed || !e.params)
//         return;
//     const t = () => e.isElement ? "swiper-slide" : `.${e.params.slideClass}`
//       , i = s.closest(t());
//     if (i) {
//         let n = i.querySelector(`.${e.params.lazyPreloaderClass}`);
//         !n && e.isElement && (i.shadowRoot ? n = i.shadowRoot.querySelector(`.${e.params.lazyPreloaderClass}`) : requestAnimationFrame( () => {
//             i.shadowRoot && (n = i.shadowRoot.querySelector(`.${e.params.lazyPreloaderClass}`),
//             n && n.remove())
//         }
//         )),
//         n && n.remove()
//     }
// }
//   , ie = (e, s) => {
//     if (!e.slides[s])
//         return;
//     const t = e.slides[s].querySelector('[loading="lazy"]');
//     t && t.removeAttribute("loading")
// }
//   , oe = e => {
//     if (!e || e.destroyed || !e.params)
//         return;
//     let s = e.params.lazyPreloadPrevNext;
//     const t = e.slides.length;
//     if (!t || !s || s < 0)
//         return;
//     s = Math.min(s, t);
//     const i = e.params.slidesPerView === "auto" ? e.slidesPerViewDynamic() : Math.ceil(e.params.slidesPerView)
//       , n = e.activeIndex;
//     if (e.params.grid && e.params.grid.rows > 1) {
//         const l = n
//           , o = [l - s];
//         o.push(...Array.from({
//             length: s
//         }).map( (r, c) => l + i + c)),
//         e.slides.forEach( (r, c) => {
//             o.includes(r.column) && ie(e, c)
//         }
//         );
//         return
//     }
//     const a = n + i - 1;
//     if (e.params.rewind || e.params.loop)
//         for (let l = n - s; l <= a + s; l += 1) {
//             const o = (l % t + t) % t;
//             (o < n || o > a) && ie(e, o)
//         }
//     else
//         for (let l = Math.max(n - s, 0); l <= Math.min(a + s, t - 1); l += 1)
//             l !== n && (l > a || l < n) && ie(e, l)
// }
// ;
// function Ke(e) {
//     const {slidesGrid: s, params: t} = e
//       , i = e.rtlTranslate ? e.translate : -e.translate;
//     let n;
//     for (let a = 0; a < s.length; a += 1)
//         typeof s[a + 1] < "u" ? i >= s[a] && i < s[a + 1] - (s[a + 1] - s[a]) / 2 ? n = a : i >= s[a] && i < s[a + 1] && (n = a + 1) : i >= s[a] && (n = a);
//     return t.normalizeSlideIndex && (n < 0 || typeof n > "u") && (n = 0),
//     n
// }
// function Qe(e) {
//     const s = this
//       , t = s.rtlTranslate ? s.translate : -s.translate
//       , {snapGrid: i, params: n, activeIndex: a, realIndex: l, snapIndex: o} = s;
//     let r = e, c;
//     const h = u => {
//         let m = u - s.virtual.slidesBefore;
//         return m < 0 && (m = s.virtual.slides.length + m),
//         m >= s.virtual.slides.length && (m -= s.virtual.slides.length),
//         m
//     }
//     ;
//     if (typeof r > "u" && (r = Ke(s)),
//     i.indexOf(t) >= 0)
//         c = i.indexOf(t);
//     else {
//         const u = Math.min(n.slidesPerGroupSkip, r);
//         c = u + Math.floor((r - u) / n.slidesPerGroup)
//     }
//     if (c >= i.length && (c = i.length - 1),
//     r === a && !s.params.loop) {
//         c !== o && (s.snapIndex = c,
//         s.emit("snapIndexChange"));
//         return
//     }
//     if (r === a && s.params.loop && s.virtual && s.params.virtual.enabled) {
//         s.realIndex = h(r);
//         return
//     }
//     const f = s.grid && n.grid && n.grid.rows > 1;
//     let y;
//     if (s.virtual && n.virtual.enabled && n.loop)
//         y = h(r);
//     else if (f) {
//         const u = s.slides.find(v => v.column === r);
//         let m = parseInt(u.getAttribute("data-swiper-slide-index"), 10);
//         Number.isNaN(m) && (m = Math.max(s.slides.indexOf(u), 0)),
//         y = Math.floor(m / n.grid.rows)
//     } else if (s.slides[r]) {
//         const u = s.slides[r].getAttribute("data-swiper-slide-index");
//         u ? y = parseInt(u, 10) : y = r
//     } else
//         y = r;
//     Object.assign(s, {
//         previousSnapIndex: o,
//         snapIndex: c,
//         previousRealIndex: l,
//         realIndex: y,
//         previousIndex: a,
//         activeIndex: r
//     }),
//     s.initialized && oe(s),
//     s.emit("activeIndexChange"),
//     s.emit("snapIndexChange"),
//     (s.initialized || s.params.runCallbacksOnInit) && (l !== y && s.emit("realIndexChange"),
//     s.emit("slideChange"))
// }
// function Ze(e, s) {
//     const t = this
//       , i = t.params;
//     let n = e.closest(`.${i.slideClass}, swiper-slide`);
//     !n && t.isElement && s && s.length > 1 && s.includes(e) && [...s.slice(s.indexOf(e) + 1, s.length)].forEach(o => {
//         !n && o.matches && o.matches(`.${i.slideClass}, swiper-slide`) && (n = o)
//     }
//     );
//     let a = !1, l;
//     if (n) {
//         for (let o = 0; o < t.slides.length; o += 1)
//             if (t.slides[o] === n) {
//                 a = !0,
//                 l = o;
//                 break
//             }
//     }
//     if (n && a)
//         t.clickedSlide = n,
//         t.virtual && t.params.virtual.enabled ? t.clickedIndex = parseInt(n.getAttribute("data-swiper-slide-index"), 10) : t.clickedIndex = l;
//     else {
//         t.clickedSlide = void 0,
//         t.clickedIndex = void 0;
//         return
//     }
//     i.slideToClickedSlide && t.clickedIndex !== void 0 && t.clickedIndex !== t.activeIndex && t.slideToClickedSlide()
// }
// var Je = {
//     updateSize: Re,
//     updateSlides: qe,
//     updateAutoHeight: We,
//     updateSlidesOffset: je,
//     updateSlidesProgress: Xe,
//     updateProgress: Ye,
//     updateSlidesClasses: Ue,
//     updateActiveIndex: Qe,
//     updateClickedSlide: Ze
// };
// function et(e=this.isHorizontal() ? "x" : "y") {
//     const s = this
//       , {params: t, rtlTranslate: i, translate: n, wrapperEl: a} = s;
//     if (t.virtualTranslate)
//         return i ? -n : n;
//     if (t.cssMode)
//         return n;
//     let l = Ae(a, e);
//     return l += s.cssOverflowAdjustment(),
//     i && (l = -l),
//     l || 0
// }
// function tt(e, s) {
//     const t = this
//       , {rtlTranslate: i, params: n, wrapperEl: a, progress: l} = t;
//     let o = 0
//       , r = 0;
//     const c = 0;
//     t.isHorizontal() ? o = i ? -e : e : r = e,
//     n.roundLengths && (o = Math.floor(o),
//     r = Math.floor(r)),
//     t.previousTranslate = t.translate,
//     t.translate = t.isHorizontal() ? o : r,
//     n.cssMode ? a[t.isHorizontal() ? "scrollLeft" : "scrollTop"] = t.isHorizontal() ? -o : -r : n.virtualTranslate || (t.isHorizontal() ? o -= t.cssOverflowAdjustment() : r -= t.cssOverflowAdjustment(),
//     a.style.transform = `translate3d(${o}px, ${r}px, ${c}px)`);
//     let h;
//     const f = t.maxTranslate() - t.minTranslate();
//     f === 0 ? h = 0 : h = (e - t.minTranslate()) / f,
//     h !== l && t.updateProgress(e),
//     t.emit("setTranslate", t.translate, s)
// }
// function st() {
//     return -this.snapGrid[0]
// }
// function it() {
//     return -this.snapGrid[this.snapGrid.length - 1]
// }
// function nt(e=0, s=this.params.speed, t=!0, i=!0, n) {
//     const a = this
//       , {params: l, wrapperEl: o} = a;
//     if (a.animating && l.preventInteractionOnTransition)
//         return !1;
//     const r = a.minTranslate()
//       , c = a.maxTranslate();
//     let h;
//     if (i && e > r ? h = r : i && e < c ? h = c : h = e,
//     a.updateProgress(h),
//     l.cssMode) {
//         const f = a.isHorizontal();
//         if (s === 0)
//             o[f ? "scrollLeft" : "scrollTop"] = -h;
//         else {
//             if (!a.support.smoothScroll)
//                 return ye({
//                     swiper: a,
//                     targetPosition: -h,
//                     side: f ? "left" : "top"
//                 }),
//                 !0;
//             o.scrollTo({
//                 [f ? "left" : "top"]: -h,
//                 behavior: "smooth"
//             })
//         }
//         return !0
//     }
//     return s === 0 ? (a.setTransition(0),
//     a.setTranslate(h),
//     t && (a.emit("beforeTransitionStart", s, n),
//     a.emit("transitionEnd"))) : (a.setTransition(s),
//     a.setTranslate(h),
//     t && (a.emit("beforeTransitionStart", s, n),
//     a.emit("transitionStart")),
//     a.animating || (a.animating = !0,
//     a.onTranslateToWrapperTransitionEnd || (a.onTranslateToWrapperTransitionEnd = function(y) {
//         !a || a.destroyed || y.target === this && (a.wrapperEl.removeEventListener("transitionend", a.onTranslateToWrapperTransitionEnd),
//         a.onTranslateToWrapperTransitionEnd = null,
//         delete a.onTranslateToWrapperTransitionEnd,
//         a.animating = !1,
//         t && a.emit("transitionEnd"))
//     }
//     ),
//     a.wrapperEl.addEventListener("transitionend", a.onTranslateToWrapperTransitionEnd))),
//     !0
// }
// var at = {
//     getTranslate: et,
//     setTranslate: tt,
//     minTranslate: st,
//     maxTranslate: it,
//     translateTo: nt
// };
// function rt(e, s) {
//     const t = this;
//     t.params.cssMode || (t.wrapperEl.style.transitionDuration = `${e}ms`,
//     t.wrapperEl.style.transitionDelay = e === 0 ? "0ms" : ""),
//     t.emit("setTransition", e, s)
// }
// function Ee({swiper: e, runCallbacks: s, direction: t, step: i}) {
//     const {activeIndex: n, previousIndex: a} = e;
//     let l = t;
//     l || (n > a ? l = "next" : n < a ? l = "prev" : l = "reset"),
//     e.emit(`transition${i}`),
//     s && l === "reset" ? e.emit(`slideResetTransition${i}`) : s && n !== a && (e.emit(`slideChangeTransition${i}`),
//     l === "next" ? e.emit(`slideNextTransition${i}`) : e.emit(`slidePrevTransition${i}`))
// }
// function lt(e=!0, s) {
//     const t = this
//       , {params: i} = t;
//     i.cssMode || (i.autoHeight && t.updateAutoHeight(),
//     Ee({
//         swiper: t,
//         runCallbacks: e,
//         direction: s,
//         step: "Start"
//     }))
// }
// function ot(e=!0, s) {
//     const t = this
//       , {params: i} = t;
//     t.animating = !1,
//     !i.cssMode && (t.setTransition(0),
//     Ee({
//         swiper: t,
//         runCallbacks: e,
//         direction: s,
//         step: "End"
//     }))
// }
// var dt = {
//     setTransition: rt,
//     transitionStart: lt,
//     transitionEnd: ot
// };
// function ct(e=0, s, t=!0, i, n) {
//     typeof e == "string" && (e = parseInt(e, 10));
//     const a = this;
//     let l = e;
//     l < 0 && (l = 0);
//     const {params: o, snapGrid: r, slidesGrid: c, previousIndex: h, activeIndex: f, rtlTranslate: y, wrapperEl: u, enabled: m} = a;
//     if (!m && !i && !n || a.destroyed || a.animating && o.preventInteractionOnTransition)
//         return !1;
//     typeof s > "u" && (s = a.params.speed);
//     const v = Math.min(a.params.slidesPerGroupSkip, l);
//     let T = v + Math.floor((l - v) / a.params.slidesPerGroup);
//     T >= r.length && (T = r.length - 1);
//     const d = -r[T];
//     if (o.normalizeSlideIndex)
//         for (let P = 0; P < c.length; P += 1) {
//             const b = -Math.floor(d * 100)
//               , I = Math.floor(c[P] * 100)
//               , E = Math.floor(c[P + 1] * 100);
//             typeof c[P + 1] < "u" ? b >= I && b < E - (E - I) / 2 ? l = P : b >= I && b < E && (l = P + 1) : b >= I && (l = P)
//         }
//     if (a.initialized && l !== f && (!a.allowSlideNext && (y ? d > a.translate && d > a.minTranslate() : d < a.translate && d < a.minTranslate()) || !a.allowSlidePrev && d > a.translate && d > a.maxTranslate() && (f || 0) !== l))
//         return !1;
//     l !== (h || 0) && t && a.emit("beforeSlideChangeStart"),
//     a.updateProgress(d);
//     let p;
//     l > f ? p = "next" : l < f ? p = "prev" : p = "reset";
//     const g = a.virtual && a.params.virtual.enabled;
//     if (!(g && n) && (y && -d === a.translate || !y && d === a.translate))
//         return a.updateActiveIndex(l),
//         o.autoHeight && a.updateAutoHeight(),
//         a.updateSlidesClasses(),
//         o.effect !== "slide" && a.setTranslate(d),
//         p !== "reset" && (a.transitionStart(t, p),
//         a.transitionEnd(t, p)),
//         !1;
//     if (o.cssMode) {
//         const P = a.isHorizontal()
//           , b = y ? d : -d;
//         if (s === 0)
//             g && (a.wrapperEl.style.scrollSnapType = "none",
//             a._immediateVirtual = !0),
//             g && !a._cssModeVirtualInitialSet && a.params.initialSlide > 0 ? (a._cssModeVirtualInitialSet = !0,
//             requestAnimationFrame( () => {
//                 u[P ? "scrollLeft" : "scrollTop"] = b
//             }
//             )) : u[P ? "scrollLeft" : "scrollTop"] = b,
//             g && requestAnimationFrame( () => {
//                 a.wrapperEl.style.scrollSnapType = "",
//                 a._immediateVirtual = !1
//             }
//             );
//         else {
//             if (!a.support.smoothScroll)
//                 return ye({
//                     swiper: a,
//                     targetPosition: b,
//                     side: P ? "left" : "top"
//                 }),
//                 !0;
//             u.scrollTo({
//                 [P ? "left" : "top"]: b,
//                 behavior: "smooth"
//             })
//         }
//         return !0
//     }
//     const L = xe().isSafari;
//     return g && !n && L && a.isElement && a.virtual.update(!1, !1, l),
//     a.setTransition(s),
//     a.setTranslate(d),
//     a.updateActiveIndex(l),
//     a.updateSlidesClasses(),
//     a.emit("beforeTransitionStart", s, i),
//     a.transitionStart(t, p),
//     s === 0 ? a.transitionEnd(t, p) : a.animating || (a.animating = !0,
//     a.onSlideToWrapperTransitionEnd || (a.onSlideToWrapperTransitionEnd = function(b) {
//         !a || a.destroyed || b.target === this && (a.wrapperEl.removeEventListener("transitionend", a.onSlideToWrapperTransitionEnd),
//         a.onSlideToWrapperTransitionEnd = null,
//         delete a.onSlideToWrapperTransitionEnd,
//         a.transitionEnd(t, p))
//     }
//     ),
//     a.wrapperEl.addEventListener("transitionend", a.onSlideToWrapperTransitionEnd)),
//     !0
// }
// function ut(e=0, s, t=!0, i) {
//     typeof e == "string" && (e = parseInt(e, 10));
//     const n = this;
//     if (n.destroyed)
//         return;
//     typeof s > "u" && (s = n.params.speed);
//     const a = n.grid && n.params.grid && n.params.grid.rows > 1;
//     let l = e;
//     if (n.params.loop)
//         if (n.virtual && n.params.virtual.enabled)
//             l = l + n.virtual.slidesBefore;
//         else {
//             let o;
//             if (a) {
//                 const v = l * n.params.grid.rows;
//                 o = n.slides.find(T => T.getAttribute("data-swiper-slide-index") * 1 === v).column
//             } else
//                 o = n.getSlideIndexByData(l);
//             const r = a ? Math.ceil(n.slides.length / n.params.grid.rows) : n.slides.length
//               , {centeredSlides: c, slidesOffsetBefore: h, slidesOffsetAfter: f} = n.params
//               , y = c || !!h || !!f;
//             let u = n.params.slidesPerView;
//             u === "auto" ? u = n.slidesPerViewDynamic() : (u = Math.ceil(parseFloat(n.params.slidesPerView, 10)),
//             y && u % 2 === 0 && (u = u + 1));
//             let m = r - o < u;
//             if (y && (m = m || o < Math.ceil(u / 2)),
//             i && y && n.params.slidesPerView !== "auto" && !a && (m = !1),
//             m) {
//                 const v = y ? o < n.activeIndex ? "prev" : "next" : o - n.activeIndex - 1 < n.params.slidesPerView ? "next" : "prev";
//                 n.loopFix({
//                     direction: v,
//                     slideTo: !0,
//                     activeSlideIndex: v === "next" ? o + 1 : o - r + 1,
//                     slideRealIndex: v === "next" ? n.realIndex : void 0
//                 })
//             }
//             if (a) {
//                 const v = l * n.params.grid.rows;
//                 l = n.slides.find(T => T.getAttribute("data-swiper-slide-index") * 1 === v).column
//             } else
//                 l = n.getSlideIndexByData(l)
//         }
//     return requestAnimationFrame( () => {
//         n.slideTo(l, s, t, i)
//     }
//     ),
//     n
// }
// function ft(e, s=!0, t) {
//     const i = this
//       , {enabled: n, params: a, animating: l} = i;
//     if (!n || i.destroyed)
//         return i;
//     typeof e > "u" && (e = i.params.speed);
//     let o = a.slidesPerGroup;
//     a.slidesPerView === "auto" && a.slidesPerGroup === 1 && a.slidesPerGroupAuto && (o = Math.max(i.slidesPerViewDynamic("current", !0), 1));
//     const r = i.activeIndex < a.slidesPerGroupSkip ? 1 : o
//       , c = i.virtual && a.virtual.enabled;
//     if (a.loop) {
//         if (l && !c && a.loopPreventsSliding)
//             return !1;
//         if (i.loopFix({
//             direction: "next"
//         }),
//         i._clientLeft = i.wrapperEl.clientLeft,
//         i.activeIndex === i.slides.length - 1 && a.cssMode)
//             return requestAnimationFrame( () => {
//                 i.slideTo(i.activeIndex + r, e, s, t)
//             }
//             ),
//             !0
//     }
//     return a.rewind && i.isEnd ? i.slideTo(0, e, s, t) : i.slideTo(i.activeIndex + r, e, s, t)
// }
// function pt(e, s=!0, t) {
//     const i = this
//       , {params: n, snapGrid: a, slidesGrid: l, rtlTranslate: o, enabled: r, animating: c} = i;
//     if (!r || i.destroyed)
//         return i;
//     typeof e > "u" && (e = i.params.speed);
//     const h = i.virtual && n.virtual.enabled;
//     if (n.loop) {
//         if (c && !h && n.loopPreventsSliding)
//             return !1;
//         i.loopFix({
//             direction: "prev"
//         }),
//         i._clientLeft = i.wrapperEl.clientLeft
//     }
//     const f = o ? i.translate : -i.translate;
//     function y(p) {
//         return p < 0 ? -Math.floor(Math.abs(p)) : Math.floor(p)
//     }
//     const u = y(f)
//       , m = a.map(p => y(p))
//       , v = n.freeMode && n.freeMode.enabled;
//     let T = a[m.indexOf(u) - 1];
//     if (typeof T > "u" && (n.cssMode || v)) {
//         let p;
//         a.forEach( (g, S) => {
//             u >= g && (p = S)
//         }
//         ),
//         typeof p < "u" && (T = v ? a[p] : a[p > 0 ? p - 1 : p])
//     }
//     let d = 0;
//     if (typeof T < "u" && (d = l.indexOf(T),
//     d < 0 && (d = i.activeIndex - 1),
//     n.slidesPerView === "auto" && n.slidesPerGroup === 1 && n.slidesPerGroupAuto && (d = d - i.slidesPerViewDynamic("previous", !0) + 1,
//     d = Math.max(d, 0))),
//     n.rewind && i.isBeginning) {
//         const p = i.params.virtual && i.params.virtual.enabled && i.virtual ? i.virtual.slides.length - 1 : i.slides.length - 1;
//         return i.slideTo(p, e, s, t)
//     } else if (n.loop && i.activeIndex === 0 && n.cssMode)
//         return requestAnimationFrame( () => {
//             i.slideTo(d, e, s, t)
//         }
//         ),
//         !0;
//     return i.slideTo(d, e, s, t)
// }
// function mt(e, s=!0, t) {
//     const i = this;
//     if (!i.destroyed)
//         return typeof e > "u" && (e = i.params.speed),
//         i.slideTo(i.activeIndex, e, s, t)
// }
// function ht(e, s=!0, t, i=.5) {
//     const n = this;
//     if (n.destroyed)
//         return;
//     typeof e > "u" && (e = n.params.speed);
//     let a = n.activeIndex;
//     const l = Math.min(n.params.slidesPerGroupSkip, a)
//       , o = l + Math.floor((a - l) / n.params.slidesPerGroup)
//       , r = n.rtlTranslate ? n.translate : -n.translate;
//     if (r >= n.snapGrid[o]) {
//         const c = n.snapGrid[o]
//           , h = n.snapGrid[o + 1];
//         r - c > (h - c) * i && (a += n.params.slidesPerGroup)
//     } else {
//         const c = n.snapGrid[o - 1]
//           , h = n.snapGrid[o];
//         r - c <= (h - c) * i && (a -= n.params.slidesPerGroup)
//     }
//     return a = Math.max(a, 0),
//     a = Math.min(a, n.slidesGrid.length - 1),
//     n.slideTo(a, e, s, t)
// }
// function gt() {
//     const e = this;
//     if (e.destroyed)
//         return;
//     const {params: s, slidesEl: t} = e
//       , i = s.slidesPerView === "auto" ? e.slidesPerViewDynamic() : s.slidesPerView;
//     let n = e.getSlideIndexWhenGrid(e.clickedIndex), a;
//     const l = e.isElement ? "swiper-slide" : `.${s.slideClass}`
//       , o = e.grid && e.params.grid && e.params.grid.rows > 1;
//     if (s.loop) {
//         if (e.animating)
//             return;
//         a = parseInt(e.clickedSlide.getAttribute("data-swiper-slide-index"), 10),
//         s.centeredSlides ? e.slideToLoop(a) : n > (o ? (e.slides.length - i) / 2 - (e.params.grid.rows - 1) : e.slides.length - i) ? (e.loopFix(),
//         n = e.getSlideIndex(N(t, `${l}[data-swiper-slide-index="${a}"]`)[0]),
//         ve( () => {
//             e.slideTo(n)
//         }
//         )) : e.slideTo(n)
//     } else
//         e.slideTo(n)
// }
// var vt = {
//     slideTo: ct,
//     slideToLoop: ut,
//     slideNext: ft,
//     slidePrev: pt,
//     slideReset: mt,
//     slideToClosest: ht,
//     slideToClickedSlide: gt
// };
// function yt(e, s) {
//     const t = this
//       , {params: i, slidesEl: n} = t;
//     if (!i.loop || t.virtual && t.params.virtual.enabled)
//         return;
//     const a = () => {
//         N(n, `.${i.slideClass}, swiper-slide`).forEach( (m, v) => {
//             m.setAttribute("data-swiper-slide-index", v)
//         }
//         )
//     }
//       , l = () => {
//         const u = N(n, `.${i.slideBlankClass}`);
//         u.forEach(m => {
//             m.remove()
//         }
//         ),
//         u.length > 0 && (t.recalcSlides(),
//         t.updateSlides())
//     }
//       , o = t.grid && i.grid && i.grid.rows > 1;
//     i.loopAddBlankSlides && (i.slidesPerGroup > 1 || o) && l();
//     const r = i.slidesPerGroup * (o ? i.grid.rows : 1)
//       , c = t.slides.length % r !== 0
//       , h = o && t.slides.length % i.grid.rows !== 0
//       , f = u => {
//         for (let m = 0; m < u; m += 1) {
//             const v = t.isElement ? Q("swiper-slide", [i.slideBlankClass]) : Q("div", [i.slideClass, i.slideBlankClass]);
//             t.slidesEl.append(v)
//         }
//     }
//     ;
//     if (c) {
//         if (i.loopAddBlankSlides) {
//             const u = r - t.slides.length % r;
//             f(u),
//             t.recalcSlides(),
//             t.updateSlides()
//         } else
//             K("Swiper Loop Warning: The number of slides is not even to slidesPerGroup, loop mode may not function properly. You need to add more slides (or make duplicates, or empty slides)");
//         a()
//     } else if (h) {
//         if (i.loopAddBlankSlides) {
//             const u = i.grid.rows - t.slides.length % i.grid.rows;
//             f(u),
//             t.recalcSlides(),
//             t.updateSlides()
//         } else
//             K("Swiper Loop Warning: The number of slides is not even to grid.rows, loop mode may not function properly. You need to add more slides (or make duplicates, or empty slides)");
//         a()
//     } else
//         a();
//     const y = i.centeredSlides || !!i.slidesOffsetBefore || !!i.slidesOffsetAfter;
//     t.loopFix({
//         slideRealIndex: e,
//         direction: y ? void 0 : "next",
//         initial: s
//     })
// }
// function St({slideRealIndex: e, slideTo: s=!0, direction: t, setTranslate: i, activeSlideIndex: n, initial: a, byController: l, byMousewheel: o}={}) {
//     const r = this;
//     if (!r.params.loop)
//         return;
//     r.emit("beforeLoopFix");
//     const {slides: c, allowSlidePrev: h, allowSlideNext: f, slidesEl: y, params: u} = r
//       , {centeredSlides: m, slidesOffsetBefore: v, slidesOffsetAfter: T, initialSlide: d} = u
//       , p = m || !!v || !!T;
//     if (r.allowSlidePrev = !0,
//     r.allowSlideNext = !0,
//     r.virtual && u.virtual.enabled) {
//         s && (!p && r.snapIndex === 0 ? r.slideTo(r.virtual.slides.length, 0, !1, !0) : p && r.snapIndex < u.slidesPerView ? r.slideTo(r.virtual.slides.length + r.snapIndex, 0, !1, !0) : r.snapIndex === r.snapGrid.length - 1 && r.slideTo(r.virtual.slidesBefore, 0, !1, !0)),
//         r.allowSlidePrev = h,
//         r.allowSlideNext = f,
//         r.emit("loopFix");
//         return
//     }
//     let g = u.slidesPerView;
//     g === "auto" ? g = r.slidesPerViewDynamic() : (g = Math.ceil(parseFloat(u.slidesPerView, 10)),
//     p && g % 2 === 0 && (g = g + 1));
//     const S = u.slidesPerGroupAuto ? g : u.slidesPerGroup;
//     let x = p ? Math.max(S, Math.ceil(g / 2)) : S;
//     x % S !== 0 && (x += S - x % S),
//     x += u.loopAdditionalSlides,
//     r.loopedSlides = x;
//     const L = r.grid && u.grid && u.grid.rows > 1;
//     c.length < g + x || r.params.effect === "cards" && c.length < g + x * 2 ? K("Swiper Loop Warning: The number of slides is not enough for loop mode, it will be disabled or not function properly. You need to add more slides (or make duplicates) or lower the values of slidesPerView and slidesPerGroup parameters") : L && u.grid.fill === "row" && K("Swiper Loop Warning: Loop mode is not compatible with grid.fill = `row`");
//     const P = []
//       , b = []
//       , I = L ? Math.ceil(c.length / u.grid.rows) : c.length
//       , E = a && I - d < g && !p;
//     let C = E ? d : r.activeIndex;
//     typeof n > "u" ? n = r.getSlideIndex(c.find(M => M.classList.contains(u.slideActiveClass))) : C = n;
//     const w = t === "next" || !t
//       , A = t === "prev" || !t;
//     let z = 0
//       , G = 0;
//     const O = (L ? c[n].column : n) + (p && typeof i > "u" ? -g / 2 + .5 : 0);
//     if (O < x) {
//         z = Math.max(x - O, S);
//         for (let M = 0; M < x - O; M += 1) {
//             const k = M - Math.floor(M / I) * I;
//             if (L) {
//                 const D = I - k - 1;
//                 for (let _ = c.length - 1; _ >= 0; _ -= 1)
//                     c[_].column === D && P.push(_)
//             } else
//                 P.push(I - k - 1)
//         }
//     } else if (O + g > I - x) {
//         G = Math.max(O - (I - x * 2), S),
//         E && (G = Math.max(G, g - I + d + 1));
//         for (let M = 0; M < G; M += 1) {
//             const k = M - Math.floor(M / I) * I;
//             L ? c.forEach( (D, _) => {
//                 D.column === k && b.push(_)
//             }
//             ) : b.push(k)
//         }
//     }
//     if (r.__preventObserver__ = !0,
//     requestAnimationFrame( () => {
//         r.__preventObserver__ = !1
//     }
//     ),
//     r.params.effect === "cards" && c.length < g + x * 2 && (b.includes(n) && b.splice(b.indexOf(n), 1),
//     P.includes(n) && P.splice(P.indexOf(n), 1)),
//     A && P.forEach(M => {
//         c[M].swiperLoopMoveDOM = !0,
//         y.prepend(c[M]),
//         c[M].swiperLoopMoveDOM = !1
//     }
//     ),
//     w && b.forEach(M => {
//         c[M].swiperLoopMoveDOM = !0,
//         y.append(c[M]),
//         c[M].swiperLoopMoveDOM = !1
//     }
//     ),
//     r.recalcSlides(),
//     u.slidesPerView === "auto" ? r.updateSlides() : L && (P.length > 0 && A || b.length > 0 && w) && r.slides.forEach( (M, k) => {
//         r.grid.updateSlide(k, M, r.slides)
//     }
//     ),
//     u.watchSlidesProgress && r.updateSlidesOffset(),
//     s) {
//         if (P.length > 0 && A) {
//             if (typeof e > "u") {
//                 const M = r.slidesGrid[C]
//                   , D = r.slidesGrid[C + z] - M;
//                 o ? r.setTranslate(r.translate - D) : (r.slideTo(C + Math.ceil(z), 0, !1, !0),
//                 i && (r.touchEventsData.startTranslate = r.touchEventsData.startTranslate - D,
//                 r.touchEventsData.currentTranslate = r.touchEventsData.currentTranslate - D))
//             } else if (i) {
//                 const M = L ? P.length / u.grid.rows : P.length;
//                 r.slideTo(r.activeIndex + M, 0, !1, !0),
//                 r.touchEventsData.currentTranslate = r.translate
//             }
//         } else if (b.length > 0 && w)
//             if (typeof e > "u") {
//                 const M = r.slidesGrid[C]
//                   , D = r.slidesGrid[C - G] - M;
//                 o ? r.setTranslate(r.translate - D) : (r.slideTo(C - G, 0, !1, !0),
//                 i && (r.touchEventsData.startTranslate = r.touchEventsData.startTranslate - D,
//                 r.touchEventsData.currentTranslate = r.touchEventsData.currentTranslate - D))
//             } else {
//                 const M = L ? b.length / u.grid.rows : b.length;
//                 r.slideTo(r.activeIndex - M, 0, !1, !0)
//             }
//     }
//     if (r.allowSlidePrev = h,
//     r.allowSlideNext = f,
//     r.controller && r.controller.control && !l) {
//         const M = {
//             slideRealIndex: e,
//             direction: t,
//             setTranslate: i,
//             activeSlideIndex: n,
//             byController: !0
//         };
//         Array.isArray(r.controller.control) ? r.controller.control.forEach(k => {
//             !k.destroyed && k.params.loop && k.loopFix({
//                 ...M,
//                 slideTo: k.params.slidesPerView === u.slidesPerView ? s : !1
//             })
//         }
//         ) : r.controller.control instanceof r.constructor && r.controller.control.params.loop && r.controller.control.loopFix({
//             ...M,
//             slideTo: r.controller.control.params.slidesPerView === u.slidesPerView ? s : !1
//         })
//     }
//     r.emit("loopFix")
// }
// function bt() {
//     const e = this
//       , {params: s, slidesEl: t} = e;
//     if (!s.loop || !t || e.virtual && e.params.virtual.enabled)
//         return;
//     e.recalcSlides();
//     const i = [];
//     e.slides.forEach(n => {
//         const a = typeof n.swiperSlideIndex > "u" ? n.getAttribute("data-swiper-slide-index") * 1 : n.swiperSlideIndex;
//         i[a] = n
//     }
//     ),
//     e.slides.forEach(n => {
//         n.removeAttribute("data-swiper-slide-index")
//     }
//     ),
//     i.forEach(n => {
//         t.append(n)
//     }
//     ),
//     e.recalcSlides(),
//     e.slideTo(e.realIndex, 0)
// }
// var Tt = {
//     loopCreate: yt,
//     loopFix: St,
//     loopDestroy: bt
// };
// function xt(e) {
//     const s = this;
//     if (!s.params.simulateTouch || s.params.watchOverflow && s.isLocked || s.params.cssMode)
//         return;
//     const t = s.params.touchEventsTarget === "container" ? s.el : s.wrapperEl;
//     s.isElement && (s.__preventObserver__ = !0),
//     t.style.cursor = "move",
//     t.style.cursor = e ? "grabbing" : "grab",
//     s.isElement && requestAnimationFrame( () => {
//         s.__preventObserver__ = !1
//     }
//     )
// }
// function Et() {
//     const e = this;
//     e.params.watchOverflow && e.isLocked || e.params.cssMode || (e.isElement && (e.__preventObserver__ = !0),
//     e[e.params.touchEventsTarget === "container" ? "el" : "wrapperEl"].style.cursor = "",
//     e.isElement && requestAnimationFrame( () => {
//         e.__preventObserver__ = !1
//     }
//     ))
// }
// var Ct = {
//     setGrabCursor: xt,
//     unsetGrabCursor: Et
// };
// function wt(e, s=this) {
//     function t(i) {
//         if (!i || i === H() || i === $())
//             return null;
//         i.assignedSlot && (i = i.assignedSlot);
//         const n = i.closest(e);
//         return !n && !i.getRootNode ? null : n || t(i.getRootNode().host)
//     }
//     return t(s)
// }
// function fe(e, s, t) {
//     const i = $()
//       , {params: n} = e
//       , a = n.edgeSwipeDetection
//       , l = n.edgeSwipeThreshold;
//     return a && (t <= l || t >= i.innerWidth - l) ? a === "prevent" ? (s.preventDefault(),
//     !0) : !1 : !0
// }
// function Mt(e) {
//     const s = this
//       , t = H();
//     let i = e;
//     i.originalEvent && (i = i.originalEvent);
//     const n = s.touchEventsData;
//     if (i.type === "pointerdown") {
//         if (n.pointerId !== null && n.pointerId !== i.pointerId)
//             return;
//         n.pointerId = i.pointerId
//     } else
//         i.type === "touchstart" && i.targetTouches.length === 1 && (n.touchId = i.targetTouches[0].identifier);
//     if (i.type === "touchstart") {
//         fe(s, i, i.targetTouches[0].pageX);
//         return
//     }
//     const {params: a, touches: l, enabled: o} = s;
//     if (!o || !a.simulateTouch && i.pointerType === "mouse" || s.animating && a.preventInteractionOnTransition)
//         return;
//     !s.animating && a.cssMode && a.loop && s.loopFix();
//     let r = i.target;
//     if (a.touchEventsTarget === "wrapper" && !De(r, s.wrapperEl) || "which"in i && i.which === 3 || "button"in i && i.button > 0 || n.isTouched && n.isMoved)
//         return;
//     const c = !!a.noSwipingClass && a.noSwipingClass !== ""
//       , h = i.composedPath ? i.composedPath() : i.path;
//     c && i.target && i.target.shadowRoot && h && (r = h[0]);
//     const f = a.noSwipingSelector ? a.noSwipingSelector : `.${a.noSwipingClass}`
//       , y = !!(i.target && i.target.shadowRoot);
//     if (a.noSwiping && (y ? wt(f, r) : r.closest(f))) {
//         s.allowClick = !0;
//         return
//     }
//     if (a.swipeHandler && !r.closest(a.swipeHandler))
//         return;
//     l.currentX = i.pageX,
//     l.currentY = i.pageY;
//     const u = l.currentX
//       , m = l.currentY;
//     if (!fe(s, i, u))
//         return;
//     Object.assign(n, {
//         isTouched: !0,
//         isMoved: !1,
//         allowTouchCallbacks: !0,
//         isScrolling: void 0,
//         startMoving: void 0
//     }),
//     l.startX = u,
//     l.startY = m,
//     n.touchStartTime = U(),
//     s.allowClick = !0,
//     s.updateSize(),
//     s.swipeDirection = void 0,
//     a.threshold > 0 && (n.allowThresholdMove = !1);
//     let v = !0;
//     r.matches(n.focusableElements) && (v = !1,
//     r.nodeName === "SELECT" && (n.isTouched = !1)),
//     t.activeElement && t.activeElement.matches(n.focusableElements) && t.activeElement !== r && (i.pointerType === "mouse" || i.pointerType !== "mouse" && !r.matches(n.focusableElements)) && t.activeElement.blur();
//     const T = v && s.allowTouchMove && a.touchStartPreventDefault;
//     (a.touchStartForcePreventDefault || T) && !r.isContentEditable && i.preventDefault(),
//     a.freeMode && a.freeMode.enabled && s.freeMode && s.animating && !a.cssMode && s.freeMode.onTouchStart(),
//     s.emit("touchStart", i)
// }
// function Pt(e) {
//     const s = H()
//       , t = this
//       , i = t.touchEventsData
//       , {params: n, touches: a, rtlTranslate: l, enabled: o} = t;
//     if (!o || !n.simulateTouch && e.pointerType === "mouse")
//         return;
//     let r = e;
//     if (r.originalEvent && (r = r.originalEvent),
//     r.type === "pointermove" && (i.touchId !== null || r.pointerId !== i.pointerId))
//         return;
//     let c;
//     if (r.type === "touchmove") {
//         if (c = [...r.changedTouches].find(x => x.identifier === i.touchId),
//         !c || c.identifier !== i.touchId)
//             return
//     } else
//         c = r;
//     if (!i.isTouched) {
//         i.startMoving && i.isScrolling && t.emit("touchMoveOpposite", r);
//         return
//     }
//     const h = c.pageX
//       , f = c.pageY;
//     if (r.preventedByNestedSwiper) {
//         a.startX = h,
//         a.startY = f;
//         return
//     }
//     if (!t.allowTouchMove) {
//         r.target.matches(i.focusableElements) || (t.allowClick = !1),
//         i.isTouched && (Object.assign(a, {
//             startX: h,
//             startY: f,
//             currentX: h,
//             currentY: f
//         }),
//         i.touchStartTime = U());
//         return
//     }
//     if (n.touchReleaseOnEdges && !n.loop)
//         if (t.isVertical()) {
//             if (f < a.startY && t.translate <= t.maxTranslate() || f > a.startY && t.translate >= t.minTranslate()) {
//                 i.isTouched = !1,
//                 i.isMoved = !1;
//                 return
//             }
//         } else {
//             if (l && (h > a.startX && -t.translate <= t.maxTranslate() || h < a.startX && -t.translate >= t.minTranslate()))
//                 return;
//             if (!l && (h < a.startX && t.translate <= t.maxTranslate() || h > a.startX && t.translate >= t.minTranslate()))
//                 return
//         }
//     if (s.activeElement && s.activeElement.matches(i.focusableElements) && s.activeElement !== r.target && r.pointerType !== "mouse" && s.activeElement.blur(),
//     s.activeElement && r.target === s.activeElement && r.target.matches(i.focusableElements)) {
//         i.isMoved = !0,
//         t.allowClick = !1;
//         return
//     }
//     i.allowTouchCallbacks && t.emit("touchMove", r),
//     a.previousX = a.currentX,
//     a.previousY = a.currentY,
//     a.currentX = h,
//     a.currentY = f;
//     const y = a.currentX - a.startX
//       , u = a.currentY - a.startY;
//     if (t.params.threshold && Math.sqrt(y ** 2 + u ** 2) < t.params.threshold)
//         return;
//     if (typeof i.isScrolling > "u") {
//         let x;
//         t.isHorizontal() && a.currentY === a.startY || t.isVertical() && a.currentX === a.startX ? i.isScrolling = !1 : y * y + u * u >= 25 && (x = Math.atan2(Math.abs(u), Math.abs(y)) * 180 / Math.PI,
//         i.isScrolling = t.isHorizontal() ? x > n.touchAngle : 90 - x > n.touchAngle)
//     }
//     if (i.isScrolling && t.emit("touchMoveOpposite", r),
//     typeof i.startMoving > "u" && (a.currentX !== a.startX || a.currentY !== a.startY) && (i.startMoving = !0),
//     i.isScrolling || r.type === "touchmove" && i.preventTouchMoveFromPointerMove) {
//         i.isTouched = !1;
//         return
//     }
//     if (!i.startMoving)
//         return;
//     t.allowClick = !1,
//     !n.cssMode && r.cancelable && r.preventDefault(),
//     n.touchMoveStopPropagation && !n.nested && r.stopPropagation();
//     let m = t.isHorizontal() ? y : u
//       , v = t.isHorizontal() ? a.currentX - a.previousX : a.currentY - a.previousY;
//     n.oneWayMovement && (m = Math.abs(m) * (l ? 1 : -1),
//     v = Math.abs(v) * (l ? 1 : -1)),
//     a.diff = m,
//     m *= n.touchRatio,
//     l && (m = -m,
//     v = -v);
//     const T = t.touchesDirection;
//     t.swipeDirection = m > 0 ? "prev" : "next",
//     t.touchesDirection = v > 0 ? "prev" : "next";
//     const d = t.params.loop && !n.cssMode
//       , p = t.touchesDirection === "next" && t.allowSlideNext || t.touchesDirection === "prev" && t.allowSlidePrev;
//     if (!i.isMoved) {
//         if (d && p && t.loopFix({
//             direction: t.swipeDirection
//         }),
//         i.startTranslate = t.getTranslate(),
//         t.setTransition(0),
//         t.animating) {
//             const x = new window.CustomEvent("transitionend",{
//                 bubbles: !0,
//                 cancelable: !0,
//                 detail: {
//                     bySwiperTouchMove: !0
//                 }
//             });
//             t.wrapperEl.dispatchEvent(x)
//         }
//         i.allowMomentumBounce = !1,
//         n.grabCursor && (t.allowSlideNext === !0 || t.allowSlidePrev === !0) && t.setGrabCursor(!0),
//         t.emit("sliderFirstMove", r)
//     }
//     if (new Date().getTime(),
//     n._loopSwapReset !== !1 && i.isMoved && i.allowThresholdMove && T !== t.touchesDirection && d && p && Math.abs(m) >= 1) {
//         Object.assign(a, {
//             startX: h,
//             startY: f,
//             currentX: h,
//             currentY: f,
//             startTranslate: i.currentTranslate
//         }),
//         i.loopSwapReset = !0,
//         i.startTranslate = i.currentTranslate;
//         return
//     }
//     t.emit("sliderMove", r),
//     i.isMoved = !0,
//     i.currentTranslate = m + i.startTranslate;
//     let g = !0
//       , S = n.resistanceRatio;
//     if (n.touchReleaseOnEdges && (S = 0),
//     m > 0 ? (d && p && i.allowThresholdMove && i.currentTranslate > (n.centeredSlides ? t.minTranslate() - t.slidesSizesGrid[t.activeIndex + 1] - (n.slidesPerView !== "auto" && t.slides.length - n.slidesPerView >= 2 ? t.slidesSizesGrid[t.activeIndex + 1] + t.params.spaceBetween : 0) - t.params.spaceBetween : t.minTranslate()) && t.loopFix({
//         direction: "prev",
//         setTranslate: !0,
//         activeSlideIndex: 0
//     }),
//     i.currentTranslate > t.minTranslate() && (g = !1,
//     n.resistance && (i.currentTranslate = t.minTranslate() - 1 + (-t.minTranslate() + i.startTranslate + m) ** S))) : m < 0 && (d && p && i.allowThresholdMove && i.currentTranslate < (n.centeredSlides ? t.maxTranslate() + t.slidesSizesGrid[t.slidesSizesGrid.length - 1] + t.params.spaceBetween + (n.slidesPerView !== "auto" && t.slides.length - n.slidesPerView >= 2 ? t.slidesSizesGrid[t.slidesSizesGrid.length - 1] + t.params.spaceBetween : 0) : t.maxTranslate()) && t.loopFix({
//         direction: "next",
//         setTranslate: !0,
//         activeSlideIndex: t.slides.length - (n.slidesPerView === "auto" ? t.slidesPerViewDynamic() : Math.ceil(parseFloat(n.slidesPerView, 10)))
//     }),
//     i.currentTranslate < t.maxTranslate() && (g = !1,
//     n.resistance && (i.currentTranslate = t.maxTranslate() + 1 - (t.maxTranslate() - i.startTranslate - m) ** S))),
//     g && (r.preventedByNestedSwiper = !0),
//     !t.allowSlideNext && t.swipeDirection === "next" && i.currentTranslate < i.startTranslate && (i.currentTranslate = i.startTranslate),
//     !t.allowSlidePrev && t.swipeDirection === "prev" && i.currentTranslate > i.startTranslate && (i.currentTranslate = i.startTranslate),
//     !t.allowSlidePrev && !t.allowSlideNext && (i.currentTranslate = i.startTranslate),
//     n.threshold > 0)
//         if (Math.abs(m) > n.threshold || i.allowThresholdMove) {
//             if (!i.allowThresholdMove) {
//                 i.allowThresholdMove = !0,
//                 a.startX = a.currentX,
//                 a.startY = a.currentY,
//                 i.currentTranslate = i.startTranslate,
//                 a.diff = t.isHorizontal() ? a.currentX - a.startX : a.currentY - a.startY;
//                 return
//             }
//         } else {
//             i.currentTranslate = i.startTranslate;
//             return
//         }
//     !n.followFinger || n.cssMode || ((n.freeMode && n.freeMode.enabled && t.freeMode || n.watchSlidesProgress) && (t.updateActiveIndex(),
//     t.updateSlidesClasses()),
//     n.freeMode && n.freeMode.enabled && t.freeMode && t.freeMode.onTouchMove(),
//     t.updateProgress(i.currentTranslate),
//     t.setTranslate(i.currentTranslate))
// }
// function Lt(e) {
//     const s = this
//       , t = s.touchEventsData;
//     let i = e;
//     i.originalEvent && (i = i.originalEvent);
//     let n;
//     if (i.type === "touchend" || i.type === "touchcancel") {
//         if (n = [...i.changedTouches].find(x => x.identifier === t.touchId),
//         !n || n.identifier !== t.touchId)
//             return
//     } else {
//         if (t.touchId !== null || i.pointerId !== t.pointerId)
//             return;
//         n = i
//     }
//     if (["pointercancel", "pointerout", "pointerleave", "contextmenu"].includes(i.type) && !(["pointercancel", "contextmenu"].includes(i.type) && (s.browser.isSafari || s.browser.isWebView)))
//         return;
//     t.pointerId = null,
//     t.touchId = null;
//     const {params: l, touches: o, rtlTranslate: r, slidesGrid: c, enabled: h} = s;
//     if (!h || !l.simulateTouch && i.pointerType === "mouse")
//         return;
//     if (t.allowTouchCallbacks && s.emit("touchEnd", i),
//     t.allowTouchCallbacks = !1,
//     !t.isTouched) {
//         t.isMoved && l.grabCursor && s.setGrabCursor(!1),
//         t.isMoved = !1,
//         t.startMoving = !1;
//         return
//     }
//     l.grabCursor && t.isMoved && t.isTouched && (s.allowSlideNext === !0 || s.allowSlidePrev === !0) && s.setGrabCursor(!1);
//     const f = U()
//       , y = f - t.touchStartTime;
//     if (s.allowClick) {
//         const x = i.path || i.composedPath && i.composedPath();
//         s.updateClickedSlide(x && x[0] || i.target, x),
//         s.emit("tap click", i),
//         y < 300 && f - t.lastClickTime < 300 && s.emit("doubleTap doubleClick", i)
//     }
//     if (t.lastClickTime = U(),
//     ve( () => {
//         s.destroyed || (s.allowClick = !0)
//     }
//     ),
//     !t.isTouched || !t.isMoved || !s.swipeDirection || o.diff === 0 && !t.loopSwapReset || t.currentTranslate === t.startTranslate && !t.loopSwapReset) {
//         t.isTouched = !1,
//         t.isMoved = !1,
//         t.startMoving = !1;
//         return
//     }
//     t.isTouched = !1,
//     t.isMoved = !1,
//     t.startMoving = !1;
//     let u;
//     if (l.followFinger ? u = r ? s.translate : -s.translate : u = -t.currentTranslate,
//     l.cssMode)
//         return;
//     if (l.freeMode && l.freeMode.enabled) {
//         s.freeMode.onTouchEnd({
//             currentPos: u
//         });
//         return
//     }
//     const m = u >= -s.maxTranslate() && !s.params.loop;
//     let v = 0
//       , T = s.slidesSizesGrid[0];
//     for (let x = 0; x < c.length; x += x < l.slidesPerGroupSkip ? 1 : l.slidesPerGroup) {
//         const L = x < l.slidesPerGroupSkip - 1 ? 1 : l.slidesPerGroup;
//         typeof c[x + L] < "u" ? (m || u >= c[x] && u < c[x + L]) && (v = x,
//         T = c[x + L] - c[x]) : (m || u >= c[x]) && (v = x,
//         T = c[c.length - 1] - c[c.length - 2])
//     }
//     let d = null
//       , p = null;
//     l.rewind && (s.isBeginning ? p = l.virtual && l.virtual.enabled && s.virtual ? s.virtual.slides.length - 1 : s.slides.length - 1 : s.isEnd && (d = 0));
//     const g = (u - c[v]) / T
//       , S = v < l.slidesPerGroupSkip - 1 ? 1 : l.slidesPerGroup;
//     if (y > l.longSwipesMs) {
//         if (!l.longSwipes) {
//             s.slideTo(s.activeIndex);
//             return
//         }
//         s.swipeDirection === "next" && (g >= l.longSwipesRatio ? s.slideTo(l.rewind && s.isEnd ? d : v + S) : s.slideTo(v)),
//         s.swipeDirection === "prev" && (g > 1 - l.longSwipesRatio ? s.slideTo(v + S) : p !== null && g < 0 && Math.abs(g) > l.longSwipesRatio ? s.slideTo(p) : s.slideTo(v))
//     } else {
//         if (!l.shortSwipes) {
//             s.slideTo(s.activeIndex);
//             return
//         }
//         s.navigation && (i.target === s.navigation.nextEl || i.target === s.navigation.prevEl) ? i.target === s.navigation.nextEl ? s.slideTo(v + S) : s.slideTo(v) : (s.swipeDirection === "next" && s.slideTo(d !== null ? d : v + S),
//         s.swipeDirection === "prev" && s.slideTo(p !== null ? p : v))
//     }
// }
// function pe() {
//     const e = this
//       , {params: s, el: t} = e;
//     if (t && t.offsetWidth === 0)
//         return;
//     s.breakpoints && e.setBreakpoint();
//     const {allowSlideNext: i, allowSlidePrev: n, snapGrid: a} = e
//       , l = e.virtual && e.params.virtual.enabled;
//     e.allowSlideNext = !0,
//     e.allowSlidePrev = !0,
//     e.updateSize(),
//     e.updateSlides(),
//     e.updateSlidesClasses();
//     const o = l && s.loop;
//     (s.slidesPerView === "auto" || s.slidesPerView > 1) && e.isEnd && !e.isBeginning && !e.params.centeredSlides && !o ? e.slideTo(e.slides.length - 1, 0, !1, !0) : e.params.loop && !l ? e.slideToLoop(e.realIndex, 0, !1, !0) : e.slideTo(e.activeIndex, 0, !1, !0),
//     e.autoplay && e.autoplay.running && e.autoplay.paused && (clearTimeout(e.autoplay.resizeTimeout),
//     e.autoplay.resizeTimeout = setTimeout( () => {
//         e.autoplay && e.autoplay.running && e.autoplay.paused && e.autoplay.resume()
//     }
//     , 500)),
//     e.allowSlidePrev = n,
//     e.allowSlideNext = i,
//     e.params.watchOverflow && a !== e.snapGrid && e.checkOverflow()
// }
// function It(e) {
//     const s = this;
//     s.enabled && (s.allowClick || (s.params.preventClicks && e.preventDefault(),
//     s.params.preventClicksPropagation && s.animating && (e.stopPropagation(),
//     e.stopImmediatePropagation())))
// }
// function Ot() {
//     const e = this
//       , {wrapperEl: s, rtlTranslate: t, enabled: i} = e;
//     if (!i)
//         return;
//     e.previousTranslate = e.translate,
//     e.isHorizontal() ? e.translate = -s.scrollLeft : e.translate = -s.scrollTop,
//     e.translate === 0 && (e.translate = 0),
//     e.updateActiveIndex(),
//     e.updateSlidesClasses();
//     let n;
//     const a = e.maxTranslate() - e.minTranslate();
//     a === 0 ? n = 0 : n = (e.translate - e.minTranslate()) / a,
//     n !== e.progress && e.updateProgress(t ? -e.translate : e.translate),
//     e.emit("setTranslate", e.translate, !1)
// }
// function At(e) {
//     const s = this;
//     Y(s, e.target),
//     !(s.params.cssMode || s.params.slidesPerView !== "auto" && !s.params.autoHeight) && s.update()
// }
// function kt() {
//     const e = this;
//     e.documentTouchHandlerProceeded || (e.documentTouchHandlerProceeded = !0,
//     e.params.touchReleaseOnEdges && (e.el.style.touchAction = "auto"))
// }
// const Ce = (e, s) => {
//     const t = H()
//       , {params: i, el: n, wrapperEl: a, device: l} = e
//       , o = !!i.nested
//       , r = s === "on" ? "addEventListener" : "removeEventListener"
//       , c = s;
//     !n || typeof n == "string" || (t[r]("touchstart", e.onDocumentTouchStart, {
//         passive: !1,
//         capture: o
//     }),
//     n[r]("touchstart", e.onTouchStart, {
//         passive: !1
//     }),
//     n[r]("pointerdown", e.onTouchStart, {
//         passive: !1
//     }),
//     t[r]("touchmove", e.onTouchMove, {
//         passive: !1,
//         capture: o
//     }),
//     t[r]("pointermove", e.onTouchMove, {
//         passive: !1,
//         capture: o
//     }),
//     t[r]("touchend", e.onTouchEnd, {
//         passive: !0
//     }),
//     t[r]("pointerup", e.onTouchEnd, {
//         passive: !0
//     }),
//     t[r]("pointercancel", e.onTouchEnd, {
//         passive: !0
//     }),
//     t[r]("touchcancel", e.onTouchEnd, {
//         passive: !0
//     }),
//     t[r]("pointerout", e.onTouchEnd, {
//         passive: !0
//     }),
//     t[r]("pointerleave", e.onTouchEnd, {
//         passive: !0
//     }),
//     t[r]("contextmenu", e.onTouchEnd, {
//         passive: !0
//     }),
//     (i.preventClicks || i.preventClicksPropagation) && n[r]("click", e.onClick, !0),
//     i.cssMode && a[r]("scroll", e.onScroll),
//     i.updateOnWindowResize ? e[c](l.ios || l.android ? "resize orientationchange observerUpdate" : "resize observerUpdate", pe, !0) : e[c]("observerUpdate", pe, !0),
//     n[r]("load", e.onLoad, {
//         capture: !0
//     }))
// }
// ;
// function zt() {
//     const e = this
//       , {params: s} = e;
//     e.onTouchStart = Mt.bind(e),
//     e.onTouchMove = Pt.bind(e),
//     e.onTouchEnd = Lt.bind(e),
//     e.onDocumentTouchStart = kt.bind(e),
//     s.cssMode && (e.onScroll = Ot.bind(e)),
//     e.onClick = It.bind(e),
//     e.onLoad = At.bind(e),
//     Ce(e, "on")
// }
// function Dt() {
//     Ce(this, "off")
// }
// var Gt = {
//     attachEvents: zt,
//     detachEvents: Dt
// };
// const me = (e, s) => e.grid && s.grid && s.grid.rows > 1;
// function Bt() {
//     const e = this
//       , {realIndex: s, initialized: t, params: i, el: n} = e
//       , a = i.breakpoints;
//     if (!a || a && Object.keys(a).length === 0)
//         return;
//     const l = H()
//       , o = i.breakpointsBase === "window" || !i.breakpointsBase ? i.breakpointsBase : "container"
//       , r = ["window", "container"].includes(i.breakpointsBase) || !i.breakpointsBase ? e.el : l.querySelector(i.breakpointsBase)
//       , c = e.getBreakpoint(a, o, r);
//     if (!c || e.currentBreakpoint === c)
//         return;
//     const f = (c in a ? a[c] : void 0) || e.originalParams
//       , y = me(e, i)
//       , u = me(e, f)
//       , m = e.params.grabCursor
//       , v = f.grabCursor
//       , T = i.enabled;
//     y && !u ? (n.classList.remove(`${i.containerModifierClass}grid`, `${i.containerModifierClass}grid-column`),
//     e.emitContainerClasses()) : !y && u && (n.classList.add(`${i.containerModifierClass}grid`),
//     (f.grid.fill && f.grid.fill === "column" || !f.grid.fill && i.grid.fill === "column") && n.classList.add(`${i.containerModifierClass}grid-column`),
//     e.emitContainerClasses()),
//     m && !v ? e.unsetGrabCursor() : !m && v && e.setGrabCursor(),
//     ["navigation", "pagination", "scrollbar"].forEach(L => {
//         if (typeof f[L] > "u")
//             return;
//         const P = i[L] && i[L].enabled
//           , b = f[L] && f[L].enabled;
//         P && !b && e[L].disable(),
//         !P && b && e[L].enable()
//     }
//     );
//     const d = f.direction && f.direction !== i.direction
//       , p = i.loop && (f.slidesPerView !== i.slidesPerView || d)
//       , g = i.loop;
//     d && t && e.changeDirection(),
//     V(e.params, f);
//     const S = e.params.enabled
//       , x = e.params.loop;
//     Object.assign(e, {
//         allowTouchMove: e.params.allowTouchMove,
//         allowSlideNext: e.params.allowSlideNext,
//         allowSlidePrev: e.params.allowSlidePrev
//     }),
//     T && !S ? e.disable() : !T && S && e.enable(),
//     e.currentBreakpoint = c,
//     e.emit("_beforeBreakpoint", f),
//     t && (p ? (e.loopDestroy(),
//     e.loopCreate(s),
//     e.updateSlides()) : !g && x ? (e.loopCreate(s),
//     e.updateSlides()) : g && !x && e.loopDestroy()),
//     e.emit("breakpoint", f)
// }
// function $t(e, s="window", t) {
//     if (!e || s === "container" && !t)
//         return;
//     let i = !1;
//     const n = $()
//       , a = s === "window" ? n.innerHeight : t.clientHeight
//       , l = Object.keys(e).map(o => {
//         if (typeof o == "string" && o.indexOf("@") === 0) {
//             const r = parseFloat(o.substr(1));
//             return {
//                 value: a * r,
//                 point: o
//             }
//         }
//         return {
//             value: o,
//             point: o
//         }
//     }
//     );
//     l.sort( (o, r) => parseInt(o.value, 10) - parseInt(r.value, 10));
//     for (let o = 0; o < l.length; o += 1) {
//         const {point: r, value: c} = l[o];
//         s === "window" ? n.matchMedia(`(min-width: ${c}px)`).matches && (i = r) : c <= t.clientWidth && (i = r)
//     }
//     return i || "max"
// }
// var Vt = {
//     setBreakpoint: Bt,
//     getBreakpoint: $t
// };
// function Ft(e, s) {
//     const t = [];
//     return e.forEach(i => {
//         typeof i == "object" ? Object.keys(i).forEach(n => {
//             i[n] && t.push(s + n)
//         }
//         ) : typeof i == "string" && t.push(s + i)
//     }
//     ),
//     t
// }
// function _t() {
//     const e = this
//       , {classNames: s, params: t, rtl: i, el: n, device: a} = e
//       , l = Ft(["initialized", t.direction, {
//         "free-mode": e.params.freeMode && t.freeMode.enabled
//     }, {
//         autoheight: t.autoHeight
//     }, {
//         rtl: i
//     }, {
//         grid: t.grid && t.grid.rows > 1
//     }, {
//         "grid-column": t.grid && t.grid.rows > 1 && t.grid.fill === "column"
//     }, {
//         android: a.android
//     }, {
//         ios: a.ios
//     }, {
//         "css-mode": t.cssMode
//     }, {
//         centered: t.cssMode && t.centeredSlides
//     }, {
//         "watch-progress": t.watchSlidesProgress
//     }], t.containerModifierClass);
//     s.push(...l),
//     n.classList.add(...s),
//     e.emitContainerClasses()
// }
// function Nt() {
//     const e = this
//       , {el: s, classNames: t} = e;
//     !s || typeof s == "string" || (s.classList.remove(...t),
//     e.emitContainerClasses())
// }
// var Ht = {
//     addClasses: _t,
//     removeClasses: Nt
// };
// function Rt() {
//     const e = this
//       , {isLocked: s, params: t} = e
//       , {slidesOffsetBefore: i} = t;
//     if (i) {
//         const n = e.slides.length - 1
//           , a = e.slidesGrid[n] + e.slidesSizesGrid[n] + i * 2;
//         e.isLocked = e.size > a
//     } else
//         e.isLocked = e.snapGrid.length === 1;
//     t.allowSlideNext === !0 && (e.allowSlideNext = !e.isLocked),
//     t.allowSlidePrev === !0 && (e.allowSlidePrev = !e.isLocked),
//     s && s !== e.isLocked && (e.isEnd = !1),
//     s !== e.isLocked && e.emit(e.isLocked ? "lock" : "unlock")
// }
// var qt = {
//     checkOverflow: Rt
// }
//   , he = {
//     init: !0,
//     direction: "horizontal",
//     oneWayMovement: !1,
//     swiperElementNodeName: "SWIPER-CONTAINER",
//     touchEventsTarget: "wrapper",
//     initialSlide: 0,
//     speed: 300,
//     cssMode: !1,
//     updateOnWindowResize: !0,
//     resizeObserver: !0,
//     nested: !1,
//     createElements: !1,
//     eventsPrefix: "swiper",
//     enabled: !0,
//     focusableElements: "input, select, option, textarea, button, video, label",
//     width: null,
//     height: null,
//     preventInteractionOnTransition: !1,
//     userAgent: null,
//     url: null,
//     edgeSwipeDetection: !1,
//     edgeSwipeThreshold: 20,
//     autoHeight: !1,
//     setWrapperSize: !1,
//     virtualTranslate: !1,
//     effect: "slide",
//     breakpoints: void 0,
//     breakpointsBase: "window",
//     spaceBetween: 0,
//     slidesPerView: 1,
//     slidesPerGroup: 1,
//     slidesPerGroupSkip: 0,
//     slidesPerGroupAuto: !1,
//     centeredSlides: !1,
//     centeredSlidesBounds: !1,
//     slidesOffsetBefore: 0,
//     slidesOffsetAfter: 0,
//     normalizeSlideIndex: !0,
//     centerInsufficientSlides: !1,
//     watchOverflow: !0,
//     roundLengths: !1,
//     touchRatio: 1,
//     touchAngle: 45,
//     simulateTouch: !0,
//     shortSwipes: !0,
//     longSwipes: !0,
//     longSwipesRatio: .5,
//     longSwipesMs: 300,
//     followFinger: !0,
//     allowTouchMove: !0,
//     threshold: 5,
//     touchMoveStopPropagation: !1,
//     touchStartPreventDefault: !0,
//     touchStartForcePreventDefault: !1,
//     touchReleaseOnEdges: !1,
//     uniqueNavElements: !0,
//     resistance: !0,
//     resistanceRatio: .85,
//     watchSlidesProgress: !1,
//     grabCursor: !1,
//     preventClicks: !0,
//     preventClicksPropagation: !0,
//     slideToClickedSlide: !1,
//     loop: !1,
//     loopAddBlankSlides: !0,
//     loopAdditionalSlides: 0,
//     loopPreventsSliding: !0,
//     rewind: !1,
//     allowSlidePrev: !0,
//     allowSlideNext: !0,
//     swipeHandler: null,
//     noSwiping: !0,
//     noSwipingClass: "swiper-no-swiping",
//     noSwipingSelector: null,
//     passiveListeners: !0,
//     maxBackfaceHiddenSlides: 10,
//     containerModifierClass: "swiper-",
//     slideClass: "swiper-slide",
//     slideBlankClass: "swiper-slide-blank",
//     slideActiveClass: "swiper-slide-active",
//     slideVisibleClass: "swiper-slide-visible",
//     slideFullyVisibleClass: "swiper-slide-fully-visible",
//     slideNextClass: "swiper-slide-next",
//     slidePrevClass: "swiper-slide-prev",
//     wrapperClass: "swiper-wrapper",
//     lazyPreloaderClass: "swiper-lazy-preloader",
//     lazyPreloadPrevNext: 0,
//     runCallbacksOnInit: !0,
//     _emitClasses: !1
// };
// function Wt(e, s) {
//     return function(i={}) {
//         const n = Object.keys(i)[0]
//           , a = i[n];
//         if (typeof a != "object" || a === null) {
//             V(s, i);
//             return
//         }
//         if (e[n] === !0 && (e[n] = {
//             enabled: !0
//         }),
//         n === "navigation" && e[n] && e[n].enabled && !e[n].prevEl && !e[n].nextEl && (e[n].auto = !0),
//         ["pagination", "scrollbar"].indexOf(n) >= 0 && e[n] && e[n].enabled && !e[n].el && (e[n].auto = !0),
//         !(n in e && "enabled"in a)) {
//             V(s, i);
//             return
//         }
//         typeof e[n] == "object" && !("enabled"in e[n]) && (e[n].enabled = !0),
//         e[n] || (e[n] = {
//             enabled: !1
//         }),
//         V(s, i)
//     }
// }
// const ne = {
//     eventsEmitter: He,
//     update: Je,
//     translate: at,
//     transition: dt,
//     slide: vt,
//     loop: Tt,
//     grabCursor: Ct,
//     events: Gt,
//     breakpoints: Vt,
//     checkOverflow: qt,
//     classes: Ht
// }
//   , ae = {};
// class F {
//     constructor(...s) {
//         let t, i;
//         s.length === 1 && s[0].constructor && Object.prototype.toString.call(s[0]).slice(8, -1) === "Object" ? i = s[0] : [t,i] = s,
//         i || (i = {}),
//         i = V({}, i),
//         t && !i.el && (i.el = t);
//         const n = H();
//         if (i.el && typeof i.el == "string" && n.querySelectorAll(i.el).length > 1) {
//             const r = [];
//             return n.querySelectorAll(i.el).forEach(c => {
//                 const h = V({}, i, {
//                     el: c
//                 });
//                 r.push(new F(h))
//             }
//             ),
//             r
//         }
//         const a = this;
//         a.__swiper__ = !0,
//         a.support = be(),
//         a.device = Te({
//             userAgent: i.userAgent
//         }),
//         a.browser = xe(),
//         a.eventsListeners = {},
//         a.eventsAnyListeners = [],
//         a.modules = [...a.__modules__],
//         i.modules && Array.isArray(i.modules) && a.modules.push(...i.modules);
//         const l = {};
//         a.modules.forEach(r => {
//             r({
//                 params: i,
//                 swiper: a,
//                 extendParams: Wt(i, l),
//                 on: a.on.bind(a),
//                 once: a.once.bind(a),
//                 off: a.off.bind(a),
//                 emit: a.emit.bind(a)
//             })
//         }
//         );
//         const o = V({}, he, l);
//         return a.params = V({}, o, ae, i),
//         a.originalParams = V({}, a.params),
//         a.passedParams = V({}, i),
//         a.params && a.params.on && Object.keys(a.params.on).forEach(r => {
//             a.on(r, a.params.on[r])
//         }
//         ),
//         a.params && a.params.onAny && a.onAny(a.params.onAny),
//         Object.assign(a, {
//             enabled: a.params.enabled,
//             el: t,
//             classNames: [],
//             slides: [],
//             slidesGrid: [],
//             snapGrid: [],
//             slidesSizesGrid: [],
//             isHorizontal() {
//                 return a.params.direction === "horizontal"
//             },
//             isVertical() {
//                 return a.params.direction === "vertical"
//             },
//             activeIndex: 0,
//             realIndex: 0,
//             isBeginning: !0,
//             isEnd: !1,
//             translate: 0,
//             previousTranslate: 0,
//             progress: 0,
//             velocity: 0,
//             animating: !1,
//             cssOverflowAdjustment() {
//                 return Math.trunc(this.translate / 2 ** 23) * 2 ** 23
//             },
//             allowSlideNext: a.params.allowSlideNext,
//             allowSlidePrev: a.params.allowSlidePrev,
//             touchEventsData: {
//                 isTouched: void 0,
//                 isMoved: void 0,
//                 allowTouchCallbacks: void 0,
//                 touchStartTime: void 0,
//                 isScrolling: void 0,
//                 currentTranslate: void 0,
//                 startTranslate: void 0,
//                 allowThresholdMove: void 0,
//                 focusableElements: a.params.focusableElements,
//                 lastClickTime: 0,
//                 clickTimeout: void 0,
//                 velocities: [],
//                 allowMomentumBounce: void 0,
//                 startMoving: void 0,
//                 pointerId: null,
//                 touchId: null
//             },
//             allowClick: !0,
//             allowTouchMove: a.params.allowTouchMove,
//             touches: {
//                 startX: 0,
//                 startY: 0,
//                 currentX: 0,
//                 currentY: 0,
//                 diff: 0
//             },
//             imagesToLoad: [],
//             imagesLoaded: 0
//         }),
//         a.emit("_swiper"),
//         a.params.init && a.init(),
//         a
//     }
//     getDirectionLabel(s) {
//         return this.isHorizontal() ? s : {
//             width: "height",
//             "margin-top": "margin-left",
//             "margin-bottom ": "margin-right",
//             "margin-left": "margin-top",
//             "margin-right": "margin-bottom",
//             "padding-left": "padding-top",
//             "padding-right": "padding-bottom",
//             marginRight: "marginBottom"
//         }[s]
//     }
//     getSlideIndex(s) {
//         const {slidesEl: t, params: i} = this
//           , n = N(t, `.${i.slideClass}, swiper-slide`)
//           , a = Z(n[0]);
//         return Z(s) - a
//     }
//     getSlideIndexByData(s) {
//         return this.getSlideIndex(this.slides.find(t => t.getAttribute("data-swiper-slide-index") * 1 === s))
//     }
//     getSlideIndexWhenGrid(s) {
//         return this.grid && this.params.grid && this.params.grid.rows > 1 && (this.params.grid.fill === "column" ? s = Math.floor(s / this.params.grid.rows) : this.params.grid.fill === "row" && (s = s % Math.ceil(this.slides.length / this.params.grid.rows))),
//         s
//     }
//     recalcSlides() {
//         const s = this
//           , {slidesEl: t, params: i} = s;
//         s.slides = N(t, `.${i.slideClass}, swiper-slide`)
//     }
//     enable() {
//         const s = this;
//         s.enabled || (s.enabled = !0,
//         s.params.grabCursor && s.setGrabCursor(),
//         s.emit("enable"))
//     }
//     disable() {
//         const s = this;
//         s.enabled && (s.enabled = !1,
//         s.params.grabCursor && s.unsetGrabCursor(),
//         s.emit("disable"))
//     }
//     setProgress(s, t) {
//         const i = this;
//         s = Math.min(Math.max(s, 0), 1);
//         const n = i.minTranslate()
//           , l = (i.maxTranslate() - n) * s + n;
//         i.translateTo(l, typeof t > "u" ? 0 : t),
//         i.updateActiveIndex(),
//         i.updateSlidesClasses()
//     }
//     emitContainerClasses() {
//         const s = this;
//         if (!s.params._emitClasses || !s.el)
//             return;
//         const t = s.el.className.split(" ").filter(i => i.indexOf("swiper") === 0 || i.indexOf(s.params.containerModifierClass) === 0);
//         s.emit("_containerClasses", t.join(" "))
//     }
//     getSlideClasses(s) {
//         const t = this;
//         return t.destroyed ? "" : s.className.split(" ").filter(i => i.indexOf("swiper-slide") === 0 || i.indexOf(t.params.slideClass) === 0).join(" ")
//     }
//     emitSlidesClasses() {
//         const s = this;
//         if (!s.params._emitClasses || !s.el)
//             return;
//         const t = [];
//         s.slides.forEach(i => {
//             const n = s.getSlideClasses(i);
//             t.push({
//                 slideEl: i,
//                 classNames: n
//             }),
//             s.emit("_slideClass", i, n)
//         }
//         ),
//         s.emit("_slideClasses", t)
//     }
//     slidesPerViewDynamic(s="current", t=!1) {
//         const i = this
//           , {params: n, slides: a, slidesGrid: l, slidesSizesGrid: o, size: r, activeIndex: c} = i;
//         let h = 1;
//         if (typeof n.slidesPerView == "number")
//             return n.slidesPerView;
//         if (n.centeredSlides) {
//             let f = a[c] ? Math.ceil(a[c].swiperSlideSize) : 0, y;
//             for (let u = c + 1; u < a.length; u += 1)
//                 a[u] && !y && (f += Math.ceil(a[u].swiperSlideSize),
//                 h += 1,
//                 f > r && (y = !0));
//             for (let u = c - 1; u >= 0; u -= 1)
//                 a[u] && !y && (f += a[u].swiperSlideSize,
//                 h += 1,
//                 f > r && (y = !0))
//         } else if (s === "current")
//             for (let f = c + 1; f < a.length; f += 1)
//                 (t ? l[f] + o[f] - l[c] < r : l[f] - l[c] < r) && (h += 1);
//         else
//             for (let f = c - 1; f >= 0; f -= 1)
//                 l[c] - l[f] < r && (h += 1);
//         return h
//     }
//     update() {
//         const s = this;
//         if (!s || s.destroyed)
//             return;
//         const {snapGrid: t, params: i} = s;
//         i.breakpoints && s.setBreakpoint(),
//         [...s.el.querySelectorAll('[loading="lazy"]')].forEach(l => {
//             l.complete && Y(s, l)
//         }
//         ),
//         s.updateSize(),
//         s.updateSlides(),
//         s.updateProgress(),
//         s.updateSlidesClasses();
//         function n() {
//             const l = s.rtlTranslate ? s.translate * -1 : s.translate
//               , o = Math.min(Math.max(l, s.maxTranslate()), s.minTranslate());
//             s.setTranslate(o),
//             s.updateActiveIndex(),
//             s.updateSlidesClasses()
//         }
//         let a;
//         if (i.freeMode && i.freeMode.enabled && !i.cssMode)
//             n(),
//             i.autoHeight && s.updateAutoHeight();
//         else {
//             if ((i.slidesPerView === "auto" || i.slidesPerView > 1) && s.isEnd && !i.centeredSlides) {
//                 const l = s.virtual && i.virtual.enabled ? s.virtual.slides : s.slides;
//                 a = s.slideTo(l.length - 1, 0, !1, !0)
//             } else
//                 a = s.slideTo(s.activeIndex, 0, !1, !0);
//             a || n()
//         }
//         i.watchOverflow && t !== s.snapGrid && s.checkOverflow(),
//         s.emit("update")
//     }
//     changeDirection(s, t=!0) {
//         const i = this
//           , n = i.params.direction;
//         return s || (s = n === "horizontal" ? "vertical" : "horizontal"),
//         s === n || s !== "horizontal" && s !== "vertical" || (i.el.classList.remove(`${i.params.containerModifierClass}${n}`),
//         i.el.classList.add(`${i.params.containerModifierClass}${s}`),
//         i.emitContainerClasses(),
//         i.params.direction = s,
//         i.slides.forEach(a => {
//             s === "vertical" ? a.style.width = "" : a.style.height = ""
//         }
//         ),
//         i.emit("changeDirection"),
//         t && i.update()),
//         i
//     }
//     changeLanguageDirection(s) {
//         const t = this;
//         t.rtl && s === "rtl" || !t.rtl && s === "ltr" || (t.rtl = s === "rtl",
//         t.rtlTranslate = t.params.direction === "horizontal" && t.rtl,
//         t.rtl ? (t.el.classList.add(`${t.params.containerModifierClass}rtl`),
//         t.el.dir = "rtl") : (t.el.classList.remove(`${t.params.containerModifierClass}rtl`),
//         t.el.dir = "ltr"),
//         t.update())
//     }
//     mount(s) {
//         const t = this;
//         if (t.mounted)
//             return !0;
//         let i = s || t.params.el;
//         if (typeof i == "string" && (i = document.querySelector(i)),
//         !i)
//             return !1;
//         i.swiper = t,
//         i.parentNode && i.parentNode.host && i.parentNode.host.nodeName === t.params.swiperElementNodeName.toUpperCase() && (t.isElement = !0);
//         const n = () => `.${(t.params.wrapperClass || "").trim().split(" ").join(".")}`;
//         let l = i && i.shadowRoot && i.shadowRoot.querySelector ? i.shadowRoot.querySelector(n()) : N(i, n())[0];
//         return !l && t.params.createElements && (l = Q("div", t.params.wrapperClass),
//         i.append(l),
//         N(i, `.${t.params.slideClass}`).forEach(o => {
//             l.append(o)
//         }
//         )),
//         Object.assign(t, {
//             el: i,
//             wrapperEl: l,
//             slidesEl: t.isElement && !i.parentNode.host.slideSlots ? i.parentNode.host : l,
//             hostEl: t.isElement ? i.parentNode.host : i,
//             mounted: !0,
//             rtl: i.dir.toLowerCase() === "rtl" || R(i, "direction") === "rtl",
//             rtlTranslate: t.params.direction === "horizontal" && (i.dir.toLowerCase() === "rtl" || R(i, "direction") === "rtl"),
//             wrongRTL: R(l, "display") === "-webkit-box"
//         }),
//         !0
//     }
//     init(s) {
//         const t = this;
//         if (t.initialized || t.mount(s) === !1)
//             return t;
//         t.emit("beforeInit"),
//         t.params.breakpoints && t.setBreakpoint(),
//         t.addClasses(),
//         t.updateSize(),
//         t.updateSlides(),
//         t.params.watchOverflow && t.checkOverflow(),
//         t.params.grabCursor && t.enabled && t.setGrabCursor(),
//         t.params.loop && t.virtual && t.params.virtual.enabled ? t.slideTo(t.params.initialSlide + t.virtual.slidesBefore, 0, t.params.runCallbacksOnInit, !1, !0) : t.slideTo(t.params.initialSlide, 0, t.params.runCallbacksOnInit, !1, !0),
//         t.params.loop && t.loopCreate(void 0, !0),
//         t.attachEvents();
//         const n = [...t.el.querySelectorAll('[loading="lazy"]')];
//         return t.isElement && n.push(...t.hostEl.querySelectorAll('[loading="lazy"]')),
//         n.forEach(a => {
//             a.complete ? Y(t, a) : a.addEventListener("load", l => {
//                 Y(t, l.target)
//             }
//             )
//         }
//         ),
//         oe(t),
//         t.initialized = !0,
//         oe(t),
//         t.emit("init"),
//         t.emit("afterInit"),
//         t
//     }
//     destroy(s=!0, t=!0) {
//         const i = this
//           , {params: n, el: a, wrapperEl: l, slides: o} = i;
//         return typeof i.params > "u" || i.destroyed || (i.emit("beforeDestroy"),
//         i.initialized = !1,
//         i.detachEvents(),
//         n.loop && i.loopDestroy(),
//         t && (i.removeClasses(),
//         a && typeof a != "string" && a.removeAttribute("style"),
//         l && l.removeAttribute("style"),
//         o && o.length && o.forEach(r => {
//             r.classList.remove(n.slideVisibleClass, n.slideFullyVisibleClass, n.slideActiveClass, n.slideNextClass, n.slidePrevClass),
//             r.removeAttribute("style"),
//             r.removeAttribute("data-swiper-slide-index")
//         }
//         )),
//         i.emit("destroy"),
//         Object.keys(i.eventsListeners).forEach(r => {
//             i.off(r)
//         }
//         ),
//         s !== !1 && (i.el && typeof i.el != "string" && (i.el.swiper = null),
//         Ie(i)),
//         i.destroyed = !0),
//         null
//     }
//     static extendDefaults(s) {
//         V(ae, s)
//     }
//     static get extendedDefaults() {
//         return ae
//     }
//     static get defaults() {
//         return he
//     }
//     static installModule(s) {
//         F.prototype.__modules__ || (F.prototype.__modules__ = []);
//         const t = F.prototype.__modules__;
//         typeof s == "function" && t.indexOf(s) < 0 && t.push(s)
//     }
//     static use(s) {
//         return Array.isArray(s) ? (s.forEach(t => F.installModule(t)),
//         F) : (F.installModule(s),
//         F)
//     }
// }
// Object.keys(ne).forEach(e => {
//     Object.keys(ne[e]).forEach(s => {
//         F.prototype[s] = ne[e][s]
//     }
//     )
// }
// );
// F.use([_e, Ne]);
// function we(e, s, t, i) {
//     return e.params.createElements && Object.keys(i).forEach(n => {
//         if (!t[n] && t.auto === !0) {
//             let a = N(e.el, `.${i[n]}`)[0];
//             a || (a = Q("div", i[n]),
//             a.className = i[n],
//             e.el.append(a)),
//             t[n] = a,
//             s[n] = a
//         }
//     }
//     ),
//     t
// }
// const jt = '<svg class="swiper-navigation-icon" width="11" height="20" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.38296 20.0762C0.111788 19.805 0.111788 19.3654 0.38296 19.0942L9.19758 10.2796L0.38296 1.46497C0.111788 1.19379 0.111788 0.754138 0.38296 0.482966C0.654131 0.211794 1.09379 0.211794 1.36496 0.482966L10.4341 9.55214C10.8359 9.9539 10.8359 10.6053 10.4341 11.007L1.36496 20.0762C1.09379 20.3474 0.654131 20.3474 0.38296 20.0762Z" fill="currentColor"/></svg>';
// function Xt({swiper: e, extendParams: s, on: t, emit: i}) {
//     s({
//         navigation: {
//             nextEl: null,
//             prevEl: null,
//             hideOnClick: !1,
//             disabledClass: "swiper-button-disabled",
//             hiddenClass: "swiper-button-hidden",
//             lockClass: "swiper-button-lock",
//             navigationDisabledClass: "swiper-navigation-disabled"
//         }
//     }),
//     e.navigation = {
//         nextEl: null,
//         prevEl: null
//     };
//     function n(u) {
//         let m;
//         return u && typeof u == "string" && e.isElement && (m = e.el.querySelector(u) || e.hostEl.querySelector(u),
//         m) ? m : (u && (typeof u == "string" && (m = [...document.querySelectorAll(u)]),
//         e.params.uniqueNavElements && typeof u == "string" && m && m.length > 1 && e.el.querySelectorAll(u).length === 1 ? m = e.el.querySelector(u) : m && m.length === 1 && (m = m[0])),
//         u && !m ? u : m)
//     }
//     function a(u, m) {
//         const v = e.params.navigation;
//         u = B(u),
//         u.forEach(T => {
//             T && (T.classList[m ? "add" : "remove"](...v.disabledClass.split(" ")),
//             T.tagName === "BUTTON" && (T.disabled = m),
//             e.params.watchOverflow && e.enabled && T.classList[e.isLocked ? "add" : "remove"](v.lockClass))
//         }
//         )
//     }
//     function l() {
//         const {nextEl: u, prevEl: m} = e.navigation;
//         if (e.params.loop) {
//             a(m, !1),
//             a(u, !1);
//             return
//         }
//         a(m, e.isBeginning && !e.params.rewind),
//         a(u, e.isEnd && !e.params.rewind)
//     }
//     function o(u) {
//         u.preventDefault(),
//         !(e.isBeginning && !e.params.loop && !e.params.rewind) && (e.slidePrev(),
//         i("navigationPrev"))
//     }
//     function r(u) {
//         u.preventDefault(),
//         !(e.isEnd && !e.params.loop && !e.params.rewind) && (e.slideNext(),
//         i("navigationNext"))
//     }
//     function c() {
//         const u = e.params.navigation;
//         if (e.params.navigation = we(e, e.originalParams.navigation, e.params.navigation, {
//             nextEl: "swiper-button-next",
//             prevEl: "swiper-button-prev"
//         }),
//         !(u.nextEl || u.prevEl))
//             return;
//         let m = n(u.nextEl)
//           , v = n(u.prevEl);
//         Object.assign(e.navigation, {
//             nextEl: m,
//             prevEl: v
//         }),
//         m = B(m),
//         v = B(v);
//         const T = (d, p) => {
//             d && (d.matches(".swiper-button-next,.swiper-button-prev") && !d.querySelector("svg") && le(d, jt),
//             d.addEventListener("click", p === "next" ? r : o)),
//             !e.enabled && d && d.classList.add(...u.lockClass.split(" "))
//         }
//         ;
//         m.forEach(d => T(d, "next")),
//         v.forEach(d => T(d, "prev"))
//     }
//     function h() {
//         let {nextEl: u, prevEl: m} = e.navigation;
//         u = B(u),
//         m = B(m);
//         const v = (T, d) => {
//             T.removeEventListener("click", d === "next" ? r : o),
//             T.classList.remove(...e.params.navigation.disabledClass.split(" "))
//         }
//         ;
//         u.forEach(T => v(T, "next")),
//         m.forEach(T => v(T, "prev"))
//     }
//     t("init", () => {
//         e.params.navigation.enabled === !1 ? y() : (c(),
//         l())
//     }
//     ),
//     t("toEdge fromEdge lock unlock", () => {
//         l()
//     }
//     ),
//     t("destroy", () => {
//         h()
//     }
//     ),
//     t("enable disable", () => {
//         let {nextEl: u, prevEl: m} = e.navigation;
//         if (u = B(u),
//         m = B(m),
//         e.enabled) {
//             l();
//             return
//         }
//         [...u, ...m].filter(v => !!v).forEach(v => v.classList.add(e.params.navigation.lockClass))
//     }
//     ),
//     t("click", (u, m) => {
//         let {nextEl: v, prevEl: T} = e.navigation;
//         v = B(v),
//         T = B(T);
//         const d = m.target;
//         let p = T.includes(d) || v.includes(d);
//         if (e.isElement && !p) {
//             const g = m.path || m.composedPath && m.composedPath();
//             g && (p = g.find(S => v.includes(S) || T.includes(S)))
//         }
//         if (e.params.navigation.hideOnClick && !p) {
//             if (e.pagination && e.params.pagination && e.params.pagination.clickable && (e.pagination.el === d || e.pagination.el.contains(d)))
//                 return;
//             let g;
//             v.length ? g = v[0].classList.contains(e.params.navigation.hiddenClass) : T.length && (g = T[0].classList.contains(e.params.navigation.hiddenClass)),
//             i(g === !0 ? "navigationShow" : "navigationHide"),
//             [...v, ...T].filter(S => !!S).forEach(S => S.classList.toggle(e.params.navigation.hiddenClass))
//         }
//     }
//     );
//     const f = () => {
//         e.el.classList.remove(...e.params.navigation.navigationDisabledClass.split(" ")),
//         c(),
//         l()
//     }
//       , y = () => {
//         e.el.classList.add(...e.params.navigation.navigationDisabledClass.split(" ")),
//         h()
//     }
//     ;
//     Object.assign(e.navigation, {
//         enable: f,
//         disable: y,
//         update: l,
//         init: c,
//         destroy: h
//     })
// }
// function q(e="") {
//     return `.${e.trim().replace(/([\.:!+\/()[\]])/g, "\\$1").replace(/ /g, ".")}`
// }
// function Yt({swiper: e, extendParams: s, on: t, emit: i}) {
//     const n = "swiper-pagination";
//     s({
//         pagination: {
//             el: null,
//             bulletElement: "span",
//             clickable: !1,
//             hideOnClick: !1,
//             renderBullet: null,
//             renderProgressbar: null,
//             renderFraction: null,
//             renderCustom: null,
//             progressbarOpposite: !1,
//             type: "bullets",
//             dynamicBullets: !1,
//             dynamicMainBullets: 1,
//             formatFractionCurrent: d => d,
//             formatFractionTotal: d => d,
//             bulletClass: `${n}-bullet`,
//             bulletActiveClass: `${n}-bullet-active`,
//             modifierClass: `${n}-`,
//             currentClass: `${n}-current`,
//             totalClass: `${n}-total`,
//             hiddenClass: `${n}-hidden`,
//             progressbarFillClass: `${n}-progressbar-fill`,
//             progressbarOppositeClass: `${n}-progressbar-opposite`,
//             clickableClass: `${n}-clickable`,
//             lockClass: `${n}-lock`,
//             horizontalClass: `${n}-horizontal`,
//             verticalClass: `${n}-vertical`,
//             paginationDisabledClass: `${n}-disabled`
//         }
//     }),
//     e.pagination = {
//         el: null,
//         bullets: []
//     };
//     let a, l = 0;
//     function o() {
//         return !e.params.pagination.el || !e.pagination.el || Array.isArray(e.pagination.el) && e.pagination.el.length === 0
//     }
//     function r(d, p) {
//         const {bulletActiveClass: g} = e.params.pagination;
//         d && (d = d[`${p === "prev" ? "previous" : "next"}ElementSibling`],
//         d && (d.classList.add(`${g}-${p}`),
//         d = d[`${p === "prev" ? "previous" : "next"}ElementSibling`],
//         d && d.classList.add(`${g}-${p}-${p}`)))
//     }
//     function c(d, p, g) {
//         if (d = d % g,
//         p = p % g,
//         p === d + 1)
//             return "next";
//         if (p === d - 1)
//             return "previous"
//     }
//     function h(d) {
//         const p = d.target.closest(q(e.params.pagination.bulletClass));
//         if (!p)
//             return;
//         d.preventDefault();
//         const g = Z(p) * e.params.slidesPerGroup;
//         if (e.params.loop) {
//             if (e.realIndex === g)
//                 return;
//             const S = c(e.realIndex, g, e.slides.length);
//             S === "next" ? e.slideNext() : S === "previous" ? e.slidePrev() : e.slideToLoop(g)
//         } else
//             e.slideTo(g)
//     }
//     function f() {
//         const d = e.rtl
//           , p = e.params.pagination;
//         if (o())
//             return;
//         let g = e.pagination.el;
//         g = B(g);
//         let S, x;
//         const L = e.virtual && e.params.virtual.enabled ? e.virtual.slides.length : e.slides.length
//           , P = e.params.loop ? Math.ceil(L / e.params.slidesPerGroup) : e.snapGrid.length;
//         if (e.params.loop ? (x = e.previousRealIndex || 0,
//         S = e.params.slidesPerGroup > 1 ? Math.floor(e.realIndex / e.params.slidesPerGroup) : e.realIndex) : typeof e.snapIndex < "u" ? (S = e.snapIndex,
//         x = e.previousSnapIndex) : (x = e.previousIndex || 0,
//         S = e.activeIndex || 0),
//         p.type === "bullets" && e.pagination.bullets && e.pagination.bullets.length > 0) {
//             const b = e.pagination.bullets;
//             let I, E, C;
//             if (p.dynamicBullets && (a = re(b[0], e.isHorizontal() ? "width" : "height"),
//             g.forEach(w => {
//                 w.style[e.isHorizontal() ? "width" : "height"] = `${a * (p.dynamicMainBullets + 4)}px`
//             }
//             ),
//             p.dynamicMainBullets > 1 && x !== void 0 && (l += S - (x || 0),
//             l > p.dynamicMainBullets - 1 ? l = p.dynamicMainBullets - 1 : l < 0 && (l = 0)),
//             I = Math.max(S - l, 0),
//             E = I + (Math.min(b.length, p.dynamicMainBullets) - 1),
//             C = (E + I) / 2),
//             b.forEach(w => {
//                 const A = [...["", "-next", "-next-next", "-prev", "-prev-prev", "-main"].map(z => `${p.bulletActiveClass}${z}`)].map(z => typeof z == "string" && z.includes(" ") ? z.split(" ") : z).flat();
//                 w.classList.remove(...A)
//             }
//             ),
//             g.length > 1)
//                 b.forEach(w => {
//                     const A = Z(w);
//                     A === S ? w.classList.add(...p.bulletActiveClass.split(" ")) : e.isElement && w.setAttribute("part", "bullet"),
//                     p.dynamicBullets && (A >= I && A <= E && w.classList.add(...`${p.bulletActiveClass}-main`.split(" ")),
//                     A === I && r(w, "prev"),
//                     A === E && r(w, "next"))
//                 }
//                 );
//             else {
//                 const w = b[S];
//                 if (w && w.classList.add(...p.bulletActiveClass.split(" ")),
//                 e.isElement && b.forEach( (A, z) => {
//                     A.setAttribute("part", z === S ? "bullet-active" : "bullet")
//                 }
//                 ),
//                 p.dynamicBullets) {
//                     const A = b[I]
//                       , z = b[E];
//                     for (let G = I; G <= E; G += 1)
//                         b[G] && b[G].classList.add(...`${p.bulletActiveClass}-main`.split(" "));
//                     r(A, "prev"),
//                     r(z, "next")
//                 }
//             }
//             if (p.dynamicBullets) {
//                 const w = Math.min(b.length, p.dynamicMainBullets + 4)
//                   , A = (a * w - a) / 2 - C * a
//                   , z = d ? "right" : "left";
//                 b.forEach(G => {
//                     G.style[e.isHorizontal() ? z : "top"] = `${A}px`
//                 }
//                 )
//             }
//         }
//         g.forEach( (b, I) => {
//             if (p.type === "fraction" && (b.querySelectorAll(q(p.currentClass)).forEach(E => {
//                 E.textContent = p.formatFractionCurrent(S + 1)
//             }
//             ),
//             b.querySelectorAll(q(p.totalClass)).forEach(E => {
//                 E.textContent = p.formatFractionTotal(P)
//             }
//             )),
//             p.type === "progressbar") {
//                 let E;
//                 p.progressbarOpposite ? E = e.isHorizontal() ? "vertical" : "horizontal" : E = e.isHorizontal() ? "horizontal" : "vertical";
//                 const C = (S + 1) / P;
//                 let w = 1
//                   , A = 1;
//                 E === "horizontal" ? w = C : A = C,
//                 b.querySelectorAll(q(p.progressbarFillClass)).forEach(z => {
//                     z.style.transform = `translate3d(0,0,0) scaleX(${w}) scaleY(${A})`,
//                     z.style.transitionDuration = `${e.params.speed}ms`
//                 }
//                 )
//             }
//             p.type === "custom" && p.renderCustom ? (le(b, p.renderCustom(e, S + 1, P)),
//             I === 0 && i("paginationRender", b)) : (I === 0 && i("paginationRender", b),
//             i("paginationUpdate", b)),
//             e.params.watchOverflow && e.enabled && b.classList[e.isLocked ? "add" : "remove"](p.lockClass)
//         }
//         )
//     }
//     function y() {
//         const d = e.params.pagination;
//         if (o())
//             return;
//         const p = e.virtual && e.params.virtual.enabled ? e.virtual.slides.length : e.grid && e.params.grid.rows > 1 ? e.slides.length / Math.ceil(e.params.grid.rows) : e.slides.length;
//         let g = e.pagination.el;
//         g = B(g);
//         let S = "";
//         if (d.type === "bullets") {
//             let x = e.params.loop ? Math.ceil(p / e.params.slidesPerGroup) : e.snapGrid.length;
//             e.params.freeMode && e.params.freeMode.enabled && x > p && (x = p);
//             for (let L = 0; L < x; L += 1)
//                 d.renderBullet ? S += d.renderBullet.call(e, L, d.bulletClass) : S += `<${d.bulletElement} ${e.isElement ? 'part="bullet"' : ""} class="${d.bulletClass}"></${d.bulletElement}>`
//         }
//         d.type === "fraction" && (d.renderFraction ? S = d.renderFraction.call(e, d.currentClass, d.totalClass) : S = `<span class="${d.currentClass}"></span> / <span class="${d.totalClass}"></span>`),
//         d.type === "progressbar" && (d.renderProgressbar ? S = d.renderProgressbar.call(e, d.progressbarFillClass) : S = `<span class="${d.progressbarFillClass}"></span>`),
//         e.pagination.bullets = [],
//         g.forEach(x => {
//             d.type !== "custom" && le(x, S || ""),
//             d.type === "bullets" && e.pagination.bullets.push(...x.querySelectorAll(q(d.bulletClass)))
//         }
//         ),
//         d.type !== "custom" && i("paginationRender", g[0])
//     }
//     function u() {
//         e.params.pagination = we(e, e.originalParams.pagination, e.params.pagination, {
//             el: "swiper-pagination"
//         });
//         const d = e.params.pagination;
//         if (!d.el)
//             return;
//         let p;
//         typeof d.el == "string" && e.isElement && (p = e.el.querySelector(d.el)),
//         !p && typeof d.el == "string" && (p = [...document.querySelectorAll(d.el)]),
//         p || (p = d.el),
//         !(!p || p.length === 0) && (e.params.uniqueNavElements && typeof d.el == "string" && Array.isArray(p) && p.length > 1 && (p = [...e.el.querySelectorAll(d.el)],
//         p.length > 1 && (p = p.find(g => Se(g, ".swiper")[0] === e.el))),
//         Array.isArray(p) && p.length === 1 && (p = p[0]),
//         Object.assign(e.pagination, {
//             el: p
//         }),
//         p = B(p),
//         p.forEach(g => {
//             d.type === "bullets" && d.clickable && g.classList.add(...(d.clickableClass || "").split(" ")),
//             g.classList.add(d.modifierClass + d.type),
//             g.classList.add(e.isHorizontal() ? d.horizontalClass : d.verticalClass),
//             d.type === "bullets" && d.dynamicBullets && (g.classList.add(`${d.modifierClass}${d.type}-dynamic`),
//             l = 0,
//             d.dynamicMainBullets < 1 && (d.dynamicMainBullets = 1)),
//             d.type === "progressbar" && d.progressbarOpposite && g.classList.add(d.progressbarOppositeClass),
//             d.clickable && g.addEventListener("click", h),
//             e.enabled || g.classList.add(d.lockClass)
//         }
//         ))
//     }
//     function m() {
//         const d = e.params.pagination;
//         if (o())
//             return;
//         let p = e.pagination.el;
//         p && (p = B(p),
//         p.forEach(g => {
//             g.classList.remove(d.hiddenClass),
//             g.classList.remove(d.modifierClass + d.type),
//             g.classList.remove(e.isHorizontal() ? d.horizontalClass : d.verticalClass),
//             d.clickable && (g.classList.remove(...(d.clickableClass || "").split(" ")),
//             g.removeEventListener("click", h))
//         }
//         )),
//         e.pagination.bullets && e.pagination.bullets.forEach(g => g.classList.remove(...d.bulletActiveClass.split(" ")))
//     }
//     t("changeDirection", () => {
//         if (!e.pagination || !e.pagination.el)
//             return;
//         const d = e.params.pagination;
//         let {el: p} = e.pagination;
//         p = B(p),
//         p.forEach(g => {
//             g.classList.remove(d.horizontalClass, d.verticalClass),
//             g.classList.add(e.isHorizontal() ? d.horizontalClass : d.verticalClass)
//         }
//         )
//     }
//     ),
//     t("init", () => {
//         e.params.pagination.enabled === !1 ? T() : (u(),
//         y(),
//         f())
//     }
//     ),
//     t("activeIndexChange", () => {
//         typeof e.snapIndex > "u" && f()
//     }
//     ),
//     t("snapIndexChange", () => {
//         f()
//     }
//     ),
//     t("snapGridLengthChange", () => {
//         y(),
//         f()
//     }
//     ),
//     t("destroy", () => {
//         m()
//     }
//     ),
//     t("enable disable", () => {
//         let {el: d} = e.pagination;
//         d && (d = B(d),
//         d.forEach(p => p.classList[e.enabled ? "remove" : "add"](e.params.pagination.lockClass)))
//     }
//     ),
//     t("lock unlock", () => {
//         f()
//     }
//     ),
//     t("click", (d, p) => {
//         const g = p.target
//           , S = B(e.pagination.el);
//         if (e.params.pagination.el && e.params.pagination.hideOnClick && S && S.length > 0 && !g.classList.contains(e.params.pagination.bulletClass)) {
//             if (e.navigation && (e.navigation.nextEl && g === e.navigation.nextEl || e.navigation.prevEl && g === e.navigation.prevEl))
//                 return;
//             const x = S[0].classList.contains(e.params.pagination.hiddenClass);
//             i(x === !0 ? "paginationShow" : "paginationHide"),
//             S.forEach(L => L.classList.toggle(e.params.pagination.hiddenClass))
//         }
//     }
//     );
//     const v = () => {
//         e.el.classList.remove(e.params.pagination.paginationDisabledClass);
//         let {el: d} = e.pagination;
//         d && (d = B(d),
//         d.forEach(p => p.classList.remove(e.params.pagination.paginationDisabledClass))),
//         u(),
//         y(),
//         f()
//     }
//       , T = () => {
//         e.el.classList.add(e.params.pagination.paginationDisabledClass);
//         let {el: d} = e.pagination;
//         d && (d = B(d),
//         d.forEach(p => p.classList.add(e.params.pagination.paginationDisabledClass))),
//         m()
//     }
//     ;
//     Object.assign(e.pagination, {
//         enable: v,
//         disable: T,
//         render: y,
//         update: f,
//         init: u,
//         destroy: m
//     })
// }
// function Ut({swiper: e, extendParams: s, on: t, emit: i, params: n}) {
//     e.autoplay = {
//         running: !1,
//         paused: !1,
//         timeLeft: 0
//     },
//     s({
//         autoplay: {
//             enabled: !1,
//             delay: 3e3,
//             waitForTransition: !0,
//             disableOnInteraction: !1,
//             stopOnLastSlide: !1,
//             reverseDirection: !1,
//             pauseOnMouseEnter: !1
//         }
//     });
//     let a, l, o = n && n.autoplay ? n.autoplay.delay : 3e3, r = n && n.autoplay ? n.autoplay.delay : 3e3, c, h = new Date().getTime(), f, y, u, m, v, T, d;
//     function p(O) {
//         !e || e.destroyed || !e.wrapperEl || O.target === e.wrapperEl && (e.wrapperEl.removeEventListener("transitionend", p),
//         !(d || O.detail && O.detail.bySwiperTouchMove) && I())
//     }
//     const g = () => {
//         if (e.destroyed || !e.autoplay.running)
//             return;
//         e.autoplay.paused ? f = !0 : f && (r = c,
//         f = !1);
//         const O = e.autoplay.paused ? c : h + r - new Date().getTime();
//         e.autoplay.timeLeft = O,
//         i("autoplayTimeLeft", O, O / o),
//         l = requestAnimationFrame( () => {
//             g()
//         }
//         )
//     }
//       , S = () => {
//         let O;
//         return e.virtual && e.params.virtual.enabled ? O = e.slides.find(k => k.classList.contains("swiper-slide-active")) : O = e.slides[e.activeIndex],
//         O ? parseInt(O.getAttribute("data-swiper-autoplay"), 10) : void 0
//     }
//       , x = O => {
//         if (e.destroyed || !e.autoplay.running)
//             return;
//         cancelAnimationFrame(l),
//         g();
//         let M = typeof O > "u" ? e.params.autoplay.delay : O;
//         o = e.params.autoplay.delay,
//         r = e.params.autoplay.delay;
//         const k = S();
//         !Number.isNaN(k) && k > 0 && typeof O > "u" && (M = k,
//         o = k,
//         r = k),
//         c = M;
//         const D = e.params.speed
//           , _ = () => {
//             !e || e.destroyed || (e.params.autoplay.reverseDirection ? !e.isBeginning || e.params.loop || e.params.rewind ? (e.slidePrev(D, !0, !0),
//             i("autoplay")) : e.params.autoplay.stopOnLastSlide || (e.slideTo(e.slides.length - 1, D, !0, !0),
//             i("autoplay")) : !e.isEnd || e.params.loop || e.params.rewind ? (e.slideNext(D, !0, !0),
//             i("autoplay")) : e.params.autoplay.stopOnLastSlide || (e.slideTo(0, D, !0, !0),
//             i("autoplay")),
//             e.params.cssMode && (h = new Date().getTime(),
//             requestAnimationFrame( () => {
//                 x()
//             }
//             )))
//         }
//         ;
//         return M > 0 ? (clearTimeout(a),
//         a = setTimeout( () => {
//             _()
//         }
//         , M)) : requestAnimationFrame( () => {
//             _()
//         }
//         ),
//         M
//     }
//       , L = () => {
//         h = new Date().getTime(),
//         e.autoplay.running = !0,
//         x(),
//         i("autoplayStart")
//     }
//       , P = () => {
//         e.autoplay.running = !1,
//         clearTimeout(a),
//         cancelAnimationFrame(l),
//         i("autoplayStop")
//     }
//       , b = (O, M) => {
//         if (e.destroyed || !e.autoplay.running)
//             return;
//         clearTimeout(a),
//         O || (T = !0);
//         const k = () => {
//             i("autoplayPause"),
//             e.params.autoplay.waitForTransition ? e.wrapperEl.addEventListener("transitionend", p) : I()
//         }
//         ;
//         if (e.autoplay.paused = !0,
//         M) {
//             v && (c = e.params.autoplay.delay),
//             v = !1,
//             k();
//             return
//         }
//         c = (c || e.params.autoplay.delay) - (new Date().getTime() - h),
//         !(e.isEnd && c < 0 && !e.params.loop) && (c < 0 && (c = 0),
//         k())
//     }
//       , I = () => {
//         e.isEnd && c < 0 && !e.params.loop || e.destroyed || !e.autoplay.running || (h = new Date().getTime(),
//         T ? (T = !1,
//         x(c)) : x(),
//         e.autoplay.paused = !1,
//         i("autoplayResume"))
//     }
//       , E = () => {
//         if (e.destroyed || !e.autoplay.running)
//             return;
//         const O = H();
//         O.visibilityState === "hidden" && (T = !0,
//         b(!0)),
//         O.visibilityState === "visible" && I()
//     }
//       , C = O => {
//         O.pointerType === "mouse" && (T = !0,
//         d = !0,
//         !(e.animating || e.autoplay.paused) && b(!0))
//     }
//       , w = O => {
//         O.pointerType === "mouse" && (d = !1,
//         e.autoplay.paused && I())
//     }
//       , A = () => {
//         e.params.autoplay.pauseOnMouseEnter && (e.el.addEventListener("pointerenter", C),
//         e.el.addEventListener("pointerleave", w))
//     }
//       , z = () => {
//         e.el && typeof e.el != "string" && (e.el.removeEventListener("pointerenter", C),
//         e.el.removeEventListener("pointerleave", w))
//     }
//       , G = () => {
//         H().addEventListener("visibilitychange", E)
//     }
//       , W = () => {
//         H().removeEventListener("visibilitychange", E)
//     }
//     ;
//     t("init", () => {
//         e.params.autoplay.enabled && (A(),
//         G(),
//         L())
//     }
//     ),
//     t("destroy", () => {
//         z(),
//         W(),
//         e.autoplay.running && P()
//     }
//     ),
//     t("_freeModeStaticRelease", () => {
//         (u || T) && I()
//     }
//     ),
//     t("_freeModeNoMomentumRelease", () => {
//         e.params.autoplay.disableOnInteraction ? P() : b(!0, !0)
//     }
//     ),
//     t("beforeTransitionStart", (O, M, k) => {
//         e.destroyed || !e.autoplay.running || (k || !e.params.autoplay.disableOnInteraction ? b(!0, !0) : P())
//     }
//     ),
//     t("sliderFirstMove", () => {
//         if (!(e.destroyed || !e.autoplay.running)) {
//             if (e.params.autoplay.disableOnInteraction) {
//                 P();
//                 return
//             }
//             y = !0,
//             u = !1,
//             T = !1,
//             m = setTimeout( () => {
//                 T = !0,
//                 u = !0,
//                 b(!0)
//             }
//             , 200)
//         }
//     }
//     ),
//     t("touchEnd", () => {
//         if (!(e.destroyed || !e.autoplay.running || !y)) {
//             if (clearTimeout(m),
//             clearTimeout(a),
//             e.params.autoplay.disableOnInteraction) {
//                 u = !1,
//                 y = !1;
//                 return
//             }
//             u && e.params.cssMode && I(),
//             u = !1,
//             y = !1
//         }
//     }
//     ),
//     t("slideChange", () => {
//         e.destroyed || !e.autoplay.running || (v = !0)
//     }
//     ),
//     Object.assign(e.autoplay, {
//         start: L,
//         stop: P,
//         pause: b,
//         resume: I
//     })
// }
// function Kt({swiper: e, on: s, extendParams: t}) {
//     t({
//         carouselEffect: {
//             opacityStep: .33,
//             scaleStep: .2,
//             sideSlides: 2
//         }
//     }),
//     s("beforeInit", () => {
//         if (e.params.effect !== "carousel")
//             return;
//         e.classNames.push(`${e.params.containerModifierClass}carousel`);
//         const i = {
//             watchSlidesProgress: !0,
//             centeredSlides: !0
//         };
//         Object.assign(e.params, i),
//         Object.assign(e.originalParams, i)
//     }
//     ),
//     s("progress", () => {
//         if (e.params.effect !== "carousel")
//             return;
//         const {scaleStep: i, opacityStep: n} = e.params.carouselEffect
//           , a = Math.max(Math.min(e.params.carouselEffect.sideSlides, 3), 1)
//           , l = {
//             1: 2,
//             2: 1,
//             3: .2
//         }[a]
//           , o = {
//             1: 50,
//             2: 50,
//             3: 67
//         }[a]
//           , r = e.slides.length;
//         for (let c = 0; c < e.slides.length; c += 1) {
//             const h = e.slides[c]
//               , f = e.slides[c].progress
//               , y = Math.abs(f);
//             let u = 1;
//             y > 1 && (u = (y - 1) * .3 * l + 1);
//             const m = h.querySelectorAll(".swiper-carousel-animate-opacity")
//               , v = `${f * u * o * (e.rtlTranslate ? -1 : 1)}%`
//               , T = 1 - y * i
//               , d = r - Math.abs(Math.round(f));
//             h.style.transform = `translateX(${v}) scale(${T})`,
//             h.style.zIndex = d,
//             y > a + 1 ? h.style.opacity = 0 : h.style.opacity = 1,
//             m.forEach(p => {
//                 p.style.opacity = 1 - y * n
//             }
//             )
//         }
//     }
//     ),
//     s("resize", () => {
//         e.virtual && e.params.virtual && e.params.virtual.enabled && requestAnimationFrame( () => {
//             e.destroyed || (e.updateSlides(),
//             e.updateProgress())
//         }
//         )
//     }
//     ),
//     s("setTransition", (i, n) => {
//         if (e.params.effect === "carousel")
//             for (let a = 0; a < e.slides.length; a += 1) {
//                 const l = e.slides[a]
//                   , o = l.querySelectorAll(".swiper-carousel-animate-opacity");
//                 l.style.transitionDuration = `${n}ms`,
//                 o.forEach(r => {
//                     r.style.transitionDuration = `${n}ms`
//                 }
//                 )
//             }
//     }
//     )
// }
// new F(".swiper",{
//     modules: [Ut, Xt, Yt, Kt],
//     effect: "carousel",
//     carouselEffect: {
//         opacityStep: .33,
//         scaleStep: .2,
//         sideSlides: 2
//     },
//     grabCursor: !0,
//     loop: !0,
//     loopAdditionalSlides: 1,
//     slidesPerView: "auto",
//     navigation: {
//         nextEl: ".swiper-button-next",
//         prevEl: ".swiper-button-prev"
//     },
//     pagination: {
//         el: ".swiper-pagination"
//     },
//     autoplay: {
//         delay: 3e3
//     }
// });
