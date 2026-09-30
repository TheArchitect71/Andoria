import { AppModule } from 'src/app/app.module';
import { AuthModule } from 'src/app/authentication/auth.module';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
describe('AppComponent', () => {
  beforeEach(() => { TestBed.configureTestingModule({ imports: [AppModule, AuthModule], providers: [provideHttpClientTesting()],}); });
  it('renders the navigation shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-sidenav-container')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    fixture.destroy();
  });
});
