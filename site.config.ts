import { defineConfig } from './src/core/config'

// Maintainer's site configuration. Template users edit this file (and only
// this file) to configure their own site.
//
// NOTE: the profile below is SAMPLE CONTENT — the prototype's example persona
// "Mara Ellison Voss" (ADR-010: sample data ships with the template, the
// maintainer's real data replaces it before launch, P1-16).
export default defineConfig({
  profile: {
    name: 'Mara Ellison Voss',
    nameVariants: ['M. E. Voss', 'Mara E. Voss', 'Mara Ellison Voss'],
    role: { en: 'Postdoctoral Researcher', zh: '博士后研究员' },
    field: {
      en: 'Computational Neuroscience & Machine Learning',
      zh: '计算神经科学与机器学习',
    },
    affiliation: {
      en: 'Institute for Theoretical Neuroscience, ETH Zürich',
      zh: '苏黎世联邦理工学院理论神经科学研究所',
    },
    location: { en: 'Zürich, Switzerland', zh: '瑞士苏黎世' },
    email: 'm.voss@example.edu',
    photo:
      'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=900&h=1100&fit=crop&auto=format',
    tagline: {
      en: 'I build models of how populations of neurons encode uncertainty — and I write, in public, about the messy parts of doing that work.',
      zh: '我为神经元群体如何编码不确定性建立模型，并公开写下这项工作中那些不那么光鲜的部分。',
    },
    bio: [
      {
        en: 'I study the geometry of neural population codes: how distributed activity across thousands of neurons represents belief, uncertainty, and time. My work sits between dynamical-systems theory and modern representation learning, and I care about models that are both predictive and interpretable.',
        zh: '我研究神经群体编码的几何：数千个神经元的分布式活动如何表征信念、不确定性与时间。我的工作介于动力系统理论与现代表示学习之间，我在意的是既有预测力又可解释的模型。',
      },
      {
        en: 'Before Zürich I completed my PhD at the Gatsby Computational Neuroscience Unit, where I worked on latent variable models for large-scale electrophysiology. I still write most of my analysis code in the open.',
        zh: '来苏黎世之前，我在 Gatsby 计算神经科学中心完成博士学位，研究大规模电生理数据的隐变量模型。我的分析代码大多仍然公开编写。',
      },
    ],
    interests: [
      { en: 'Neural population geometry', zh: '神经群体几何' },
      { en: 'Latent variable models', zh: '隐变量模型' },
      { en: 'Uncertainty representation', zh: '不确定性表征' },
      { en: 'Interpretable deep learning', zh: '可解释深度学习' },
      { en: 'Open scientific tooling', zh: '开放科研工具' },
    ],
    orcid: '0000-0002-1825-0097',
    scholar: 'sample123',
    links: [
      { label: 'Google Scholar', href: 'https://scholar.google.com', kind: 'scholar' },
      { label: 'GitHub', href: 'https://github.com', kind: 'github' },
      { label: 'ORCID', href: 'https://orcid.org', kind: 'orcid' },
      { label: 'Bluesky', href: 'https://bsky.app', kind: 'bluesky' },
    ],
  },
  modules: {
    blog: true,
    pages: true,
    publications: true,
    projects: true,
    cv: true,
  },
  i18n: {
    default: 'en',
    locales: ['en', 'zh'],
  },
  // theme: 'paper' preset with locked tokens (ADR-011); runtime: static + fs
  // store — both defaults, RUNTIME_MODE env overrides mode at build time.
})
