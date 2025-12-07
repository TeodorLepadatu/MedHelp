import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersLanding } from './partners-landing';

describe('PartnersLanding', () => {
  let component: PartnersLanding;
  let fixture: ComponentFixture<PartnersLanding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersLanding]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnersLanding);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
