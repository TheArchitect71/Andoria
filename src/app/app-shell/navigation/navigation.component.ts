import { ChangeDetectionStrategy } from '@angular/core';
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit } from "@angular/core";
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { QuestionsService } from "../../questions/questions.service";

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: "app-navigation",
  templateUrl: "./navigation.component.html",
  styleUrls: ["./navigation.component.css"],
})
export class NavigationComponent implements OnInit, AfterViewInit, OnDestroy {
  private scrollContainer: HTMLElement;
  private navigationSub: Subscription;
  private frameId: number;
  private navigationInProgress = false;
  private restoring = true;
  private destroyed = false;

  constructor(
    private questionsService: QuestionsService,
    private router: Router,
    private host: ElementRef<HTMLElement>,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.navigationSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.rememberScroll();
        this.navigationInProgress = true;
      } else if (event instanceof NavigationEnd || event instanceof NavigationCancel ||
                 event instanceof NavigationError) {
        this.navigationInProgress = false;
        if (this.restoring) {
          this.restoreScroll();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.scrollContainer = this.host.nativeElement.closest("mat-sidenav-content") ||
      document.scrollingElement as HTMLElement;
    this.zone.runOutsideAngular(() => {
      this.scrollContainer.addEventListener("scroll", this.onScroll, { passive: true });
    });
    this.restoreScroll();
  }

  private onScroll = (): void => {
    if (!this.restoring && !this.navigationInProgress) {
      this.rememberScroll();
    }
  };

  private rememberScroll(): void {
    if (this.scrollContainer && !this.restoring) {
      this.questionsService.rememberJourneyOverviewScrollTop(this.scrollContainer.scrollTop);
    }
  }

  private restoreScroll(): void {
    if (!this.scrollContainer) {
      return;
    }
    cancelAnimationFrame(this.frameId);
    this.zone.runOutsideAngular(() => {
      this.frameId = requestAnimationFrame(() => {
        this.frameId = requestAnimationFrame(() => {
          if (!this.destroyed && !this.navigationInProgress) {
            // This screen's offset is independent of the question list sharing this container.
            this.scrollContainer.scrollTop = this.questionsService.getJourneyOverviewScrollTop();
            this.restoring = false;
          }
        });
      });
    });
  }

  ngOnDestroy(): void {
    if (!this.navigationInProgress) {
      this.rememberScroll();
    }
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    this.navigationSub.unsubscribe();
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener("scroll", this.onScroll);
    }
  }

  navigationList = [
    {
      id: 2,
      route: `/questions/?journeys=destination`,
      title: `Destination Journey`,
      content: `Finding your Life's Purpose or True Calling`,
    },
    {
      route: `/questions/?journeys=humanitarian`,
      title: `Humanitarian Journey`,
      content: `Make a Difference in the World`
    },
    {
      id: 3,
      route: "/questions/?journeys=overcomer",
      title: `Overcomer's Journey`,
      content: `Conquering your Fears`,
    },
    {
      id: 4,
      route: "/questions/?journeys=resolve",
      title: `Chaotic Resolve Journey`,
      content: `Achieving Inner Peace`,
    },
    {
      id: 5,
      route: "/questions/?journeys=achievement",
      title: `Achievement Journey`,
      content: `Creating New Goals`,
    },
    {
      id: 6,
      route: "/questions/?journeys=selfdiscovery",
      title: `Self-Discovery Journey`,
      content: `Exploring your True Creative Passions`,
    },
    {
      id: 2,
      route: "/questions/?journeys=newchapter",
      title: `Writing a New Chapter Journey`,
      content: `Learning from Past Mistakes`,
    },
    {
      id: 3,
      route: "/questions/?journeys=mending",
      title: `Mending Fences Journey`,
      content: `Righting your Wrongs`,
    },
    {
      id: 4,
      route: "/questions/?journeys=selfimprovement",
      title: `Self-Improvement Journey`,
      content: `Loving Yourself Through Acceptance`,
    },
    {
      id: 5,
      route: "/questions/?journeys=spiritual",
      title: `Spiritual Journey`,
      content: `Exploring your Beliefs`,
    },
  ];
}
