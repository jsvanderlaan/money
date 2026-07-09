import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { CoverageMetricsService } from '../services/coverage-metrics.service';
import { MetaService } from '../services/meta.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './app.component.html',
})
export class AppComponent {
    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);
    private readonly meta = inject(MetaService);
    private readonly destroyRef = inject(DestroyRef);

    constructor(private readonly coverageMetrics: CoverageMetricsService) {
        void this.coverageMetrics;

        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                startWith(null),
                map(() => this.getLeafRoute(this.activatedRoute)),
                takeUntilDestroyed()
            )
            .subscribe(route => {
                this.meta.updateRouteMeta({
                    title: route.snapshot.title?.toString(),
                    description: route.snapshot.data['description'] as string | undefined,
                    path: this.router.url,
                });
            });

        this.activatedRoute.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            if (params['disable_analytics'] === 'true') {
                localStorage.setItem('plausible_ignore', 'true');
            } else if (params['disable_analytics'] === 'false') {
                localStorage.removeItem('plausible_ignore');
            }
        });
    }

    private getLeafRoute(route: ActivatedRoute): ActivatedRoute {
        let current = route;
        while (current.firstChild) {
            current = current.firstChild;
        }
        return current;
    }
}
