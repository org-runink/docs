/**
 * Markdown Export Module
 * Exports page content as markdown with YAML frontmatter headers
 */

export const MarkdownExporter = {
  /**
   * Generate YAML frontmatter from page metadata
   */
  generateFrontmatter(metadata) {
    const lines = ['---'];

    if (metadata.title) lines.push(`title: "${metadata.title}"`);
    if (metadata.product) lines.push(`product: ${metadata.product}`);
    if (metadata.category) lines.push(`category: ${metadata.category}`);
    if (metadata.audience) {
      const audiences = Array.isArray(metadata.audience)
        ? metadata.audience
        : [metadata.audience];
      lines.push(`audience: [${audiences.map(a => `"${a}"`).join(', ')}]`);
    }
    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(`tags: [${metadata.tags.map(t => `"${t}"`).join(', ')}]`);
    }

    const now = new Date().toISOString().split('T')[0];
    lines.push(`updated_at: "${now}"`);

    if (metadata.relatedDocs && metadata.relatedDocs.length > 0) {
      lines.push('related_docs:');
      metadata.relatedDocs.forEach(doc => {
        lines.push(`  - ${doc}`);
      });
    }

    lines.push('---\n');
    return lines.join('\n');
  },

  /**
   * Extract main content from page (removes navigation, sidebars, etc.)
   */
  extractMainContent() {
    const article = document.querySelector('article')
      || document.querySelector('main')
      || document.querySelector('section.geekdoc');

    if (!article) {
      console.warn('Could not find main content area');
      return '';
    }

    // Clone to avoid modifying the DOM
    const content = article.cloneNode(true);

    // Remove navigation elements
    const selectorsToRemove = [
      '.toc',           // Table of contents sidebar
      'nav',            // Navigation
      '.geekdoc-nav',   // Geekdocs navigation
      '.breadcrumb',    // Breadcrumbs
      '[role="navigation"]'
    ];

    selectorsToRemove.forEach(selector => {
      content.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Convert HTML to markdown
    return this.htmlToMarkdown(content.innerHTML);
  },

  /**
   * Basic HTML to Markdown converter
   * Handles common elements found in documentation
   */
  htmlToMarkdown(html) {
    let markdown = html
      // Remove script and style tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

      // Headings
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n')

      // Bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

      // Links
      .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')

      // Code blocks
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi,
        (match, code) => '```\n' + this.decodeHtml(code) + '\n```\n')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')

      // Lists
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')

      // Blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')

      // Line breaks and paragraphs
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')

      // Tables (basic)
      .replace(/<table[^>]*>.*?<\/table>/gi, '[Table content - see HTML source]\n')

      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '')

      // Decode HTML entities
      .split('\n')
      .map(line => this.decodeHtml(line))
      .join('\n')

      // Clean up excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return markdown;
  },

  /**
   * Decode HTML entities
   */
  decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  },

  /**
   * Get page metadata from document
   */
  getMetadata() {
    const title = document.title
      || document.querySelector('h1')?.textContent
      || 'Untitled';

    const metaProduct = document.querySelector('[data-product]')?.dataset.product || 'core';
    const metaCategory = document.querySelector('[data-category]')?.dataset.category || '';
    const metaTags = (document.querySelector('[data-tags]')?.dataset.tags || '').split(',').filter(Boolean);

    return {
      title: title.replace(' | CORE', '').trim(),
      product: metaProduct,
      category: metaCategory,
      audience: ['admin', 'dev'],
      tags: metaTags,
      relatedDocs: []
    };
  },

  /**
   * Export page as markdown file
   */
  exportAsMarkdown(filename) {
    const metadata = this.getMetadata();
    const frontmatter = this.generateFrontmatter(metadata);
    const content = this.extractMainContent();
    const markdown = frontmatter + content;

    // Create blob and download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${metadata.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return markdown;
  },

  /**
   * Copy markdown to clipboard
   */
  async copyToClipboard(filename) {
    const metadata = this.getMetadata();
    const frontmatter = this.generateFrontmatter(metadata);
    const content = this.extractMainContent();
    const markdown = frontmatter + content;

    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  },

  /**
   * Get MCP server endpoint info
   */
  getMCPServerInfo() {
    return {
      endpoint: 'http://localhost:7441',
      tools: [
        {
          name: 'list_documents',
          description: 'List all documents, optionally filtered by product',
          params: ['product (optional)']
        },
        {
          name: 'get_document',
          description: 'Fetch a single document as markdown with YAML frontmatter',
          params: ['product', 'path']
        },
        {
          name: 'search_docs',
          description: 'Search for documents by keyword across all products',
          params: ['query']
        }
      ],
      products: ['core', 'face', 'pulse', 'river', 'luna']
    };
  }
};

// Add export button to page if DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  MarkdownExporter.addExportButton();
});

/**
 * Add markdown export button to page
 */
MarkdownExporter.addExportButton = function() {
  // Only add if not already present
  if (document.querySelector('[data-markdown-export]')) {
    return;
  }

  const nav = document.querySelector('nav.breadcrumb')
    || document.querySelector('nav')
    || document.querySelector('header');

  if (!nav) return;

  const container = document.createElement('div');
  container.setAttribute('data-markdown-export', 'true');
  container.style.cssText = `
    display: flex;
    gap: 8px;
    margin: 12px 0;
    padding: 8px 0;
    border-top: 1px solid var(--geekdoc-border);
  `;

  // Export button
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '📥 Export as Markdown';
  exportBtn.style.cssText = `
    padding: 6px 12px;
    background: var(--geekdoc-accent, #3DDC97);
    color: var(--geekdoc-text-dark, #151312);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    font-family: inherit;
  `;
  exportBtn.addEventListener('click', () => {
    const metadata = this.getMetadata();
    this.exportAsMarkdown(`${metadata.title.toLowerCase().replace(/\s+/g, '-')}.md`);
  });

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copy Markdown';
  copyBtn.style.cssText = `
    padding: 6px 12px;
    background: var(--geekdoc-accent, #3DDC97);
    color: var(--geekdoc-text-dark, #151312);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    font-family: inherit;
  `;
  copyBtn.addEventListener('click', async () => {
    const success = await this.copyToClipboard();
    copyBtn.textContent = success ? '✓ Copied!' : '✗ Failed';
    setTimeout(() => {
      copyBtn.textContent = '📋 Copy Markdown';
    }, 2000);
  });

  container.appendChild(exportBtn);
  container.appendChild(copyBtn);
  nav.parentNode.insertBefore(container, nav.nextSibling);
};
