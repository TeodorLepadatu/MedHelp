import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersLogin } from './partners-login';

describe('PartnersLogin', () => {
  let component: PartnersLogin;
  let fixture: ComponentFixture<PartnersLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersLogin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnersLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
