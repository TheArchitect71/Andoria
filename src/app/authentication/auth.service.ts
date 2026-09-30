import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthData } from './auth-data.model';

const BACKEND_URL = environment.apiUrl + '/api/v1/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = false;
  private token: string;
  private tokenTimer: any;
  // private userId: string;
  private userInfo = {};
  private authStatusListener = new Subject<boolean>();

  constructor(private http: HttpClient, private router: Router) {}

  getToken() {
    return this.token;
  }

  getIsAuth() {
    return this.isAuthenticated;
  }

  getUserInfo() {
    return this.userInfo;
  }

  getAuthStatusListener() {
    return this.authStatusListener.asObservable();
  }

  createUser(name: string, email: string, password: string) {
    const authData = { name: name, email: email, password: password };
    this.http.post(BACKEND_URL + '/register', authData).subscribe(
      () => {
        this.router.navigate([`/auth/login`]);
      },
      error => {
        this.authStatusListener.next(false);
      }
    );
  }

  login(email: string, password: string) {
    const authData: AuthData = { email: email, password: password };
    this.http
      .post<{ auth_token: string; info: {} }>(
        BACKEND_URL + '/login',
        authData
      )
      .subscribe(
        response => {
          const token = response.auth_token;
          this.token = token;
          if (token) {
            this.isAuthenticated = true;
            this.userInfo = response.info;
            this.authStatusListener.next(true);
            this.saveAuthData(token, this.userInfo);
            this.router.navigate(['/']);
          }
        },
        error => {
          this.authStatusListener.next(false);
        }
      );
  }

  autoAuthUser() {
    const authInformation = this.getAuthData();
    if (!authInformation) {
      return;
    }
      this.token = authInformation.token;
      this.isAuthenticated = true;
      this.userInfo = authInformation.userInfo;
      this.authStatusListener.next(true);
  }

  logout() {
    this.token = null;
    this.isAuthenticated = false;
    this.authStatusListener.next(false);
    this.userInfo = null;
    clearTimeout(this.tokenTimer);
    this.clearAuthData();
    this.router.navigate(['/']);
  }

  private saveAuthData(token: string, userInfo: {}) {
    localStorage.setItem('token', token);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }

  private clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
  }

  private getAuthData() {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');
    if (!token) {
      return;
    }
    return {
      token: token,
      userInfo: JSON.parse(userInfo),
    };
  }

  resetPassword(email: string) {
    this.token = null;
    this.isAuthenticated = false;
    this.authStatusListener.next(false);
    this.userInfo = null;
    console.log("Hey There beautiful!")
  }
}
