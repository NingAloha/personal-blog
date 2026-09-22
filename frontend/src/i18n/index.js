import { ref } from 'vue'
import { siteConfig } from '../config/site.js'

const STORAGE_KEY = 'locale'
const SUPPORTED = ['zh', 'en']

export const locale = ref('zh')

function normalizeLocale(value) {
  if (!value) return null
  const lower = String(value).toLowerCase()
  if (lower.startsWith('zh')) return 'zh'
  if (lower.startsWith('en')) return 'en'
  return null
}

function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return 'zh'
  const langs = Array.isArray(navigator.languages) ? navigator.languages : []
  for (const l of langs) {
    const norm = normalizeLocale(l)
    if (norm) return norm
  }
  return normalizeLocale(navigator.language) || 'zh'
}

export function initLocale() {
  if (typeof window === 'undefined') return
  const saved = normalizeLocale(localStorage.getItem(STORAGE_KEY))
  locale.value = saved || detectBrowserLocale() || 'zh'
}

export function setLocale(next) {
  const norm = normalizeLocale(next)
  const value = norm && SUPPORTED.includes(norm) ? norm : 'zh'
  if (locale.value === value) return
  locale.value = value
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: value } }))
}

function get(obj, path) {
  const parts = String(path).split('.')
  let cur = obj
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = cur[p]
  }
  return cur
}

function format(template, params) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))
}

const messages = {
  zh: {
    site: {
      name: siteConfig.siteName,
      description: siteConfig.description,
    },
    nav: {
      home: '主页',
      projects: '项目',
      essays: '文学随笔',
      techBlogs: '技术博客',
    },
    toggles: {
      themeLight: '浅色',
      themeDark: '黑夜',
      langZh: '中文',
      langEn: 'EN',
    },
    footer: {
      lastModified: '本页面最后修改于 {date} · 内容由本人维护',
    },
    common: {
      loading: '加载中...',
      views: '阅读 {n} 次',
      readMore: '阅读更多 →',
    },
    notFound: {
      title: '页面不存在',
      body: '你访问的页面不存在，可能已被移除或链接有误。',
      backHome: '← 返回主页',
    },
    home: {
      title: '关于我',
      infobox: {
        callMe: '可以叫我',
        iMayBe: '我也许是',
        from: '我来自于',
        nameValue: siteConfig.authorNameZh,
        rolesValue: '开发者/随笔作者/吉他手/摄影师',
        fromValue: '中国·汕头',
        projectCount: '项目做了',
        essayCount: '随笔写了',
        techBlogCount: '技术博客',
        siteVisits: '网站访问',
        unitProject: '{n}个',
        unitEssay: '{n}篇',
        unitTechBlog: '{n}篇',
        unitVisits: '{n}次',
      },
      intro1:
        '你好，这里是我的个人主页。我喜欢写点代码，也喜欢写文章，时不时也会听听歌，练练琴。这个网站受 Wikipedia 排版风格的启发——不炫技，只是把东西放在该放的地方。',
      intro2: '上边（或者说，这段文字）是关于我的介绍。不过我暂时还没想好写些什么，就先这么多吧。',
      doingProjects: '正在做的项目',
      projectsLoading: '项目加载中...',
      seeAllProjects: '查看所有项目',
      essaysLoading: '随笔加载中...',
      seeAllEssays: '查看所有随笔',
      techBlogsLoading: '技术博客加载中...',
      seeAllTechBlogs: '查看所有技术博客',
    },
    list: {
      projectsLead: '这里是我做过和正在做的项目，点击标题查看详情。',
      essaysLead: '一些零散的文字，不成体系，但都是真实的。',
      techBlogsLead: '记录开发实践、技术思考与踩坑总结。',
      thTitle: '标题',
      thSummary: '摘要',
      thTags: '标签',
      thDate: '日期',
      projectName: '项目名',
      projectTech: '技术栈',
      projectStatus: '状态',
      projectTime: '时间',
    },
    detail: {
      projectMissing: '项目不存在。',
      backProjects: '← 返回项目列表',
      essayMissing: '随笔不存在。',
      backEssays: '← 返回随笔列表',
      postMissing: '文章不存在。',
      backTechBlogs: '← 返回技术博客列表',
    },
    seo: {
      home: {
        title: '首页',
        description: 'NingAloha 的个人站点，记录项目、文学随笔与技术博客。',
      },
      projects: {
        title: '项目',
        description: '项目列表：正在做和做过的工程项目。',
      },
      essays: {
        title: '文学随笔',
        description: '文学随笔与生活思考。',
      },
      techBlogs: {
        title: '技术博客',
        description: '开发实践、技术思考与踩坑复盘。',
      },
      notFound: {
        title: '页面未找到',
        description: '你访问的页面不存在。',
      },
    },
  },
  en: {
    site: {
      name: siteConfig.siteNameEn,
      description: siteConfig.descriptionEn,
    },
    nav: {
      home: 'Home',
      projects: 'Projects',
      essays: 'Essays',
      techBlogs: 'Tech Blogs',
    },
    toggles: {
      themeLight: 'Light',
      themeDark: 'Dark',
      langZh: '中文',
      langEn: 'EN',
    },
    footer: {
      lastModified: 'Last updated on {date} · Maintained by me',
    },
    common: {
      loading: 'Loading...',
      views: '{n} views',
      readMore: 'Read more →',
    },
    notFound: {
      title: 'Page Not Found',
      body: 'The page you requested does not exist. It may have been removed or the link is incorrect.',
      backHome: '← Back to home',
    },
    home: {
      title: 'About',
      infobox: {
        callMe: 'Call me',
        iMayBe: 'I might be',
        from: 'From',
        nameValue: siteConfig.authorName,
        rolesValue: 'Developer / essay writer / guitarist / photographer',
        fromValue: 'Shantou, China',
        projectCount: 'Projects',
        essayCount: 'Essays',
        techBlogCount: 'Tech blogs',
        siteVisits: 'Site visits',
        unitProject: '{n}',
        unitEssay: '{n}',
        unitTechBlog: '{n}',
        unitVisits: '{n}',
      },
      intro1:
        "Hi — welcome to my personal site. I write code and I write words. Sometimes I listen to music and practice guitar. The layout is inspired by Wikipedia: minimal, calm, and focused on putting things where they belong.",
      intro2:
        "That’s the short version of me (or at least of this page). I haven’t decided what else to put here yet, so I’ll keep it simple for now.",
      doingProjects: 'Active projects',
      projectsLoading: 'Loading projects...',
      seeAllProjects: 'See all projects',
      essaysLoading: 'Loading essays...',
      seeAllEssays: 'See all essays',
      techBlogsLoading: 'Loading tech blogs...',
      seeAllTechBlogs: 'See all tech blogs',
    },
    list: {
      projectsLead: "Things I've built or I'm currently building. Click a title to see details.",
      essaysLead: 'Loose thoughts and notes — not systematic, but all real.',
      techBlogsLead: 'Practical notes, engineering reflections, and postmortems.',
      thTitle: 'Title',
      thSummary: 'Summary',
      thTags: 'Tags',
      thDate: 'Date',
      projectName: 'Project',
      projectTech: 'Tech',
      projectStatus: 'Status',
      projectTime: 'Time',
    },
    detail: {
      projectMissing: 'Project not found.',
      backProjects: '← Back to projects',
      essayMissing: 'Essay not found.',
      backEssays: '← Back to essays',
      postMissing: 'Post not found.',
      backTechBlogs: '← Back to tech blogs',
    },
    seo: {
      home: {
        title: 'Home',
        description: siteConfig.descriptionEn,
      },
      projects: {
        title: 'Projects',
        description: 'Project list: what I built and what I am building.',
      },
      essays: {
        title: 'Essays',
        description: 'Essays and reflections.',
      },
      techBlogs: {
        title: 'Tech Blogs',
        description: 'Engineering notes and postmortems.',
      },
      notFound: {
        title: 'Not Found',
        description: 'The page you requested does not exist.',
      },
    },
  },
}

export function t(key, params) {
  const lang = messages[locale.value] ? locale.value : 'zh'
  const value = get(messages[lang], key) ?? get(messages.zh, key) ?? key
  return typeof value === 'string' ? format(value, params) : value
}
