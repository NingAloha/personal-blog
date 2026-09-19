<template>
  <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
  <div v-else-if="project">
    <p class="breadcrumb">
      <router-link to="/projects/">{{ t('nav.projects') }}</router-link>
      <span> › </span>
      <span>{{ project.title }}</span>
    </p>

    <article>
      <!-- ── 标题 ── -->
      <h1 class="wiki-title">{{ project.title }}</h1>
      <p class="meta">{{ t('common.views', { n: views }) }}</p>

      <!-- ── 正文 ── -->
      <div class="wiki-body" v-html="rendered" />
    </article>
  </div>
  <div v-else class="not-found">
    <p>{{ t('detail.projectMissing') }} <router-link to="/projects/">{{ t('detail.backProjects') }}</router-link></p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../utils/api'
import { renderMarkdown } from '../utils/markdown'
import { applySeo, buildArticleJsonLd } from '../utils/seo'
import { locale, t } from '../i18n'

const route = useRoute()
const project = ref(null)
const loading = ref(true)
const notFound = ref(false)
const views = ref(0)

function scheduleLowPriority(task) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: 1500 })
    return
  }
  setTimeout(task, 0)
}

async function load(slug) {
  loading.value = true
  notFound.value = false
  try {
    project.value = await api.getProject(slug, locale.value)
    const path = `/projects/${slug}`
    const applyArticleSeo = () =>
      applySeo({
        title: project.value.title,
        description: project.value.summary,
        path,
        type: 'article',
        jsonLd: buildArticleJsonLd({
          title: project.value.title,
          summary: project.value.summary,
          path,
          datePublished: project.value.startDate,
          tags: project.value.tech,
          articleType: 'Article',
        }),
      })
    applyArticleSeo()
    scheduleLowPriority(async () => {
      try {
        await api.trackArticleVisit(slug)
        const stats = await api.getArticleStats(slug)
        views.value = stats.views || 0
      } catch {
        views.value = 0
      }
    })
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

const rendered = computed(() => renderMarkdown(project.value?.content))

onMounted(() => load(route.params.slug))
watch(() => route.params.slug, (slug) => slug && load(slug))
watch(locale, () => {
  const slug = route.params.slug
  if (slug) load(slug)
})
</script>

<style scoped>
.breadcrumb {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
.breadcrumb a { color: var(--link); text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.meta {
  font-size: 0.85rem;
  color: var(--text-faint);
  margin: -0.25rem 0 1rem;
}

.tech-tag {
  display: inline-block;
  background: var(--border-soft);
  border-radius: 2px;
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
  color: var(--text-soft);
  margin: 0.1rem 0.2rem 0.1rem 0;
}
.loading { color: var(--text-muted); padding: 2rem 0; }
.not-found { color: var(--text-muted); padding: 2rem 0; }
</style>
