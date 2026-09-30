import { ChangeDetectionStrategy } from '@angular/core';
import { Component, ChangeDetectorRef, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import {MediaMatcher} from '@angular/cdk/layout';
import { AuthService } from "src/app/authentication/auth.service";

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  mobileQuery: MediaQueryList;
  opened: boolean;
  userIsAuthenticated = false;
  private _mobileQueryListener: () => void;
  private authListenerSubs: Subscription;

  constructor(
    private authService: AuthService,
    changeDetectorRef: ChangeDetectorRef,
    media: MediaMatcher
  ) {
    this.mobileQuery = media.matchMedia("(max-width: 600px)");
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  ngOnInit() {
    this.authService.autoAuthUser();
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe((isAuthenticated) => {
        this.userIsAuthenticated = isAuthenticated;
      });
  }

  onLogout() {
    this.authService.logout();
  }

  ngOnDestroy() {
    this.authListenerSubs.unsubscribe();
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  navigationList = [
    {
      id: 1,
      route: "/about",
      title: `About`,
      content: `To Be Authentic. To Surrender the Outcome. To Do Uncomfortable Work.`,
    },
    {
      route: "/contact",
      title: `Contact Us`,
    },
    {
      route: "/auth/login",
      title: "Log In",
    },
  ];
}
