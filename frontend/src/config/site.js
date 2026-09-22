export function normalizeSiteUrl(value) {
  return String(value).replace(/\/+$/, '')
}

export const siteConfig = {
  siteUrl: 'https://ningaloha.com',
  siteName: '寧中亙的个人主页',
  siteNameEn: "NingAloha's Personal Site",
  authorName: 'NingAloha',
  authorNameZh: 'NingAloha(寧中亙)',
  description: 'NingAloha 的个人站点，包含项目、文学随笔与技术博客。',
  descriptionEn: "NingAloha's personal site: projects, essays, and tech blogs.",
  githubUrl: 'https://github.com/NingAloha',
  avatarPath: '/avatar.jpg',
}
