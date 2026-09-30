import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { AngularMaterialModule } from "../angular-material.module";
import { AnswerComponent } from "./answer/answer.component";
import { ListComponent } from "./list/list.component";

@NgModule({
  declarations: [ListComponent, AnswerComponent],
  imports: [
    CommonModule,
    AngularMaterialModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    RouterModule,
  ],
})
export class QuestionsModule {}
