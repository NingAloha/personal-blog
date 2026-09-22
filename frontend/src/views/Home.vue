<template>
  <article class="home-article">

    <!-- ── 页面标题 ── -->
    <h1 class="wiki-title">{{ t('home.title') }}</h1>

    <!-- ── 名片 Infobox（右浮动） ── -->
    <aside class="infobox">
      <div class="infobox-image">
        <!-- 替换为你的头像 URL -->
        <img
          :src="siteConfig.avatarPath"
          alt="avatar"
          width="900"
          height="900"
          loading="eager"
          decoding="async"
        />
      </div>
      <table class="infobox-table">
        <tbody>
          <tr><th>{{ t('home.infobox.callMe') }}</th><td>{{ t('home.infobox.nameValue') }}</td></tr>
          <tr><th>{{ t('home.infobox.iMayBe') }}</th><td>{{ t('home.infobox.rolesValue') }}</td></tr>
          <tr><th>{{ t('home.infobox.from') }}</th><td>{{ t('home.infobox.fromValue') }}</td></tr>
          <tr><th>{{ t('home.infobox.projectCount') }}</th><td>{{ t('home.infobox.unitProject', { n: projectCount }) }}</td></tr>
          <tr><th>{{ t('home.infobox.essayCount') }}</th><td>{{ t('home.infobox.unitEssay', { n: essayCount }) }}</td></tr>
          <tr><th>{{ t('home.infobox.techBlogCount') }}</th><td>{{ t('home.infobox.unitTechBlog', { n: techBlogCount }) }}</td></tr>
          <tr><th>{{ t('home.infobox.siteVisits') }}</th><td>{{ t('home.infobox.unitVisits', { n: siteVisits }) }}</td></tr>
        </tbody>
      </table>
      <div class="infobox-links">
        <a :href="siteConfig.githubUrl" target="_blank" rel="noopener">GitHub</a>
        <!-- 可以加更多链接 -->
      </div>
    </aside>

    <!-- ── 自我介绍 ── -->
    <p>
      {{ t('home.intro1') }}
    </p>
    <p>
      {{ t('home.intro2') }}
    </p>

    <!-- ── 在做的项目 ── -->
    <h2 class="wiki-section">{{ t('home.doingProjects') }}</h2>
    <template v-if="featuredProject">
      <div class="featured-card" @click="$router.push(`/projects/${featuredProject.slug}/`)">
        <div class="featured-card-header">
          <span class="featured-card-title">{{ featuredProject.title }}</span>
          <span class="featured-card-status">{{ featuredProject.status }}</span>
        </div>
        <p class="featured-card-summary">{{ featuredProject.summary }}</p>
        <div class="featured-card-tech">
          <span v-for="t in featuredProject.tech" :key="t" class="tech-tag">{{ t }}</span>
        </div>
        <router-link :to="`/projects/${featuredProject.slug}/`" class="featured-more">
          {{ t('common.readMore') }}
        </router-link>
      </div>
    </template>
    <div v-else class="featured-card featured-skeleton">{{ t('home.projectsLoading') }}</div>
    <p class="section-seeall">
      <router-link to="/projects/">{{ t('home.seeAllProjects') }}</router-link>
    </p>

    <!-- ── 文学随笔 ── -->
    <h2 class="wiki-section">{{ t('nav.essays') }}</h2>
    <template v-if="featuredEssay">
      <div class="featured-card" @click="$router.push(`/essays/${featuredEssay.slug}/`)">
        <div class="featured-card-header">
          <span class="featured-card-title">{{ featuredEssay.title }}</span>
          <span class="featured-card-date">{{ featuredEssay.date }}</span>
        </div>
        <p class="featured-card-summary">{{ featuredEssay.summary }}</p>
        <router-link :to="`/essays/${featuredEssay.slug}/`" class="featured-more">
          {{ t('common.readMore') }}
        </router-link>
      </div>
    </template>
    <div v-else class="featured-card featured-skeleton">{{ t('home.essaysLoading') }}</div>
    <p class="section-seeall">
      <router-link to="/essays/">{{ t('home.seeAllEssays') }}</router-link>
    </p>

    <!-- ── 技术博客 ── -->
    <h2 class="wiki-section">{{ t('nav.techBlogs') }}</h2>
    <template v-if="featuredTechBlog">
      <div class="featured-card" @click="$router.push(`/tech-blogs/${featuredTechBlog.slug}/`)">
        <div class="featured-card-header">
          <span class="featured-card-title">{{ featuredTechBlog.title }}</span>
          <span class="featured-card-date">{{ featuredTechBlog.date }}</span>
        </div>
        <p class="featured-card-summary">{{ featuredTechBlog.summary }}</p>
        <router-link :to="`/tech-blogs/${featuredTechBlog.slug}/`" class="featured-more">
          {{ t('common.readMore') }}
        </router-link>
      </div>
    </template>
    <div v-else class="featured-card featured-skeleton">{{ t('home.techBlogsLoading') }}</div>
    <p class="section-seeall">
      <router-link to="/tech-blogs/">{{ t('home.seeAllTechBlogs') }}</router-link>
    </p>

  </article>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { siteConfig } from '../config/site.js'
import { api } from '../utils/api'
import { locale, t } from '../i18n'

const featuredProject = ref(null)
const featuredEssay = ref(null)
const featuredTechBlog = ref(null)
const projectCount = ref(0)
const essayCount = ref(0)
const techBlogCount = ref(0)
const siteVisits = ref(0)

function trySetSiteVisitsFromStorage() {
  try {
    const raw = sessionStorage.getItem('site_visits_latest')
    if (!raw) return false
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return false
    siteVisits.value = n
    return true
  } catch {
    return false
  }
}

function handleSiteVisitsUpdated(e) {
  const n = e?.detail?.siteVisits
  if (typeof n === 'number' && Number.isFinite(n)) {
    siteVisits.value = n
  }
}

async function loadTechBlogs() {
  try {
    const techBlogs = await api.getTechBlogs(locale.value)
    techBlogCount.value = techBlogs.length
    featuredTechBlog.value = techBlogs.find((p) => p.featured) || techBlogs[0] || null
  } catch {}
}

async function loadProjects() {
  try {
    const projects = await api.getProjects(locale.value)
    projectCount.value = projects.length
    featuredProject.value = projects.find((p) => p.featured) || projects[0] || null
  } catch {}
}

async function loadEssays() {
  try {
    const essays = await api.getEssays(locale.value)
    essayCount.value = essays.length
    featuredEssay.value = essays.find((e) => e.featured) || essays[0] || null
  } catch {}
}

onMounted(async () => {
  trySetSiteVisitsFromStorage()
  window.addEventListener('site-visits-updated', handleSiteVisitsUpdated)

  loadProjects()

  loadEssays()

  loadTechBlogs()

  api.getSiteStats().then((stats) => {
    siteVisits.value = stats.siteVisits || 0
  }).catch(() => {})
})

watch(locale, () => {
  loadProjects()
  loadEssays()
  loadTechBlogs()
})

onBeforeUnmount(() => {
  window.removeEventListener('site-visits-updated', handleSiteVisitsUpdated)
})
</script>

<style scoped>
/* ── Infobox ── */
.infobox {
  float: right;
  clear: right;
  margin: 0 0 1.25em 2em;
  border: 1px solid var(--border);
  background: var(--bg-muted);
  font-size: 0.875rem;
  width: 240px;
  border-collapse: collapse;
}
.infobox-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-bottom: 1px solid var(--border);
}
.infobox-image {
  aspect-ratio: 1 / 1;
  overflow: hidden;
}
.infobox-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
}
.infobox-table th,
.infobox-table td {
  padding: 0.3rem 0.6rem;
  border-top: 1px solid var(--border-soft);
  vertical-align: top;
}
.infobox-table th {
  color: var(--text-muted);
  font-weight: normal;
  white-space: nowrap;
  width: 60px;
}
.infobox-links {
  border-top: 1px solid var(--border);
  padding: 0.4rem 0.6rem;
  display: flex;
  gap: 0.75rem;
}

/* ── Featured card ── */
.featured-card {
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 0.9rem 1.1rem;
  cursor: pointer;
  transition: background 0.15s;
  background: var(--bg);
  /* 让卡片不被右侧浮动的 infobox 遮住 */
  margin-right: calc(240px + 2em + 2px);
}
.featured-skeleton {
  min-height: 130px;
  color: var(--text-faint);
}
.featured-card:hover {
  background: var(--bg-muted);
}
.featured-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.4rem;
}
.featured-card-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
}
.featured-card-status,
.featured-card-date {
  font-size: 0.8rem;
  color: var(--text-faint);
}
.featured-card-summary {
  margin: 0 0 0.75rem;
  color: var(--text-soft);
  line-height: 1.6;
}
.featured-card-tech {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.tech-tag {
  background: var(--border-soft);
  border-radius: 2px;
  padding: 0.15rem 0.5rem;
  font-size: 0.78rem;
  color: var(--text-soft);
}
.featured-more {
  font-size: 0.875rem;
  color: var(--link);
  text-decoration: none;
}
.featured-more:hover {
  text-decoration: underline;
}
.section-seeall {
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

/* ── 移动端响应式 ── */
@media (max-width: 768px) {
  .infobox {
    float: none;
    width: 100%;
    margin: 0 0 1.5em 0;
  }
  .featured-card {
    margin-right: 0;
  }
}
</style>
