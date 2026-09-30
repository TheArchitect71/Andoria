import { ChangeDetectionStrategy } from '@angular/core';
import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";

import { trigger, transition, animate, style } from "@angular/animations";
import { ActivatedRoute, ParamMap, Params } from "@angular/router";
import { Subscription } from "rxjs";

import { QuestionsService } from "../questions.service";
import { Question } from "../question.model";
import { AuthService } from "src/app/authentication/auth.service";

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: "app-answer",
  animations: [
    trigger("myInsertRemoveTrigger", [
      transition(":enter", [
        style({ opacity: 0 }),
        animate("1000ms", style({ opacity: 1 })),
      ]),
      transition(":leave", [animate("1000ms", style({ opacity: 0 }))]),
    ]),
  ],
  templateUrl: "./answer.component.html",
  styleUrls: ["./answer.component.css"],
})
export class AnswerComponent implements OnInit, OnDestroy {
  question: any = {
    id: "",
    title: "",
    answers: [],
  };
  isLoading = false;
  writtenAnswer = new FormControl("");
  private mode = "create";
  private id: string;
  private authStatusSub: Subscription;
  currentDate = new Date();

  constructor(
    public questionsService: QuestionsService,
    public route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe((authStatus) => {
        this.isLoading = false;
      });
    this.getQuestion();
  }

  getQuestion(): void {
    this.route.paramMap.subscribe((paramMap: ParamMap) => {
      if (paramMap.has("id")) {
        this.id = paramMap.get("id");
        this.questionsService.getQuestion(this.id).subscribe((postData) => {
          this.isLoading = false;
          this.question = {
            id: postData.question._id,
            title: postData.question.title,
            answers: postData.question.answers,
          };
        });
      } else {
        this.mode = "create";
        this.id = null;
      }
    });
  }

  onSaveAnswer() {
    if (this.writtenAnswer.value.trim() == '') {
      return;
    }
    this.isLoading = true;
    if (this.mode === "create") {
      const trimmedAnswer = this.writtenAnswer.value.trim()
      this.questionsService.addAnswer(
        this.id, trimmedAnswer, this.route.snapshot.queryParamMap.get("journey") || undefined
      );
    } else {
      this.questionsService.updateQuestion(this.id, this.writtenAnswer.value);
    }
    this.writtenAnswer.reset();
  }

  onDelete(answerId: string, questionId: string) {
    this.isLoading = true;
    this.questionsService.deleteAnswer(answerId, questionId).subscribe(() => {
      this.getQuestion();
    }, () => {
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
  }
}
