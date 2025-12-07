import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-partners-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partners-statistics.html',
  styleUrls: ['./partners-statistics.css']
})
export class PartnersStatisticsComponent implements OnInit {
  
  // Filters
  selectedCountry: string = 'All';
  selectedDisease: string = '';
  
  // Data
  stats: any[] = [];
  totalCases: number = 0;
  isLoading: boolean = false;

  // List of countries for the dropdown (You can expand this)
  countries: string[] = [
    'Romania', 'USA', 'Germany', 'France', 'UK', 'Spain', 'Italy', 'Canada'
  ];

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Load initial data (All countries, all diseases)
    this.fetchStatistics();
  }

  fetchStatistics() {
    this.isLoading = true;
    this.stats = [];
    this.totalCases = 0;

    // Call the backend
    this.authService.getPartnerStatistics(this.selectedCountry, this.selectedDisease).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success) {
          this.stats = res.data;
          // Calculate total from the breakdown
          this.totalCases = this.stats.reduce((sum, item) => sum + item.count, 0);
        }
        this.cdr.detectChanges(); // Force UI update
      },
      error: (err) => {
        console.error('Stats Error:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}