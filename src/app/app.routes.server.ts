import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
    {
        path: '',
        renderMode: RenderMode.Prerender,
    },
    {
        path: 'transactions',
        renderMode: RenderMode.Prerender,
    },
    {
        path: 'labels',
        renderMode: RenderMode.Prerender,
    },
    {
        path: '**',
        renderMode: RenderMode.Prerender,
    },
];
