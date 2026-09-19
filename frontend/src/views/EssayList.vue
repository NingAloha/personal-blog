<template>
  <article>
    <h1 class="wiki-title">{{ t('nav.essays') }}</h1>
    <p class="page-lead">{{ t('list.essaysLead') }}</p>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <table v-else class="wiki-list-table">
      <thead>
        <tr>
          <th>{{ t('list.thTitle') }}</th>
          <th>{{ t('list.thSummary') }}</th>
          <th>{{ t('list.thTags') }}</th>
          <th>{{ t('list.thDate') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in essays" :key="e.slug">
          <td class="list-title-cell">
            <router-link :to="`/essays/${e.slug}/`">{{ e.title }}</router-link>
          </td>
          <td class="list-summary-cell">{{ e.summary }}</td>
          <td>
            <span v-for="tag in e.tags" :key="tag" class="tag">{{ tag }}</span>
          </td>
          <td class="list-date-cell">{{ e.date }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { api } from '../utils/api'
import { locale, t } from '../i18n'

const essays = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    essays.value = await api.getEssays(locale.value)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(locale, load)
</script>

<style scoped>
.page-lead {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}
.wiki-list-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.wiki-list-table th {
  background: var(--border-soft);
  border: 1px solid var(--border);
  padding: 0.45rem 0.75rem;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}
.wiki-list-table td {
  border: 1px solid var(--border);
  padding: 0.45rem 0.75rem;
  vertical-align: top;
}
.wiki-list-table tbody tr:hover td {
  background: var(--bg-muted);
}
.list-title-cell a {
  font-weight: 600;
  color: var(--link);
  text-decoration: none;
}
.list-title-cell a:hover {
  text-decoration: underline;
}
.list-summary-cell {
  max-width: 380px;
  color: var(--text-soft);
}
.list-date-cell {
  white-space: nowrap;
  color: var(--text-faint);
}
.tag {
  display: inline-block;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 2px;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
  color: var(--link);
  margin: 0.1rem 0.2rem 0.1rem 0;
}
</style>
