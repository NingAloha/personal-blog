<template>
  <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
  <div v-else-if="post">
    <p class="breadcrumb">
      <router-link to="/tech-blogs/">{{ t('nav.techBlogs') }}</router-link>
      <span> › </span>
      <span>{{ post.title }}</span>
    </p>

    <article>
      <h1 class="wiki-title">{{ post.title }}</h1>
      <p class="meta">{{ t('common.views', { n: views }) }}</p>
      <div class="wiki-body" v-html="rendered" />
    </article>
  </div>
  <div v-else class="not-found">
    <p>{{ t('detail.postMissing') }} <router-link to="/tech-blogs/">{{ t('detail.backTechBlogs') }}</router-link></p>
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
const post = ref(null)
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
    post.value = await api.getTechBlog(slug, locale.value)
    const path = `/tech-blogs/${post.value.slug}`
    applySeo({
      title: post.value.title,
      description: post.value.summary,
      path,
      type: 'article',
      language: post.value.contentLanguage,
      jsonLd: buildArticleJsonLd({
        title: post.value.title,
        summary: post.value.summary,
        path,
        datePublished: post.value.date,
        tags: post.value.tags,
        articleType: 'BlogPosting',
        language: post.value.contentLanguage,
      }),
    })
    scheduleLowPriority(async () => {
      try {
        await api.trackArticleVisit(post.value.slug)
        const stats = await api.getArticleStats(post.value.slug)
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

const rendered = computed(() => renderMarkdown(post.value?.content))

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
.loading { color: var(--text-muted); padding: 2rem 0; }
.not-found { color: var(--text-muted); padding: 2rem 0; }
</style>
