import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersRegister } from './partners-register';

describe('PartnersRegister', () => {
  let component: PartnersRegister;
  let fixture: ComponentFixture<PartnersRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersRegister]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnersRegister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
