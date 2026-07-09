import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

interface RouteMetaInput {
    title?: string;
    description?: string;
    path?: string;
}

@Injectable({ providedIn: 'root' })
export class MetaService {
    private readonly meta = inject(Meta);
    private readonly title = inject(Title);
    private readonly document = inject(DOCUMENT);
    private readonly baseUrl = 'https://money.jurre.dev';
    private readonly defaultTitle = 'money.jurre.dev';
    private readonly defaultDescription =
        'Upload bank .TAB exports, label transactions, and inspect spending insights with local-first processing.';

    updateRouteMeta(input: RouteMetaInput): void {
        const title = input.title?.trim() || this.defaultTitle;
        const description = input.description?.trim() || this.defaultDescription;
        const canonicalPath = input.path?.trim() || '/';
        const canonicalUrl = this.toCanonicalUrl(canonicalPath);

        this.title.setTitle(title);

        this.meta.updateTag({ name: 'description', content: description });
        this.meta.updateTag({ name: 'robots', content: 'index,follow' });

        this.meta.updateTag({ property: 'og:type', content: 'website' });
        this.meta.updateTag({ property: 'og:title', content: title });
        this.meta.updateTag({ property: 'og:description', content: description });
        this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
        this.meta.updateTag({ property: 'og:site_name', content: 'money.jurre.dev' });

        this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
        this.meta.updateTag({ name: 'twitter:title', content: title });
        this.meta.updateTag({ name: 'twitter:description', content: description });

        this.updateCanonical(canonicalUrl);
    }

    private toCanonicalUrl(path: string): string {
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return `${this.baseUrl}${normalized}`;
    }

    private updateCanonical(url: string): void {
        let canonicalEl = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonicalEl) {
            canonicalEl = this.document.createElement('link');
            canonicalEl.setAttribute('rel', 'canonical');
            this.document.head.appendChild(canonicalEl);
        }
        canonicalEl.setAttribute('href', url);
    }
}
