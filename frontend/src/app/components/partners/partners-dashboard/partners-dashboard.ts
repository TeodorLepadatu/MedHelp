import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-partners-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './partners-dashboard.html',
  styleUrls: ['./partners-dashboard.css']
})
export class PartnersDashboardComponent implements OnInit {
  companyName: string = 'Partner Portal';
  isLoading: boolean = true;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // We fetch the dashboard data just to get the Company Name for the header
    this.authService.getPartnerDashboard().subscribe({
      next: (res: any) => {
        if (res.company_info && res.company_info.name) {
          this.companyName = res.company_info.name;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load partner info', err);
        this.isLoading = false;
        // Optionally redirect to login if 401
        if (err.status === 401) this.logout();
      }
    });
  }

  logout() {
    localStorage.removeItem('token'); // Clear token
    this.router.navigate(['/partners-login']);
  }
}