# markdown-toc

选择的是 marked.js 库，配合 highlight.js 进行代码高亮。类似中间件。

## 功能

- [x] 生成 Markdown 的对应【目录】（同时返回解析好的 MD）
- [x] 当前 Markdown 内容的，对应【目录标题】高亮显示
- [x] 目录标题自动滚动（需要 CSS 配合）
- [x] Markdown CSS
- [ ] 点击目录标题后自动切换颜色（否则需要滚动页面触发）
- [ ] 高度抽象化
- [ ] 离开组件后去掉监听

## 在线浏览效果


[文章 / 关于](https://evgo2017.com)

## 用法

**直接** 引入 `src/utils ` 文件夹内的 `marked.js` 或 `marked.min.js` 即可。

> 有写好的组件做示例。

## 注意事项

1. 核心是 `src/components/Markdown 中的 ` markdown.js 文件；
2. 大量注释，[地址](<https://github.com/evgo2017/Markdown-Toc/blob/master/src/components/Markdown/markdown.js>) ；
3. 依赖 marked.js 库，[官网](<https://marked.js.org/#/README.md#README.md> )，[npm](<https://www.npmjs.com/package/marked> )；
4. 若需要使用 highlight.js ，可以参考 `src` 内的 `main.js` ，注册一个 `v-hljs` 指令。或直接文件修改配置。

## TOC 思路

考虑的情况：标题并不是按顺序写的，也就是说，顺序是乱的：开局一个二级标题，接下来就是五级标题，三级标题这样。

### 对应数组

```json
toc.push({text, level, anchor})

0: {text: "1 一级标题", level: 1}
1: {text: "1.1 二级标题", level: 2}
2: {text: "2 一级标题", level: 1}
3: {text: "2.1.1 三级标题", level: 3}
4: {text: "2.1.2 三级标题", level: 3}
```

### 生成的 HTML 结构

```html
<ul>
	<li>1 一级标题
		<ul>
			<li>1.1 二级标题</li>
		</ul>
	</li>
	<li>2 一级标题
		<ul>
            <li>
                <ul> 
                    <li>2.1.1 三级标题</li>
                    <li>2.1.2 三级标题</li>
                </ul>
            </li>
		</ul>
    </li>
</ul>		
```

### 规则

```
* [index].level==当前level：栈顶如果是</li>，则弹出栈；输入<li>+text；推</li>入栈；index++。
* [index].level>当前level：如果栈顶是</ul>，则输入<li><ul>，推</li>入栈，推</ul>入栈；如果栈顶不是</ul>，则输入<ul>，推</ul>入栈；level++。
* [index].level<当前level：弹出 [(当前level-匹配level) * 2+1] 个值出栈；level=[index].level。
* index 达到最大，栈内数据全弹出。
```

### 示例

最右一列为栈，第一行为栈底。

`</ul>（10）` 表示，在第10行的时候弹出了 `</ul>` ，弹出时，以由下至上的顺序，若此行为多个标签，则以由右至左的顺序弹出。

且其对应行数，表示其在第几个循环被推入栈。

第 `7` 行的 `</li></ul>（10）` 表示，在第 `7` 个循环，先推入 `</li>` 入栈，再推入 `</ul>` 入栈；在第 `10` 行（所有循环已结束，次数所有数据均匹配完成，要打上闭合标签）时，先弹出 `</ul>`， 再弹出 `</li>` 。

| 行数 | index | [index].level | 当前level | bool | <ul>                    | </ul>（10）                |
| ---- | ----- | ------------- | --------- | ---- | ----------------------- | -------------------------- |
| 1    | 0     | 1             | 1         | ==   | <li>1 一级标题          | </li>已匹配（4）           |
| 2    | 1     | 2             | 1         | >    | <ul>                    | </ul>已匹配（4）           |
| 3    | 1     | 2             | 2         | ==   | <li>1.1 二级标题        | </li>已匹配（4）           |
| 4    | 2     | 1             | 2         | <    | </li></ul></li>         |                            |
| 5    | 2     | 1             | 1         | ==   | <li>2 一级标题          | </li>（10）                |
| 6    | 3     | 3             | 1         | >    | <ul>                    | </ul>（10）                |
| 7    | 3     | 3             | 2         | >    | <li><ul>                | </li></ul>（10）           |
| 8    | 3     | 3             | 3         | ==   | <li>2.1.1 三级标题      | </li>已匹配（9）           |
| 9    | 4     | 3             | 3         | ==   | </li><li>2.1.2 三级标题 | </li>（10）                |
|      | -     | -             | -         |      |                         | 全弹出，从下至上，从右至左 |

详细请查看代码：utils/marked.js 文件，里面含有大量注释。

## 锚点唯一性

此部分查看源码后一举击破，库本身就提供了此功能。

之前自己确定锚点的唯一性是靠标题顺序（1，2，3...），但这次查看源码后，发现自己欠缺很多考虑，源码中调用 slugger.slug 有很多数据预处理，并提供了锚点唯一值。

因为之后要添加目录，于是新增了 `toc.push({text, level, anchor})` ，其中的 `toc` 是用于存放各级标题数据的。

相关源码:

```javascript
 renderer.heading = function (text, level, raw, slugger) {
    if (this.options.headerIds) {
      // 遵循 options，如果 headerIds = false，也没必要制作 toc 了
      let anchor = this.options.headerPrefix + slugger.slug(raw)
      toc.push({text, level, anchor})
      return `<h${level} id="#${anchor}">${text}</h${level}>`
    }
    // ignore IDs
    return `<h${level}>${text}</h${level}>`
  };
```

## 本地启动服务

```
npm install
npm run serve
```
