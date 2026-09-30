import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { JourneyQuestionsState, QuestionsService } from '../questions.service';
import { ListComponent } from './list.component';

describe('ListComponent scroll lifecycle', () => {
  let fixture: ComponentFixture<ListComponent>;
  let component: ListComponent;
  let root: HTMLElement;
  let service: any;
  let events: Subject<any>;
  let params: BehaviorSubject<any>;
  let destination: BehaviorSubject<JourneyQuestionsState>;
  let humanitarian: BehaviorSubject<JourneyQuestionsState>;
  let intersection: (entries: any[]) => void;
  let disconnected: jasmine.Spy;
  let originalObserver: typeof IntersectionObserver;
  const state = (): JourneyQuestionsState => ({
    questions: [{ id: 'one', title: 'One' }], lastId: 'one',
    hasMore: true, isLoading: false, error: null,
  });

  beforeEach(() => {
    events = new Subject();
    params = new BehaviorSubject(convertToParamMap({ journeyPath: 'destination' }));
    destination = new BehaviorSubject(state());
    humanitarian = new BehaviorSubject({ ...state(), questions: [{ id: 'two', title: 'Two' }] });
    service = jasmine.createSpyObj('QuestionsService', [
      'getJourneyQuestions', 'loadMoreJourneyQuestions', 'getJourneyScrollTop', 'rememberJourneyScrollTop',
    ]);
    service.getJourneyQuestions.and.callFake(path => path === 'destination' ? destination : humanitarian);
    service.getJourneyScrollTop.and.callFake(path => path === 'destination' ? 420 : 100);
    originalObserver = window.IntersectionObserver;
    disconnected = jasmine.createSpy('disconnect');
    (window as any).IntersectionObserver = class {
      constructor(callback: any) { intersection = callback; }
      observe() {}
      disconnect = disconnected;
    };
    TestBed.configureTestingModule({
      declarations: [ListComponent],
      providers: [
        { provide: QuestionsService, useValue: service },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: { events } },
      ],
    }).overrideComponent(ListComponent, {
      set: { template: '<div style="height:2000px">{{state.questions[0]?.title}}</div><div #loadTrigger></div>', styles: [], styleUrls: [] },
    });
    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    root = document.createElement('mat-sidenav-content');
    root.style.cssText = 'display:block;height:200px;overflow:auto';
    document.body.appendChild(root);
    root.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.destroy();
    root.remove();
    (window as any).IntersectionObserver = originalObserver;
  });

  it('restores the actual Material scroll container only after rendering', fakeAsync(() => {
    fixture.detectChanges();
    expect(root.scrollTop).toBe(0);
    tick(16);
    expect(root.scrollTop).toBe(0);
    tick(16);
    expect(root.scrollTop).toBe(420);
    expect(component.state.questions[0].title).toBe('One');
  }));

  it('saves before navigation removes content instead of overwriting with a clamped offset', fakeAsync(() => {
    fixture.detectChanges(); tick(32);
    root.scrollTop = 540;
    events.next(new NavigationStart(1, '/about'));
    root.scrollTop = 0;
    fixture.destroy();
    expect(service.rememberJourneyScrollTop.calls.mostRecent().args).toEqual(['destination', 540]);
    expect(disconnected).toHaveBeenCalled();
  }));

  it('restores each journey independently when Angular reuses the component', fakeAsync(() => {
    fixture.detectChanges(); tick(32);
    root.scrollTop = 600;
    events.next(new NavigationStart(1, '/questions/humanitarian'));
    params.next(convertToParamMap({ journeyPath: 'humanitarian' }));
    fixture.detectChanges();
    expect(service.rememberJourneyScrollTop).toHaveBeenCalledWith('destination', 600);
    events.next(new NavigationEnd(1, '/questions/humanitarian', '/questions/humanitarian'));
    tick(32);
    expect(root.scrollTop).toBe(100);
    expect(component.state.questions[0].title).toBe('Two');
    destination.next({ ...state(), questions: [{ id: 'late', title: 'Late old response' }] });
    expect(component.state.questions[0].title).toBe('Two');
  }));

  it('loads at the bottom but suppresses observation while loading, failed, or finished', fakeAsync(() => {
    fixture.detectChanges(); tick(32);
    spyOn(component.loadTrigger.nativeElement, 'getBoundingClientRect').and.returnValue({ top: 100 } as DOMRect);
    intersection([{ isIntersecting: true }]);
    expect(service.loadMoreJourneyQuestions).toHaveBeenCalledWith('destination');
    service.loadMoreJourneyQuestions.calls.reset();
    destination.next({ ...state(), isLoading: true });
    intersection([{ isIntersecting: true }]);
    destination.next({ ...state(), error: 'Temporary failure' });
    intersection([{ isIntersecting: true }]);
    destination.next({ ...state(), hasMore: false });
    intersection([{ isIntersecting: true }]);
    tick(32);
    expect(service.loadMoreJourneyQuestions).not.toHaveBeenCalled();
  }));

  it('offers an explicit retry without discarding loaded cards', fakeAsync(() => {
    fixture.detectChanges(); tick(32);
    destination.next({ ...state(), error: 'Temporary failure' });
    tick(32);
    component.loadMore();
    expect(service.loadMoreJourneyQuestions).toHaveBeenCalledWith('destination');
    expect(component.state.questions.length).toBe(1);
  }));
});
