import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersPredictions } from './partners-predictions';

describe('PartnersPredictions', () => {
  let component: PartnersPredictions;
  let fixture: ComponentFixture<PartnersPredictions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersPredictions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnersPredictions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
