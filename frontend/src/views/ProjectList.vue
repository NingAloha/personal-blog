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
          <td class="list-title-cell">
            <router-link :to="`/projects/${p.slug}/`">{{ p.title }}</router-link>
          </td>
          <td class="list-summary-cell">{{ p.summary }}</td>
          <td>
            <span v-for="t in p.tech" :key="t" class="tech-tag">{{ t }}</span>
          </td>
          <td>{{ p.status }}</td>
          <td class="list-date-cell">{{ p.startDate }}</td>
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
  max-width: 320px;
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
