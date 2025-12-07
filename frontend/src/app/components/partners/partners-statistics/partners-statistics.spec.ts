import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersStatistics } from './partners-statistics';

describe('PartnersStatistics', () => {
  let component: PartnersStatistics;
  let fixture: ComponentFixture<PartnersStatistics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersStatistics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnersStatistics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
