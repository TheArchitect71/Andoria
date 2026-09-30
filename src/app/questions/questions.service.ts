import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { map } from "rxjs/operators";
import { Router } from "@angular/router";

import { Question } from "./question.model";
import { environment } from "../../environments/environment";

const BACKEND_URL = environment.apiUrl + "/api/v1/questions";

export interface JourneyQuestionsState {
  questions: Question[];
  lastId: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

interface JourneyPage {
  titles: { _id: string; title: string }[];
  last_id: string | null;
  next_cursor?: string | null;
  has_more?: boolean;
}

interface JourneyCache {
  state: BehaviorSubject<JourneyQuestionsState>;
  scrollTop: number;
}

@Injectable({ providedIn: "root" })
export class QuestionsService {
  private journeyPath: string;
  private journeys = new Map<string, JourneyCache>();
  private journeyOverviewScrollTop = 0;

  constructor(private http: HttpClient, private router: Router) {}

  getJourneyQuestions(journeyPath: string): Observable<JourneyQuestionsState> {
    this.journeyPath = journeyPath;
    return this.getJourneyCache(journeyPath).state.asObservable();
  }

  loadMoreJourneyQuestions(journeyPath: string, pageSize = 5): void {
    const cache = this.getJourneyCache(journeyPath);
    const previous = cache.state.value;
    if (previous.isLoading || !previous.hasMore) {
      return;
    }

    let params = this.getJourneyFilters(journeyPath).set("pageSize", String(pageSize));
    if (previous.lastId) {
      params = params.set("lastId", previous.lastId);
    }
    cache.state.next({ ...previous, isLoading: true, error: null });

    // Each response closes over its own cache, so another journey cannot receive it.
    this.http.get<JourneyPage>(`${BACKEND_URL}/journeys`, { params })
      .pipe(map((page) => {
        if (!Array.isArray(page.titles)) {
          throw new Error("Invalid questions response");
        }
        const questions = page.titles.map((question) => ({
          title: question.title, id: question._id,
        }));
        const lastId = page.next_cursor || page.last_id ||
          (questions.length ? questions[questions.length - 1].id : null);
        const hasMore = typeof page.has_more === "boolean"
          ? page.has_more : questions.length === pageSize;
        if (hasMore && (!lastId || lastId === previous.lastId)) {
          throw new Error("The questions cursor did not advance");
        }
        return { questions, lastId, hasMore };
      }))
      .subscribe(
        (page) => {
          const current = cache.state.value;
          const seen = new Set(current.questions.map((question) => question.id));
          const additional = page.questions.filter((question) => {
            if (seen.has(question.id)) {
              return false;
            }
            seen.add(question.id);
            return true;
          });
          cache.state.next({
            questions: [...current.questions, ...additional],
            lastId: page.lastId || current.lastId,
            hasMore: page.hasMore,
            isLoading: false,
            error: null,
          });
        },
        () => cache.state.next({
          ...cache.state.value,
          isLoading: false,
          error: "Could not load questions. Please try again.",
        })
      );
  }

  getJourneyScrollTop(journeyPath: string): number {
    return this.getJourneyCache(journeyPath).scrollTop;
  }

  getJourneyOverviewScrollTop(): number {
    return this.journeyOverviewScrollTop;
  }

  rememberJourneyOverviewScrollTop(scrollTop: number): void {
    this.journeyOverviewScrollTop = Math.max(0, scrollTop);
  }

  rememberJourneyScrollTop(journeyPath: string, scrollTop: number): void {
    // Avoid emitting a new question list on every pixel of movement.
    this.getJourneyCache(journeyPath).scrollTop = Math.max(0, scrollTop);
  }

  private getJourneyCache(journeyPath: string): JourneyCache {
    const key = this.getJourneyFilters(journeyPath).toString();
    if (!this.journeys.has(key)) {
      this.journeys.set(key, {
        state: new BehaviorSubject<JourneyQuestionsState>({
          questions: [], lastId: null, hasMore: true, isLoading: false, error: null,
        }),
        scrollTop: 0,
      });
    }
    return this.journeys.get(key);
  }

  private getJourneyFilters(journeyPath: string): HttpParams {
    // Existing bookmarked routes encode ?journeys=destination as the path segment.
    const routeParams = journeyPath.startsWith("?")
      ? new HttpParams({ fromString: journeyPath.slice(1) })
      : new HttpParams().set("journeys", journeyPath);
    const journeys = Array.from(new Set(routeParams.getAll("journeys") || [])).sort();
    return journeys.reduce((params, journey) => params.append("journeys", journey), new HttpParams());
  }

  getQuestion(id: string) {
    return this.http.get<{
      question: { _id: string; title: string; answers: [] };
    }>(`${BACKEND_URL}/id/${id}`, { responseType: "json" });
  }

  addAnswer(questionId: string, answer: string, returnJourneyPath = this.journeyPath) {
    const body = new HttpParams()
      .set(`question_id`, questionId)
      .set(`answer`, answer);
    const headers = new HttpHeaders({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    this.http
      .post<{ message: string; question: Question }>(
        `${BACKEND_URL}/answer`,
        body,
        { headers }
      )
      .subscribe((responseData) => {
        this.router.navigate(returnJourneyPath ? ["/questions", returnJourneyPath] : ["/"]);
      });
  }

  updateQuestion(id: string, title: string) {
    let questionData: Question | FormData;

    questionData = new FormData();
    questionData.append("id", id);
    questionData.append("title", title);

    this.http.put(BACKEND_URL + id, questionData).subscribe((response) => {
      this.router.navigate(["/"]);
    });
  }

  deleteAnswer(answerId: string, questionId: string) {
    const body = new HttpParams()
      .set(`question_id`, questionId)
      .set(`answer_id`, answerId);
    const options = {
      headers: new HttpHeaders({
        "Content-Type": "application/x-www-form-urlencoded",
      }),
      body: body,
    };
    return this.http.delete(`${BACKEND_URL}/answer`, options);
  }

}
