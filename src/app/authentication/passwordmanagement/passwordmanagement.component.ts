import { ChangeDetectionStrategy } from '@angular/core';
import { Component, OnInit } from "@angular/core";
import { NgForm } from "@angular/forms";
import { Subscription } from "rxjs";
import { AuthService } from "../auth.service";

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: "app-passwordmanagement",
  templateUrl: "./passwordmanagement.component.html",
  styleUrls: ["./passwordmanagement.component.css"],
})
export class PasswordmanagementComponent implements OnInit {
  isLoading = false;
  private authStatusSub: Subscription;

  constructor(public authService: AuthService) {}

  onReset(form: NgForm) {
    if (form.invalid) {
      return;
    }
    this.isLoading = true;
    this.authService.resetPassword(form.value.email);
  }

  ngOnInit(): void {
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe((authStatus) => {
        this.isLoading = false;
      });
  }
}
