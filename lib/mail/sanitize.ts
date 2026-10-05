import sanitizeHtml from 'sanitize-html';

export function sanitizeMailHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'span', 'font', 'center', 'hr']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      td: ['colspan', 'rowspan', 'align', 'valign', 'width', 'height', 'bgcolor'],
      th: ['colspan', 'rowspan', 'align', 'valign', 'width', 'height'],
      table: ['width', 'cellpadding', 'cellspacing', 'border', 'align', 'bgcolor'],
      '*': ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'cid', 'data'],
    allowProtocolRelative: false,
  });
}
