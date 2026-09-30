import { ChangeDetectionStrategy } from '@angular/core';
import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";

import { AuthService } from "../auth.service";
@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: "app-profile",
  templateUrl: "./profile.component.html",
  styleUrls: ["./profile.component.css"],
})
export class ProfileComponent implements OnInit, OnDestroy {
  isLoading = false;
  user: any;
  private authStatusSub: Subscription;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe( authStatus => {
        this.isLoading = false;
      });
      this.user = this.authService.getUserInfo();
  }

  onLogout() {
    this.authService.logout();
  }

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
  }
}
