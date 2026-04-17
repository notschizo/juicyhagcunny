import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

export default defineConfig({
  redirects: {
    '/api/overview/': '/api/introduction/'
  },
  integrations: [
    starlight({
      title: 'FxEmbed',
      logo: {
        src: './src/assets/fxembed.svg'
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/FxEmbed/FxEmbed' }],
      customCss: ['./src/styles/custom.css'],
      plugins: [
        starlightOpenAPI([
          {
            base: 'api/twitter',
            label: 'FxTwitter API',
            schema: './specs/fxtwitter-openapi.json'
          },
          {
            base: 'api/bluesky',
            label: 'FxBluesky API',
            schema: './specs/fxbluesky-openapi.json'
          }
        ])
      ],
      sidebar: [
        {
          label: 'User Guide',
          items: [
            { label: 'Getting Started', slug: 'guide/getting-started' },
            { label: 'Built-In Features', slug: 'guide/built-in-features' },
            {
              label: 'URL Modifiers',
              collapsed: false,
              items: [
                { label: 'Overview', link: '/guide/url-modifiers/' },
                { label: 'Direct media (d.)', slug: 'guide/url-modifiers/direct-media' },
                { label: 'Select photo', slug: 'guide/url-modifiers/select-photo' },
                { label: 'Translate', slug: 'guide/url-modifiers/translate' },
                { label: 'Mosaic (m.)', slug: 'guide/url-modifiers/mosaic' },
                { label: 'Gallery (g.)', slug: 'guide/url-modifiers/gallery' },
                { label: 'Text-only (t.)', slug: 'guide/url-modifiers/text-only' },
                { label: 'Instant View (i.)', slug: 'guide/url-modifiers/instant-view' },
                { label: 'Old embeds (o.)', slug: 'guide/url-modifiers/old-embeds' }
              ]
            },
            { label: 'Embedding Media', slug: 'guide/embedding-media' },
            { label: 'RSS & Atom feeds', slug: 'guide/rss-atom-feeds' },
            { label: 'Compare Features', slug: 'guide/compare' },
            { label: 'FAQ', slug: 'guide/faq' }
          ]
        },
        {
          label: 'API Reference',
          items: [{ label: 'Introduction', slug: 'api/introduction' }, ...openAPISidebarGroups]
        },
        {
          label: 'Deployment',
          items: [
            { label: 'Self-Hosting', slug: 'deployment/self-hosting' },
            { label: 'Mosaic', slug: 'deployment/mosaic' },
            { label: 'Configuration', slug: 'deployment/configuration' },
            { label: 'Credentials', slug: 'deployment/credentials' }
          ]
        }
      ]
    })
  ]
});
