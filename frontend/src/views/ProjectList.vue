<template>
  <article>
    <h1 class="wiki-title">{{ t('nav.projects') }}</h1>
    <p class="page-lead">{{ t('list.projectsLead') }}</p>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <table v-else class="wiki-list-table">
      <thead>
        <tr>
          <th>{{ t('list.projectName') }}</th>
          <th>{{ t('list.thSummary') }}</th>
          <th>{{ t('list.projectTech') }}</th>
          <th>{{ t('list.projectStatus') }}</th>
          <th>{{ t('list.projectTime') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in projects" :key="p.slug">
          <td class="list-title-cell" :data-label="t('list.projectName')">
            <router-link :to="`/projects/${p.slug}/`">{{ p.title }}</router-link>
          </td>
          <td class="list-summary-cell" :data-label="t('list.thSummary')">{{ p.summary }}</td>
          <td :data-label="t('list.projectTech')">
            <span v-for="t in p.tech" :key="t" class="tech-tag">{{ t }}</span>
          </td>
          <td :data-label="t('list.projectStatus')">{{ p.status }}</td>
          <td class="list-date-cell" :data-label="t('list.projectTime')">{{ p.startDate }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { api } from '../utils/api'
import { locale, t } from '../i18n'

const projects = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    projects.value = await api.getProjects(locale.value)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(locale, load)
</script>

<style scoped>
/* Desktop columns: name, summary, tech stack, status, date.
   Fix their proportions rather than letting long tech lists absorb width.
   Mobile keeps the shared stacked-card layout. */
@media (min-width: 769px) {
  .wiki-list-table {
    table-layout: fixed;
  }
  .wiki-list-table th:nth-child(1) { width: 18%; }
  .wiki-list-table th:nth-child(2) { width: 37%; }
  .wiki-list-table th:nth-child(3) { width: 25%; }
  .wiki-list-table th:nth-child(4) { width: 9%; }
  .wiki-list-table th:nth-child(5) { width: 11%; }
  .wiki-list-table td { overflow-wrap: anywhere; }
}
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
  color: var(--text-soft);
}
.list-date-cell {
  white-space: nowrap;
  color: var(--text-faint);
}
.tech-tag {
  display: inline-block;
  background: var(--border-soft);
  border-radius: 2px;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
  color: var(--text-soft);
  margin: 0.1rem 0.2rem 0.1rem 0;
}
</style>
