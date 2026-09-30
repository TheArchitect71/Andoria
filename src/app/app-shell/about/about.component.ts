import { ChangeDetectionStrategy } from '@angular/core';
import { Component, OnInit } from '@angular/core';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {

  constructor() {}

  summaries = [
    {
      title: `This application is inspired by the work of Dr. James W. Pennebaker`,
      text: `A psychology professor at UT Austin. His work discover the benefits of “expressive writing” in the 1980’s showing that people’s health and productivity improved when they wrote about traumatic experience or uncertainty- particularly if they constructed casual accounts or plans. He also investigated the psychological significance patterns of word use. `,
    },
  ]
}
