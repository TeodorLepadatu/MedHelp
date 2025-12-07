import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnersDashboard } from './partners-dashboard';

describe('PartnersDashboard', () => {
  let component: PartnersDashboard;
  let fixture: ComponentFixture<PartnersDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartnersDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
