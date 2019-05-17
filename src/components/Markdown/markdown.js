/**
 * 对于生成目录，考虑的情况为：标题并不是按顺序写的。
 * 也就是说，顺序是乱的：开局一个二级标题，接下来就是五级标题，三级标题这样。
 *
 * （目前个人认为）可完美生成 markdown 文件的 toc 目录的 HTML 代码。
 *
 * 根据 marked.js 源码导出了 heading 的 tokens，再用（完全是自己的逻辑~） tocTokens2HTML() 导出 tocHTML。联系点就是 tokens。
 * 可选是否生成目录，如果不生成则基本就是直接调用 marked.js（不过没提供外部更改的配置的途径0.0）。
 */

import marked from "marked"

let renderer = new marked.Renderer()

/**
 * 新增属性 tocTokens，存放 toc 的 token 数据，比如：[{text: "一级标题", level: 1, anchor: "一级标题"}]
 * toc 指目录，且 marked.js 源码中将解析数据均推入 tokens 数组，故取名为 tocTokens。
 */
renderer.tocTokens = []

/**
 * 重新配置 heading。
 *
 * 若在调用时，传入 renderer，请将 renderer 的 heading 加入，
 * 请务必将 {text, level, anchor} 推入 tocTokens 数组，id="${anchor}" ：用于生成 toc
 * 且 class 需配置 "markdown-body-anchor"：用于联动高亮 toc
 *
 * @param text
 * @param level
 * @param raw
 * @param slugger
 * @returns {string}
 */
renderer.heading = function (text, level, raw, slugger) {
  /**
   * 超强！之前没看源码，自己确定锚点唯一性是靠顺序（ toc 数组的长度）。
   * 这次发现自己欠缺很多考虑，slugger.slug有很多数据预处理，并提供了锚点唯一值。
   * 用模板字面量精简了代码，此外结合个人需求，添加了 push() 部分。
   */
  if (this.options.headerIds) {
    // 遵循 options，如果 headerIds = false，也没必要制作 toc 了
    let anchor = this.options.headerPrefix + slugger.slug(raw)
    this.tocTokens.push({text, level, anchor})
    /**
     * 2019-05-02
     *
     * 因为将导航的跳转由 scrollIntoView 改为 a 标签锚点跳转了，
     * 所以去掉之前加在每个 id 的前面的 '#'，更加符合 URL 语义吧，RESTFul。
     */
    return `<h${level} id="${anchor}" class="markdown-body-anchor">${text}</h${level}>`
  }
  // ignore IDs
  return `<h${level}>${text}</h${level}>`
}

/**
 * 默认配置，可在调用时更改。
 *
 * 但更改 renderer 时请注意，如果需要生成 toc，请查阅前方 renderer.heading。
 * highlight 注册了指令，故未在设置中；如果需要，可采用指令方式或者自行修改。
 */
marked.setOptions({
  renderer: renderer,
  headerPrefix: 'md' //markdown 简写，稳妥起见还是加上前缀
})

/**
 * 输入： toc 的 token 数据。
 * 输出： toc 的 HTML 格式。
 *
 * @param tokens {Array}
 * @returns html {String}
 */
function tocTokens2HTML(tokens) {
  // 数据初始化
  let html = "<ul>", // toc 的 HTMl 内容，最终返回 html 字符串。
    index = 0,  // 为 tokens 数组的第几个
    level = 1,// 当前第几层，最小为 1，{text: "一级标题", level: 1, anchor: "一级标题"}
    levelStack = ['</ul>'] // 闭合标签栈

  /**
   * 逻辑：
   * [index].level==当前level：栈顶如果是</li>，则弹出栈；输入<li>+text；推</li>入栈；index++。
   * [index].level>当前level：如果栈顶是</ul>，则输入<li><ul>，推</li>入栈，推</ul>入栈；如果栈顶不是</ul>，则输入<ul>，推</ul>入栈；level++。
   * [index].level<当前level：弹出 [(当前level-匹配level) * 2+1] 个值出栈；level=[index].level。
   * index 达到最大，栈内数据全弹出。
   */
  let tokensLength = tokens.length
  while (index < tokensLength) {
    // 还有数据未匹配成功
    if (tokens[index].level == level) {
      /**
       * 层数相等就是成功匹配了。
       */
      if (levelStack[levelStack.length - 1] == '</li>') {
        /**
         * 此时栈顶如果是 “</li>”，此时为同级数据，需要弹出 </li>。
         */
        html += levelStack.pop() // html += '</li>'
      }
      /**
       * 2019-05-02
       *
       * 改为 <a> 标签进行跳转，点击时会自动更改 URL 地址，
       * 可以直接复制分享，通过文章 URL 地址直接跳转到目标位置。
       */
      // html += `<li><p onclick="document.getElementById('#${tokens[index].anchor}').scrollIntoView({behavior:'smooth', block: 'start', inline: 'nearest'})">${tokens[index].text}</p>`
      html += `<li><a href="#${tokens[index].anchor}">${tokens[index].text}</a>`

      levelStack.push(`</li>`)
      index++
    } else if (tokens[index].level > level) {
      /**
       * 如果大于，则需要继续深入。
       * 也就是说当前标题直接为更小的标题，比如当前按书顺序该为二级标题，但你直接跳到了三级、四级等标题
       */
      if (levelStack[levelStack.length - 1] == '</ul>') {
        html += `<li><ul>`
        levelStack.push(`</li>`)
        levelStack.push(`</ul>`)
      } else {
        html += `<ul>`
        levelStack.push('</ul>')
      }
      level++
    } else {
      /**
       * 如果小于，就该部分返回。
       * 也就是说该打上部分的闭合标签了。
       * 需要返回的个数：(level - tokens[index].level) * 2 + 1
       */
      for (let i = (level - tokens[index].level) * 2 + 1; i > 0; i--) {
        html += levelStack.pop()
      }
      level = tokens[index].level
    }
  }
  /**
   * 此时 tokens 数组内数据全部匹配完成，则栈中内容全部弹出。
   */
  for (let i = levelStack.length; i > 0; i--) {
    html += levelStack.pop()
  }
  return html
}

/**
 * 联动链，用于对应目录标题：高亮显示、处于可视范围内。
 *
 * 关键点：
 * 因为生成的 mdHTML 的标题数，与 tocHTML 的标题数相等，
 * 所以只需要一个监听，按照规则进行数值增减即可。
 *
 * 待完善：需要根据 URL 来初始化 index
 *
 * @returns {{length: number, index: number, anchors: Array, tocs: Array, scroll: scroll}}
 */
let chain = function () {
  return {
    length: 0, // 一共几个标题
    index: 0, // 目前是第几个标题
    anchors: [], // markdown-body anchor 的 HTMLCollection
    tocs: [], // markdown-toc 的 HTMLCollection
    tocDOM: null, // markdown-toc 的 DOM，用于控制 toc 的滚动条滚动，使高亮标签处于可视范围
    scroll: scroll // 监听页面函数，用于切换高亮标题，需要自行设置
  }
}

/**
 * 初始化联动链
 *
 * @param e 能够获取到 chain
 * @param a 绑定 mdHTML 的 dom
 * @param t 绑定 tocHTML 的 dom
 */
function init(e, a, t) {
  e.chain.anchors = document.getElementById(a).getElementsByClassName("markdown-body-anchor")
  e.chain.tocDOM = document.getElementById(t)
  e.chain.tocs = e.chain.tocDOM.getElementsByTagName('a')
  e.chain.length = e.chain.tocs.length
  e.chain.tocs[e.chain.index].style.color = "#0099ff"
  /**
   * 因为我使用的是 Vuetify，直接用 v-Scroll 指令就监听了，离开自动移除，所以此段注释掉了。
   * 请自行加入监听，有需要则在离开页面时再移除监听。
   */
  window.addEventListener("scroll", function () {
    e.chain.scroll()
  })
}

/**
 * 监听页面函数，用于切换高亮标题
 */
function scroll() {
  // 只是读取用 [name] 即可，写需要使用 this.[name]。
  let anchors = this.anchors,
    index = this.index,
    length = this.length,
    tocs = this.tocs

  function top(e) {
    return e.getBoundingClientRect().top
  }

  /**
   * 可使用此句输出查看数值变化
   */
  // console.log(anchors[index-1].getBoundingClientRect().top, anchors[index].innerHTML, anchors[index].getBoundingClientRect().top, anchors[index+1].getBoundingClientRect().top)

  /**
   * 规则：distance = 30
   * 上一个： [index].top > distance
   * 此条：  [index-1].top < distance && [index].top < distance
   * 下一个：[index+1].top > distance
   * */
  let distance = 30 // 增加切换为下一条的距离，减小切换为上一条的距离
  if (top(anchors[index]) < distance) {
    // 如果为最后一个直接返回
    if (index > length - 2) return
    if (top(anchors[index + 1]) < distance) {
      // 下一条了
      tocs[this.index++].style.color = "#111"
      tocs[this.index].style.color = "#0099ff"
      /**
       * 目录动态滚动的核心代码。
       *  控制 toc 目录区域的滚动条下移，上移在后面几行。
       *  也可通过添加 postion: relative; overflow: hidden; 用 dom.style.marginTop 来控制。
       *  position: sticky 会有一种吸顶的感觉，不过我用 fixed，margin 代替了。
       */
      if (top(tocs[index]) > window.innerHeight / 2.5) {
        this.tocDOM.scrollTop += top(tocs[index]) - window.innerHeight / 2.5;
      }
    } else {
      // 还在此条，无操作
      return
    }
  } else {
    // 上一条了
    // 如果为第一个直接返回
    if (index < 1) return
    tocs[this.index--].style.color = "#111"
    tocs[this.index].style.color = "#0099ff"
    // 控制 toc 目前区域的滚动条上移
    if (top(tocs[index]) < window.innerHeight / 2) {
      this.tocDOM.scrollTop -= Math.abs(top(tocs[index]) - window.innerHeight / 2.5);
    }
  }
}

/**
 * 在原始函数上增加了 toc 及高亮功能。若无需其他功能，设置 toc 为 false 即可。
 *
 * @param mdString ：String，原始 md 文件的字符串
 * @param toc ：Boolean，是否需要生成目录
 * @param opt ：配置文件，同 marked.js 用法，仅传递，建议不要更改
 * @param callback ：回调函数，同 marked.js 用法，仅传递
 * @returns {*}
 */
export default function (mdString = "", toc = false, opt, callback) {
  renderer.tocTokens = [] // 重置数据，否则目录会不断（重复）增加
  let mdHTML = marked(mdString, opt, callback)

  if (!toc) {
    return {
      mdHTML: mdHTML
    }
  } else {
    return {
      mdHTML: mdHTML,
      tocHTML: tocTokens2HTML(renderer.tocTokens),
      init: init,
      chain: chain() // 因为 chain 是一个返回对象的函数
    }
  }
}