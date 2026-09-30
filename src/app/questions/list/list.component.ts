import { ChangeDetectionStrategy } from '@angular/core';
import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild,
} from "@angular/core";
import {
  ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router,
} from "@angular/router";
import { Subscription } from "rxjs";
import { JourneyQuestionsState, QuestionsService } from "../questions.service";
import { Question } from "../question.model";

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: "app-list",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.css"],
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("loadTrigger") loadTrigger: ElementRef<HTMLElement>;

  journeyPath = "";
  state: JourneyQuestionsState = {
    questions: [], lastId: null, hasMore: true, isLoading: false, error: null,
  };
  supportsObserver = typeof IntersectionObserver !== "undefined";

  private routeSub: Subscription;
  private stateSub: Subscription;
  private navigationSub: Subscription;
  private observer: IntersectionObserver;
  private scrollContainer: HTMLElement;
  private viewReady = false;
  private restoring = true;
  private navigationInProgress = false;
  private pendingScrollTop = 0;
  private frameId: number;
  private destroyed = false;

  constructor(
    private questionsService: QuestionsService,
    private route: ActivatedRoute,
    private router: Router,
    private host: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.navigationSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Capture before Angular removes the tall list and clamps its scroll offset.
        this.rememberScroll();
        this.pendingScrollTop = this.scrollContainer ? this.scrollContainer.scrollTop : 0;
        this.navigationInProgress = true;
        this.restoring = true;
      } else if (event instanceof NavigationEnd || event instanceof NavigationCancel ||
                 event instanceof NavigationError) {
        this.navigationInProgress = false;
        this.queueLayoutWork();
      }
    });

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const journeyPath = params.get("journeyPath");
      if (!journeyPath || journeyPath === this.journeyPath) {
        return;
      }
      if (!this.navigationInProgress) {
        this.rememberScroll();
      }
      if (this.stateSub) {
        this.stateSub.unsubscribe();
      }
      this.journeyPath = journeyPath;
      this.pendingScrollTop = this.questionsService.getJourneyScrollTop(journeyPath);
      this.restoring = true;
      this.stateSub = this.questionsService.getJourneyQuestions(journeyPath).subscribe((state) => {
        this.state = state;
        this.queueLayoutWork();
      });
    });
  }

  ngAfterViewInit(): void {
    // The viewport-sized Material sidenav owns scrolling; window.scrollY stays zero.
    this.scrollContainer = this.host.nativeElement.closest("mat-sidenav-content") ||
      document.scrollingElement as HTMLElement;
    this.viewReady = true;
    this.zone.runOutsideAngular(() => {
      this.scrollContainer.addEventListener("scroll", this.onScroll, { passive: true });
      if (this.supportsObserver) {
        this.observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.maybeLoadMore();
          }
        }, {
          root: this.scrollContainer === document.scrollingElement ? null : this.scrollContainer,
          rootMargin: "0px 0px 200px 0px",
        });
        this.observer.observe(this.loadTrigger.nativeElement);
      }
    });
    this.queueLayoutWork();
  }

  loadMore(): void {
    this.questionsService.loadMoreJourneyQuestions(this.journeyPath);
  }

  trackQuestion(_index: number, question: Question): string {
    return question.id;
  }

  private onScroll = (): void => {
    if (!this.restoring && !this.navigationInProgress) {
      this.rememberScroll();
    }
  };

  private rememberScroll(): void {
    if (this.journeyPath && this.scrollContainer) {
      this.questionsService.rememberJourneyScrollTop(this.journeyPath, this.scrollContainer.scrollTop);
    }
  }

  private queueLayoutWork(): void {
    if (!this.viewReady || this.destroyed) {
      return;
    }
    cancelAnimationFrame(this.frameId);
    this.zone.runOutsideAngular(() => {
      // Wait for Angular to paint the cached cards before restoring their offset.
      this.frameId = requestAnimationFrame(() => {
        this.frameId = requestAnimationFrame(() => {
          if (this.destroyed || this.navigationInProgress || this.state.isLoading) {
            return;
          }
          if (this.restoring) {
            this.scrollContainer.scrollTop = this.pendingScrollTop;
            this.restoring = false;
          }
          this.maybeLoadMore();
        });
      });
    });
  }

  private maybeLoadMore(): void {
    if (this.destroyed || this.restoring || this.navigationInProgress ||
        this.state.isLoading || !this.state.hasMore || this.state.error) {
      return;
    }
    const rootBottom = this.scrollContainer === document.scrollingElement
      ? window.innerHeight : this.scrollContainer.getBoundingClientRect().bottom;
    if (this.loadTrigger.nativeElement.getBoundingClientRect().top <= rootBottom + 200) {
      // Recheck after appending so a short first page fills a tall viewport.
      this.zone.run(() => this.loadMore());
    }
  }

  ngOnDestroy(): void {
    if (!this.navigationInProgress) {
      this.rememberScroll();
    }
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener("scroll", this.onScroll);
    }
    if (this.stateSub) {
      this.stateSub.unsubscribe();
    }
    this.routeSub.unsubscribe();
    this.navigationSub.unsubscribe();
  }
}
