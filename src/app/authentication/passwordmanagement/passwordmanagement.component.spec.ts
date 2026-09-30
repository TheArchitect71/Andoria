import { AppModule } from 'src/app/app.module';
import { AuthModule } from 'src/app/authentication/auth.module';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordmanagementComponent } from './passwordmanagement.component';

describe('PasswordmanagementComponent', () => {
  let component: PasswordmanagementComponent;
  let fixture: ComponentFixture<PasswordmanagementComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({ imports: [AppModule, AuthModule], providers: [provideHttpClientTesting()],

    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordmanagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
