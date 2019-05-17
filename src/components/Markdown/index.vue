<template>
  <div style="display: flex">
    <article
      v-html="oMarkdown.mdHTML"
      v-hljs
      class="markdown-body"
      id="markdown-body"
      style="width: 70%;"
    />
    <div>
      <div
        v-html="oMarkdown.tocHTML"
        class="markdown-toc markdown-toc-fixed "
        id="markdown-toc"
      ></div>
    </div>
  </div>
</template>

<script>
  import markdown from './markdown.min.js'
  import markdownCSS from './markdown.css'

  export default {
    name: "Markdown",
    props: {
      mdString: { // 文章字符串
        type: String,
        required: false,
        default: ""
      }
    },
    data: function () {
      return {
        oMarkdown: {}
      }
    },
    methods: {
      scroll() {
        this.oMarkdown.chain.scroll()
      }
    },
    mounted: function () {
      // src/utils/markdown.js 包含大量注释
      this.oMarkdown = markdown(this.mdString, true)

      this.$nextTick(function () {
        // 确保 Dom，https://cn.vuejs.org/v2/api/#Vue-nextTick
        this.oMarkdown.init(this.oMarkdown, "markdown-body", "markdown-toc")
      })
    }
  }
</script>

<style scoped>
  .markdown-toc-fixed {
    position: fixed;
    height: 70%;
    overflow-y: auto;
  }
</style>
