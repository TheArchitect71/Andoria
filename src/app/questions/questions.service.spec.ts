import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { JourneyQuestionsState, QuestionsService } from './questions.service';

describe('QuestionsService journey cache', () => {
  let service: QuestionsService;
  let http: HttpTestingController;
  let state: JourneyQuestionsState;
  const journey = '?journeys=destination';
  const endpoint = environment.apiUrl + '/api/v1/questions/journeys';
  const question = (id: number) => ({ _id: id.toString(16).padStart(24, '0'), title: `Question ${id}` });
  const page = (ids: number[], hasMore?: boolean) => ({
    titles: ids.map(question),
    last_id: ids.length ? question(ids[ids.length - 1])._id : null,
    ...(hasMore === undefined ? {} : { has_more: hasMore }),
  });
  const request = () => http.expectOne(r => r.url === endpoint);
  const load = (ids: number[], hasMore?: boolean) => {
    service.loadMoreJourneyQuestions(journey);
    request().flush(page(ids, hasMore));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }],
    });
    service = TestBed.inject(QuestionsService);
    http = TestBed.inject(HttpTestingController);
    service.getJourneyQuestions(journey).subscribe(value => state = value);
  });
  afterEach(() => http.verify());

  it('sends structured filters and omits the first-page cursor', () => {
    service.loadMoreJourneyQuestions(journey);
    const req = request();
    expect(req.request.params.get('journeys')).toBe('destination');
    expect(req.request.params.get('pageSize')).toBe('5');
    expect(req.request.params.has('lastId')).toBe(false);
    req.flush(page([1, 2, 3, 4, 5], true));
    expect(state.questions.length).toBe(5);
  });

  it('allows only one concurrent request for each journey', () => {
    service.loadMoreJourneyQuestions(journey);
    service.loadMoreJourneyQuestions(journey);
    expect(state.isLoading).toBe(true);
    request().flush(page([1, 2, 3, 4, 5], true));
    expect(state.isLoading).toBe(false);
  });

  it('appends pages and removes duplicate IDs across and within pages', () => {
    load([1, 2, 3, 4, 5], true);
    service.loadMoreJourneyQuestions(journey);
    const req = request();
    expect(req.request.params.get('lastId')).toBe(question(5)._id);
    req.flush(page([5, 6, 6, 7], false));
    expect(state.questions.map(q => q.title)).toEqual([1, 2, 3, 4, 5, 6, 7].map(id => `Question ${id}`));
  });

  it('replays cached cards and scroll to a new subscriber', () => {
    load([1, 2, 3, 4, 5], true);
    service.rememberJourneyScrollTop(journey, 540);
    let restored: JourneyQuestionsState;
    service.getJourneyQuestions('destination').subscribe(value => restored = value).unsubscribe();
    expect(restored.questions.length).toBe(5);
    expect(restored.lastId).toBe(question(5)._id);
    expect(service.getJourneyScrollTop('destination')).toBe(540);
    http.expectNone(endpoint);
  });

  it('isolates late responses and scroll offsets for different journeys', () => {
    service.loadMoreJourneyQuestions(journey);
    const oldRequest = request();
    let other: JourneyQuestionsState;
    service.getJourneyQuestions('humanitarian').subscribe(value => other = value);
    service.loadMoreJourneyQuestions('humanitarian');
    request().flush(page([20, 21], false));
    oldRequest.flush(page([1, 2, 3, 4, 5], true));
    service.rememberJourneyScrollTop(journey, 350);
    service.rememberJourneyScrollTop('humanitarian', 120);
    expect(other.questions.map(q => q.title)).toEqual(['Question 20', 'Question 21']);
    expect(state.questions.length).toBe(5);
    expect(service.getJourneyScrollTop(journey)).toBe(350);
    expect(service.getJourneyScrollTop('humanitarian')).toBe(120);
  });

  it('retains cards and cursor on failure and retries the same page', () => {
    load([1, 2, 3, 4, 5], true);
    service.loadMoreJourneyQuestions(journey);
    request().flush({}, { status: 503, statusText: 'Unavailable' });
    expect(state.questions.length).toBe(5);
    expect(state.lastId).toBe(question(5)._id);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeTruthy();
    service.loadMoreJourneyQuestions(journey);
    const retry = request();
    expect(retry.request.params.get('lastId')).toBe(question(5)._id);
    retry.flush(page([6], false));
    expect(state.questions.length).toBe(6);
    expect(state.error).toBe(null);
  });

  it('keeps the final partial page and stops subsequent requests', () => {
    load([1, 2, 3, 4, 5], true);
    load([6], false);
    expect(state.questions.length).toBe(6);
    expect(state.hasMore).toBe(false);
    service.loadMoreJourneyQuestions(journey);
    http.expectNone(endpoint);
  });

  it('honors the explicit end signal for a full final page', () => {
    load([1, 2, 3, 4, 5], false);
    expect(state.hasMore).toBe(false);
    service.loadMoreJourneyQuestions(journey);
    http.expectNone(endpoint);
  });

  it('supports the older response contract and keeps cards on the empty final page', () => {
    load([1, 2, 3, 4, 5]);
    expect(state.hasMore).toBe(true);
    load([]);
    expect(state.hasMore).toBe(false);
    expect(state.questions.length).toBe(5);
  });

  it('rejects a non-advancing cursor instead of repeatedly requesting it', () => {
    load([1, 2, 3, 4, 5], true);
    load([1, 2, 3, 4, 5], true);
    expect(state.error).toBeTruthy();
    expect(state.questions.length).toBe(5);
    expect(state.isLoading).toBe(false);
  });

  it('shares cache only for equivalent journey filters', () => {
    service.rememberJourneyScrollTop('?journeys=destination&journeys=humanitarian', 250);
    expect(service.getJourneyScrollTop('?journeys=humanitarian&journeys=destination')).toBe(250);
    expect(service.getJourneyScrollTop(journey)).toBe(0);
  });

  it('keeps the journey overview offset independent from question scrolling', () => {
    service.rememberJourneyOverviewScrollTop(188);
    service.rememberJourneyScrollTop(journey, 1400);
    expect(service.getJourneyOverviewScrollTop()).toBe(188);
    service.rememberJourneyScrollTop(journey, 0);
    expect(service.getJourneyOverviewScrollTop()).toBe(188);
  });

  it('returns a saved answer to its original journey even after another journey was visited', () => {
    service.getJourneyQuestions('humanitarian').subscribe().unsubscribe();
    service.addAnswer(question(1)._id, 'Navigation fixture', journey);
    http.expectOne(environment.apiUrl + '/api/v1/questions/answer').flush({});
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/questions', journey]);
  });
});
