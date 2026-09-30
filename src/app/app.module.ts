import { NgModule, provideZoneChangeDetection } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { AppComponent } from "./app.component";
import { QuestionsModule } from "./questions/questions.module"
import { AngularMaterialModule } from "./angular-material.module";

import { AboutComponent } from "./app-shell/about/about.component";
import { NavigationComponent } from "./app-shell/navigation/navigation.component";
import { FooterComponent } from "./app-shell/footer/footer.component";
import { AppRoutingModule } from "./app-routing.module";
import { ContactComponent } from './app-shell/contact/contact.component';
import { AuthInterceptor } from "./authentication/auth-interceptor";

@NgModule({
  declarations: [
    AppComponent,
    AboutComponent,
    NavigationComponent,
    FooterComponent,
    ContactComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    AngularMaterialModule,
    QuestionsModule
  ],
  providers: [ provideZoneChangeDetection(), { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true } ],
  bootstrap: [AppComponent],
})
export class AppModule {}
