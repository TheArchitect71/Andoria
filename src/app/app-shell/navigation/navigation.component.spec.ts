import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { QuestionsService } from '../../questions/questions.service';
import { NavigationComponent } from './navigation.component';

describe('Journey overview scroll restoration', () => {
  let fixture: ComponentFixture<NavigationComponent>;
  let root: HTMLElement;
  let service: any;
  let events: Subject<any>;
  let saved: number;

  beforeEach(() => {
    saved = 188;
    events = new Subject();
    service = jasmine.createSpyObj('QuestionsService', ['getJourneyOverviewScrollTop', 'rememberJourneyOverviewScrollTop']);
    service.getJourneyOverviewScrollTop.and.callFake(() => saved);
    service.rememberJourneyOverviewScrollTop.and.callFake(top => saved = top);
    TestBed.configureTestingModule({
      declarations: [NavigationComponent],
      providers: [
        { provide: QuestionsService, useValue: service },
        { provide: Router, useValue: { events } },
      ],
    }).overrideComponent(NavigationComponent, {
      set: { template: '<div style="height:2000px">Journey overview</div>', styles: [], styleUrls: [] },
    });
    fixture = TestBed.createComponent(NavigationComponent);
    root = document.createElement('mat-sidenav-content');
    root.style.cssText = 'display:block;height:200px;overflow:auto';
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
  });

  afterEach(() => { fixture.destroy(); root.remove(); });

  it('restores its saved position after rendering instead of inheriting questions at the bottom', fakeAsync(() => {
    root.scrollTop = 1400;
    fixture.detectChanges();
    root.dispatchEvent(new Event('scroll'));
    expect(saved).toBe(188);
    tick(16);
    expect(root.scrollTop).toBe(1400);
    tick(16);
    expect(root.scrollTop).toBe(188);
  }));

  it('restores its saved position even when the questions screen was at the top', fakeAsync(() => {
    root.scrollTop = 0;
    fixture.detectChanges(); tick(32);
    expect(root.scrollTop).toBe(188);
  }));

  it('starts at the top only when the journey overview has no saved position', fakeAsync(() => {
    saved = 0;
    root.scrollTop = 1400;
    fixture.detectChanges(); tick(32);
    expect(root.scrollTop).toBe(0);
  }));

  it('captures departure before removal clamps the shared container', fakeAsync(() => {
    fixture.detectChanges(); tick(32);
    root.scrollTop = 350;
    events.next(new NavigationStart(1, '/questions/destination'));
    root.scrollTop = 0;
    root.dispatchEvent(new Event('scroll'));
    fixture.destroy();
    expect(saved).toBe(350);
    expect(service.rememberJourneyOverviewScrollTop.calls.mostRecent().args).toEqual([350]);
  }));
});
